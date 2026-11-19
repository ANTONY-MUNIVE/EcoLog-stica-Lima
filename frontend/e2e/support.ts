import { expect, type APIRequestContext, type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test'

import { readFileSync } from 'node:fs'

export const API_URL = process.env.E2E_API_URL ?? 'http://127.0.0.1:8000'

export const USERS = {
  operador: 'operador.demo@ecologistica.example',
  conductor: 'conductor.demo@ecologistica.example',
} as const

export function password(rol: 'OPERADOR' | 'CONDUCTOR'): string {
  const value = process.env[`SEED_DEMO_PASSWORD_${rol}`]
  if (!value) throw new Error(`Falta SEED_DEMO_PASSWORD_${rol} en el entorno.`)
  return value
}

/** Operating date of the demo: today in Lima, as YYYY-MM-DD. */
export function hoyLima(now = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(now)
}

/** Lima wall-clock time for a datetime-local input, never in the future nor before the day starts. */
export function horaRealLima(eta: string, now = new Date()): string {
  const margin = new Date(now.getTime() - 2 * 60_000)
  const chosen = new Date(Math.min(new Date(eta).getTime(), margin.getTime()))
  const text = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(chosen).replace(' ', 'T')
  return text.startsWith(hoyLima(now)) ? text : `${hoyLima(now)}T00:01`
}

export async function login(page: Page, email: string, secret: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/correo/i).fill(email)
  await page.getByLabel(/contraseña/i).first().fill(secret)
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await page.waitForURL((url) => url.pathname === '/')
}

/** Client-side navigation: a full reload would drop the in-memory session. */
export async function irA(page: Page, path: string): Promise<void> {
  await page.evaluate((target) => {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}

export async function apiLogin(request: APIRequestContext, email: string, secret: string): Promise<void> {
  const response = await request.post(`${API_URL}/login`, { data: { email, password: secret } })
  expect(response.status(), 'login de la API').toBe(200)
}

export async function nuevoContextoConductor(browser: Browser): Promise<BrowserContext> {
  // Mobile-sized viewport without isMobile, which Firefox does not support.
  return browser.newContext({
    viewport: { width: 412, height: 880 },
    geolocation: { latitude: -12.0035, longitude: -76.991 },
    permissions: ['geolocation'],
    locale: 'es-PE',
    timezoneId: 'America/Lima',
  })
}

export async function adjuntarJson(testInfo: TestInfo, name: string, data: unknown): Promise<void> {
  await testInfo.attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' })
}

export type Parada = { secuencia: number, eta: string }
export type Ruta = { ruta_id: string, vehiculo: { placa: string }, paradas: Parada[] }
export type DetalleOptimizacion = { optimizacion_id: string, rutas: Ruta[], no_asignados?: unknown[] }
export type ListaOptimizaciones = { items?: Array<{ optimizacion_id: string, estado: string }> }
export type Plan = { fecha: string, optimizacion_id: string, rutas: Array<{ ruta_id: string, placa: string }> }

export function leerPlan(): Plan {
  return JSON.parse(readFileSync('playwright-report/plan-e2e.json', 'utf8')) as Plan
}
