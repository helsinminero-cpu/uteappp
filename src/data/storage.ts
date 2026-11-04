import { Student, TramiteRecord } from '../types';
import { INITIAL_STUDENTS, INITIAL_TRAMITES } from './initialData';

const STORAGE_STUDENTS_KEY = 'utea_ppp_students_v1';
const STORAGE_TRAMITES_KEY = 'utea_ppp_tramites_v1';

/**
 * Filter numeric characters only
 */
function cleanDigits(val?: string, fallback: string = ''): string {
  if (!val) return fallback;
  const num = val.replace(/\D/g, '');
  return num || fallback;
}

/**
 * Sanitizes a TramiteRecord so the database ONLY stores the fillable fields (los rellenables)
 * needed to generate the Word and PDF documents, eliminating raw texts, bloated dumps, and logs.
 */
export function sanitizeTramiteRecord(record: TramiteRecord): TramiteRecord {
  const clean: TramiteRecord = {
    id: record.id,
    studentId: record.studentId,
    studentCode: record.studentCode ? record.studentCode.trim().toUpperCase() : '',
    type: record.type,
    submittedAt: record.submittedAt || new Date().toISOString(),
    updatedAt: record.updatedAt || new Date().toISOString(),
    status: record.status || 'pendiente',
  };

  // Solo rellenables de Designación
  if (record.designacion || record.type === 'designacion') {
    const des = record.designacion || ({} as any);
    clean.designacion = {
      futNumber: cleanDigits(des.futNumber),
      futDate: des.futDate || '',
      expedienteNumber: cleanDigits(des.expedienteNumber),
      informeNumber: cleanDigits(des.informeNumber) || undefined,
      informeDate: des.informeDate || undefined,
      advisorName: des.advisorName?.trim() || undefined,
      adminResolutionNumber: cleanDigits(des.adminResolutionNumber) || undefined,
      adminResolutionDate: des.adminResolutionDate || undefined,
    };
  }

  // Solo rellenables de Reasignación
  if (record.reasignacion || record.type === 'reasignacion') {
    const rea = record.reasignacion || ({} as any);
    clean.reasignacion = {
      currentResolution: rea.currentResolution?.trim() || '',
      currentResolutionDate: rea.currentResolutionDate || '',
      currentAdvisorName: rea.currentAdvisorName?.trim() || '',
      futNumber: cleanDigits(rea.futNumber),
      futDate: rea.futDate || '',
      expedienteNumber: cleanDigits(rea.expedienteNumber),
      informeNumber: cleanDigits(rea.informeNumber) || undefined,
      informeDate: rea.informeDate || undefined,
      newAdvisorName: rea.newAdvisorName?.trim() || undefined,
      adminResolutionNumber: cleanDigits(rea.adminResolutionNumber) || undefined,
      adminResolutionDate: rea.adminResolutionDate || undefined,
    };
  }

  // Solo rellenables de Sustentación
  if (record.sustentacion || record.type === 'sustentacion') {
    const sus = record.sustentacion || ({} as any);
    clean.sustentacion = {
      advisorName: sus.advisorName?.trim() || '',
      futNumber: cleanDigits(sus.futNumber),
      futDate: sus.futDate || '',
      expedienteNumber: cleanDigits(sus.expedienteNumber),
      advisorApprovalReportNumber: cleanDigits(sus.advisorApprovalReportNumber),
      advisorApprovalReportDate: sus.advisorApprovalReportDate || '',
      juryDesignationReportNumber: cleanDigits(sus.juryDesignationReportNumber) || undefined,
      juryDesignationReportDate: sus.juryDesignationReportDate || undefined,
      presidentName: sus.presidentName?.trim() || undefined,
      memberName: sus.memberName?.trim() || undefined,
      defenseDate: sus.defenseDate || undefined,
      defenseTime: sus.defenseTime || undefined,
      adminResolutionNumber: cleanDigits(sus.adminResolutionNumber) || undefined,
      adminResolutionDate: sus.adminResolutionDate || undefined,
    };
  }

  // Solo rellenables de Aprobación
  if (record.aprobacion || record.type === 'aprobacion') {
    const apr = record.aprobacion || ({} as any);
    clean.aprobacion = {
      futNumber: cleanDigits(apr.futNumber),
      futDate: apr.futDate || '',
      expedienteNumber: cleanDigits(apr.expedienteNumber),
      advisorDesignationReportNumber: cleanDigits(apr.advisorDesignationReportNumber),
      advisorDesignationReportDate: apr.advisorDesignationReportDate || '',
      advisorReviewerResolution: apr.advisorReviewerResolution?.trim() || '',
      advisorReviewerResolutionDate: apr.advisorReviewerResolutionDate || '',
      juryApprovalReportNumber: cleanDigits(apr.juryApprovalReportNumber) || undefined,
      juryApprovalReportDate: apr.juryApprovalReportDate || undefined,
      adminResolutionNumber: cleanDigits(apr.adminResolutionNumber) || undefined,
      adminResolutionDate: apr.adminResolutionDate || undefined,
      advisorName: apr.advisorName?.trim() || undefined,
      futSustentacionNumber: cleanDigits(apr.futSustentacionNumber) || undefined,
      futSustentacionDate: apr.futSustentacionDate || undefined,
      resolutionSustentacionNumber: cleanDigits(apr.resolutionSustentacionNumber) || undefined,
      resolutionSustentacionDate: apr.resolutionSustentacionDate || undefined,
      juryDesignationReportNumber: cleanDigits(apr.juryDesignationReportNumber) || undefined,
      juryDesignationReportDate: apr.juryDesignationReportDate || undefined,
      presidentName: apr.presidentName?.trim() || undefined,
      memberName: apr.memberName?.trim() || undefined,
    };
  }

  return clean;
}

export function getStoredStudents(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_STUDENTS_KEY);
    if (!raw) {
      saveStudents(INITIAL_STUDENTS);
      return INITIAL_STUDENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_STUDENTS;
  }
}

export function saveStudents(students: Student[]): void {
  try {
    localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(students));
  } catch (err) {
    console.error('Error saving students to localStorage', err);
  }
}

export function getStoredTramites(): TramiteRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_TRAMITES_KEY);
    if (!raw) {
      const sanitizedInitial = INITIAL_TRAMITES.map(sanitizeTramiteRecord);
      saveTramites(sanitizedInitial);
      return sanitizedInitial;
    }
    const parsed: TramiteRecord[] = JSON.parse(raw);
    const sanitized = parsed.map(sanitizeTramiteRecord);
    return sanitized;
  } catch {
    return INITIAL_TRAMITES.map(sanitizeTramiteRecord);
  }
}

export function saveTramites(tramites: TramiteRecord[]): void {
  try {
    // Garantiza que la base de datos almacene estrictamente solo los rellenables
    const sanitized = tramites.map(sanitizeTramiteRecord);
    localStorage.setItem(STORAGE_TRAMITES_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.error('Error saving tramites to localStorage', err);
  }
}

export function resetToDefaults(): { students: Student[]; tramites: TramiteRecord[] } {
  const sanitizedInitialTramites = INITIAL_TRAMITES.map(sanitizeTramiteRecord);
  saveStudents(INITIAL_STUDENTS);
  saveTramites(sanitizedInitialTramites);
  return { students: INITIAL_STUDENTS, tramites: sanitizedInitialTramites };
}

/**
 * Exporta la base de datos conteniendo estrictamente los datos rellenables
 * de alumnos y trámites necesarios para generar los documentos Word y PDF.
 */
export function exportDataBackup(): string {
  const students = getStoredStudents();
  const tramites = getStoredTramites().map(sanitizeTramiteRecord);
  const data = {
    app: 'UTEA_PPP_GESTOR',
    version: '2.1',
    descripcion: 'Base de datos exclusiva de rellenables de alumnos y tramites para generacion dinamica de Word (.docx) y PDF',
    exportedAt: new Date().toISOString(),
    students,
    tramites,
    summary: {
      totalStudents: students.length,
      totalTramites: tramites.length,
    },
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Importa y restaura la base de datos de rellenables desde un archivo JSON
 */
export function importDataBackup(jsonString: string): { 
  success: boolean; 
  countStudents: number; 
  countTramites: number; 
  countTemplates: number;
  error?: string 
} {
  try {
    const data = JSON.parse(jsonString);
    if (!data || !Array.isArray(data.students) || !Array.isArray(data.tramites)) {
      return { 
        success: false, 
        countStudents: 0, 
        countTramites: 0, 
        countTemplates: 0,
        error: 'El archivo seleccionado no tiene el formato de respaldo válido de UTEA PPP.' 
      };
    }
    const sanitizedTramites = data.tramites.map(sanitizeTramiteRecord);
    saveStudents(data.students);
    saveTramites(sanitizedTramites);

    return { 
      success: true, 
      countStudents: data.students.length, 
      countTramites: sanitizedTramites.length,
      countTemplates: 0,
    };
  } catch (e: any) {
    return { 
      success: false, 
      countStudents: 0, 
      countTramites: 0, 
      countTemplates: 0,
      error: `Error al procesar el archivo JSON: ${e.message}` 
    };
  }
}
