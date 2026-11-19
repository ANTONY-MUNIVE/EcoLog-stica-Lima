# Revisión del sprint

[← Volver al README principal](../../../README.md)

**Nombre del Proyecto:** EcoLogística Lima

**Líder del Proyecto:** Julio Armando Naupari Camarena

## Historias de Usuario completadas en este Sprint

Sprint 4 «Rutas y Cierre MVP» (sprint 39 de Jira, del 04/11/2026 al
20/11/2026). El objetivo fue entregar el MVP: generar rutas optimizadas
sostenibles, verlas en el mapa y consultar el dashboard de sostenibilidad. La
segunda parte del sprint, después de la Inspección 4 del 13/11, agregó la suite
E2E con Playwright, el despliegue continuo en producción y la evaluación de
usabilidad.

Estado en Jira al 19/11/2026. Los enlaces de PR van al repositorio
`ANTONY-MUNIVE/EcoLog-stica-Lima`; los números de PR anteriores a la
transferencia del 19/11 se conservan.

### Historias de usuario

| Historia | Jira | Responsable | Criterio de aceptación | Resultado | Commits / PR |
|---|---|---|---|---|---|
| **US-006** Generar rutas optimizadas | [ECL-12](https://continental-team-il84x39k.atlassian.net/browse/ECL-12) (13 SP) | Antony Munive | Plan VRPTW que respeta capacidad, ventanas, jornada y descansos; pedidos no asignados con motivo; ≤ 45 s para 150 pedidos y 15 vehículos (RNF-001) | `COMPLETADA` con 10 rutas y 2 pedidos inviables con motivo. P95 de **20,18 s** en 30 corridas | [#88](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/88), [#89](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/89), [#108](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/108), [#109](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/109), [#111](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/111), [#113](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/113) |
| **US-008** Ver rutas y alertas en el mapa | [ECL-14](https://continental-team-il84x39k.atlassian.net/browse/ECL-14) (8 SP) | José Delgadillo | Rutas en mapa con paradas, ETA y alertas; alternativa accesible; funciona sin tráfico en vivo | Mapa Leaflet con OpenStreetMap y lista accesible en el mismo orden; ETA rotuladas como de planificación | [#104](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/104) |
| **US-009** Dashboard de sostenibilidad | [ECL-15](https://continental-team-il84x39k.atlassian.net/browse/ECL-15) (5 SP) | Giancarlo Soto | Indicadores por periodo sobre rutas cerradas: distancia, CO₂, combustible, costo, ahorro y cumplimiento de ventanas | El Operador registra paradas y cierra la ruta; el dashboard muestra las rutas cerradas. Cierre de `DEMO-004` con **34,01 %** de ahorro de distancia | [#116](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/116), [#117](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/117), [#119](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/119) |

La BDD de las tres historias se definió en
[ECL-97](https://continental-team-il84x39k.atlassian.net/browse/ECL-97)
([#91](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/91)) y la
ratificó Julio ([#100](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/100)).

### Historias técnicas y tareas de la Inspección 5

| Elemento | Jira | Responsable | Resultado | Commits / PR |
|---|---|---|---|---|
| Suite E2E con Playwright en Chromium, Firefox y WebKit, y workflow `tests.yml` | [ECL-124](https://continental-team-il84x39k.atlassian.net/browse/ECL-124) (3 SP) · Finalizada | Antony Munive | 14 pruebas: autenticación, flujo de rutas, incidencias, Web Vitals, tiempos de API y resiliencia. Los 3 navegadores en verde en CI | [#153](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/153): [`e21dc49`](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/commit/e21dc49), [`5a9da5a`](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/commit/5a9da5a), [`f75d8ea`](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/commit/f75d8ea), [`d0c5ab2`](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/commit/d0c5ab2) |
| Despliegue continuo en Render con `deploy-production.yml` | [ECL-125](https://continental-team-il84x39k.atlassian.net/browse/ECL-125) (3 SP) | Antony Munive | Blueprint `render.yaml` (Postgres 16, API y web). Servicio web «Live» en Render sobre `0ef36ec` ([captura](<evidencias/ECL-125/render-web-live-0ef36ec.png>)) | [#154](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/154) |
| Evaluación de usabilidad SUS | [ECL-126](https://continental-team-il84x39k.atlassian.net/browse/ECL-126) (2 SP) | Antony Munive | [04 Usabilidad](<04 Usabilidad V_1_0_0.md>) | Este PR |
| Documentos de la Inspección 5 y README con badges | [ECL-127](https://continental-team-il84x39k.atlassian.net/browse/ECL-127) (2 SP) | Antony Munive | Los 4 documentos de esta carpeta, índice y badges en el README | Este PR |
| EN-003 Benchmark de RNF-001 | [ECL-21](https://continental-team-il84x39k.atlassian.net/browse/ECL-21) (8 SP) | Antony Munive | P95 de 20,18 s ≤ 45 s en 30 corridas | [#113](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/113) |
| EN-008 Parámetros versionados | [ECL-26](https://continental-team-il84x39k.atlassian.net/browse/ECL-26) (5 SP) | Antony Munive | Versiones sin edición ni borrado; instantánea por optimización | [#110](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/110) |
| Green IT: ocho optimizaciones medidas antes y después | [ECL-108](https://continental-team-il84x39k.atlassian.net/browse/ECL-108) a [ECL-118](https://continental-team-il84x39k.atlassian.net/browse/ECL-118) (20 SP) | José, Antony, Giancarlo, Julio y Frank | Línea base, optimizaciones, Lighthouse CI y modelo SWDM v4 | [#90](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/90), [#93](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/93)–[#97](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/97), [#114](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/114), [#121](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/121) |

## Demostración del trabajo completado

«DATO-DEMO»

## Pendientes

«DATO-PENDIENTES»

[← Volver al README principal](../../../README.md)
