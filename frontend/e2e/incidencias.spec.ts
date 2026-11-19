import { expect, test } from '@playwright/test'
import { USERS, login, nuevoContextoConductor, password } from './support'

test.describe('Incidencias del conductor y validación del Operador (US-012, RF-007)', () => {
  test('el Conductor reporta desde el móvil y el Operador la valida', async ({ browser, page }, testInfo) => {
    const marca = `E2E ${testInfo.project.name} ${Date.now()}`
    const movil = await nuevoContextoConductor(browser)
    const conductor = await movil.newPage()
    try {
      await login(conductor, USERS.conductor, password('CONDUCTOR'))
      await conductor.getByRole('link', { name: /reportar incidencia/i }).first().click()
      await conductor.locator('#tipo').selectOption({ label: 'Tráfico' })
      await conductor.getByLabel(/Media/).check()
      await conductor.getByRole('button', { name: /usar mi ubicación/i }).click()
      await conductor.locator('textarea').fill(`Congestión en avenida principal (${marca}).`)
      await conductor.getByRole('button', { name: 'Enviar incidencia' }).click()
      await expect(conductor.getByText(/Incidencia registrada · pendiente de validación/)).toBeVisible({ timeout: 15_000 })
    } finally {
      await movil.close()
    }

    await login(page, USERS.operador, password('OPERADOR'))
    await page.getByRole('link', { name: /incidencias pendientes/i }).first().click()
    const fila = page.locator('tr', { hasText: marca }).first()
    await expect(fila).toBeVisible()
    await fila.getByRole('button', { name: /Validar/ }).click()
    const confirmar = page.getByRole('button', { name: /confirmar/i })
    if (await confirmar.count()) await confirmar.first().click()
    await expect(page.getByText(/validad/i).first()).toBeVisible()
  })
})
