import { defineConfig, devices } from '@playwright/test'

/**
 * ECL-124 · Suite E2E del MVP (Inspección 5, Sprint 4).
 *
 * La app y la API se levantan fuera de Playwright (localmente o en tests.yml):
 * - E2E_BASE_URL: build de producción servido con `vite preview` (por defecto :4173).
 * - E2E_API_URL: API FastAPI (por defecto :8000).
 * La base de datos debe estar sembrada con `seed_demo_mvp --fecha <hoy en Lima>`.
 * Las contraseñas llegan por variables de entorno (SEED_DEMO_PASSWORD_<ROL>), nunca en el código.
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  outputDir: './test-results',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  // The three browsers share one seeded database, so the flows run one at a time.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/resultados.json' }],
    ['junit', { outputFile: 'playwright-report/junit.xml' }],
  ],
  use: {
    baseURL: BASE_URL,
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
