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
 * Plantillas Oficial UTEA - Vacías por defecto
 * El sistema funciona al 100% con los archivos .docx que el usuario sube manualmente.
 */
export const OFFICIAL_TEMPLATES: Record<TemplateKey, string> = {
  informe_designacion: '',
  resolucion_designacion: '',
  informe_reasignacion: '',
  resolucion_reasignacion: '',
  informe_sustentacion: '',
  resolucion_sustentacion: '',
  informe_aprobacion: '',
  resolucion_aprobacion: '',
};
