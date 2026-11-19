# Evaluación cuantitativa de usabilidad (SUS)

[← Volver al README principal](../../../README.md)

**Nombre del Proyecto:** EcoLogística Lima

**Líder del Proyecto:** Julio Armando Naupari Camarena

| Metadato | Valor |
|---|---|
| Ticket | [ECL-126 — Evaluación de usabilidad SUS (n ≥ 5) e informe 04 Usabilidad](https://continental-team-il84x39k.atlassian.net/browse/ECL-126) |
| Versión | 1.0.0 |
| Fecha de la evaluación | 19/11/2026, de 15:03 a 15:31 (America/Lima) |
| Redacción | Antony Munive Rios (@ANTONY-MUNIVE), con apoyo de IA (Claude) para el cálculo y el análisis |
| Datos | [respuestas-sus-20261119.csv](<evidencias/ECL-126/respuestas-sus-20261119.csv>): exportación de Google Forms, anónima |

## 1. Ficha técnica de la evaluación

| Campo | Valor |
|---|---|
| Instrumento | **System Usability Scale (SUS)** de Brooke (1996): 10 ítems que alternan afirmaciones positivas (impares) y negativas (pares). Versión en español aplicada con Google Forms ([script que crea el formulario](<evidencias/ECL-126/crear_formulario_SUS.gs>)). |
| Por qué SUS | Es el estándar de la industria para comparar la usabilidad percibida con una referencia conocida (68 puntos) y funciona con muestras pequeñas. |
| Escala | Likert de 1 a 5: 1 = totalmente en desacuerdo, 5 = totalmente de acuerdo |
| Sistema evaluado | Versión desplegada en producción, <https://ecologistica-web-9tkq.onrender.com> (commit `0ef36ec`) |
| Tamaño de la muestra | **n = 5** |
| Perfil | 4 integrantes del equipo G5117 que usaron los roles de Operador y Conductor, y 1 estudiante de otro equipo o carrera que usó el rol de Conductor desde el celular. 4 de 5 usan aplicaciones web o de mapas algunas veces por semana; el participante externo, rara vez. |
| Momento | Después de ejecutar las tareas, nunca antes |
| Anonimato | El formulario no pide nombre ni correo |

**Tareas ejecutadas antes de responder:**

| Tarea | Descripción | Participantes que la completaron |
|---|---|---|
| T1 | Iniciar sesión | P2, P3, P4, P5 |
| T2 | Ver las rutas optimizadas del día y su mapa | P2, P3, P4 |
| T3 | Registrar el resultado de una parada | P1, P2, P3, P4 |
| T4 | Reportar una incidencia como conductor | P2, P3, P4, P5 |
| T5 | Revisar el dashboard de sostenibilidad (CO₂) | P2, P3, P4 |

P2, P3 y P4 completaron las 5 tareas. P1 marcó solo T3 y P5 hizo el recorrido
del Conductor (T1 y T4).

## 2. Resultados cuantitativos

### 2.1 Matriz de respuestas brutas

| Participante | Perfil | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | Equipo · Ambos roles | 4 | 3 | 4 | 4 | 4 | 3 | 3 | 3 | 3 | 5 |
| P2 | Equipo · Ambos roles | 5 | 4 | 4 | 5 | 4 | 4 | 5 | 5 | 4 | 4 |
| P3 | Equipo · Ambos roles | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 |
| P4 | Equipo · Ambos roles | 5 | 2 | 4 | 1 | 5 | 1 | 4 | 1 | 5 | 2 |
| P5 | Externo · Conductor (celular) | 2 | 3 | 2 | 4 | 3 | 5 | 5 | 5 | 5 | 5 |

Ítems del cuestionario:

1. Creo que me gustaría usar este sistema con frecuencia.
2. Encontré el sistema innecesariamente complejo.
3. Pensé que el sistema era fácil de usar.
4. Creo que necesitaría el apoyo de un técnico para poder usar este sistema.
5. Encontré que las funciones de este sistema estaban bien integradas.
6. Pensé que había demasiada inconsistencia en este sistema.
7. Imagino que la mayoría de las personas aprendería a usar este sistema muy rápido.
8. Encontré el sistema muy complicado de usar.
9. Me sentí muy seguro/a usando el sistema.
10. Necesité aprender muchas cosas antes de poder usar este sistema.

### 2.2 Cálculo paso a paso

Fórmula de Brooke (1996):

1. Ítems impares (positivos): contribución = respuesta − 1.
2. Ítems pares (negativos): contribución = 5 − respuesta.
3. Cada contribución va de 0 a 4. Se suman las 10 (0 a 40).
4. **SUS = suma × 2,5** (0 a 100).

| Participante | P1 | P2 | P3 | P4 | P5 | P6 | P7 | P8 | P9 | P10 | Suma | × 2,5 = **SUS** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | 4−1=3 | 5−3=2 | 4−1=3 | 5−4=1 | 4−1=3 | 5−3=2 | 3−1=2 | 5−3=2 | 3−1=2 | 5−5=0 | 20 | **50,0** |
| P2 | 5−1=4 | 5−4=1 | 4−1=3 | 5−5=0 | 4−1=3 | 5−4=1 | 5−1=4 | 5−5=0 | 4−1=3 | 5−4=1 | 20 | **50,0** |
| P3 | 5−1=4 | 5−5=0 | 5−1=4 | 5−5=0 | 5−1=4 | 5−5=0 | 5−1=4 | 5−5=0 | 5−1=4 | 5−5=0 | 20 | **50,0** |
| P4 | 5−1=4 | 5−2=3 | 4−1=3 | 5−1=4 | 5−1=4 | 5−1=4 | 4−1=3 | 5−1=4 | 5−1=4 | 5−2=3 | 36 | **90,0** |
| P5 | 2−1=1 | 5−3=2 | 2−1=1 | 5−4=1 | 3−1=2 | 5−5=0 | 5−1=4 | 5−5=0 | 5−1=4 | 5−5=0 | 15 | **37,5** |

### 2.3 Puntaje global

**SUS promedio = (50,0 + 50,0 + 50,0 + 90,0 + 37,5) / 5 = 277,5 / 5 = 55,5**

| Estadístico | Valor |
|---|---|
| Promedio | **55,5** |
| Mediana | 50,0 |
| Desviación estándar (muestral) | 20,0 |
| Mínimo y máximo | 37,5 y 90,0 |
| Intervalo de confianza del 95 % (t de Student, 4 g. l.) | 30,6 a 80,4 |
| Equipo (n = 4) | 60,0 |
| Externo (n = 1) | 37,5 |

El cálculo se reprodujo con un script sobre el CSV exportado, con el mismo
resultado.

## 3. Análisis e interpretación

### 3.1 Ubicación frente al estándar de la industria

| Referencia | Valor | EcoLogística Lima |
|---|---|---|
| Umbral de aceptación (promedio de la industria) | ≥ 68 | **55,5: por debajo, a 12,5 puntos** |
| Grado en la escala curva de Sauro y Lewis | A 78,9–100 · B 72,6–78,8 · C 62,7–72,5 · D 51,7–62,6 · F < 51,7 | **Grado D** |
| Adjetivo de Bangor, Kortum y Miller (2009) | «OK» ≈ 51, «Bueno» ≈ 71 | **«OK»**: aceptable con reservas |

**Conclusión:** con esta muestra, la usabilidad percibida **no alcanza el umbral
de 68**. El intervalo de confianza es amplio (30,6 a 80,4) porque n = 5. El
resultado indica una tendencia y no un valor preciso, pero es consistente: 4 de
5 participantes quedan en 50 o menos.

### 3.2 Calidad de las respuestas

Antes de interpretar los ítems se revisó la coherencia de cada participante:

- **P3 respondió 5 en los 10 ítems.** Está de acuerdo con que el sistema es
  «fácil de usar» (P3) y a la vez «muy complicado de usar» (P8). Es un patrón de
  respuesta en línea recta por aquiescencia, y SUS lo neutraliza: da 50 puntos.
  Sin P3, el promedio sería 56,9, con el mismo grado D.
- **P2 dio 5 en «necesitaría el apoyo de un técnico» y «muy complicado de usar»**,
  pero también 4 en «fácil de usar». Los ítems negativos del SUS se leen mal con
  frecuencia (Sauro y Lewis, 2011). Se conserva la respuesta tal como se dio.
- **Sesgo del equipo.** 4 de 5 participantes construyeron el sistema. El único
  externo dio el puntaje más bajo (37,5), así que un usuario nuevo
  probablemente percibe una usabilidad menor que el promedio.

Ninguna respuesta se descartó ni se modificó.

### 3.3 Ítems más débiles

Contribución media por ítem (0 = peor, 4 = mejor):

| Ítem | Contribución media | Lectura |
|---|---|---|
| P10 Necesité aprender muchas cosas antes de usarlo | **0,8** | Curva de aprendizaje alta |
| P4 Necesitaría el apoyo de un técnico | **1,2** | Falta autonomía del usuario |
| P8 Muy complicado de usar | **1,2** | Complejidad percibida |
| P6 Demasiada inconsistencia | 1,4 | |
| P2 Innecesariamente complejo | 1,6 | |
| P3 Fácil de usar | 2,8 | |
| P1 Me gustaría usarlo con frecuencia | 3,2 | |
| P5 Funciones bien integradas | 3,2 | |
| P7 La mayoría aprendería rápido | 3,4 | |
| P9 Me sentí seguro | 3,4 | Mejor valorado |

Los ítems negativos son los más débiles, sobre todo los de **aprendizaje y
autonomía** (P10 y P4). Los participantes se sintieron seguros y valoraron la
integración de las funciones, pero sienten que necesitan guía para empezar.

### 3.4 Cuellos de botella de la interfaz

| # | Cuello de botella | Fuente | Ítems relacionados |
|---|---|---|---|
| CB1 | **No se encuentra el mapa.** El inicio y el menú mostraban «Rutas optimizadas — Próximamente», aunque la pantalla de rutas y mapa existe como «Rutas y alertas». El usuario busca «rutas» y lee que todavía no está disponible. | Comentario de P2: «no sé dónde está el mapa» | P10, P6 |
| CB2 | **La búsqueda de clientes exige escribir para ver la lista.** El campo de cliente (registrar pedido y preferencias) no muestra opciones al hacer clic. | Comentario de P4 | P8, P2 |
| CB3 | **Probar una incidencia necesita a otra persona.** El conductor reporta y el operador valida; quien prueba solo un rol queda esperando, sin aviso de que hay incidencias pendientes. | Comentario de P1 | P4 |
| CB4 | **La experiencia móvil del conductor fue la peor valorada.** El único participante externo usó el celular y dio 37,5. Su comentario («impacto con las pantallas») no detalla qué pantalla. | Comentario y puntaje de P5 | P1, P3 |
| CB5 | **La optimización solo se lanza desde Swagger.** No hay botón en la pantalla de rutas; en la prueba, las rutas ya estaban generadas. | Revisión del Sprint 4 | P4 |

### 3.5 Mejoras aplicadas y propuestas

| Cuello de botella | Mejora | Estado | Verificación |
|---|---|---|---|
| CB1 | Se retira el aviso «Próximamente — Rutas optimizadas» del menú y del inicio. El inicio del Operador y del Administrador enlaza directo a **«Rutas y alertas — Rutas optimizadas del día en el mapa»**. | **Aplicada** en la rama [`fix/ECL-126-acceso-rutas-y-mapa`](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/compare/main...fix/ECL-126-acceso-rutas-y-mapa) (commit `86b4d17`), pendiente de revisión e integración | Pruebas actualizadas: las 1 018 de Vitest pasan; `AppShell` y `HomePage` comprueban el enlace a `/operacion/rutas` y que no aparezca «Próximamente». Capturas abajo. |
| CB2 | Abrir la lista de clientes al enfocar el campo, con los primeros resultados, sin exigir escribir | Propuesta | Volver a medir el ítem P8 |
| CB3 | Mostrar en el inicio y en el menú del Operador el número de incidencias pendientes de validar | Propuesta | Tiempo hasta validar una incidencia nueva |
| CB4 | Prueba moderada del rol Conductor en celular con 3 usuarios externos, observando dónde se traban | Propuesta | SUS del rol Conductor por separado |
| CB5 | Botón «Optimizar fecha» para el Operador, con el estado de la corrida | Propuesta (backlog) | Tarea T2 sin ayuda |
| P10 y P4 | Textos de ayuda breves en la primera visita a rutas, cierre e incidencias | Propuesta | Contribución de P10 y P4 ≥ 2 en la siguiente medición |

**Antes y después de CB1** (inicio del Operador, misma base de datos):

| Antes | Después |
|---|---|
| ![Inicio con «Próximamente — Rutas optimizadas»](<evidencias/ECL-126/inicio-operador-antes.png>) | ![Inicio con acceso directo a «Rutas y alertas»](<evidencias/ECL-126/inicio-operador-despues.png>) |

### 3.6 Siguiente medición

- **Más participantes:** el formulario sigue abierto. La meta es n ≥ 10, con al
  menos la mitad de usuarios externos al equipo.
- **Separar por rol:** medir el SUS por separado para Operador y Conductor.
- **Antes de la evaluación final del 04/12:** repetir la medición después de
  integrar CB1 y aplicar CB2 y CB3, para comprobar si el promedio supera 68.

## Referencias

- Brooke, J. (1996). SUS: A «quick and dirty» usability scale. En *Usability
  Evaluation in Industry*. Taylor & Francis.
- Bangor, A., Kortum, P. y Miller, J. (2009). Determining what individual SUS
  scores mean: Adding an adjective rating scale. *Journal of Usability Studies*,
  4(3), 114–123.
- Sauro, J. y Lewis, J. R. (2011). When designing usability questionnaires, does
  it hurt to be positive? *Proceedings of CHI 2011*, 2215–2224.
- Sauro, J. y Lewis, J. R. (2016). *Quantifying the User Experience* (2.ª ed.).
  Morgan Kaufmann. Escala curva de grados del SUS.

[← Volver al README principal](../../../README.md)
