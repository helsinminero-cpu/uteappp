import { Student, TramiteRecord } from '../types';
import { formatDateSpanish, add4MonthsFormatted } from './dateUtils';

/**
 * Cleans report number so it contains numbers only
 */
export function cleanReportNumber(val?: string, fallback: string = ''): string {
  if (!val) return fallback;
  const num = val.replace(/\D/g, '');
  return num || fallback;
}

/**
 * Helper to build replacement tags dictionary
 * Ensures each of the 4 trámites has its OWN independent FUT, Expediente, Informe and Resolución
 * All report numbers (informes) contain numbers only
 */
export function getTemplateTags(
  student: Student, 
  record: TramiteRecord, 
  allStudentTramites?: TramiteRecord[]
): Record<string, string> {
  const fechaInicio = formatDateSpanish(student.startDate);
  const fechaFin = add4MonthsFormatted(student.startDate);

  // Try to find sibling trámites of the same student for antecedent references or cross-tags
  let siblings = allStudentTramites;
  if (!siblings && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('utea_ppp_tramites_v1');
      if (raw) {
        const parsed: TramiteRecord[] = JSON.parse(raw);
        siblings = parsed.filter(t => t.studentId === student.id || t.studentCode === student.studentCode);
      }
    } catch {
      // Ignore
    }
  }

  const tramDesignacion = record.type === 'designacion' ? record : siblings?.find(t => t.type === 'designacion');
  const tramReasignacion = record.type === 'reasignacion' ? record : siblings?.find(t => t.type === 'reasignacion');
  const tramSustentacion = record.type === 'sustentacion' ? record : siblings?.find(t => t.type === 'sustentacion');
  const tramAprobacion = record.type === 'aprobacion' ? record : siblings?.find(t => t.type === 'aprobacion');

  const des = tramDesignacion?.designacion;
  const rea = tramReasignacion?.reasignacion;
  const sus = tramSustentacion?.sustentacion;
  const apr = tramAprobacion?.aprobacion;

  const baseTags: Record<string, string> = {
    // Alumno
    'Apellidos_y_Nombres': student.fullName,
    'Apellidos y Nombres del Alumno': student.fullName,
    'ALUMNO': student.fullName,
    'Alumno': student.fullName,
    'Codigo_Alumno': student.studentCode,
    'Codigo del Alumno': student.studentCode,
    'Codigo del Alumno ': student.studentCode,
    'CODIGO': student.studentCode,
    'Codigo': student.studentCode,
    'Organizacion': student.organization,
    'Organizacion en la que esta realizando las Practicas Pre profesionales': student.organization,
    'EMPRESA': student.organization,
    'Empresa': student.organization,
    'Fecha_Inicio_PPP': fechaInicio,
    'Fecha de inicio de  Practicas Pre profesionales': fechaInicio,
    'Fecha de inicio de Practicas Pre profesionales': fechaInicio,
    'Fecha_Fin_PPP': fechaFin,
    'agregar 4 meses a la fecha de inicio de Practicas': fechaFin,
    'Correo': student.email,

    // Cross-tramite distinct tags (disponibles en cualquier documento)
    // 1. Designación
    'FUT_Designacion': des?.futNumber || '',
    'Fecha_FUT_Designacion': formatDateSpanish(des?.futDate),
    'EXP_Designacion': des?.expedienteNumber || '',
    'Informe_Designacion': cleanReportNumber(des?.informeNumber, '045'),
    'Fecha_Informe_Designacion': formatDateSpanish(des?.informeDate || des?.futDate),
    'Resolucion_Designacion': des?.adminResolutionNumber || '583',
    'Fecha_Resolucion_Designacion': formatDateSpanish(des?.adminResolutionDate || des?.futDate),

    // 2. Reasignación
    'FUT_Reasignacion': rea?.futNumber || '',
    'Fecha_FUT_Reasignacion': formatDateSpanish(rea?.futDate),
    'EXP_Reasignacion': rea?.expedienteNumber || '',
    'Informe_Reasignacion': cleanReportNumber(rea?.informeNumber, '052'),
    'Fecha_Informe_Reasignacion': formatDateSpanish(rea?.informeDate || rea?.futDate),
    'Resolucion_Reasignacion': rea?.adminResolutionNumber || '590',
    'Fecha_Resolucion_Reasignacion': formatDateSpanish(rea?.adminResolutionDate || rea?.futDate),

    // 3. Sustentación
    'FUT_Sustentacion': sus?.futNumber || '',
    'Fecha_FUT_Sustentacion': formatDateSpanish(sus?.futDate),
    'EXP_Sustentacion': sus?.expedienteNumber || '',
    'Informe_Sustentacion': cleanReportNumber(sus?.juryDesignationReportNumber, '088'),
    'Fecha_Informe_Sustentacion': formatDateSpanish(sus?.juryDesignationReportDate || sus?.futDate),
    'Resolucion_Sustentacion': sus?.adminResolutionNumber || '612',
    'Fecha_Resolucion_Sustentacion': formatDateSpanish(sus?.adminResolutionDate || sus?.futDate),

    // 4. Aprobación
    'FUT_Aprobacion': apr?.futNumber || '',
    'Fecha_FUT_Aprobacion': formatDateSpanish(apr?.futDate),
    'EXP_Aprobacion': apr?.expedienteNumber || '',
    'Informe_Aprobacion': cleanReportNumber(apr?.juryApprovalReportNumber, '098'),
    'Fecha_Informe_Aprobacion': formatDateSpanish(apr?.juryApprovalReportDate || apr?.futDate),
    'Resolucion_Aprobacion': apr?.adminResolutionNumber || '745',
    'Fecha_Resolucion_Aprobacion': formatDateSpanish(apr?.adminResolutionDate || apr?.futDate),
  };

  // ================= 1. TRÁMITE DE DESIGNACIÓN =================
  if (record.type === 'designacion' && record.designacion) {
    const d = record.designacion;
    const fut = d.futNumber || '';
    const futDate = formatDateSpanish(d.futDate);
    const exp = d.expedienteNumber || '';
    const infNum = cleanReportNumber(d.informeNumber, '045');
    const infDate = formatDateSpanish(d.informeDate || d.futDate);
    const resolNum = d.adminResolutionNumber || '583';
    const resolDate = formatDateSpanish(d.adminResolutionDate || d.futDate);
    const asesor = d.advisorName || 'Mg. Ing. Carlos Mendoza Estrada';

    return {
      ...baseTags,
      // Etiquetas específicas de Designación
      'Numero de FUT solicitud de Asesor': fut,
      'Numero de FUT de solicitud de Asesor': fut,
      'Fecha de FUT de solicitud de Asesor': futDate,
      'Numero de Expediente Fut de Asesor': exp,
      'Numero de Expediente FUT de Asesor': exp,
      'Informe de designacion de asesor de Practicas Pre Profesionales': infNum,
      'Fecha de Informe de designacion de asesor de Practicas Pre Profesionales': infDate,
      'numero de resolucion de designacion asesor': resolNum,
      'Numero de resolucion de designacion asesor': resolNum,
      'Fecha de resolucion de designacion de asesor de Practicas Pre Profesionales': resolDate,
      'Nombre completo del asesor': asesor,
      'Asesor': asesor,
      'Asesor_Nombre': asesor,

      // Etiquetas genéricas en el contexto del trámite 1 (Designación)
      'FUT': fut,
      'FUT_Numero': fut,
      'Numero de FUT': fut,
      'Fecha_FUT': futDate,
      'FUT_Fecha': futDate,
      'Fecha de FUT': futDate,
      'EXP': exp,
      'EXPEDIENTE': exp,
      'Expediente_Numero': exp,
      'Numero de Expediente': exp,
      'Informe_Numero': infNum,
      'Numero de Informe': infNum,
      'Informe_Fecha': infDate,
      'Fecha_Informe': infDate,
      'Fecha de Informe': infDate,
      'numero de resolucion': resolNum,
      'Numero de resolucion': resolNum,
      'Resolucion_Numero': resolNum,
      'Fecha de resolucion': resolDate,
      'Resolucion_Fecha': resolDate,
    };
  }

  // ================= 2. TRÁMITE DE REASIGNACIÓN =================
  if (record.type === 'reasignacion' && record.reasignacion) {
    const r = record.reasignacion;
    const fut = r.futNumber || '';
    const futDate = formatDateSpanish(r.futDate);
    const exp = r.expedienteNumber || '';
    const infNum = cleanReportNumber(r.informeNumber, '052');
    const infDate = formatDateSpanish(r.informeDate || r.futDate);
    const resolNum = r.adminResolutionNumber || '590';
    const resolDate = formatDateSpanish(r.adminResolutionDate || r.futDate);
    const nuevoAsesor = r.newAdvisorName || 'Mg. Ing. Luis Fernando Palomino Rivas';

    return {
      ...baseTags,
      // Etiquetas específicas de Reasignación
      'Resolucion de Designacion de asesor actual': r.currentResolution,
      'Resolucion_Actual': r.currentResolution,
      'fecha Resolucion de Designacion de asesor actual': formatDateSpanish(r.currentResolutionDate),
      'Fecha_Resolucion_Actual': formatDateSpanish(r.currentResolutionDate),
      'nombre de asesor actual': r.currentAdvisorName,
      'Asesor_Actual': r.currentAdvisorName,
      'Numero de FUT de solicitud de Reasignacion de asesor': fut,
      'Fecha de FUT de solicitud de reasignacion de Asesor': futDate,
      'Numero de Expediente de reasignacion de Asesor': exp,
      'Informe de reasignacion de asesor de Practicas Pre Profesionales': infNum,
      'Fecha de Informe de reasignacion de asesor de Practicas Pre Profesionales': infDate,
      'Nombre completo del nuevo asesor': nuevoAsesor,
      'Nuevo_Asesor': nuevoAsesor,
      'Asesor': nuevoAsesor,
      'numero de resolucion de reasignacion asesor': resolNum,
      'Numero de resolucion de reasignacion asesor': resolNum,
      'Fecha de resolucion de reasignacion de asesor de Practicas Pre Profesionales': resolDate,

      // Etiquetas genéricas en el contexto del trámite 2 (Reasignación)
      'FUT': fut,
      'FUT_Numero': fut,
      'Numero de FUT': fut,
      'Fecha_FUT': futDate,
      'FUT_Fecha': futDate,
      'Fecha de FUT': futDate,
      'EXP': exp,
      'EXPEDIENTE': exp,
      'Expediente_Numero': exp,
      'Numero de Expediente': exp,
      'Informe_Numero': infNum,
      'Numero de Informe': infNum,
      'Informe_Fecha': infDate,
      'Fecha_Informe': infDate,
      'Fecha de Informe': infDate,
      'numero de resolucion': resolNum,
      'Numero de resolucion': resolNum,
      'Resolucion_Numero': resolNum,
      'Fecha de resolucion': resolDate,
      'Resolucion_Fecha': resolDate,
    };
  }

  // ================= 3. TRÁMITE DE SUSTENTACIÓN =================
  if (record.type === 'sustentacion' && record.sustentacion) {
    const s = record.sustentacion;
    const fut = s.futNumber || '';
    const futDate = formatDateSpanish(s.futDate);
    const exp = s.expedienteNumber || '';
    const infJuradoNum = cleanReportNumber(s.juryDesignationReportNumber, '088');
    const infAsesorAprobNum = cleanReportNumber(s.advisorApprovalReportNumber, '018');
    const infJuradoDate = formatDateSpanish(s.juryDesignationReportDate || s.futDate);
    const resolNum = s.adminResolutionNumber || '612';
    const resolDate = formatDateSpanish(s.adminResolutionDate || s.futDate);
    const fechaSustentacion = formatDateSpanish(s.defenseDate || s.futDate);
    const horaSustentacion = s.defenseTime || '10:00';
    const presidente = s.presidentName || 'Mg. Ing. Jorge Armando Cardenas Galiano';
    const miembro = s.memberName || 'Mg. Ing. Paul Gerardo Vargas Meza';

    return {
      ...baseTags,
      // Etiquetas específicas de Sustentación
      'nombre completo de su asesor': s.advisorName,
      'Ingresar nombre completo de su asesor': s.advisorName,
      'Asesor': s.advisorName,
      'Numero de FUT de solicitud de Sustentacion de Practicas Pre profesionales': fut,
      'Fecha de FUT de solicitud de sustentacion de PracticasPre Profesionales': futDate,
      'Fecha de FUT de solicitud de sustentacion de Practicas Pre Profesionales': futDate,
      'Numero de Expediente de sustentacion de Practicas Pre Profesionales': exp,
      'Informe de aprobacion de Practicas Pre Profesionales del asesor': infAsesorAprobNum,
      'Informe_Aprobacion_Asesor': infAsesorAprobNum,
      'Fecha de Informe de aprobacion de Practicas Pre Profesionales del asesor': formatDateSpanish(s.advisorApprovalReportDate),
      'Fecha_Aprobacion_Asesor': formatDateSpanish(s.advisorApprovalReportDate),
      'Informe de Designacion de jurado revisor de Practicas Pre Profesionales': infJuradoNum,
      'Informe_Jurado': infJuradoNum,
      'Fecha de Informe de designacion de jurado de Practicas Pre Profesionales': infJuradoDate,
      'Fecha_Jurado': infJuradoDate,
      'Presidente': presidente,
      'Miembro': miembro,
      'Fecha que se realizara la sustentacion de Practicas Pre Profesionales': fechaSustentacion,
      'Fecha_Sustentacion': fechaSustentacion,
      'Hora que se realizara la sustentacion de Practicas Pre Profesionales': horaSustentacion,
      'Hora_Sustentacion': horaSustentacion,
      'numero de resolucion de sustentacion de ppp': resolNum,
      'Numero de resolucion de sustentacion de ppp': resolNum,
      'Fecha de resolucion de sustentacion de Practicas Pre Profesionales': resolDate,

      // Etiquetas genéricas en el contexto del trámite 3 (Sustentación)
      'FUT': fut,
      'FUT_Numero': fut,
      'Numero de FUT': fut,
      'Fecha_FUT': futDate,
      'FUT_Fecha': futDate,
      'Fecha de FUT': futDate,
      'EXP': exp,
      'EXPEDIENTE': exp,
      'Expediente_Numero': exp,
      'Numero de Expediente': exp,
      'Informe_Numero': infJuradoNum,
      'Numero de Informe': infJuradoNum,
      'Informe_Fecha': infJuradoDate,
      'Fecha_Informe': infJuradoDate,
      'Fecha de Informe': infJuradoDate,
      'numero de resolucion': resolNum,
      'Numero de resolucion': resolNum,
      'Resolucion_Numero': resolNum,
      'Fecha de resolucion': resolDate,
      'Resolucion_Fecha': resolDate,
    };
  }

  // ================= 4. TRÁMITE DE APROBACIÓN =================
  if (record.type === 'aprobacion' && record.aprobacion) {
    const a = record.aprobacion;
    // Identificadores independientes de este trámite de Aprobación
    const fut = a.futNumber || '71045';
    const futDate = formatDateSpanish(a.futDate || a.advisorDesignationReportDate);
    const exp = a.expedienteNumber || '31280';
    const infAprobNum = cleanReportNumber(a.juryApprovalReportNumber, '098');
    const infAprobDate = formatDateSpanish(a.juryApprovalReportDate || a.futDate || a.advisorDesignationReportDate);
    const resolNum = a.adminResolutionNumber || '745';
    const resolDate = formatDateSpanish(a.adminResolutionDate || a.futDate || a.advisorDesignationReportDate);

    // Antecedentes (tomados del registro o de los trámites previos)
    const asesor = a.advisorName || des?.advisorName || rea?.newAdvisorName || 'Mg. Ing. Carlos Mendoza Estrada';
    const futSust = a.futSustentacionNumber || sus?.futNumber || '58902';
    const futSustDate = formatDateSpanish(a.futSustentacionDate || sus?.futDate || a.advisorDesignationReportDate);
    const resolSust = a.resolutionSustentacionNumber || sus?.adminResolutionNumber || '612';
    const resolSustDate = formatDateSpanish(a.resolutionSustentacionDate || sus?.adminResolutionDate || a.advisorDesignationReportDate);
    const infJuradoRevisorNum = cleanReportNumber(a.juryDesignationReportNumber || sus?.juryDesignationReportNumber, '088');
    const infJuradoRevisorDate = formatDateSpanish(a.juryDesignationReportDate || sus?.juryDesignationReportDate || a.advisorDesignationReportDate);
    const presSust = a.presidentName || sus?.presidentName || 'Mg. Ing. Jorge Armando Cardenas Galiano';
    const miembroSust = a.memberName || sus?.memberName || 'Mg. Ing. Paul Gerardo Vargas Meza';
    const infAsesorDesigNum = cleanReportNumber(a.advisorDesignationReportNumber || des?.informeNumber, '024');

    return {
      ...baseTags,
      // Identificadores propios e independientes de Aprobación
      'Numero de FUT de Aprobacion': fut,
      'Numero de FUT de aprobacion de Practicas Pre Profesionales': fut,
      'Fecha de FUT de Aprobacion': futDate,
      'Fecha de FUT de aprobacion de Practicas Pre Profesionales': futDate,
      'Numero de Expediente de Aprobacion': exp,
      'Numero de Expediente de aprobacion de Practicas Pre Profesionales': exp,
      'Informe de aprobacion de Practicas Pre Profesionales del jurado': infAprobNum,
      'Fecha de Informe de aprobacion de Practicas Pre Profesionales del jurado': infAprobDate,
      'Numero de resolucion de aprobacion': resolNum,
      'Numero de resolucion de aprobación': resolNum,
      'numero de resolucion de aprobacion': resolNum,
      'Fecha de resolucion de aprobacion': resolDate,
      'Fecha de resolucion de aprobación': resolDate,
      'Fecha de resolucion de aprovacion': resolDate, // Compatibilidad con plantilla original UTEA

      // Antecedentes de trámites previos citados en la resolución de aprobación
      'Escribir el numero de Informe de designacion de asesor de Practicas Pre Profesionales': infAsesorDesigNum,
      'Fecha de Informe de asignacion de asesor de Practicas Pre Profesionales': formatDateSpanish(a.advisorDesignationReportDate || des?.informeDate),
      'Resolucion de Designacion de asesor revisor de Practicas Pre Profesionales': a.advisorReviewerResolution || des?.adminResolutionNumber || '583',
      'Fecha de Resolucion de Designacion de asesor revisor de Practicas Pre Profesionales': formatDateSpanish(a.advisorReviewerResolutionDate || des?.adminResolutionDate),
      'Asesor actual': asesor,
      'Asesor': asesor,
      'Numero de FUT de solicitud de Sustentacion de PPP': futSust,
      'Fecha de FUT de solicitud de sustentacion de PPP': futSustDate,
      'Numero de resolucion sustentacion de PPP': resolSust,
      'Fecha de resolucion de sustentacion de PPP': resolSustDate,
      'Informe de Designacion del jurado revisor de Practicas Pre Profesionales': infJuradoRevisorNum,
      'Informe de Designacion de jurado revisor de Practicas Pre Profesionales': infJuradoRevisorNum,
      'Fecha de Informe de designacion del jurado de Practicas Pre Profesionales': infJuradoRevisorDate,
      'Fecha de Informe de designacion de jurado de Practicas Pre Profesionales': infJuradoRevisorDate,
      'Presidente sustentacion': presSust,
      'Miembro sustentacion': miembroSust,
      'Presidente': presSust,
      'Miembro': miembroSust,

      // Etiquetas genéricas en el contexto del trámite 4 (Aprobación) - INDEPENDIENTES
      'FUT': fut,
      'FUT_Numero': fut,
      'Numero de FUT': fut,
      'Fecha_FUT': futDate,
      'FUT_Fecha': futDate,
      'Fecha de FUT': futDate,
      'EXP': exp,
      'EXPEDIENTE': exp,
      'Expediente_Numero': exp,
      'Numero de Expediente': exp,
      'Informe_Numero': infAprobNum,
      'Numero de Informe': infAprobNum,
      'Informe_Fecha': infAprobDate,
      'Fecha_Informe': infAprobDate,
      'Fecha de Informe': infAprobDate,
      'numero de resolucion': resolNum,
      'Numero de resolucion': resolNum,
      'Resolucion_Numero': resolNum,
      'Fecha de resolucion': resolDate,
      'Resolucion_Fecha': resolDate,
    };
  }

  return baseTags;
}
