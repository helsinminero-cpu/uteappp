import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { 
  formatDateSpanish, 
  add4MonthsFormatted, 
  toTitleCase, 
  generateDocuments 
} from './formatters';
import { UTEA_LOGO_BASE64 } from '../data/uteaLogoData';

export type TemplateKey = 
  | 'informe_designacion'
  | 'resolucion_designacion'
  | 'informe_reasignacion'
  | 'resolucion_reasignacion'
  | 'informe_sustentacion'
  | 'resolucion_sustentacion'
  | 'informe_aprobacion'
  | 'resolucion_aprobacion';

export interface TemplateInfo {
  key: TemplateKey;
  title: string;
  category: 'Designación' | 'Reasignación' | 'Sustentación' | 'Aprobación';
  type: 'informe' | 'resolucion';
  fileName?: string;
  uploadedAt?: string;
}

export const TEMPLATE_LIST: TemplateInfo[] = [
  { key: 'informe_designacion', title: 'Informe de Designación de Asesor', category: 'Designación', type: 'informe', fileName: 'Informe_Designacion_Asesor_PPP.docx' },
  { key: 'resolucion_designacion', title: 'Resolución de Designación de Asesor', category: 'Designación', type: 'resolucion', fileName: 'Resol_Designacion_Asesor.docx' },
  { key: 'informe_reasignacion', title: 'Informe de Reasignación de Asesor', category: 'Reasignación', type: 'informe', fileName: 'Informe_de_reasignacion_PPP.docx' },
  { key: 'resolucion_reasignacion', title: 'Resolución de Reasignación de Asesor', category: 'Reasignación', type: 'resolucion', fileName: 'Resol_reasignacion_PPP.docx' },
  { key: 'informe_sustentacion', title: 'Informe de Designación de Jurado Sustentación', category: 'Sustentación', type: 'informe', fileName: 'Informe_Sustentacion_PPP.docx' },
  { key: 'resolucion_sustentacion', title: 'Resolución de Sustentación de PPP', category: 'Sustentación', type: 'resolucion', fileName: 'RESOL_Sustentacion.docx' },
  { key: 'informe_aprobacion', title: 'Informe de Aprobación Final de PPP', category: 'Aprobación', type: 'informe', fileName: 'INFORME_Aprobacion.docx' },
  { key: 'resolucion_aprobacion', title: 'Resolución Sub Directoral de Aprobación de PPP', category: 'Aprobación', type: 'resolucion', fileName: 'Resol_Aprobacion_Sustentacion_PPP.docx' },
];

// Re-export storage methods from templateStorage
export { 
  getStoredDocxTemplates, 
  saveDocxTemplate, 
  removeDocxTemplate,
  saveDocxTemplateAsync,
  removeDocxTemplateAsync,
  validateAndParseDocxFile,
  generateBaseDocxTemplate,
  generateBaseDocxTemplateBase64,
  resetAllTemplatesToDefaultAsync,
  initTemplateStorage,
  getActiveTemplateText,
  getActiveDocxTemplateAsync,
  extractTextFromDocxBase64
} from './templateStorage';

// Re-export getTemplateTags from tagEngine
export { getTemplateTags } from './tagEngine';

export interface ExtractedDocxAssets {
  headerImageBase64: string | null;
  headerImages: string[];
  headerTexts: string[];
  allImages: { name: string; dataUrl: string; mimeType: string }[];
  hasTables: boolean;
  manualPageBreaksCount: number;
  hasHeader: boolean;
}

/**
 * Converts various docx input formats safely into a Uint8Array
 */
export async function docxInputToUint8Array(
  input: Blob | string | ArrayBuffer | Uint8Array
): Promise<Uint8Array> {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  if (typeof Blob !== 'undefined' && input instanceof Blob) {
    const ab = await input.arrayBuffer();
    return new Uint8Array(ab);
  }
  if (typeof input === 'string') {
    const cleanB64 = input.includes('base64,') ? input.split('base64,')[1] : input;
    const binary = typeof window !== 'undefined' && window.atob
      ? window.atob(cleanB64)
      : Buffer.from(cleanB64, 'base64').toString('binary');
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  throw new Error('Formato de entrada DOCX no soportado.');
}

/**
 * Safe Base64 encoder for large Uint8Arrays without call-stack overflow
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/**
 * Inspects a .docx package (PizZip) to extract:
 * 1. The exact header image/logo from word/_rels/header*.xml.rels or word/media/
 * 2. Header text content
 * 3. Tables and manual page breaks presence (<w:tbl>, <w:br w:type="page"/>)
 */
export async function extractDocxAssets(
  input: Blob | string | ArrayBuffer | Uint8Array
): Promise<ExtractedDocxAssets> {
  const bytes = await docxInputToUint8Array(input);
  const zip = new PizZip(bytes);

  const allImages: { name: string; dataUrl: string; mimeType: string }[] = [];
  const headerImages: string[] = [];
  const headerTexts: string[] = [];
  let hasTables = false;
  let manualPageBreaksCount = 0;
  let hasHeader = false;

  // 1. Extract all images embedded in word/media/
  const imageMapByName: Record<string, string> = {};
  for (const [filePath, file] of Object.entries(zip.files)) {
    if (filePath.startsWith('word/media/')) {
      const fileName = filePath.replace('word/media/', '');
      const lower = fileName.toLowerCase();
      let mimeType = 'image/png';
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (lower.endsWith('.gif')) mimeType = 'image/gif';
      else if (lower.endsWith('.svg')) mimeType = 'image/svg+xml';
      else if (lower.endsWith('.webp')) mimeType = 'image/webp';

      try {
        const fileBytes = file.asUint8Array
          ? file.asUint8Array()
          : Uint8Array.from(file.asBinary(), (c) => c.charCodeAt(0));
        const b64 = uint8ArrayToBase64(fileBytes);
        const dataUrl = `data:${mimeType};base64,${b64}`;
        imageMapByName[fileName] = dataUrl;
        imageMapByName[filePath] = dataUrl;
        allImages.push({ name: fileName, dataUrl, mimeType });
      } catch (err) {
        console.warn('Error al extraer imagen del docx:', filePath, err);
      }
    }
  }

  // 2. Identify header files and their relationships
  const headerTargetImageNames = new Set<string>();
  for (const [filePath, file] of Object.entries(zip.files)) {
    // Check word/_rels/header*.xml.rels
    if (filePath.startsWith('word/_rels/header') && filePath.endsWith('.rels')) {
      hasHeader = true;
      try {
        const relsXml = file.asText();
        const matches = relsXml.matchAll(/Target=["'](?:media\/|(?:\.\.\/)+media\/)?([^"']+)["']/gi);
        for (const m of matches) {
          if (m[1]) {
            headerTargetImageNames.add(m[1].replace(/.*[\/\\]/, ''));
          }
        }
      } catch {}
    }

    // Check header text in word/header*.xml
    if (filePath.startsWith('word/header') && filePath.endsWith('.xml')) {
      hasHeader = true;
      try {
        const headerXml = file.asText();
        const textMatches = headerXml.matchAll(/<w:t[^>]*>([^<]+)<\/w:t>/gi);
        let headerLine = '';
        for (const tm of textMatches) {
          if (tm[1]) headerLine += tm[1] + ' ';
        }
        if (headerLine.trim()) {
          headerTexts.push(headerLine.trim());
        }
      } catch {}
    }
  }

  // Map header target image names to actual data URLs
  for (const imgName of headerTargetImageNames) {
    if (imageMapByName[imgName]) {
      headerImages.push(imageMapByName[imgName]);
    }
  }

  // Fallback: If no header rels explicitly referenced an image, but there are images in word/media:
  // the first image is typically the institutional escudo/logo
  if (headerImages.length === 0 && allImages.length > 0) {
    headerImages.push(allImages[0].dataUrl);
  }

  // Final fallback to official UTEA logo if docx had no image
  const headerImageBase64 = headerImages.length > 0
    ? headerImages[0]
    : `data:image/png;base64,${UTEA_LOGO_BASE64}`;

  // 3. Inspect document.xml for tables and manual page breaks
  const docXmlFile = zip.file('word/document.xml');
  if (docXmlFile) {
    try {
      const docXml = docXmlFile.asText();
      if (docXml.includes('<w:tbl')) {
        hasTables = true;
      }
      const pageBreakMatches = docXml.match(/<w:br[^>]+w:type=["']page["']/gi);
      if (pageBreakMatches) {
        manualPageBreaksCount = pageBreakMatches.length;
      }
      const lastRenderedBreaks = docXml.match(/<w:lastRenderedPageBreak\/>/gi);
      if (lastRenderedBreaks) {
        manualPageBreaksCount += lastRenderedBreaks.length;
      }
    } catch {}
  }

  return {
    headerImageBase64,
    headerImages,
    headerTexts,
    allImages,
    hasTables,
    manualPageBreaksCount,
    hasHeader: hasHeader || headerImages.length > 0,
  };
}

/**
 * Normalizes string for fuzzy tag matching
 */
export function normalizeTag(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[{}\[\]]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Generate binary .docx file using docxtemplater and PizZip,
 * strictly preserving margins, logos, embedded images, headers and footers!
 */
export function generateDocxFromTemplate(
  base64Template: string,
  tags: Record<string, string>
): Blob {
  // Convert base64 to binary string safely across environments
  const binaryString = typeof window !== 'undefined' && window.atob
    ? window.atob(base64Template)
    : Buffer.from(base64Template, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const zip = new PizZip(bytes);

  // Normalize XML files in zip: remove Word proofing/spelling split tags and format tag runs in bold (<w:b/>)
  const normalizeXml = (content: string) => {
    let clean = content
      .replace(/<w:proofErr[^>]*\/>/g, '')
      .replace(/<w:noProof\/>/g, '');

    // Ensure all runs containing tags {{...}} or {...} have bold style (<w:b/>)
    clean = clean.replace(/<w:r\b([^>]*)>([\s\S]*?)<\/w:r>/g, (match, attrs, inner) => {
      if (/\{\{?[^{}]+\}?/.test(inner)) {
        if (!inner.includes('<w:b/>') && !inner.includes('<w:b ')) {
          if (inner.includes('<w:rPr>')) {
            inner = inner.replace('<w:rPr>', '<w:rPr><w:b/>');
          } else {
            inner = `<w:rPr><w:b/></w:rPr>` + inner;
          }
          return `<w:r${attrs}>${inner}</w:r>`;
        }
      }
      return match;
    });

    return clean;
  };

  let hasDoubleBraces = false;

  Object.keys(zip.files).forEach((filePath) => {
    if (filePath.startsWith('word/') && filePath.endsWith('.xml')) {
      const file = zip.file(filePath);
      if (file) {
        try {
          const raw = file.asText();
          if (raw.includes('{{')) {
            hasDoubleBraces = true;
          }
          zip.file(filePath, normalizeXml(raw));
        } catch {
          // Ignore binary parts
        }
      }
    }
  });

  // Pre-index normalized dictionary
  const normalizedDict: Record<string, string> = {};
  for (const [key, value] of Object.entries(tags)) {
    normalizedDict[normalizeTag(key)] = value ?? '';
  }

  // Flexible parser that matches case-insensitively, accent-insensitively and space-insensitively
  const customParser = (tag: string) => {
    const cleanTag = tag.replace(/^\{+|\}+$/g, '').trim();
    const norm = normalizeTag(cleanTag);
    return {
      get(scope: Record<string, any>) {
        if (!scope) return '';
        // 1. Direct key match
        if (scope[cleanTag] !== undefined) return scope[cleanTag];
        if (scope[tag] !== undefined) return scope[tag];
        // 2. Normalized dictionary match
        if (normalizedDict[norm] !== undefined) return normalizedDict[norm];
        // 3. Fallback search
        for (const [k, v] of Object.entries(scope)) {
          if (normalizeTag(k) === norm) return v ?? '';
        }
        return '';
      }
    };
  };

  const delimiters = hasDoubleBraces 
    ? { start: '{{', end: '}}' } 
    : { start: '{', end: '}' };

  try {
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters,
      parser: customParser,
    });
    doc.render(tags);
  } catch (err: any) {
    console.warn('First render attempt failed, trying alternate delimiter:', err);
    // Alternate delimiter attempt
    const alternateDelimiters = hasDoubleBraces 
      ? { start: '{', end: '}' } 
      : { start: '{{', end: '}}' };
    
    // Re-create zip from fresh bytes
    const retryZip = new PizZip(bytes);
    Object.keys(retryZip.files).forEach((filePath) => {
      if (filePath.startsWith('word/') && filePath.endsWith('.xml')) {
        const file = retryZip.file(filePath);
        if (file) {
          try {
            retryZip.file(filePath, normalizeXml(file.asText()));
          } catch {
            // Ignore
          }
        }
      }
    });

    const retryDoc = new Docxtemplater(retryZip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: alternateDelimiters,
      parser: customParser,
    });
    retryDoc.render(tags);
    return retryDoc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }

  // Generate output blob keeping all media and section properties intact
  const out = zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return out;
}
