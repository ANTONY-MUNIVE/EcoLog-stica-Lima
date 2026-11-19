import { expect, test, type Page } from '@playwright/test'
import { API_URL, USERS, adjuntarJson, apiLogin, hoyLima, leerPlan, login, password } from './support'

/** Web Vitals of a full page load, read from the browser's Performance API. */
async function webVitals(page: Page) {
  return page.evaluate(async () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null
    // LCP is not exposed by every engine (WebKit); null means "not supported", never 0.
    const lcp = await new Promise<number | null>((resolve) => {
      if (!PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')) return resolve(null)
      let last: number | null = null
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) last = entry.startTime
      })
      observer.observe({ type: 'largest-contentful-paint', buffered: true })
      setTimeout(() => { observer.disconnect(); resolve(last) }, 1500)
    })
    return {
      ttfb_ms: nav ? Math.round(nav.responseStart) : null,
      fcp_ms: fcp === null ? null : Math.round(fcp),
      lcp_ms: lcp === null ? null : Math.round(lcp),
      dom_content_loaded_ms: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      carga_total_ms: nav ? Math.round(nav.loadEventEnd) : null,
      transferido_bytes: performance.getEntriesByType('resource')
        .reduce((total, r) => total + ((r as PerformanceResourceTiming).transferSize || 0), nav?.transferSize ?? 0),
    }
  })
}

function percentil(valores: number[], p: number): number {
  const ordenados = [...valores].sort((a, b) => a - b)
  return ordenados[Math.min(ordenados.length - 1, Math.ceil((p / 100) * ordenados.length) - 1)]
}

test.describe('Monitoreo de rendimiento (Web Vitals y API)', () => {
  test('Web Vitals de la carga de /login', async ({ page }, testInfo) => {
    await page.goto('/login', { waitUntil: 'load' })
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible()
    const vitals = await webVitals(page)
    await adjuntarJson(testInfo, `web-vitals-login-${testInfo.project.name}.json`, vitals)
    expect(vitals.ttfb_ms).not.toBeNull()
    expect(vitals.fcp_ms ?? 0).toBeLessThan(1800)
    if (vitals.lcp_ms !== null) expect(vitals.lcp_ms).toBeLessThan(2500)
  })

  test('tiempo hasta el contenido de las pantallas del MVP', async ({ page }, testInfo) => {
    const tiempos: Record<string, number> = {}
    const medir = async (nombre: string, accion: () => Promise<unknown>, listo: () => Promise<unknown>) => {
      const inicio = Date.now()
      await accion()
      await listo()
      tiempos[nombre] = Date.now() - inicio
    }
    await page.goto('/login')
    await medir('login_hasta_inicio', () => login(page, USERS.operador, password('OPERADOR')),
      () => expect(page.getByRole('link', { name: /rutas y alertas/i }).first()).toBeVisible())
    await medir('rutas_y_alertas', () => page.getByRole('link', { name: /rutas y alertas/i }).first().click(),
      () => expect(page.locator('#route-date')).toBeVisible())
    await page.getByRole('link', { name: 'Inicio' }).first().click()
    await medir('dashboard_sostenibilidad', () => page.getByRole('link', { name: /indicadores de sostenibilidad/i }).first().click(),
      () => expect(page.getByRole('button', { name: /consultar periodo/i })).toBeVisible())
    await adjuntarJson(testInfo, `tiempo-hasta-contenido-${testInfo.project.name}.json`, tiempos)
    for (const ms of Object.values(tiempos)) expect(ms).toBeLessThan(5000)
  })

  test('tiempos de respuesta de la API (20 llamadas por endpoint, p95 < 500 ms)', async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'La API se mide una sola vez; no depende del navegador.')
    await apiLogin(request, USERS.operador, password('OPERADOR'))
    const plan = leerPlan()
    const hoy = hoyLima()
    const endpoints: Record<string, string> = {
      'GET /health': `${API_URL}/health`,
      'GET /optimizaciones?fecha_operacion': `${API_URL}/optimizaciones?fecha_operacion=${hoy}`,
      'GET /optimizaciones/{id}': `${API_URL}/optimizaciones/${plan.optimizacion_id}`,
      'GET /indicadores/sostenibilidad': `${API_URL}/indicadores/sostenibilidad?desde=${hoy}&hasta=${hoy}`,
      'GET /incidencias': `${API_URL}/incidencias`,
      'GET /vehiculos': `${API_URL}/vehiculos`,
    }
    const resultado: Record<string, { p50_ms: number, p95_ms: number, max_ms: number, estado: number }> = {}
    for (const [nombre, url] of Object.entries(endpoints)) {
      const muestras: number[] = []
      let estado = 0
      for (let i = 0; i < 20; i++) {
        const inicio = performance.now()
        const respuesta = await request.get(url)
        muestras.push(performance.now() - inicio)
        estado = respuesta.status()
      }
      resultado[nombre] = {
        p50_ms: Math.round(percentil(muestras, 50)),
        p95_ms: Math.round(percentil(muestras, 95)),
        max_ms: Math.round(Math.max(...muestras)),
        estado,
      }
    }
    await adjuntarJson(testInfo, 'tiempos-api.json', resultado)
    for (const [nombre, medida] of Object.entries(resultado)) {
      expect(medida.estado, nombre).toBe(200)
      expect(medida.p95_ms, nombre).toBeLessThan(500)
    }
  })
})
