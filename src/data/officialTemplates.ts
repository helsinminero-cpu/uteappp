import { TemplateKey } from '../utils/docxEngine';

/**
 * Normalizes tag string for robust case-insensitive, accent-insensitive matching
 */
export function normalizeTag(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[{}\[\]]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Renders raw template text by substituting tags enclosed in {{...}} or {...}
 */
export function renderTemplateText(templateText: string, tags: Record<string, string>): string {
  const normalizedDict: Record<string, string> = {};
  for (const [key, val] of Object.entries(tags)) {
    normalizedDict[normalizeTag(key)] = val ?? '';
  }

  // Replace {{Tag}} or {Tag}
  return templateText.replace(/\{\{?([^{}]+)\}?\}/g, (match, rawTag) => {
    const trimmed = rawTag.trim();
    if (tags[trimmed] !== undefined) {
      return tags[trimmed];
    }
    const norm = normalizeTag(rawTag);
    if (normalizedDict[norm] !== undefined) {
      return normalizedDict[norm];
    }
    return match;
  });
}

/**
 * Plantillas Oficiales Institucionales UTEA - Escuela Profesional de Ingeniería Civil
 * Filial Cusco - Comisión de Prácticas Pre-Profesionales (PPP)
 * Cada plantilla contiene el texto y las etiquetas oficiales completas.
 */
export const OFFICIAL_TEMPLATES: Record<TemplateKey, string> = {
  // 1. DESIGNACIÓN - INFORME
  informe_designacion: `INFORME Nº {{Informe de designacion de asesor de Practicas Pre Profesionales}}-2026-COMISIÓN-PPP-EPIC-UTEA

A:
Dr. Ing. SUB DIRECTOR DE LA ESCUELA PROFESIONAL DE INGENIERÍA CIVIL
Universidad Tecnológica de los Andes - Filial Cusco

DE:
COMISIÓN DE PRÁCTICAS PRE PROFESIONALES (PPP)
Escuela Profesional de Ingeniería Civil

ASUNTO:
Designación de Docente Asesor de Prácticas Pre Profesionales

REFERENCIA:
FUT Nº {{Numero de FUT de solicitud de Asesor}} · Expediente Nº {{Numero de Expediente FUT de Asesor}}
Fecha de Solicitud: {{Fecha de FUT de solicitud de Asesor}}

FECHA:
Cusco, {{Fecha de Informe de designacion de asesor de Practicas Pre Profesionales}}

Por medio del presente, nos dirigimos a su despacho para informarle que el estudiante {{ALUMNO}}, identificado con Código de Matrícula Nº {{CODIGO}}, ha presentado satisfactoriamente su expediente solicitando la designación de Asesor Docente para la supervisión de sus Prácticas Pre Profesionales (PPP).

Las prácticas se vienen desarrollando en la entidad/empresa {{EMPRESA}}, habiéndose iniciado formalmente el día {{Fecha de inicio de  Practicas Pre profesionales}}, con una duración mínima de cuatro (04) meses lectivos (480 horas), proyectándose su culminación para el {{Fecha_Fin_PPP}}.

Habiéndose verificado el cumplimiento de los requisitos establecidos en el Reglamento General de Prácticas Pre Profesionales de la UTEA, esta Comisión propone formalmente la designación del docente:

{{Nombre completo del asesor}}

como Asesor Docente de Prácticas Pre Profesionales del referido estudiante.

Sin otro particular, aprovechamos la oportunidad para expresarle los sentimientos de nuestra especial consideración y estima personal.

Atentamente,


________________________________________
COMISIÓN DE PRÁCTICAS PRE PROFESIONALES
Escuela Profesional de Ingeniería Civil
Universidad Tecnológica de los Andes · Filial Cusco`,

  // 1. DESIGNACIÓN - RESOLUCIÓN
  resolucion_designacion: `RESOLUCIÓN SUB DIRECTORAL Nº {{Numero de resolucion de designacion asesor}}-2026-UTEA-FC-FI-EPIC

Cusco, {{Fecha de resolucion de designacion de asesor de Practicas Pre Profesionales}}

VISTO:
El Expediente Nº {{Numero de Expediente FUT de Asesor}} con FUT Nº {{Numero de FUT de solicitud de Asesor}}, promovido por el estudiante {{ALUMNO}} con Código Nº {{CODIGO}}, y el Informe Nº {{Informe de designacion de asesor de Practicas Pre Profesionales}} emitido por la Comisión de Prácticas Pre Profesionales de la Escuela Profesional de Ingeniería Civil de la Universidad Tecnológica de los Andes - Filial Cusco.

CONSIDERANDO:
Que, de conformidad con la Ley Universitaria Nº 30220 y el Estatuto de la Universidad Tecnológica de los Andes, las Prácticas Pre Profesionales son un requisito indispensable para la formación integral del futuro Ingeniero Civil;

Que, el estudiante {{ALUMNO}}, con Código Nº {{CODIGO}}, viene realizando sus Prácticas Pre Profesionales en {{EMPRESA}}, habiendo iniciado formalmente con fecha {{Fecha de inicio de  Practicas Pre profesionales}} y con fecha de conclusión proyectada el {{Fecha_Fin_PPP}};

Que, la Comisión de Prácticas Pre Profesionales, mediante Informe Nº {{Informe de designacion de asesor de Practicas Pre Profesionales}}, ha verificado la documentación y emitido opinión favorable para la designación de asesor docente;

Estando a las atribuciones conferidas a esta Sub Dirección;

SE RESUELVE:
ARTÍCULO PRIMERO.- DESIGNAR al docente {{Nombre completo del asesor}} como ASESOR DOCENTE de las Prácticas Pre Profesionales del estudiante {{ALUMNO}}, con Código de Matrícula Nº {{CODIGO}}, realizadas en {{EMPRESA}}.

ARTÍCULO SEGUNDO.- ENCARGAR al Asesor Docente designado la supervisión, seguimiento y asesoramiento pedagógico del plan de trabajo de prácticas del estudiante hasta su culminación e informe final.

ARTÍCULO TERCERO.- DISPONER que el estudiante cumpla con las 480 horas mínimas y demás disposiciones contenidas en el Reglamento de Prácticas Pre Profesionales.

ARTÍCULO CUARTO.- NOTIFICAR la presente Resolución al interesado, al Asesor Docente, a la Comisión de PPP y a las dependencias administrativas correspondientes para los fines de ley.

REGÍSTRESE, COMUNÍQUESE Y CÚMPLASE.


________________________________________
SUB DIRECCIÓN DE ESCUELA PROFESIONAL
Ingeniería Civil · UTEA Filial Cusco`,

  // 2. REASIGNACIÓN - INFORME
  informe_reasignacion: `INFORME Nº {{Informe de reasignacion de asesor de Practicas Pre Profesionales}}-2026-COMISIÓN-PPP-EPIC-UTEA

A:
Dr. Ing. SUB DIRECTOR DE LA ESCUELA PROFESIONAL DE INGENIERÍA CIVIL
Universidad Tecnológica de los Andes - Filial Cusco

DE:
COMISIÓN DE PRÁCTICAS PRE PROFESIONALES (PPP)

ASUNTO:
Reasignación de Docente Asesor de Prácticas Pre Profesionales

REFERENCIA:
FUT Nº {{Numero de FUT de solicitud de Reasignacion de asesor}} · Expediente Nº {{Numero de Expediente de reasignacion de Asesor}}
Fecha de Solicitud: {{Fecha de FUT de solicitud de reasignacion de Asesor}}
Resolución Previa: Nº {{Resolucion de Designacion de asesor actual}} (Fecha: {{fecha Resolucion de Designacion de asesor actual}})

FECHA:
Cusco, {{Fecha de Informe de reasignacion de asesor de Practicas Pre Profesionales}}

Por el presente documento, nos dirigimos a usted a fin de poner en su conocimiento la solicitud presentada por el estudiante {{ALUMNO}}, con Código Nº {{CODIGO}}, quien solicita el cambio y reasignación de su docente asesor para la continuidad de sus Prácticas Pre Profesionales desarrolladas en {{EMPRESA}}.

ANTECEDENTES:
Mediante Resolución Sub Directoral Nº {{Resolucion de Designacion de asesor actual}} de fecha {{fecha Resolucion de Designacion de asesor actual}}, se designó oportunamente al docente {{nombre de asesor actual}} como asesor de PPP.

EVALUACIÓN Y PROPUESTA:
Habiéndose evaluado los motivos expuestos y verificada la disponibilidad docente, esta Comisión aprueba la solicitud y propone formalmente la designación de:

{{Nombre completo del nuevo asesor}}

como NUEVO ASESOR DOCENTE de Prácticas Pre Profesionales para el citado estudiante.

Es todo cuanto informamos para la emisión del acto resolutivo correspondiente.

Atentamente,


________________________________________
COMISIÓN DE PRÁCTICAS PRE PROFESIONALES
Escuela Profesional de Ingeniería Civil
Universidad Tecnológica de los Andes · Filial Cusco`,

  // 2. REASIGNACIÓN - RESOLUCIÓN
  resolucion_reasignacion: `RESOLUCIÓN SUB DIRECTORAL Nº {{Numero de resolucion de reasignacion asesor}}-2026-UTEA-FC-FI-EPIC

Cusco, {{Fecha de resolucion de reasignacion de asesor de Practicas Pre Profesionales}}

VISTO:
El Expediente Nº {{Numero de Expediente de reasignacion de Asesor}} con FUT Nº {{Numero de FUT de solicitud de Reasignacion de asesor}}, presentado por el estudiante {{ALUMNO}} con Código Nº {{CODIGO}}, y el Informe Nº {{Informe de reasignacion de asesor de Practicas Pre Profesionales}} de la Comisión de Prácticas Pre Profesionales;

CONSIDERANDO:
Que, mediante Resolución Sub Directoral Nº {{Resolucion de Designacion de asesor actual}} de fecha {{fecha Resolucion de Designacion de asesor actual}}, se designó inicialmente como asesor al docente {{nombre de asesor actual}};

Que, el estudiante realiza sus Prácticas Pre Profesionales en {{EMPRESA}} habiendo iniciado con fecha {{Fecha de inicio de  Practicas Pre profesionales}};

Que, ante la solicitud de reasignación y existiendo opinión técnica favorable de la Comisión de PPP;

SE RESUELVE:
ARTÍCULO PRIMERO.- DEJAR SIN EFECTO, en todos sus extremos, la designación conferida mediante Resolución Sub Directoral Nº {{Resolucion de Designacion de asesor actual}} al docente {{nombre de asesor actual}}.

ARTÍCULO SEGUNDO.- DESIGNAR al docente {{Nombre completo del nuevo asesor}} como NUEVO ASESOR DOCENTE de las Prácticas Pre Profesionales del estudiante {{ALUMNO}}, con Código Nº {{CODIGO}}, en la entidad {{EMPRESA}}.

ARTÍCULO TERCERO.- NOTIFICAR a los interesados y archivar actuados conforme al reglamento.

REGÍSTRESE, COMUNÍQUESE Y CÚMPLASE.


________________________________________
SUB DIRECCIÓN DE ESCUELA PROFESIONAL
Ingeniería Civil · UTEA Filial Cusco`,

  // 3. SUSTENTACIÓN - INFORME
  informe_sustentacion: `INFORME Nº {{Informe_Sustentacion}}-2026-COMISIÓN-PPP-EPIC-UTEA

A:
Dr. Ing. SUB DIRECTOR DE LA ESCUELA PROFESIONAL DE INGENIERÍA CIVIL
Universidad Tecnológica de los Andes - Filial Cusco

DE:
COMISIÓN DE PRÁCTICAS PRE PROFESIONALES (PPP)

ASUNTO:
Designación de Jurado Evaluador y Fecha de Sustentación de PPP

REFERENCIA:
FUT Nº {{FUT_Sustentacion}} · Expediente Nº {{EXP_Sustentacion}}
Fecha de FUT: {{Fecha_FUT_Sustentacion}}

FECHA:
Cusco, {{Fecha_Informe_Sustentacion}}

Nos dirigimos a usted para informarle que el estudiante {{ALUMNO}}, con Código Nº {{CODIGO}}, ha culminado satisfactoriamente el periodo de ejecución de sus Prácticas Pre Profesionales en {{EMPRESA}}, contando con la aprobación formal de su Asesor Docente {{Asesor_Nombre}}.

Habiendo revisado el expediente y verificado el cumplimiento de los requisitos reglamentarios, esta Comisión propone la designación del Jurado Evaluador para el Acto de Sustentación Oficial:

- PRESIDENTE DEL JURADO: {{Presidente_Jurado}}
- MIEMBRO DEL JURADO: {{Miembro_Jurado}}

Asimismo, se propone la programación del Acto de Sustentación para:
- FECHA: {{Fecha_Sustentacion}}
- HORA: {{Hora_Sustentacion}}

Es todo cuanto informamos a usted para los fines pertinentes.

Atentamente,


________________________________________
COMISIÓN DE PRÁCTICAS PRE PROFESIONALES
Escuela Profesional de Ingeniería Civil
Universidad Tecnológica de los Andes · Filial Cusco`,

  // 3. SUSTENTACIÓN - RESOLUCIÓN
  resolucion_sustentacion: `RESOLUCIÓN SUB DIRECTORAL Nº {{Resolucion_Sustentacion}}-2026-UTEA-FC-FI-EPIC

Cusco, {{Fecha_Resolucion_Sustentacion}}

VISTO:
El Expediente Nº {{EXP_Sustentacion}} con FUT Nº {{FUT_Sustentacion}} y el Informe Nº {{Informe_Sustentacion}} emitido por la Comisión de Prácticas Pre Profesionales;

CONSIDERANDO:
Que, el estudiante {{ALUMNO}}, con Código Nº {{CODIGO}}, ha cumplido las Prácticas Pre Profesionales en {{EMPRESA}} bajo la asesoría del docente {{Asesor_Nombre}};

Que, cuenta con el Informe de Aprobación de Asesor y la conformidad de la Comisión de PPP;

SE RESUELVE:
ARTÍCULO PRIMERO.- DESIGNAR al JURADO EVALUADOR para la Sustentación del Informe Final de Prácticas Pre Profesionales del estudiante {{ALUMNO}}, con Código Nº {{CODIGO}}, integrado por los siguientes docentes:
- PRESIDENTE: {{Presidente_Jurado}}
- MIEMBRO: {{Miembro_Jurado}}

ARTÍCULO SEGUNDO.- FIJAR la fecha y hora para el Acto Público de Sustentación:
- Fecha: {{Fecha_Sustentacion}}
- Hora: {{Hora_Sustentacion}}
- Lugar: Sala de Grados y Títulos / Plataforma Institucional EPIC - UTEA Filial Cusco.

ARTÍCULO TERCERO.- ENCARGAR al Jurado Evaluador la calificación y suscripción del Acta Oficial de Sustentación de Prácticas Pre Profesionales.

REGÍSTRESE, COMUNÍQUESE Y CÚMPLASE.


________________________________________
SUB DIRECCIÓN DE ESCUELA PROFESIONAL
Ingeniería Civil · UTEA Filial Cusco`,

  // 4. APROBACIÓN - INFORME
  informe_aprobacion: `INFORME Nº {{Informe_Aprobacion}}-2026-COMISIÓN-PPP-EPIC-UTEA

A:
Dr. Ing. SUB DIRECTOR DE LA ESCUELA PROFESIONAL DE INGENIERÍA CIVIL
Universidad Tecnológica de los Andes - Filial Cusco

DE:
COMISIÓN DE PRÁCTICAS PRE PROFESIONALES (PPP)

ASUNTO:
Aprobación Final de Prácticas Pre Profesionales (480 Horas Lectivas)

REFERENCIA:
FUT Nº {{FUT_Aprobacion}} · Expediente Nº {{EXP_Aprobacion}}
Fecha de Solicitud: {{Fecha_FUT_Aprobacion}}

FECHA:
Cusco, {{Fecha_Informe_Aprobacion}}

Por medio del presente, nos dirigimos a su despacho a fin de elevar el expediente consolidado correspondiente al estudiante {{ALUMNO}}, con Código de Matrícula Nº {{CODIGO}}, sobre Aprobación Final de Prácticas Pre Profesionales.

ANTECEDENTES Y EVALUACIÓN:
1. El estudiante realizó sus prácticas en {{EMPRESA}}, habiendo iniciado el {{Fecha de inicio de  Practicas Pre profesionales}} y culminado su periodo reglamentario, completando cuatrocientas ochenta (480) horas lectivas.
2. Contó con el asesoramiento del docente {{Asesor_Nombre}}.
3. El Acto de Sustentación se llevó a cabo con calificación aprobatoria ante el Jurado Evaluador integrado por {{Presidente_Jurado}} (Presidente) y {{Miembro_Jurado}} (Miembro).

CONCLUSIÓN:
Habiéndose verificado el cumplimiento estricto del Estatuto y Reglamento General de Prácticas Pre Profesionales de la Universidad Tecnológica de los Andes, esta Comisión emite OPINIÓN FAVORABLE para que se expida la Resolución Sub Directoral de APROBACIÓN FINAL DE PRÁCTICAS PRE PROFESIONALES.

Atentamente,


________________________________________
COMISIÓN DE PRÁCTICAS PRE PROFESIONALES
Escuela Profesional de Ingeniería Civil
Universidad Tecnológica de los Andes · Filial Cusco`,

  // 4. APROBACIÓN - RESOLUCIÓN
  resolucion_aprobacion: `RESOLUCIÓN SUB DIRECTORAL Nº {{Resolucion_Aprobacion}}-2026-UTEA-FC-FI-EPIC

Cusco, {{Fecha_Resolucion_Aprobacion}}

VISTO:
El Expediente consolidado Nº {{EXP_Aprobacion}} con FUT Nº {{FUT_Aprobacion}}, y el Informe Nº {{Informe_Aprobacion}} de la Comisión de Prácticas Pre Profesionales de la Escuela Profesional de Ingeniería Civil;

CONSIDERANDO:
Que, el estudiante {{ALUMNO}}, con Código de Matrícula Nº {{CODIGO}}, ha desarrollado y sustentado satisfactoriamente sus Prácticas Pre Profesionales en la institución/empresa {{EMPRESA}};

Que, consta en el expediente la acreditación del cumplimiento de cuatrocientas ochenta (480) horas lectivas de prácticas pre profesionales, el informe favorable del docente asesor {{Asesor_Nombre}} y el Acta de Aprobación de Sustentación suscrita por el Jurado Evaluador;

Que, de conformidad a las atribuciones conferidas a esta Sub Dirección;

SE RESUELVE:
ARTÍCULO PRIMERO.- APROBAR las Prácticas Pre Profesionales (PPP) desarrolladas por el estudiante {{ALUMNO}}, identificado con Código de Matrícula Nº {{CODIGO}}, realizadas en la entidad {{EMPRESA}}, por un total acumulado de cuatrocientas ochenta (480) horas lectivas reglamentarias.

ARTÍCULO SEGUNDO.- DISPONER la remisión de la presente Resolución a la Dirección de Escuela, Comisión de Grados y Títulos, y a la Oficina de Registros Académicos de la UTEA para la respectiva convalidación curricular.

ARTÍCULO TERCERO.- FELICITAR al estudiante por el cumplimiento del requisito académico y reconocer la labor del docente asesor y jurados evaluadores intervinientes.

REGÍSTRESE, COMUNÍQUESE Y ARCHÍVESE.


________________________________________
SUB DIRECCIÓN DE ESCUELA PROFESIONAL
Ingeniería Civil · UTEA Filial Cusco`,
};

