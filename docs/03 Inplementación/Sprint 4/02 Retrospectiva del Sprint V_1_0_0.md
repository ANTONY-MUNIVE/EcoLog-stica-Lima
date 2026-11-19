# Retrospectiva del sprint

[← Volver al README principal](../../../README.md)

**Nombre del Proyecto:** EcoLogística Lima

**Líder del Proyecto:** Julio Armando Naupari Camarena

## ¿Qué aprendimos?

1. **Mostrar la automatización es parte de la entrega.** En la Inspección 4
   (13/11) el CI existía y estaba en verde, pero no se demostró, y el docente lo
   anotó. Lo que no se ve en la exposición no cuenta. Para la Inspección 5 la
   demo incluye en vivo el CI, la suite E2E y el despliegue.
2. **Probar en tres motores encuentra fallas que uno solo no ve.** En WebKit, el
   service worker respondía antes que `page.route()` y la falla de red inyectada
   no llegaba a la pantalla. Al bloquearlo en todo el archivo, se rompió la
   prueba sin conexión en Chromium: el modo offline **depende** del service
   worker. La corrección fue acotar el bloqueo a 2 pruebas
   ([`f75d8ea`](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/commit/f75d8ea),
   [`d0c5ab2`](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/commit/d0c5ab2)).
3. **Una prueba que escribe datos necesita una base limpia.** El flujo E2E
   registra paradas y cierra rutas. Sobre una base reutilizada falló porque una
   corrida anterior ya había cerrado esas rutas. En CI cada job siembra una base
   nueva; en local se usa una base `*_demo` nueva por corrida.
4. **El entorno de producción impone reglas que el local no tiene.** Detectado
   antes de desplegar:
   - `onrender.com` está en la Public Suffix List, así que la cookie de sesión
     (`SameSite=Strict`) no viaja entre `web` y `api`. La web hace de proxy de
     `/api` para mantener el mismo origen.
   - Render entrega `postgresql://` y la API exige `postgresql+psycopg://`; PostGIS
     no viene activado. `render_start.sh` resuelve ambos al arrancar.
5. **Cargar datos a distancia es frágil.** El seed de 150 pedidos desde Huancayo
   contra la base en Oregon se cortó a mitad. Hubo que limpiar los pedidos
   parciales y reanudar. Las cargas grandes conviene hacerlas cerca de la base.

## ¿Qué estamos haciendo bien?

- **Nada llega a `main` sin CI en verde y revisión de otra persona.** Los PR
  [#153](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/153) y
  [#154](https://github.com/ANTONY-MUNIVE/EcoLog-stica-Lima/pull/154) se
  integraron con la aprobación de los dueños de cada carpeta y todos los checks
  en verde, incluido el E2E en 3 navegadores.
- **Los secretos no están en el código.** Las contraseñas de la suite E2E se
  generan al azar en cada corrida y se enmascaran en el log. La API key de Render
  tiene solo los permisos de ejecutar y consultar deploys. La base de producción
  no acepta conexiones desde internet.
- **Medimos antes de afirmar.** Las cifras de los informes salen de corridas
  reales: Web Vitals y tiempos de API del run #9, 30/30 respuestas 200 en
  producción y la optimización de 150 pedidos en 20,23 s en Render.
- **Las fallas se corrigen en la causa, no en la prueba.** Ninguna prueba se
  desactivó para poner el CI en verde. Las 2 omitidas en Firefox y WebKit lo
  están por diseño (la API se mide una sola vez).
- **El repositorio pasó a una cuenta que puede administrarse.** Con la
  transferencia del 19/11 se configuraron Secrets, variables y el despliegue sin
  depender de una sola persona para cada ajuste.

## ¿Qué podemos hacer mejor?

### Personas

- **El trabajo de la Inspección 5 quedó concentrado en una persona.** ECL-124 a
  ECL-127 (10 SP) están asignados a Antony. Si él no está, nadie más sabe
  desplegar ni correr la suite E2E.
- **En la Inspección 4 expuso una sola persona.** La regla del docente para la
  Inspección 5 exige que todos estén presentes y participen.

### Relaciones

- **El docente no hizo preguntas el 13/11, y la retroalimentación llegó recién
  con la nota.** El equipo no pidió confirmación de lo que faltaba durante la
  exposición. Preguntar al cierre de la demo «¿falta algo de la rúbrica?»
  adelanta la corrección.
- **La transferencia del repositorio y los merges se hicieron el mismo día.**
  Funcionó porque Julio y Antony estaban juntos, pero cada paso esperó al
  anterior. Los cambios de infraestructura conviene coordinarlos con un día de
  margen.

### Procesos

- **Jira volvió a ir detrás de GitHub.** ECL-124 y ECL-125 seguían en «Tareas
  por hacer» el 19/11, con su trabajo ya en ramas y PR. Se actualizaron ese día.
- **Los documentos se empezaron la víspera de la evaluación.** La acción A17 de
  la retrospectiva anterior pedía borradores 3 días antes; los de esta carpeta se
  abrieron el 19/11 para el 20/11.
- **El primer run de `Deploy production` falló porque no había configuración.**
  El workflow se integró antes de crear los Secrets y las variables. El mensaje
  de error decía exactamente qué faltaba, pero el orden correcto es configurar y
  luego integrar.

### Herramientas

- **El plan gratuito de Render duerme los servicios tras 15 minutos sin uso** y
  la primera petición tarda unos 50 s. Para una demo hay que despertarlo antes.
- **La optimización solo se lanza desde Swagger.** Falta un botón para el
  Operador en la pantalla de rutas.
- **GitHub marca como obsoleto Node.js 20** en `actions/upload-artifact`. No
  falla hoy, pero dejará de funcionar.
- **Una credencial de la base de producción quedó escrita en un chat** durante la
  carga de datos. La base no acepta conexiones externas, pero la credencial hay
  que rotarla.

### Acciones a realizar

| Acción | Dimensión | Qué | Responsable | Fecha | Métrica |
|---|---|---|---|---|---|
| A20 | Personas | Ensayo de la Inspección 5 con los 5 integrantes: cada uno expone su parte y uno más sabe correr el deploy y la suite E2E | Julio (líder) | 20/11, antes de las 14:40 | 5 de 5 integrantes exponen; 2 personas corren `Deploy production` sin ayuda |
| A21 | Relaciones | Al terminar cada exposición, preguntar al docente si falta algún punto de la rúbrica y anotarlo | Julio | 20/11 y 04/12 | Respuesta registrada en la Revisión del sprint |
| A22 | Procesos | Al abrir un PR, su ticket pasa a «En curso»; al integrarlo, a «Finalizada», el mismo día | Cada autor; control de Giancarlo | Desde el 20/11 | 0 tickets con PR integrado fuera de «Finalizada» por más de 24 h |
| A23 | Procesos | Los 7 documentos de la evaluación final se abren con su estructura el 27/11, una semana antes | Dueños de cada documento | 27/11 | 7 de 7 borradores en PR el 01/12 |
| A24 | Herramientas | Rotar la credencial de la base de producción y documentar el procedimiento de carga de datos sin pegar la URL en ningún chat | Antony | 21/11 | Credencial anterior borrada en Render; login en producción funcionando |
| A25 | Herramientas | Abrir la URL de producción 5 minutos antes de cada demo y verificar `/api/health` | Quien expone la demo | 20/11 y 04/12 | Primera pantalla de la demo carga en menos de 5 s |
| A26 | Herramientas | Actualizar `actions/upload-artifact` a una versión con Node.js 24, fijada por SHA | Antony | 27/11 | 0 avisos de Node.js 20 en los runs de `main` |

**Seguimiento de las acciones anteriores** (de la
[retrospectiva de la primera mitad del sprint](<../../03 Implementación/Sprint 04/02 Retrospectiva del Sprint V_1_0_0.md>)):

| Acción | Estado al 19/11 | Evidencia |
|---|---|---|
| A15 — Ticket a «Finalizada» el día del merge | No cumplida | ECL-124 y ECL-125 se actualizaron después de integrar #153 y #154. Sigue como A22. |
| A17 — Borradores de los documentos 3 días antes | No cumplida | Los documentos de esta carpeta se abrieron el 19/11. Sigue como A23. |
| A18 — Ninguna prueba con fecha u hora fija | Cumplida en la suite nueva | La suite E2E calcula la fecha de Lima y las horas reales desde el propio plan (`hoyLima()`, `horaRealLima()`). |
| A14, A16 y A19 | Sin medir | Se revisan en la retrospectiva final del 04/12. |

[← Volver al README principal](../../../README.md)
