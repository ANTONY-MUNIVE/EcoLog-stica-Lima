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
| Evaluación de usabilidad SUS | [ECL-126](https://continental-team-il84x39k.atlassian.net/browse/ECL-126) (2 SP) | Antony Munive | n = 5, SUS promedio **55,5** (grado D, por debajo de 68). Mejora del acceso al mapa aplicada en `86b4d17` ([04 Usabilidad](<04 Usabilidad V_1_0_0.md>)) | [#157](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/157) y [#158](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/158) |
| Documentos de la Inspección 5 y README con badges | [ECL-127](https://continental-team-il84x39k.atlassian.net/browse/ECL-127) (2 SP) | Antony Munive | Los 4 documentos de esta carpeta, índice y badges en el README | [#157](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/157) |
| EN-003 Benchmark de RNF-001 | [ECL-21](https://continental-team-il84x39k.atlassian.net/browse/ECL-21) (8 SP) | Antony Munive | P95 de 20,18 s ≤ 45 s en 30 corridas | [#113](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/113) |
| EN-008 Parámetros versionados | [ECL-26](https://continental-team-il84x39k.atlassian.net/browse/ECL-26) (5 SP) | Antony Munive | Versiones sin edición ni borrado; instantánea por optimización | [#110](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/110) |
| Green IT: ocho optimizaciones medidas antes y después | [ECL-108](https://continental-team-il84x39k.atlassian.net/browse/ECL-108) a [ECL-118](https://continental-team-il84x39k.atlassian.net/browse/ECL-118) (20 SP) | José, Antony, Giancarlo, Julio y Frank | Línea base, optimizaciones, Lighthouse CI y modelo SWDM v4 | [#90](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/90), [#93](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/93)–[#97](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/97), [#114](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/114), [#121](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/121) |

## Demostración del trabajo completado

### Demostración a los stakeholders del 13/11/2026 (Inspección 4)

| Campo | Registro |
|---|---|
| Quién la presentó | Julio Naupari, líder del proyecto |
| Equipo y navegador | PC del laboratorio de la universidad y laptop de Julio, con Google Chrome |
| Evaluador | Docente del curso Taller de Proyectos 2 |
| Resultado | 14/20 en la rúbrica de la Inspección 4 |
| Retroalimentación del docente | «Añade métricas de CO₂ antes y después de la implementación de los módulos de la aplicación. La comparación consolidada debe indicar las unidades utilizadas en cada indicador. No realizó la demostración de la automatización. Desarrolle solo los puntos solicitados en la rúbrica.» El docente no hizo preguntas durante la exposición. |

Guion y tiempos medidos de esa demostración:
[guía de la demo del Sprint 4](<../../03 Implementación/Sprint 04/guias/GUIA_DEMO_SPRINT4.md>).
Capturas del ensayo: [mapa](<../../03 Implementación/Sprint 04/evidencias/ECL-105/03-mapa-rutas.png>),
[ruta cerrada](<../../03 Implementación/Sprint 04/evidencias/ECL-105/05-ruta-cerrada.png>),
[dashboard](<../../03 Implementación/Sprint 04/evidencias/ECL-105/06-dashboard.png>) y
[validación de incidencia](<../../03 Implementación/Sprint 04/evidencias/ECL-105/10-validacion.png>).

### Respuesta a la retroalimentación

| Observación | Qué se hizo |
|---|---|
| No se demostró la automatización | La automatización ahora es demostrable de punta a punta: `ci.yml` (calidad), `tests.yml` (unitarias, integración y E2E en 3 navegadores con artifacts) y `deploy-production.yml` (despliegue en Render con smoke test). La demo de la Inspección 5 la ejecuta en vivo (ver abajo). |
| Desarrollar solo lo pedido | Los entregables de esta inspección son los 4 documentos de la rúbrica en esta carpeta, sin anexos adicionales. |
| Métricas de CO₂ por módulo con unidades | Pendiente (ver «Pendientes»). |

### Trabajo completado después del 13/11, verificado en producción

| Qué se demostró | Evidencia verificable |
|---|---|
| Suite E2E en Chromium, Firefox y WebKit en verde en el CI de `main` (14/14, 12/12 y 12/12) | [Run #9 de Tests](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/actions/runs/44571097407) · [03 Análisis Playwright](<03 Analisis PlayWrigth V_1_0_0.md>) · [captura del run](<evidencias/ECL-124/ci-run-44571097407-tests-main.jpg>) |
| Despliegue continuo: `Deploy production` despliega el commit validado, espera `live` y verifica la URL | [Summary en verde](<evidencias/ECL-125/deploy-production-summary-verde.png>): `/api/health` `{"status":"ok"}`, portada 200, 30/30 respuestas 200 |
| La app en producción: <https://ecologistica-web-9tkq.onrender.com> | [Servicio web «Live» en Render](<evidencias/ECL-125/render-web-live-0ef36ec.png>) |
| Optimización de 150 pedidos y 15 vehículos en producción (19/11/2026) | `POST /optimizaciones` → 201 `COMPLETADA` en 20,23 s, 12 rutas y 2 pedidos inviables con motivo |
| Evaluación de usabilidad con SUS sobre producción (n = 5): 55,5, grado D. El cuello de botella principal (no encontrar el mapa) ya tiene una corrección | [04 Usabilidad](<04 Usabilidad V_1_0_0.md>) · [antes](<evidencias/ECL-126/inicio-operador-antes.png>) y [después](<evidencias/ECL-126/inicio-operador-despues.png>) |

### Demostración de la Inspección 5 (20/11/2026, 14:40)

Recorrido en vivo sobre producción, con la automatización como parte de la demo:

1. **Automatización.** Un cambio pequeño en una rama abre un PR: el CI y `tests.yml` corren los checks y la suite E2E en 3 navegadores. Se muestran el reporte HTML y los artifacts de un run terminado.
2. **Despliegue.** `Deploy production` (manual o tras el CI de `main`): deploy en Render, espera `live`, smoke test y disponibilidad en el Summary.
3. **Producto.** En la URL de producción: login del Operador, rutas del 20/11 en el mapa, registro y cierre de la ruta `DEMO-004` (4 paradas), dashboard de sostenibilidad, reporte de incidencia desde el móvil del Conductor y validación del Operador.
4. **Calidad y usabilidad.** Resultados de Playwright (Web Vitals, API < 500 ms, resiliencia) y puntaje SUS.

## Pendientes

| Pendiente | Responsable | Jira | Siguiente paso |
|---|---|---|---|
| Métricas de CO₂ antes y después por módulo, con unidades en la comparación consolidada (retroalimentación del 13/11) | Antony y José | Por crear | Agregar la tabla por módulo al informe de Green IT antes de la evaluación final del 04/12 |
| Demo ejecutable en una PC de laboratorio sin permisos de administrador | Julio | [ECL-68](https://continental-team-il84x39k.atlassian.net/browse/ECL-68) (In Review / QA) | Con producción en Render, la demo solo necesita un navegador; registrar la prueba en el laboratorio |
| Documentos de cierre del Sprint 4 en curso | Julio, Frank y Giancarlo | [ECL-100](https://continental-team-il84x39k.atlassian.net/browse/ECL-100), [ECL-101](https://continental-team-il84x39k.atlassian.net/browse/ECL-101), [ECL-103](https://continental-team-il84x39k.atlassian.net/browse/ECL-103) | Cerrarlos o reemplazarlos por los documentos de esta carpeta |
| La optimización solo se lanza por la API (Swagger); la pantalla de rutas no tiene botón | José y Antony | Por crear | Botón «Optimizar fecha» para el Operador |
| El inicio y el menú todavía muestran «Próximamente: Rutas optimizadas» | Giancarlo | Por crear | Retirar el texto obsoleto |
| Rotar la credencial de la base de producción | Antony | [ECL-125](https://continental-team-il84x39k.atlassian.net/browse/ECL-125) | Después del 20/11: credencial nueva en Render, sincronizar el Blueprint, redesplegar la API y borrar la anterior |
| Plan gratuito de Render: arranque en frío de unos 50 s y base gratuita con vencimiento | Antony | — | Abrir la URL 5 minutos antes de cada demo; la base dura hasta después de la evaluación final |
| `actions/upload-artifact` usa Node.js 20, que GitHub marca como obsoleto | Antony | Por crear | Actualizar la acción, fijada por SHA, a una versión con Node.js 24 |
| Reoptimización (US-007), cola con worker (RNF-002) y alerta 5xx | José y Antony | [ECL-13](https://continental-team-il84x39k.atlassian.net/browse/ECL-13), [ECL-121](https://continental-team-il84x39k.atlassian.net/browse/ECL-121), [ECL-122](https://continental-team-il84x39k.atlassian.net/browse/ECL-122) | Backlog |
| Ambiente de staging separado de producción | Julio | [ECL-107](https://continental-team-il84x39k.atlassian.net/browse/ECL-107) | Backlog; hoy los PR se validan en CI con PostGIS efímero |

[← Volver al README principal](../../../README.md)
