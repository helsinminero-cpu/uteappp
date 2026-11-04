import PizZip from 'pizzip';
import { TemplateKey, generateDocxFromTemplate } from './docxEngine';

export interface StoredTemplateItem {
  base64: string;
  fileName: string;
  uploadedAt: string;
  fileSizeBytes?: number;
  isCustom: boolean; // true = uploaded by user
}

export interface TemplateDefinition {
  key: TemplateKey;
  title: string;
  category: 'Designación' | 'Reasignación' | 'Sustentación' | 'Aprobación';
  type: 'informe' | 'resolucion';
  fileName: string;
}

export const DEFAULT_TEMPLATE_DEFS: TemplateDefinition[] = [
  { key: 'informe_designacion', title: 'Informe de Designación de Asesor', category: 'Designación', type: 'informe', fileName: 'Informe_Designacion_Asesor_PPP.docx' },
  { key: 'resolucion_designacion', title: 'Resolución de Designación de Asesor', category: 'Designación', type: 'resolucion', fileName: 'Resol_Designacion_Asesor.docx' },
  { key: 'informe_reasignacion', title: 'Informe de Reasignación de Asesor', category: 'Reasignación', type: 'informe', fileName: 'Informe_de_reasignacion_PPP.docx' },
  { key: 'resolucion_reasignacion', title: 'Resolución de Reasignación de Asesor', category: 'Reasignación', type: 'resolucion', fileName: 'Resol_reasignacion_PPP.docx' },
  { key: 'informe_sustentacion', title: 'Informe de Designación de Jurado Sustentación', category: 'Sustentación', type: 'informe', fileName: 'Informe_Sustentacion_PPP.docx' },
  { key: 'resolucion_sustentacion', title: 'Resolución de Sustentación de PPP', category: 'Sustentación', type: 'resolucion', fileName: 'RESOL_Sustentacion.docx' },
  { key: 'informe_aprobacion', title: 'Informe de Aprobación Final de PPP', category: 'Aprobación', type: 'informe', fileName: 'INFORME_Aprobacion.docx' },
  { key: 'resolucion_aprobacion', title: 'Resolución Sub Directoral de Aprobación de PPP', category: 'Aprobación', type: 'resolucion', fileName: 'Resol_Aprobacion_Sustentacion_PPP.docx' },
];

const DB_NAME = 'utea_user_docx_templates_v5';
const DB_VERSION = 1;
const STORE_NAME = 'user_templates';
const LOCALSTORAGE_KEY = 'utea_custom_docx_templates_v2';
const LOCALSTORAGE_KEY_PREFIX = 'utea_tpl_v2_';
const TEXT_STORAGE_PREFIX = 'utea_tpl_text_';
const META_STORAGE_PREFIX = 'utea_tpl_meta_';

// Synchronous in-memory cache for user-uploaded templates and extracted text
let inMemoryCache: Record<string, StoredTemplateItem> = {};
const activeTemplateTextCache: Record<string, string> = {};

/**
 * Safely purges legacy bulky data and old databases from localStorage & IndexedDB
 */
function purgeLegacyBulkyLocalStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCALSTORAGE_KEY);
    for (const def of DEFAULT_TEMPLATE_DEFS) {
      localStorage.removeItem(`${LOCALSTORAGE_KEY_PREFIX}${def.key}`);
      localStorage.removeItem(`${TEXT_STORAGE_PREFIX}${def.key}`);
      localStorage.removeItem(`${META_STORAGE_PREFIX}${def.key}`);
    }
    // Delete legacy databases to ensure clean slate with zero conflicts
    if (window.indexedDB?.deleteDatabase) {
      try {
        window.indexedDB.deleteDatabase('utea_docx_templates_db');
        window.indexedDB.deleteDatabase('utea_docx_official_v4');
      } catch {}
    }
  } catch {
    // Safe ignore
  }
}

/**
 * Open IndexedDB safely for user-uploaded templates
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no soportado en este entorno.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME, { keyPath: 'key' });
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Error al abrir base de datos IndexedDB'));
    };
  });
}

/**
 * Initialize storage with ONLY the user-uploaded templates.
 * No default or pre-loaded templates exist.
 */
export async function initTemplateStorage(): Promise<Record<string, StoredTemplateItem>> {
  if (typeof window !== 'undefined') {
    purgeLegacyBulkyLocalStorage();
  }

  try {
    const db = await openDB();
    const storedItems = await new Promise<any[]>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    inMemoryCache = {};

    // Populate user-uploaded templates from IndexedDB
    for (const item of storedItems) {
      if (item && item.key && item.base64) {
        inMemoryCache[item.key] = {
          base64: item.base64,
          fileName: item.fileName,
          uploadedAt: item.uploadedAt,
          fileSizeBytes: item.fileSizeBytes,
          isCustom: true,
        };
        const text = extractTextFromDocxBase64(item.base64);
        if (text) {
          activeTemplateTextCache[item.key] = text;
        }

        try {
          const meta = {
            fileName: item.fileName,
            uploadedAt: item.uploadedAt,
            fileSizeBytes: item.fileSizeBytes,
            isCustom: true,
          };
          localStorage.setItem(`${META_STORAGE_PREFIX}${item.key}`, JSON.stringify(meta));
        } catch {}
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('utea_templates_updated', { detail: { all: true } }));
    }

    return { ...inMemoryCache };
  } catch (err) {
    console.warn('Error al sincronizar plantillas con IndexedDB:', err);
    return { ...inMemoryCache };
  }
}

// Auto-run initialization in browser environment
if (typeof window !== 'undefined') {
  initTemplateStorage().catch(() => {});
}

/**
 * Extracts plain text and paragraph structure from a .docx file's XML.
 */
export function extractTextFromDocxBase64(base64: string): string {
  if (!base64) return '';
  try {
    const binary = typeof window !== 'undefined' && window.atob
      ? window.atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const zip = new PizZip(bytes);
    const docFile = zip.file('word/document.xml');
    if (!docFile) return '';
    const xml = docFile.asText();

    if (typeof window !== 'undefined' && window.DOMParser) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'application/xml');
      const paragraphs = doc.getElementsByTagName('w:p');
      const lines: string[] = [];

      for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        let pText = '';
        const textElements = p.querySelectorAll('w\\:t, t, w\\:br, br, w\\:tab, tab');
        textElements.forEach((el) => {
          const tagName = el.tagName.toLowerCase();
          if (tagName.includes('br')) {
            pText += '\n';
          } else if (tagName.includes('tab')) {
            pText += '\t';
          } else {
            pText += el.textContent || '';
          }
        });
        lines.push(pText);
      }
      return lines.join('\n');
    }

    // Fallback regex-based extraction
    const cleanXml = xml
      .replace(/<w:p[^>]*>/g, '\n')
      .replace(/<w:br[^>]*\/>/g, '\n')
      .replace(/<w:tab[^>]*\/>/g, '\t')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");

    return cleanXml;
  } catch (err) {
    console.warn('Error al extraer texto de .docx:', err);
    return '';
  }
}

/**
 * Returns the active template text for document generation.
 */
export function getActiveTemplateText(key: TemplateKey): string {
  if (activeTemplateTextCache[key]) {
    return activeTemplateTextCache[key];
  }

  const item = inMemoryCache[key];
  if (item?.base64) {
    const text = extractTextFromDocxBase64(item.base64);
    if (text) {
      activeTemplateTextCache[key] = text;
      return text;
    }
  }

  return '';
}

/**
 * Get stored templates synchronously (from in-memory cache)
 */
export function getStoredDocxTemplates(): Record<string, StoredTemplateItem> {
  return { ...inMemoryCache };
}

/**
 * Asynchronously retrieves the active DOCX template item for a key.
 * Returns null if the user has not uploaded a .docx for this document yet.
 */
export async function getActiveDocxTemplateAsync(key: TemplateKey): Promise<StoredTemplateItem | null> {
  // 1. If in-memory cache has the uploaded template
  if (inMemoryCache[key]?.base64) {
    return inMemoryCache[key];
  }

  // 2. Query IndexedDB
  try {
    if (typeof window !== 'undefined' && window.indexedDB) {
      const db = await openDB();
      const item = await new Promise<any>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });

      if (item && item.base64) {
        const loadedItem: StoredTemplateItem = {
          base64: item.base64,
          fileName: item.fileName,
          uploadedAt: item.uploadedAt,
          fileSizeBytes: item.fileSizeBytes,
          isCustom: true,
        };
        inMemoryCache[key] = loadedItem;
        return loadedItem;
      }
    }
  } catch (err) {
    console.warn('Advertencia al consultar plantilla en IndexedDB:', err);
  }

  return null;
}

/**
 * Save template safely into IndexedDB and in-memory cache.
 */
export async function saveDocxTemplateAsync(
  key: TemplateKey,
  base64: string,
  fileName: string,
  fileSizeBytes?: number
): Promise<void> {
  const item: StoredTemplateItem = {
    base64,
    fileName,
    uploadedAt: new Date().toISOString(),
    fileSizeBytes: fileSizeBytes || Math.round(base64.length * 0.75),
    isCustom: true,
  };

  inMemoryCache[key] = item;

  const text = extractTextFromDocxBase64(base64);
  if (text) {
    activeTemplateTextCache[key] = text;
    try {
      localStorage.setItem(`${TEXT_STORAGE_PREFIX}${key}`, text);
    } catch {}
  }

  try {
    const meta = {
      fileName: item.fileName,
      uploadedAt: item.uploadedAt,
      fileSizeBytes: item.fileSizeBytes,
      isCustom: true,
    };
    localStorage.setItem(`${META_STORAGE_PREFIX}${key}`, JSON.stringify(meta));
  } catch {}

  try {
    if (typeof window !== 'undefined' && window.indexedDB) {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put({
          key,
          ...item,
        });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  } catch (err) {
    console.warn('Advertencia al guardar en IndexedDB:', err);
  }

  purgeLegacyBulkyLocalStorage();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('utea_templates_updated', { detail: { key, updatedBase: true } }));
  }
}

/**
 * Synchronous save helper
 */
export function saveDocxTemplate(key: TemplateKey, base64: string, fileName: string): void {
  saveDocxTemplateAsync(key, base64, fileName);
}

/**
 * Deletes the uploaded template for a key, returning it to empty.
 */
export async function removeDocxTemplateAsync(key: TemplateKey): Promise<void> {
  delete inMemoryCache[key];
  delete activeTemplateTextCache[key];

  try {
    localStorage.removeItem(`${TEXT_STORAGE_PREFIX}${key}`);
    localStorage.removeItem(`${META_STORAGE_PREFIX}${key}`);
  } catch {}

  try {
    if (typeof window !== 'undefined' && window.indexedDB) {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    }
  } catch (err) {
    console.warn('Error al eliminar plantilla de IndexedDB:', err);
  }

  purgeLegacyBulkyLocalStorage();

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('utea_templates_updated', { detail: { key, reset: true } }));
  }
}

/**
 * Synchronous remove helper
 */
export function removeDocxTemplate(key: TemplateKey): void {
  removeDocxTemplateAsync(key);
}

/**
 * Deletes all uploaded templates, clearing all 8 slots so the user can start from scratch.
 */
export async function resetAllTemplatesToDefaultAsync(): Promise<void> {
  for (const def of DEFAULT_TEMPLATE_DEFS) {
    await removeDocxTemplateAsync(def.key);
  }
}

/**
 * Validate uploaded file
 */
export async function validateAndParseDocxFile(file: File): Promise<{
  valid: boolean;
  base64?: string;
  detectedTags?: string[];
  fileSizeFormatted?: string;
  error?: string;
}> {
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith('.docx')) {
    if (lowerName.endsWith('.doc')) {
      return {
        valid: false,
        error: 'El archivo subido es formato ".doc" antiguo de Word. Por favor ábrelo en Microsoft Word y ve a "Guardar como" -> "Documento de Word (*.docx)".',
      };
    }
    return {
      valid: false,
      error: 'El archivo seleccionado no tiene formato .docx de Microsoft Word.',
    };
  }

  const sizeKb = Math.round(file.size / 1024);
  const sizeFormatted = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let zip: PizZip;
    try {
      zip = new PizZip(bytes);
    } catch {
      return {
        valid: false,
        error: 'El archivo .docx está dañado o no es un archivo comprimido válido de Word.',
      };
    }

    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
      return {
        valid: false,
        error: 'El archivo .docx no contiene la estructura interna estándar de Microsoft Word (falta word/document.xml).',
      };
    }

    const docXmlText = docXmlFile.asText();

    const tagsFound = new Set<string>();
    const regex = /\{\{?([^{}]+)\}?\}/g;
    let match;
    while ((match = regex.exec(docXmlText)) !== null) {
      const tag = match[1].trim();
      if (tag.length > 1 && !tag.includes('<') && !tag.includes('>')) {
        tagsFound.add(tag);
      }
    }

    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = window.btoa(binary);

    return {
      valid: true,
      base64,
      detectedTags: Array.from(tagsFound),
      fileSizeFormatted: sizeFormatted,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Error al procesar el archivo: ${err.message || 'Archivo no legible'}`,
    };
  }
}

/**
 * Returns the base official DOCX template as a Blob.
 * If tags are provided, generates a filled DOCX document.
 */
export function generateBaseDocxTemplate(
  key: TemplateKey,
  _title: string,
  tags?: Record<string, string>
): Blob {
  const item = inMemoryCache[key];
  if (item?.base64) {
    if (tags) {
      return generateDocxFromTemplate(item.base64, tags);
    }
    const binaryString = typeof window !== 'undefined' && window.atob
      ? window.atob(item.base64)
      : Buffer.from(item.base64, 'base64').toString('binary');
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }

  // Fallback empty docx blob if not yet loaded
  const zip = new PizZip();
  return zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/**
 * Returns the base official DOCX template as a Base64 string.
 */
export function generateBaseDocxTemplateBase64(
  key: TemplateKey,
  _title: string
): string {
  const item = inMemoryCache[key];
  return item?.base64 || '';
}
