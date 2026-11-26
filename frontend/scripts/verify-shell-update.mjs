import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

// Real workers and two real builds; anonymous login page, no API or DB writes.
// Never point output at tracked evidence. Requires Chrome and npm on this PC.
const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(resolve(frontend, 'package.json'))
const output = resolve(frontend, '../.tmp-ecl139-browser', new Date().toISOString().replaceAll(':', '-'))
const loginFile = resolve(frontend, 'src/pages/LoginPage.tsx')
const original = await readFile(loginFile)
const npm = process.env.npm_execpath || resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')
const marker = 'Iniciar sesión — versión nueva de prueba'
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' }
const records = []
let root
let browser
await mkdir(output, { recursive: true })
async function build(destination) {
  await new Promise((accept, reject) => {
    const child = spawn(process.execPath, [npm, 'run', 'build'], { cwd: frontend, env: process.env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let log = ''
    child.stdout.on('data', data => { log += data })
    child.stderr.on('data', data => { log += data })
    child.on('error', reject)
    child.on('exit', code => code === 0 ? accept() : reject(new Error(`Build failed (${code}): ${log.slice(-1500)}`)))
  })
  if (destination) await cp(resolve(frontend, 'dist'), destination, { recursive: true })
}
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)
    let file = resolve(root, '.' + pathname)
    if (!file.startsWith(root + sep)) file = resolve(root, 'index.html')
    let data
    try { data = await readFile(file) } catch {
      if (extname(pathname)) { response.writeHead(404); response.end(); return }
      file = resolve(root, 'index.html'); data = await readFile(file)
    }
    response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' })
    response.end(data)
  } catch { response.writeHead(500); response.end() }
})
try {
  console.log('Building A')
  root = resolve(output, 'build-a')
  await build(root)
  const a = JSON.parse(await readFile(resolve(root, 'offline-shell.json'), 'utf8')).version
  await new Promise(accept => server.listen(0, '127.0.0.1', accept))
  const origin = `http://127.0.0.1:${server.address().port}`
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const pages = []
  for (const [width, theme] of [[1280, 'light'], [360, 'dark']]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    const page = await context.newPage()
    await page.goto(origin + '/login')
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) await new Promise(accept => navigator.serviceWorker.addEventListener('controllerchange', accept, { once: true }))
    })
    await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'Iniciar sesión')
    assert.equal(await page.locator('.shell-update-notice').count(), 0, 'First install must not announce an update')
    const peer = await context.newPage()
    await peer.goto(origin + '/login')
    await peer.getByRole('heading', { name: 'Iniciar sesión', exact: true }).waitFor()
    await peer.waitForFunction(() => navigator.serviceWorker.controller !== null)
    pages.push({ context, page, peer, width, theme })
  }
  console.log('Building B with a temporary login heading; source restored in finally')
  const changed = original.toString('utf8').replace('>Iniciar sesión</h1>', `>${marker}</h1>`)
  assert.notEqual(changed, original.toString('utf8'))
  try {
    await writeFile(loginFile, changed)
    await build(resolve(output, 'build-b'))
  } finally { await writeFile(loginFile, original) }
  root = resolve(output, 'build-b')
  const b = JSON.parse(await readFile(resolve(root, 'offline-shell.json'), 'utf8')).version
  assert.notEqual(a, b)
  for (const { context, page, peer, width, theme } of pages) {
    await page.reload()
    const notice = page.locator('.shell-update-notice')
    await notice.waitFor({ timeout: 30_000 })
    assert.equal(await page.locator('h1').textContent(), 'Iniciar sesión')
    assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).waiting?.state), 'installed')
    await page.evaluate(value => document.documentElement.dataset.theme = value, theme)
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all(document.getAnimations()
        .filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime))
        .map(animation => animation.finished.catch(() => {})))
    })
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') })
    const axe = await page.evaluate(async () => {
      const result = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })
      return { violations: result.violations, incomplete: result.incomplete.map(item => item.id) }
    })
    await writeFile(resolve(output, `axe-${width}-${theme}.json`), JSON.stringify(axe, null, 2))
    assert.equal(axe.violations.length, 0)
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await page.screenshot({ path: resolve(output, `aviso-${width}-${theme}.png`) })
    await context.setOffline(true)
    await notice.waitFor({ state: 'hidden' })
    await context.setOffline(false)
    await notice.waitFor()
    if (width === 360) {
      await notice.getByRole('button', { name: 'Más tarde' }).click()
      await notice.waitFor({ state: 'hidden' })
      // Dismissal is per document/version; reloading offers this waiting update again.
      await page.reload()
      await notice.waitFor()
    }
    let navigations = 0
    let peerNavigations = 0
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++ })
    peer.on('framenavigated', frame => { if (frame === peer.mainFrame()) peerNavigations++ })
    const update = notice.getByRole('button', { name: 'Actualizar', exact: true })
    await update.focus()
    await update.press('Enter')
    await page.waitForFunction(text => document.querySelector('h1')?.textContent === text, marker)
    await peer.waitForFunction(text => document.querySelector('h1')?.textContent === text, marker)
    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.getRegistration()
      return registration?.active?.state === 'activated' && !registration.waiting
    })
    assert.equal(navigations, 1, 'Acceptance must reload just once')
    assert.equal(peerNavigations, 1, 'Other controlled tabs must switch to matching assets once')
    const acceptanceNavigations = navigations
    assert.equal(await notice.count(), 0)
    await context.setOffline(true)
    await page.reload()
    await page.getByRole('heading', { name: marker, exact: true }).waitFor()
    assert.equal(await notice.count(), 0)
    records.push({ width, theme, firstInstallNotice: false, waitingState: 'installed', afterAcceptance: 'activated', acceptanceNavigations, peerNavigations, offlineVerificationReloads: navigations - acceptanceNavigations, offlineAfterUpdate: true, axeViolations: 0, axeIncomplete: axe.incomplete })
    await context.close()
  }
  const sources = {}
  for (const file of ['src/services/offlineShell.ts', 'src/components/ShellUpdateNotice.tsx', 'src/app/App.tsx', 'src/styles/components.css', 'public/sw.js']) {
    sources[file] = createHash('sha256').update(await readFile(resolve(frontend, file))).digest('hex')
  }
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ status: 'passed', date: new Date().toISOString(), browser: browser.version(), source: 'Chrome real, dos builds con código ECL-139 y cambio temporal del encabezado; sin API ni credenciales', builds: { a, b }, sources, records }, null, 2))
  console.log(JSON.stringify({ status: 'passed', output, records }))
} finally {
  await writeFile(loginFile, original)
  if (browser) await browser.close()
  await new Promise(accept => server.close(accept))
  // Leave dist matching the real source, never the temporary marker build.
  console.log('Restoring normal production build')
  await build()
}
