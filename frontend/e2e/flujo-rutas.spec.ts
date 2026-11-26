import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { API_URL, USERS, horaRealLima, leerPlan, login, password, type DetalleOptimizacion } from './support'

const INDICE: Record<string, number> = { chromium: 0, firefox: 1, webkit: 2 }

test.describe('Flujo principal: optimizar, ver el mapa, registrar y cerrar (US-006, US-008, US-009)', () => {
  test('el Operador cierra una ruta y la ve en el dashboard', async ({ page }, testInfo) => {
    const plan = leerPlan()
    const ruta = plan.rutas[INDICE[testInfo.project.name] ?? 0]
    test.skip(!ruta, 'No hay una ruta corta libre para este navegador.')

    await login(page, USERS.operador, password('OPERADOR'))
    await page.getByRole('link', { name: /rutas y alertas/i }).first().click()
    await page.locator('#route-date').fill(plan.fecha)
    await page.getByRole('button', { name: /actualizar optimizaciones/i }).click()
    await page.getByRole('button', { name: new RegExp(`^Ruta ${ruta.placa}`) }).first().click()

    // US-008: map plus its accessible text alternative.
    await expect(page.locator('.leaflet-container')).toBeVisible()
    await expect(page.getByRole('link', { name: /lista accesible/i }).first()).toBeVisible()

    // Stop times come from the plan itself, so the test works at any hour.
    const detalle = await (await page.request.get(`${API_URL}/optimizaciones/${plan.optimizacion_id}`)).json() as DetalleOptimizacion
    const paradas = detalle.rutas.find((r) => r.ruta_id === ruta.ruta_id)?.paradas ?? []
    for (const parada of paradas) {
      const n = parada.secuencia
      await page.getByRole('button', { name: `Registrar resultado de parada ${n}`, exact: true }).click()
      await page.getByLabel(`Hora real de parada ${n} (Lima)`).fill(horaRealLima(parada.eta))
      await page.getByRole('button', { name: `Guardar resultado de parada ${n}`, exact: true }).click()
      await expect(page.getByText(new RegExp(`Resultado de parada ${n} registrado`))).toBeVisible()
    }

    await page.getByRole('button', { name: 'Cerrar ruta' }).click()
    await expect(page.getByRole('button', { name: 'Cancelar cierre' })).toBeFocused()
    await page.getByRole('button', { name: 'Confirmar cierre' }).click()
    await expect(page.getByText(/Ruta cerrada el/)).toBeVisible({ timeout: 15_000 })

    await page.getByRole('link', { name: 'Inicio' }).first().click()
    await page.getByRole('link', { name: /indicadores de sostenibilidad/i }).first().click()
    await expect(page.getByText(/Rutas cerradas/).first()).toBeVisible()

    // US-010: the same period downloads as a PDF with the closed route in it.
    const [descarga] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Descargar reporte PDF' }).click(),
    ])
    expect(descarga.suggestedFilename()).toMatch(/^reporte-sostenibilidad-\d{4}-\d{2}-\d{2}-a-\d{4}-\d{2}-\d{2}\.pdf$/)
    const archivo = await descarga.path()
    const pdf = await readFile(archivo)
    expect(pdf.subarray(0, 8).toString('latin1')).toBe('%PDF-1.4')
    expect(pdf.toString('latin1')).toContain(`(${ruta.placa})`)
    await expect(page.getByText(/Reporte descargado/)).toBeVisible()
    await testInfo.attach('reporte-sostenibilidad.pdf', { path: archivo, contentType: 'application/pdf' })
  })

  test('validación: no se acepta una hora real futura', async ({ page }) => {
    const plan = leerPlan()
    // Index 3 is never closed by a browser project (they use 0, 1 and 2).
    const ruta = plan.rutas[3]
    test.skip(!ruta, 'No hay una cuarta ruta libre para esta validación.')
    await login(page, USERS.operador, password('OPERADOR'))
    await page.getByRole('link', { name: /rutas y alertas/i }).first().click()
    await page.locator('#route-date').fill(plan.fecha)
    await page.getByRole('button', { name: /actualizar optimizaciones/i }).click()
    await page.getByRole('button', { name: new RegExp(`^Ruta ${ruta.placa}`) }).first().click()
    await page.getByRole('button', { name: 'Registrar resultado de parada 1', exact: true }).click()
    await page.getByLabel('Hora real de parada 1 (Lima)').fill(`${plan.fecha}T23:59`)
    await page.getByRole('button', { name: 'Guardar resultado de parada 1', exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: /futur/i }).first()).toBeVisible()
  })
})
