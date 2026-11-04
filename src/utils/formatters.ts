import { Student, TramiteRecord } from '../types';
import { formatDateSpanish, add4MonthsFormatted } from './dateUtils';
import { getTemplateTags } from './tagEngine';
import { renderTemplateText } from '../data/officialTemplates';
import { TemplateKey, getActiveTemplateText } from './docxEngine';

// Re-export date utilities for backwards compatibility
export { formatDateSpanish, add4MonthsFormatted };

/**
 * Transforms string so each word starts with a capital letter (Title Case)
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (!word) return '';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Uppercase helper
 */
export function toUpperCase(str: string): string {
  if (!str) return '';
  return str.toUpperCase();
}

/**
 * Sanitizes student code to ensure uppercase and trimmed
 * Format: e.g. 202300220F (always ends in an uppercase letter)
 */
export function formatStudentCode(code: string): string {
  if (!code) return '';
  return code.trim().toUpperCase();
}

/**
 * Validates that the student code ends with an uppercase letter (e.g. 202300220F)
 */
export function isValidStudentCode(code: string): boolean {
  if (!code) return false;
  const trimmed = code.trim().toUpperCase();
  return /^[A-Z0-9]+[A-Z]$/.test(trimmed);
}

/**
 * Filters input to keep numbers only
 */
export function filterNumeric(str: string): string {
  if (!str) return '';
  return str.replace(/\D/g, '');
}

/**
 * Official Document Generation Engine
 * Uses the exact institutional UTEA templates for all 4 trámites
 */
export function generateDocuments(student: Student, record: TramiteRecord): {
  informe: string;
  resolucion: string;
  informeTitle: string;
  resolucionTitle: string;
} {
  const tags = getTemplateTags(student, record);

  const informeKey = `informe_${record.type}` as TemplateKey;
  const resolucionKey = `resolucion_${record.type}` as TemplateKey;

  const rawInformeTemplate = getActiveTemplateText(informeKey) || '';
  const rawResolucionTemplate = getActiveTemplateText(resolucionKey) || '';

  const generatedInforme = rawInformeTemplate ? renderTemplateText(rawInformeTemplate, tags) : '';
  const generatedResolucion = rawResolucionTemplate ? renderTemplateText(rawResolucionTemplate, tags) : '';

  const informeNum = filterNumeric(tags['Informe_Numero'] || '') || '045';
  const resolucionNum = filterNumeric(tags['Resolucion_Numero'] || '') || '583';

  const typeLabels: Record<string, string> = {
    designacion: 'DESIGNACIÓN ASESOR PPP',
    reasignacion: 'REASIGNACIÓN ASESOR PPP',
    sustentacion: 'DESIGNACIÓN JURADO SUSTENTACIÓN',
    aprobacion: 'APROBACIÓN FINAL DE PPP',
  };

  const informeTitle = `INFORME Nº ${informeNum} - ${typeLabels[record.type] || 'PPP'}`;
  const resolucionTitle = `RESOLUCIÓN SUB DIRECTORAL Nº ${resolucionNum}-2026-UTEA-FC-FI-EPIC`;

  return {
    informe: record.customInformeText || generatedInforme,
    resolucion: record.customResolucionText || generatedResolucion,
    informeTitle,
    resolucionTitle,
  };
}
