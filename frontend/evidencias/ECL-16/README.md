# ECL-16 (US-010) — Evidencias del reporte de sostenibilidad en PDF

[← Volver al README principal](../../../README.md)

Corrida local del 25/11/2026 con el mismo procedimiento del job E2E de
`tests.yml`: base `*_demo` nueva, `seed_demo_mvp` con la fecha de hoy en Lima,
API con `uvicorn`, build de producción servido con `vite preview` y Playwright
1.63.0 en Chromium. Contraseñas aleatorias por corrida, leídas de variables de
entorno y no guardadas. Datos sintéticos (placas `MVP-*`, no de DistriRápido).

| Archivo | Qué muestra |
|---|---|
| [`US-010-dashboard-descargado.png`](US-010-dashboard-descargado.png) | Analista en «Indicadores de sostenibilidad»: botón «Descargar reporte PDF» y el aviso «Reporte descargado» con el nombre del archivo |
| [`reporte-sostenibilidad-2026-11-01-a-2026-11-25.pdf`](reporte-sostenibilidad-2026-11-01-a-2026-11-25.pdf) | El PDF descargado (escenario 1 de la BDD): fecha de generación, periodo aplicado como filtro, versión de parámetros, indicadores con su referencia secuencial, cumplimiento de las metas del Acta y una fila por ruta cerrada |
| [`US-010-periodo-sin-datos.png`](US-010-periodo-sin-datos.png) | Escenario 2 de la BDD: un periodo sin rutas cerradas deshabilita el botón e informa «No existe información suficiente para generar el reporte de este periodo» |

Resultados de la corrida:

- Suite E2E en Chromium: **14 de 14** pruebas pasan. El flujo principal
  (`e2e/flujo-rutas.spec.ts`) ahora cierra una ruta, descarga el PDF desde el
  dashboard y verifica que empieza con `%PDF-1.4` y contiene la placa de la
  ruta cerrada. Firefox y WebKit corren en el CI.
- El PDF de la corrida muestra «No cumple» en la meta de distancia: la única
  ruta cerrada es una ruta corta de 3 paradas que ahorra 0,79 % frente a la
  secuencial. El reporte no redondea ni oculta un resultado bajo la meta.

[← Volver al README principal](../../../README.md)
