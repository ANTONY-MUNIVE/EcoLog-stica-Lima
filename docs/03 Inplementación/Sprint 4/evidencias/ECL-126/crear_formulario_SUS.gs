/**
 * EcoLogística Lima · Sprint 4 · ECL-126
 * Crea el formulario SUS (System Usability Scale) en Google Forms.
 *
 * Uso: script.google.com → Nuevo proyecto → pegar este archivo → guardar →
 * elegir la función crearFormularioSUS → Ejecutar → autorizar con tu cuenta.
 * Al terminar, el registro de ejecución muestra el enlace para responder y el
 * enlace de edición. Las respuestas se descargan como CSV desde la pestaña
 * Respuestas → ⋮ → Descargar respuestas (.csv).
 */
function crearFormularioSUS() {
  var form = FormApp.create('EcoLogística Lima · Evaluación de usabilidad (SUS) · Sprint 4');
  form.setDescription(
    'Gracias por probar EcoLogística Lima, un optimizador de rutas sostenibles ' +
    'para DistriRápido S.A.C. Responde después de completar las tareas de la prueba. ' +
    'El cuestionario es anónimo y toma unos 3 minutos. Las respuestas se usan solo ' +
    'para el informe académico del curso Taller de Proyectos 2 (Universidad Continental).'
  );
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(true);

  // --- Sección 1: perfil del participante ---
  form.addMultipleChoiceItem()
    .setTitle('¿Cuál es tu relación con el proyecto?')
    .setChoiceValues([
      'Integrante del equipo G5117',
      'Estudiante de otro equipo o carrera',
      'Persona externa (familiar, amigo, trabajador)'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('¿Qué rol usaste en la prueba?')
    .setChoiceValues(['Operador (web)', 'Conductor (celular)', 'Ambos'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('¿Con qué frecuencia usas aplicaciones web o de mapas para trabajar o estudiar?')
    .setChoiceValues(['Todos los días', 'Algunas veces por semana', 'Rara vez'])
    .setRequired(true);

  form.addCheckboxItem()
    .setTitle('¿Qué tareas completaste?')
    .setChoiceValues([
      'T1. Iniciar sesión',
      'T2. Ver las rutas optimizadas del día y su mapa',
      'T3. Registrar el resultado de una parada',
      'T4. Reportar una incidencia como conductor',
      'T5. Revisar el dashboard de sostenibilidad (CO2)'
    ])
    .setRequired(true);

  // --- Sección 2: los 10 ítems SUS (Brooke, 1996), escala 1 a 5 ---
  form.addPageBreakItem()
    .setTitle('Cuestionario SUS')
    .setHelpText('Marca de 1 (totalmente en desacuerdo) a 5 (totalmente de acuerdo). ' +
                 'Responde según tu primera impresión.');

  var items = [
    'Creo que me gustaría usar este sistema con frecuencia.',
    'Encontré el sistema innecesariamente complejo.',
    'Pensé que el sistema era fácil de usar.',
    'Creo que necesitaría el apoyo de un técnico para poder usar este sistema.',
    'Encontré que las funciones de este sistema estaban bien integradas.',
    'Pensé que había demasiada inconsistencia en este sistema.',
    'Imagino que la mayoría de las personas aprendería a usar este sistema muy rápido.',
    'Encontré el sistema muy complicado de usar.',
    'Me sentí muy seguro/a usando el sistema.',
    'Necesité aprender muchas cosas antes de poder usar este sistema.'
  ];
  items.forEach(function (texto, i) {
    form.addScaleItem()
      .setTitle('P' + (i + 1) + '. ' + texto)
      .setBounds(1, 5)
      .setLabels('Totalmente en desacuerdo', 'Totalmente de acuerdo')
      .setRequired(true);
  });

  // --- Sección 3: comentarios abiertos ---
  form.addPageBreakItem().setTitle('Comentarios');
  form.addParagraphTextItem()
    .setTitle('¿Qué fue lo más difícil o confuso?')
    .setRequired(false);
  form.addParagraphTextItem()
    .setTitle('¿Qué mejorarías?')
    .setRequired(false);

  Logger.log('Enlace para responder: ' + form.getPublishedUrl());
  Logger.log('Enlace de edición: ' + form.getEditUrl());
}
