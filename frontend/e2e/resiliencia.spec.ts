import { expect, test } from '@playwright/test'
import { API_URL, USERS, adjuntarJson, hoyLima, login, nuevoContextoConductor, password } from './support'

test.describe('Disponibilidad y resiliencia', () => {
  test('códigos HTTP de la API: 200, 401, 404 y 422', async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'La API se verifica una sola vez.')
    const salud = await request.get(`${API_URL}/health`)
    const sinSesion = await request.get(`${API_URL}/optimizaciones?fecha_operacion=${hoyLima()}`)
    const inexistente = await request.get(`${API_URL}/no-existe`)
    const invalido = await request.post(`${API_URL}/login`, { data: { email: 'no-es-correo' } })
    const codigos = {
      'GET /health': salud.status(),
      'GET /optimizaciones sin sesión': sinSesion.status(),
      'GET /no-existe': inexistente.status(),
      'POST /login con cuerpo inválido': invalido.status(),
    }
    await adjuntarJson(testInfo, 'codigos-http.json', codigos)
    expect(salud.status()).toBe(200)
    expect(await salud.json()).toEqual({ status: 'ok' })
    expect(sinSesion.status()).toBe(401)
    expect(inexistente.status()).toBe(404)
    expect(invalido.status()).toBe(422)
  })

  test('si la API no responde, la pantalla de rutas lo informa y permite reintentar', async ({ page }) => {
    await login(page, USERS.operador, password('OPERADOR'))
    await page.route(/\/optimizaciones\?/, (route) => route.abort('failed'))
    await page.getByRole('link', { name: /rutas y alertas/i }).first().click()
    await page.locator('#route-date').fill(hoyLima())
    await page.getByRole('button', { name: /actualizar optimizaciones/i }).click()
    await expect(page.getByText('No se pudo consultar la fecha')).toBeVisible()
    await page.unroute(/\/optimizaciones\?/)
    await page.getByRole('button', { name: /actualizar optimizaciones/i }).click()
    await expect(page.getByRole('button', { name: /^Ruta / }).first()).toBeVisible()
  })

  test('un error 500 del servidor no rompe la pantalla', async ({ page }) => {
    await login(page, USERS.operador, password('OPERADOR'))
    await page.route(/\/optimizaciones\?/, (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"error"}' }))
    await page.getByRole('link', { name: /rutas y alertas/i }).first().click()
    await page.locator('#route-date').fill(hoyLima())
    await page.getByRole('button', { name: /actualizar optimizaciones/i }).click()
    await expect(page.getByText('No se pudo consultar la fecha')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Inicio' }).first()).toBeVisible()
  })

  test('sin conexión, la incidencia del conductor queda guardada para enviarse después', async ({ browser }) => {
    const movil = await nuevoContextoConductor(browser)
    const conductor = await movil.newPage()
    try {
      await login(conductor, USERS.conductor, password('CONDUCTOR'))
      await conductor.getByRole('link', { name: /reportar incidencia/i }).first().click()
      await movil.setOffline(true)
      await conductor.locator('#tipo').selectOption({ label: 'Tráfico' })
      await conductor.getByLabel(/Baja/).check()
      await conductor.getByRole('button', { name: /usar mi ubicación/i }).click()
      await conductor.locator('textarea').fill('Prueba de resiliencia sin conexión.')
      await conductor.getByRole('button', { name: 'Enviar incidencia' }).click()
      await expect(conductor.getByText(/Pendiente de envío/).first()).toBeVisible()
    } finally {
      await movil.setOffline(false)
      await movil.close()
    }
  })
})
