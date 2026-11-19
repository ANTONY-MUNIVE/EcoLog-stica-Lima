import { expect, test } from '@playwright/test'
import { USERS, irA, login, password } from './support'

test.describe('Autenticación y permisos por rol (RF-001)', () => {
  test('el Operador inicia sesión y ve su menú', async ({ page }) => {
    await login(page, USERS.operador, password('OPERADOR'))
    await expect(page.getByRole('link', { name: /rutas y alertas/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /indicadores de sostenibilidad/i }).first()).toBeVisible()
  })

  test('una contraseña incorrecta muestra el error sin revelar cuál dato falló', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/correo/i).fill(USERS.operador)
    await page.getByLabel(/contraseña/i).first().fill('contraseña-incorrecta-e2e')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await expect(page.getByText('Credenciales inválidas')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('validación del formulario: campos vacíos', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /iniciar sesión/i }).click()
    await expect(page.getByText('El correo electrónico es obligatorio.')).toBeVisible()
    await expect(page.getByText('La contraseña es obligatoria.')).toBeVisible()
  })

  test('el Conductor no accede a pantallas de Operación', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 880 })
    await login(page, USERS.conductor, password('CONDUCTOR'))
    await irA(page, '/operacion/rutas')
    await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible()
  })
})
