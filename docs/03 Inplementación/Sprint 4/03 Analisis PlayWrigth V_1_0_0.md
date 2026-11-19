# Análisis de calidad con Playwright

[← Volver al README principal](../../../README.md)

**Nombre del Proyecto:** EcoLogística Lima

**Líder del Proyecto:** Julio Armando Naupari Camarena

| Metadato | Valor |
|---|---|
| Ticket | [ECL-124 — Suite E2E con Playwright y workflow `tests.yml`](https://continental-team-il84x39k.atlassian.net/browse/ECL-124) |
| Integración | PR [#153](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/153) (suite y `tests.yml`) y PR [#154](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/154) (despliegue en Render), en `main` el 19/11/2026 |
| Versión | 1.0.0 |
| Fecha | 19/11/2026 (America/Lima) |
| Redacción | Antony Munive Rios (@ANTONY-MUNIVE), con apoyo de IA (Claude) |
| Herramienta | `@playwright/test` 1.63.0 |
| Entorno desplegado | <https://ecologistica-web-9tkq.onrender.com> (web) y <https://ecologistica-api-3mnp.onrender.com> (API), en Render |

**Resultado en una línea.** En el CI de `main` (run
[#9 de Tests](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/actions/runs/44571097407),
commit `0ef36ec`, 19/11/2026) la suite pasó en los tres navegadores: **14/14 en
Chromium, 12/12 en Firefox y 12/12 en WebKit**, sin fallos ni reintentos. FCP de
`/login` entre 80 y 160 ms, p95 de la API ≤ 22 ms y producción con **30/30
respuestas 200** y TTFB p95 de 165 ms.

## 1. Configuración del entorno de pruebas

### 1.1 Arquitectura de carpetas

La suite vive junto al frontend, separada de las pruebas unitarias de Vitest:

```text
frontend/
├── playwright.config.ts      # proyectos, reportes y entorno
├── tsconfig.e2e.json         # tipos de Node y DOM solo para la suite E2E
├── vite.config.ts            # Vitest excluye e2e/**
└── e2e/
    ├── global-setup.ts       # login por API y una optimización del día (una sola vez)
    ├── support.ts            # usuarios demo, login, contexto móvil, helpers y tipos
    ├── autenticacion.spec.ts # RF-001: login, errores, validaciones y permisos por rol
    ├── flujo-rutas.spec.ts   # US-006, US-008, US-009: ruta, mapa, paradas, cierre y dashboard
    ├── incidencias.spec.ts   # US-012, RF-007: reporte del conductor y validación del operador
    ├── rendimiento.spec.ts   # Web Vitals, tiempo hasta el contenido y tiempos de la API
    └── resiliencia.spec.ts   # códigos HTTP, fallas de red, error 500 y modo sin conexión
```

`global-setup.ts` inicia sesión como Operador por la API y busca una
optimización `COMPLETADA` de la fecha de hoy en Lima. Si no existe, la crea con
`POST /optimizaciones` (150 pedidos y 15 vehículos sembrados por
`seed_demo_mvp`). Guarda en `playwright-report/plan-e2e.json` las 4 rutas más
cortas para que cada navegador cierre una ruta distinta.

### 1.2 Navegadores evaluados

| Proyecto | Dispositivo de Playwright | Motor | Uso |
|---|---|---|---|
| `chromium` | Desktop Chrome (1280 × 720) | Blink | Suite completa: 14 pruebas |
| `firefox` | Desktop Firefox (1280 × 720) | Gecko | 12 pruebas de interfaz; las 2 de la API se omiten por diseño |
| `webkit` | Desktop Safari (1280 × 720) | WebKit | 12 pruebas de interfaz; las 2 de la API se omiten por diseño |

Las pruebas «tiempos de respuesta de la API» y «códigos HTTP» no dependen del
navegador. Se ejecutan una sola vez, en Chromium, con
`test.skip(testInfo.project.name !== 'chromium')`. El flujo del conductor usa
un contexto de 412 × 880 px con geolocalización simulada en Lima (`-12.0035,
-76.991`).

### 1.3 `playwright.config.ts`

```ts
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
    baseURL: BASE_URL,            // E2E_BASE_URL o http://127.0.0.1:4173
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
```

| Decisión | Motivo |
|---|---|
| `workers: 1` y `fullyParallel: false` | Las pruebas escriben en la misma base sembrada (registran paradas y cierran rutas). En paralelo se pisarían. |
| `retries: 1` solo en CI | Absorbe una falla transitoria del runner sin ocultar fallas reales: un reintento fallido deja el job en rojo. |
| Cuatro reportes | `list` para el log, `html` para revisar a mano, `json` para extraer métricas y `junit` para herramientas de CI. |
| `trace`, captura y video solo al fallar | Evidencia para depurar sin inflar el artifact cuando todo pasa. |
| `locale` y `timezoneId` de Lima | Las horas de las paradas y los mensajes se validan como los ve el usuario real. |

### 1.4 Datos y credenciales

- La app corre como en producción: build de Vite servido con `vite preview`
  (puerto 4173) y la API FastAPI con uvicorn (puerto 8000).
- La base es PostgreSQL 16 con PostGIS, migrada a `head` y sembrada con
  `seed_demo_mvp --fecha <hoy en Lima>`.
- Las contraseñas de los usuarios demo **no están en el código**. `support.ts`
  las lee de `SEED_DEMO_PASSWORD_<ROL>`. En CI se generan al azar en cada
  corrida y se enmascaran en el log con `::add-mask::`.

### 1.5 Ejecución en CI (`tests.yml`)

El job **Tests / E2E Playwright** corre en `ubuntu-24.04` como matriz
`[chromium, firefox, webkit]` con `fail-fast: false`, para que un navegador no
oculte el resultado de los otros. Cada job:

1. Levanta un servicio `postgis/postgis:16-3.5` limpio.
2. Instala el backend, migra y siembra la demo del día.
3. Arranca la API, compila y sirve el frontend.
4. Instala solo su navegador (`npx playwright install --with-deps <browser>`).
5. Ejecuta `npx playwright test --project=<browser>`.
6. Sube como artifact `playwright-report-<browser>-<run_id>` el reporte HTML,
   `resultados.json`, `junit.xml`, `test-results/` y `api.log` (30 días).

Se dispara en `push` y `pull_request` hacia `main` y `develop`.

## 2. Pruebas End-to-End (E2E)

### 2.1 Casos de prueba críticos

| Archivo | Caso | Requisito | Qué verifica |
|---|---|---|---|
| `autenticacion.spec.ts` | El Operador inicia sesión y ve su menú | RF-001 | Login real y menú de Operación |
| | Contraseña incorrecta | RF-001 | Muestra «Credenciales inválidas» sin decir qué dato falló |
| | Campos vacíos | RF-001 | Mensajes de validación del formulario |
| | El Conductor no accede a Operación | RF-001 | «Acceso denegado» en `/operacion/rutas` |
| `flujo-rutas.spec.ts` | El Operador cierra una ruta y la ve en el dashboard | US-006, US-008, US-009 | Ruta optimizada, mapa Leaflet y lista accesible, registro de cada parada, cierre con foco en «Cancelar cierre» y «Rutas cerradas» en el dashboard |
| | No se acepta una hora real futura | US-008 | Alerta de validación con una hora de mañana |
| `incidencias.spec.ts` | El Conductor reporta desde el móvil y el Operador la valida | US-012, RF-007 | Reporte con ubicación, «pendiente de validación» y validación en la bandeja del Operador |
| `rendimiento.spec.ts` | Web Vitals de `/login` | RNF de rendimiento | TTFB, FCP < 1 800 ms, LCP < 2 500 ms |
| | Tiempo hasta el contenido | RNF de rendimiento | Login → inicio, rutas y dashboard en < 5 000 ms |
| | Tiempos de la API | RNF de rendimiento | 20 llamadas por endpoint, p95 < 500 ms |
| `resiliencia.spec.ts` | Códigos HTTP | Disponibilidad | 200, 401, 404 y 422 en los casos esperados |
| | La API no responde | Resiliencia | Mensaje «No se pudo consultar la fecha» y reintento exitoso |
| | Error 500 del servidor | Resiliencia | La pantalla informa el error y la navegación sigue funcionando |
| | Sin conexión | Resiliencia, RF-007 | La incidencia queda «Pendiente de envío» para enviarse después |

### 2.2 Código fuente relevante

**Registro y cierre de una ruta** (`flujo-rutas.spec.ts`). Las horas reales
salen del propio plan, así que la prueba funciona a cualquier hora del día:

```ts
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
```

**Inyección de fallas de red** (`resiliencia.spec.ts`):

```ts
await page.route(/\/optimizaciones\?/, (route) => route.abort('failed'))
await page.getByRole('button', { name: /actualizar optimizaciones/i }).click()
await expect(page.getByText('No se pudo consultar la fecha')).toBeVisible()
await page.unroute(/\/optimizaciones\?/)
await page.getByRole('button', { name: /actualizar optimizaciones/i }).click()
await expect(page.getByRole('button', { name: /^Ruta / }).first()).toBeVisible()
```

Los selectores usan roles y etiquetas accesibles (`getByRole`, `getByLabel`),
no clases CSS. Si un botón pierde su nombre accesible, la prueba falla.

### 2.3 Resultados de ejecución

**Ejecución oficial en CI.** Run
[#9 de Tests](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/actions/runs/44571097407)
sobre `main` (`0ef36ec`, merge del PR #154), 19/11/2026, `ubuntu-24.04`:

| Navegador | Pruebas | Pasan | Fallan | Omitidas por diseño | Reintentos | Tasa de éxito | Duración |
|---|---|---|---|---|---|---|---|
| Chromium | 14 | 14 | 0 | 0 | 0 | **100 %** | 38,0 s |
| Firefox | 14 | 12 | 0 | 2 (API) | 0 | **100 %** de las ejecutadas | 37,9 s |
| WebKit | 14 | 12 | 0 | 2 (API) | 0 | **100 %** de las ejecutadas | 62,7 s |
| **Total** | **42** | **38** | **0** | **4** | **0** | **100 %** | |

Los 7 casos de flujos críticos (autenticación, ruta, incidencias) pasan en los
tres navegadores. En el mismo run pasaron también las 1 330 pruebas unitarias y
350 de integración del backend y las 1 018 del frontend (job «Tests / Backend
unit and integration» y «Tests / Frontend unit»).

WebKit es el más lento: 10,2 s en el primer login y 13,9 s en el flujo de cierre,
contra 0,8 y 2,8 s en Chromium. La diferencia viene del arranque del motor en el
runner de Linux, no de la app; las métricas de carga de la sección 3 son
similares en los tres.

![Run #9 de Tests en GitHub Actions: jobs en verde](<evidencias/ECL-124/ci-run-44571097407-tests-main.jpg>)

**Ejecución local de referencia (19/11/2026, 14:23, Chromium).** Sirve para
reproducir la suite fuera del CI. Base
`e2e_demo` recién migrada y sembrada, build de producción del frontend:

| Navegador | Pruebas | Pasan | Fallan | Omitidas | Tasa de éxito | Duración |
|---|---|---|---|---|---|---|
| Chromium | 14 | 14 | 0 | 0 | **100 %** | 40,0 s |

![Reporte HTML local: 14 de 14 en Chromium](<evidencias/ECL-124/local-chromium-01-resumen.png>)

Resultados en JSON: [local-chromium-resultados.json](<evidencias/ECL-124/local-chromium-resultados.json>).

## 3. Monitoreo de rendimiento

### 3.1 Método

`rendimiento.spec.ts` lee las métricas del navegador con la Performance API, sin
herramientas externas:

| Métrica | Fuente | Umbral de la prueba |
|---|---|---|
| TTFB | `PerformanceNavigationTiming.responseStart` | Registrada; debe existir |
| FCP | Entrada `first-contentful-paint` | < 1 800 ms («bueno» según Google) |
| LCP | `PerformanceObserver` de `largest-contentful-paint` | < 2 500 ms («bueno» según Google) |
| DOMContentLoaded y carga total | `domContentLoadedEventEnd` y `loadEventEnd` | Registradas |
| Tiempo hasta el contenido | Reloj de la prueba hasta ver el contenido de cada pantalla | < 5 000 ms |
| Tiempo de respuesta de la API | 20 llamadas por endpoint con sesión iniciada; p50, p95 y máximo | p95 < 500 ms |

Si un motor no expone `largest-contentful-paint`, la prueba reporta el LCP como
`null` («no soportado») y no como 0, para no falsear la comparación. En el
run #9 los tres motores lo reportaron.

### 3.2 Web Vitals de `/login`

Valores del CI (run #9, `vite preview` y API en el mismo runner) y de la
ejecución local de referencia:

| Métrica | CI Chromium | CI Firefox | CI WebKit | Local Chromium | Umbral |
|---|---|---|---|---|---|
| TTFB | 4 ms | 4 ms | 2 ms | 4 ms | — |
| FCP | 160 ms | 80 ms | 90 ms | 148 ms | < 1 800 ms |
| LCP | 160 ms | 80 ms | 90 ms | 148 ms | < 2 500 ms |
| DOMContentLoaded | 70 ms | 73 ms | 48 ms | 69 ms | — |
| Carga total | 70 ms | 102 ms | 76 ms | 69 ms | — |
| Bytes transferidos | 166 515 B | 166 815 B | 168 108 B | 166 515 B | — |

![Web Vitals adjuntas en el reporte HTML](<evidencias/ECL-124/local-chromium-03-web-vitals.png>)

### 3.3 Tiempo hasta el contenido

| Pantalla | CI Chromium | CI Firefox | CI WebKit | Local Chromium | Umbral |
|---|---|---|---|---|---|
| Login → inicio del Operador | 342 ms | 335 ms | 467 ms | 530 ms | < 5 000 ms |
| Rutas y alertas | 158 ms | 111 ms | 220 ms | 185 ms | < 5 000 ms |
| Dashboard de sostenibilidad | 89 ms | 99 ms | 203 ms | 150 ms | < 5 000 ms |

### 3.4 Tiempos de respuesta de la API

20 llamadas secuenciales por endpoint, con sesión de Operador, sobre la
optimización de 150 pedidos:

| Endpoint | CI p50 | CI p95 | CI máx. | Local p95 | HTTP | p95 < 500 ms |
|---|---|---|---|---|---|---|
| `GET /health` | 2 ms | 3 ms | 5 ms | 4 ms | 200 | ✅ |
| `GET /optimizaciones?fecha_operacion` | 13 ms | 14 ms | 14 ms | 16 ms | 200 | ✅ |
| `GET /optimizaciones/{id}` (detalle de 10 rutas) | 20 ms | 22 ms | 22 ms | 24 ms | 200 | ✅ |
| `GET /indicadores/sostenibilidad` | 12 ms | 13 ms | 14 ms | 13 ms | 200 | ✅ |
| `GET /incidencias` | 11 ms | 12 ms | 12 ms | 12 ms | 200 | ✅ |
| `GET /vehiculos` | 10 ms | 12 ms | 17 ms | 11 ms | 200 | ✅ |

La prueba se ejecuta una vez, en el job de Chromium.

![Tiempos de la API en el reporte HTML](<evidencias/ECL-124/local-chromium-02-tiempos-api.png>)

Estas cifras son de la API en la misma máquina, sin latencia de red. Miden el
costo del servidor y de la base de datos. El tiempo que ve un usuario desde
Lima incluye además la red hasta Render (sección 4.3).

**Producción.** El workflow `deploy-production.yml` mide la API desplegada
desde un runner de GitHub Actions contra Render (región Oregon): 30 llamadas
a `/api/health` a través del proxy de la web, cada 2 s
([CSV](<evidencias/ECL-125/deploy-smoke-44603066872-disponibilidad.csv>)):

| Métrica | Valor |
|---|---|
| TTFB mínimo | 103 ms |
| TTFB p50 | 141 ms |
| TTFB p95 | **165 ms** |
| TTFB máximo | 167 ms |
| Tiempo total máximo | 167 ms |

La optimización de 150 pedidos y 15 vehículos también se probó en producción el
19/11/2026: `POST /optimizaciones` respondió **201 `COMPLETADA` en 20,23 s** de
motor (21,0 s de extremo a extremo), con 12 rutas y 2 pedidos inviables a
propósito. Cumple RNF-001 (≤ 45 s) en el plan gratuito de Render.

## 4. Disponibilidad y resiliencia

### 4.1 Códigos de estado HTTP

| Petición | Esperado | Obtenido |
|---|---|---|
| `GET /health` | 200 y `{"status":"ok"}` | 200 y `{"status":"ok"}` |
| `GET /optimizaciones` sin sesión | 401 | 401 |
| `GET /no-existe` | 404 | 404 |
| `POST /login` con cuerpo inválido | 422 | 422 |

### 4.2 Manejo de errores de red

| Escenario | Cómo se provoca | Comportamiento verificado |
|---|---|---|
| La API no responde | `page.route(...).abort('failed')` sobre `/optimizaciones?` | Alerta «No se pudo consultar la fecha». Al quitar la falla, «Actualizar optimizaciones» recupera las rutas sin recargar. |
| Error 500 | `route.fulfill({ status: 500 })` | Misma alerta; el menú «Inicio» sigue disponible. La pantalla no queda en blanco. |
| Sin conexión | `context.setOffline(true)` en el contexto móvil del conductor | La incidencia queda «Pendiente de envío» en el dispositivo; el service worker sirve la pantalla precargada. |

![Prueba sin conexión en el reporte HTML](<evidencias/ECL-124/local-chromium-04-sin-conexion.png>)

### 4.3 Uptime en el entorno desplegado

| Verificación | Resultado |
|---|---|
| Workflow | [Deploy production](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/actions/workflows/deploy-production.yml), run manual del 19/11/2026 sobre `0ef36ec`, en verde (2 min 18 s) |
| Despliegue | API y web con estado `live` en Render antes del muestreo |
| Salud | `GET /api/health` → `{"status":"ok"}`; portada HTTP 200 |
| Disponibilidad en el muestreo | **30/30 respuestas 200 (100,00 %)**, una cada 2 s durante 1 minuto |
| Monitoreo continuo | Render revisa `healthCheckPath` (`/health` en la API y `/` en la web) para dar por bueno cada despliegue y vigilar el servicio en ejecución |

El muestreo cubre un minuto, no un mes: prueba que el despliegue queda operativo,
no un SLA. El plan gratuito de Render **suspende los servicios tras 15 minutos
sin tráfico** y la primera petición tarda unos 50 s en despertarlos. Ese
arranque en frío no aparece en el muestreo porque el workflow despliega justo
antes; sí lo ve un usuario que entra después de un rato sin uso.

![Summary del workflow Deploy production en verde](<evidencias/ECL-125/deploy-production-summary-verde.png>)

### 4.4 Evidencias de los reportes HTML

Los reportes HTML completos están como artifacts de cada corrida
(`playwright-report-<navegador>-<run_id>`, 30 días). Copias de este run:

| Evidencia | Archivo |
|---|---|
| CI · Chromium 14/14 | [ci-chromium-01-resumen.png](<evidencias/ECL-124/ci-chromium-01-resumen.png>) · [JSON](<evidencias/ECL-124/ci-chromium-resultados.json>) |
| CI · Firefox 12/12 + 2 omitidas | [ci-firefox-01-resumen.png](<evidencias/ECL-124/ci-firefox-01-resumen.png>) · [JSON](<evidencias/ECL-124/ci-firefox-resultados.json>) |
| CI · WebKit 12/12 + 2 omitidas | [ci-webkit-01-resumen.png](<evidencias/ECL-124/ci-webkit-01-resumen.png>) · [JSON](<evidencias/ECL-124/ci-webkit-resultados.json>) |
| CI · Tiempos de la API | [ci-chromium-02-tiempos-api.png](<evidencias/ECL-124/ci-chromium-02-tiempos-api.png>) |

Ejecución local de referencia:

| Evidencia | Archivo |
|---|---|
| Resumen local, Chromium, 14/14 | [local-chromium-01-resumen.png](<evidencias/ECL-124/local-chromium-01-resumen.png>) |
| Tiempos de la API | [local-chromium-02-tiempos-api.png](<evidencias/ECL-124/local-chromium-02-tiempos-api.png>) |
| Web Vitals | [local-chromium-03-web-vitals.png](<evidencias/ECL-124/local-chromium-03-web-vitals.png>) |
| Incidencia sin conexión | [local-chromium-04-sin-conexion.png](<evidencias/ECL-124/local-chromium-04-sin-conexion.png>) |

## 5. Hallazgos durante la construcción de la suite

| Hallazgo | Causa | Corrección |
|---|---|---|
| Las pruebas de fallas de red pasaban en Chromium y Firefox, pero no en WebKit | En WebKit, el service worker de la app respondía antes que `page.route()`, y la falla inyectada nunca llegaba a la pantalla | `serviceWorkers: 'block'` solo en el grupo «Inyección de fallas en la red» ([`f75d8ea`](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/commit/f75d8ea)) |
| Al bloquear el service worker en todo el archivo, la prueba sin conexión falló en Chromium | Sin service worker, la pantalla de incidencias no está precargada y no abre sin red: el modo sin conexión **depende** del service worker | El bloqueo quedó acotado a las 2 pruebas de inyección ([`d0c5ab2`](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/commit/d0c5ab2)) |
| La validación de hora futura chocaba con el flujo de WebKit | Las dos pruebas usaban la misma ruta, ya cerrada por el flujo | Cada navegador cierra su propia ruta (índices 0, 1 y 2) y la validación usa la 3 |
| El job E2E fallaba con «No module named setuptools» | El lock de producción no incluye `setuptools`, necesario para la instalación editable | El job instala `requirements-dev.lock` ([`5a9da5a`](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/commit/5a9da5a)) |
| En una base local reutilizada, el flujo principal no encontraba «Registrar resultado de parada 1» | Una corrida anterior ya había registrado y cerrado esas rutas | La suite asume una base sembrada desde cero, como en CI. En local se usa una base `*_demo` nueva por corrida. |

## 6. Cómo ejecutar la suite en local

```bash
# 1. Backend: base *_demo migrada y sembrada para hoy (contraseñas en variables de entorno)
cd backend
python -m alembic upgrade head
python -m scripts.seed_demo_mvp --fecha "$(TZ=America/Lima date +%F)"
python -m uvicorn app.main:create_app --factory --port 8000

# 2. Frontend: build de producción servido en :4173
cd frontend
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run build
npx vite preview --port 4173

# 3. Suite
npx playwright install chromium firefox webkit
npm run test:e2e              # los 3 navegadores
npx playwright show-report    # abre el reporte HTML
```

[← Volver al README principal](../../../README.md)
