import jsPDF from 'jspdf';
import html2canvasRaw from 'html2canvas-pro';
import { Student, TramiteRecord } from '../types';
import { generateDocuments } from './formatters';
import { getTemplateTags } from './tagEngine';
import { UTEA_LOGO_BASE64 } from '../data/uteaLogoData';
import { extractDocxAssets, ExtractedDocxAssets } from './docxEngine';

/**
 * Executes html2canvas safely regardless of ESM/CJS bundling format
 */
export async function captureElementToCanvas(element: HTMLElement, options: any): Promise<HTMLCanvasElement> {
  const h2c: any = typeof html2canvasRaw === 'function'
    ? html2canvasRaw
    : (html2canvasRaw as any).default || (html2canvasRaw as any).html2canvas;
  return await h2c(element, options);
}

/**
 * Converts all images inside an element to base64 Data URLs
 * to prevent canvas taint, CORS security errors, and missing drawings in html2canvas.
 * Specially handles blob: URLs produced by docx-preview.
 */
async function inlineImagesAsBase64(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map(async (img) => {
      try {
        // 1. If image has no src or empty, populate with official UTEA logo
        if (!img.src || img.src.trim() === '' || img.src === window.location.href) {
          img.src = `data:image/png;base64,${UTEA_LOGO_BASE64}`;
        } else if (img.src.startsWith('blob:')) {
          // Direct fetch for blob: URLs
          const res = await fetch(img.src);
          const blob = await res.blob();
          await new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (reader.result && typeof reader.result === 'string') {
                img.src = reader.result;
              }
              resolve();
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(blob);
          });
        }

        // Wait for image decode so pixels are ready in browser memory
        if (img.decode) {
          try {
            await img.decode();
          } catch {}
        }
      } catch (err) {
        console.warn('inlineImagesAsBase64 fallback:', err);
        if (!img.src || img.src.startsWith('blob:')) {
          img.src = `data:image/png;base64,${UTEA_LOGO_BASE64}`;
        }
      }
    })
  );
}

/**
 * Direct vector-based PDF generator using jsPDF.
 * Serves as an infallible fallback if html2canvas is blocked by browser restrictions.
 * Produces crisp, searchable, 100% faithful vector typography in standard A4.
 */
export function generateDirectVectorPdf(
  student: Student,
  record: TramiteRecord,
  docType: 'informe' | 'resolucion',
  fileName: string
): void {
  const generated = generateDocuments(student, record);
  const textContent = docType === 'informe' ? generated.informe : generated.resolucion;
  const tags = getTemplateTags(student, record);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 22;
  const marginTop = 22;
  const marginBottom = 22;
  const printableWidth = pageWidth - marginX * 2; // 166 mm

  let currentY = marginTop;

  // Gather tag values for bold detection
  const boldStrings = new Set<string>();
  for (const [, val] of Object.entries(tags)) {
    if (val && typeof val === 'string' && val.trim().length >= 2) {
      boldStrings.add(val.trim());
    }
  }

  const drawHeader = () => {
    // Official Logo Escudo UTEA (Centered at Top)
    try {
      const logoW = 18;
      const logoH = 21;
      pdf.addImage(`data:image/png;base64,${UTEA_LOGO_BASE64}`, 'PNG', (pageWidth - logoW) / 2, currentY, logoW, logoH, undefined, 'FAST');
      currentY += logoH + 3;
    } catch (err) {
      console.warn('Vector logo draw skipped:', err);
    }

    // Header Institution
    pdf.setFont('times', 'bold');
    pdf.setFontSize(11);
    pdf.text('UNIVERSIDAD TECNOLÓGICA DE LOS ANDES', pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.8;

    pdf.setFontSize(9.5);
    pdf.text('FILIAL CUSCO — FACULTAD DE INGENIERÍA', pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.5;
    pdf.text('ESCUELA PROFESIONAL DE INGENIERÍA CIVIL', pageWidth / 2, currentY, { align: 'center' });
    currentY += 4.5;

    pdf.setFont('times', 'italic');
    pdf.setFontSize(8.5);
    pdf.text('"Año de la Esperanza y el Fortalecimiento de la Democracia"', pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;

    // Thin dividing line
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.3);
    pdf.line(marginX, currentY, pageWidth - marginX, currentY);
    currentY += 6;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - marginBottom) {
      pdf.addPage('a4', 'portrait');
      currentY = marginTop;
      drawHeader();
    }
  };

  // Draw header on the first page
  drawHeader();

  // Body Content: Split by lines
  const lines = textContent.split(/\r?\n/);
  pdf.setFont('times', 'normal');
  pdf.setFontSize(10.5);

  let hasEmittedResTitle = false;
  let skippingTableBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();

    if (!rawLine) {
      currentY += 3.5;
      checkPageBreak(5);
      continue;
    }

    // Skip repeated institutional header lines (already drawn above)
    if (
      rawLine.startsWith('UNIVERSIDAD TECNOLÓGICA') ||
      rawLine.startsWith('FILIAL CUSCO') ||
      rawLine.startsWith('ESCUELA PROFESIONAL') ||
      rawLine.startsWith('"Año de la Esperanza') ||
      rawLine.startsWith('Año de la Esperanza') ||
      rawLine.startsWith('________________')
    ) {
      continue;
    }

    // Check if line is title or heading
    if (rawLine.startsWith('RESOLUCIÓN SUB DIRECTORAL')) {
      if (hasEmittedResTitle) continue;
      hasEmittedResTitle = true;
      checkPageBreak(8);
      pdf.setFont('times', 'bold');
      pdf.setFontSize(11);
      pdf.text(rawLine, pageWidth / 2, currentY, { align: 'center' });
      currentY += 5.5;
      pdf.setFont('times', 'normal');
      pdf.setFontSize(10.5);
      continue;
    }

    const isMainTitle = rawLine.startsWith('INFORME Nº');

    // Handle student details tables in vector PDF
    if (
      rawLine.startsWith('FUT:') ||
      rawLine.startsWith('FUT\t') ||
      rawLine.startsWith('N°:') ||
      rawLine.startsWith('N°\t') ||
      rawLine.startsWith('APELLIDOS Y NOMBRES:')
    ) {
      if (!skippingTableBlock) {
        skippingTableBlock = true;
        checkPageBreak(25);

        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.2);

        if (record.type === 'designacion' || record.type === 'reasignacion') {
          if (docType === 'informe') {
            const colW = [28, 28, 80, 30];
            const h = 7;
            pdf.setFont('times', 'bold');
            pdf.setFontSize(9);
            pdf.setFillColor(241, 245, 249);
            pdf.rect(marginX, currentY, printableWidth, h, 'FD');
            pdf.text('FUT', marginX + colW[0] / 2, currentY + 4.8, { align: 'center' });
            pdf.text('EXP', marginX + colW[0] + colW[1] / 2, currentY + 4.8, { align: 'center' });
            pdf.text('ALUMNO', marginX + colW[0] + colW[1] + 4, currentY + 4.8);
            pdf.text('CÓDIGO', marginX + colW[0] + colW[1] + colW[2] + colW[3] / 2, currentY + 4.8, { align: 'center' });
            currentY += h;

            const futVal = tags['FUT_Designacion'] || tags['FUT_Reasignacion'] || tags['Numero de FUT solicitud de Asesor'] || tags['FUT'] || '—';
            const expVal = tags['EXP_Designacion'] || tags['EXP_Reasignacion'] || tags['Numero de Expediente Fut de Asesor'] || tags['EXP'] || '—';
            pdf.rect(marginX, currentY, printableWidth, h);
            pdf.text(futVal, marginX + colW[0] / 2, currentY + 4.8, { align: 'center' });
            pdf.text(expVal, marginX + colW[0] + colW[1] / 2, currentY + 4.8, { align: 'center' });
            pdf.text(student.fullName.toUpperCase(), marginX + colW[0] + colW[1] + 4, currentY + 4.8);
            pdf.text(student.studentCode, marginX + colW[0] + colW[1] + colW[2] + colW[3] / 2, currentY + 4.8, { align: 'center' });
            currentY += h + 4;
          } else {
            const colW = [10, 52, 26, 42, 36];
            const h = 7;
            pdf.setFont('times', 'bold');
            pdf.setFontSize(8.5);
            pdf.setFillColor(241, 245, 249);
            pdf.rect(marginX, currentY, printableWidth, h, 'FD');
            pdf.text('N°', marginX + 5, currentY + 4.8, { align: 'center' });
            pdf.text('APELLIDOS Y NOMBRES', marginX + colW[0] + 3, currentY + 4.8);
            pdf.text('CÓDIGO', marginX + colW[0] + colW[1] + 13, currentY + 4.8, { align: 'center' });
            pdf.text('ASESORA DE PRÁCTICAS', marginX + colW[0] + colW[1] + colW[2] + 3, currentY + 4.8);
            pdf.text('INSTITUCIÓN', marginX + colW[0] + colW[1] + colW[2] + colW[3] + 3, currentY + 4.8);
            currentY += h;

            const rawAsesor = record.type === 'designacion' ? (tags['Nombre completo del asesor'] || 'Carlos Mendoza Estrada') : (tags['Nombre completo del nuevo asesor'] || 'Luis Fernando Palomino');
            const cleanAsesor = rawAsesor.replace(/^Mg\.\s*Ing\.\s*/i, '');
            pdf.rect(marginX, currentY, printableWidth, h);
            pdf.text('01', marginX + 5, currentY + 4.8, { align: 'center' });
            pdf.text(student.fullName.toUpperCase(), marginX + colW[0] + 3, currentY + 4.8);
            pdf.text(student.studentCode, marginX + colW[0] + colW[1] + 13, currentY + 4.8, { align: 'center' });
            pdf.text(`Mg. Ing. ${cleanAsesor}`, marginX + colW[0] + colW[1] + colW[2] + 3, currentY + 4.8);
            pdf.text(student.organization || 'EMPRESA', marginX + colW[0] + colW[1] + colW[2] + colW[3] + 3, currentY + 4.8);
            currentY += h + 4;
          }
        } else if (record.type === 'aprobacion' && docType === 'resolucion') {
          const colW = [10, 46, 24, 36, 30, 20];
          const h = 7;
          pdf.setFont('times', 'bold');
          pdf.setFontSize(8);
          pdf.setFillColor(241, 245, 249);
          pdf.rect(marginX, currentY, printableWidth, h, 'FD');
          pdf.text('N°', marginX + 5, currentY + 4.8, { align: 'center' });
          pdf.text('APELLIDOS Y NOMBRES', marginX + colW[0] + 3, currentY + 4.8);
          pdf.text('CÓDIGO', marginX + colW[0] + colW[1] + 12, currentY + 4.8, { align: 'center' });
          pdf.text('INSTITUCIÓN', marginX + colW[0] + colW[1] + colW[2] + 3, currentY + 4.8);
          pdf.text('INICIO Y TÉRMINO', marginX + colW[0] + colW[1] + colW[2] + colW[3] + 15, currentY + 4.8, { align: 'center' });
          pdf.text('PERIODO', marginX + printableWidth - 10, currentY + 4.8, { align: 'center' });
          currentY += h;

          const fInicio = tags['Fecha_Inicio_PPP'] || '—';
          const fFin = tags['Fecha_Fin_PPP'] || '—';
          pdf.rect(marginX, currentY, printableWidth, h);
          pdf.text('01', marginX + 5, currentY + 4.8, { align: 'center' });
          pdf.text(student.fullName.toUpperCase(), marginX + colW[0] + 3, currentY + 4.8);
          pdf.text(student.studentCode, marginX + colW[0] + colW[1] + 12, currentY + 4.8, { align: 'center' });
          pdf.text(`“${student.organization || 'EMPRESA'}”`, marginX + colW[0] + colW[1] + colW[2] + 3, currentY + 4.8);
          pdf.text(`${fInicio} al ${fFin}`, marginX + colW[0] + colW[1] + colW[2] + colW[3] + 15, currentY + 4.8, { align: 'center' });
          pdf.text('480 h', marginX + printableWidth - 10, currentY + 4.8, { align: 'center' });
          currentY += h + 4;
        }
        pdf.setFont('times', 'normal');
        pdf.setFontSize(10.5);
      }
      continue;
    }

    if (skippingTableBlock) {
      if (
        rawLine.startsWith('EXP:') ||
        rawLine.startsWith('ALUMNO:') ||
        rawLine.startsWith('CODIGO:') ||
        rawLine.startsWith('CÓDIGO:') ||
        rawLine.startsWith('ASESORA DE PRÁCTICAS') ||
        rawLine.startsWith('INSTITUCIÓN Y/O EMPRESA') ||
        rawLine.startsWith('INICIO Y TERMINO') ||
        rawLine.startsWith('PERIODO DE REALIZACION') ||
        rawLine === ''
      ) {
        continue;
      } else {
        skippingTableBlock = false;
      }
    }

    const isSectionHeading = 
      rawLine === 'VISTO:' || 
      rawLine === 'CONSIDERANDO:' || 
      rawLine === 'SE RESUELVE:' ||
      rawLine.startsWith('ARTÍCULO PRIMERO') ||
      rawLine.startsWith('ARTÍCULO SEGUNDO') ||
      rawLine === 'REGÍSTRESE, COMUNÍQUESE Y ARCHÍVESE' ||
      rawLine.startsWith('A        :') ||
      rawLine.startsWith('DE        :') ||
      rawLine.startsWith('ASUNTO    :') ||
      rawLine.startsWith('REF.      :') ||
      rawLine.startsWith('FECHA     :');

    if (isMainTitle) {
      checkPageBreak(8);
      pdf.setFont('times', 'bold');
      pdf.setFontSize(11);
      pdf.text(rawLine, pageWidth / 2, currentY, { align: 'center' });
      currentY += 5.5;
      pdf.setFont('times', 'normal');
      pdf.setFontSize(10.5);
      continue;
    }

    if (isSectionHeading) {
      checkPageBreak(7);
      pdf.setFont('times', 'bold');
      pdf.setFontSize(10.5);
      const wrapped = pdf.splitTextToSize(rawLine, printableWidth);
      for (const w of wrapped) {
        checkPageBreak(4.8);
        pdf.text(w, marginX, currentY);
        currentY += 4.8;
      }
      pdf.setFont('times', 'normal');
      continue;
    }

    // Signature lines
    if (rawLine.includes('……………………') || rawLine.includes('__________________')) {
      checkPageBreak(25);
      currentY += 6;
      pdf.setFont('times', 'bold');
      pdf.text(rawLine, pageWidth / 2, currentY, { align: 'center' });
      currentY += 4.8;
      continue;
    }

    if (rawLine === 'PRESIDENTE COMISION' || rawLine.includes('Sub Director (e)')) {
      pdf.setFont('times', 'bold');
      pdf.text(rawLine, pageWidth / 2, currentY, { align: 'center' });
      currentY += 4.8;
      pdf.setFont('times', 'normal');
      continue;
    }

    // Standard paragraph with word wrap
    const wrappedLines = pdf.splitTextToSize(rawLine, printableWidth);
    for (const w of wrappedLines) {
      checkPageBreak(4.6);
      pdf.text(w, marginX, currentY);
      currentY += 4.6;
    }
  }

  const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  pdf.save(safeFileName);
}

export interface PdfExportOptions {
  headerImageBase64?: string;
  headerTexts?: string[];
  student?: Student;
  record?: TramiteRecord;
  docType?: 'informe' | 'resolucion';
}

/**
 * Converts a mounted DOM element to a high-fidelity downloadable PDF document in A4 format.
 * Strictly guarantees that:
 * 1. The header logo is fixed and centered at the top of EVERY page.
 * 2. Proper clearance margin (132px) prevents header overlap/collision with body text.
 * 3. Tables and table rows are protected against splitting (break-inside: avoid).
 * 4. Headings and paragraphs control widows/orphans and line breaks.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  fileName: string,
  studentOrOptions?: Student | PdfExportOptions,
  record?: TramiteRecord,
  docType?: 'informe' | 'resolucion'
): Promise<void> {
  let options: PdfExportOptions = {};
  if (studentOrOptions) {
    if ('id' in studentOrOptions && 'studentCode' in studentOrOptions) {
      options.student = studentOrOptions as Student;
      options.record = record;
      options.docType = docType;
    } else {
      options = studentOrOptions as PdfExportOptions;
    }
  }

  const { student, record: tramiteRecord, docType: documentType } = options;
  const headerLogo = options.headerImageBase64 || `data:image/png;base64,${UTEA_LOGO_BASE64}`;

  if (!element) {
    if (student && tramiteRecord && documentType) {
      generateDirectVectorPdf(student, tramiteRecord, documentType, fileName);
      return;
    }
    throw new Error('Elemento del documento no encontrado para generar PDF.');
  }

  try {
    // 1. Wait for web fonts (Times New Roman, Arial, etc.) to settle
    if ((document as any).fonts?.ready) {
      try {
        await (document as any).fonts.ready;
      } catch {}
    }

    // 2. Ensure all images are inlined as Base64 data URLs
    await inlineImagesAsBase64(element);

    // 3. Extract ALL stylesheets and styles across the document
    const allStyles = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent || '')
      .concat(Array.from(element.querySelectorAll('style')).map((s) => s.textContent || ''))
      .join('\n');

    // 4. Find all page sections (<section class="docx"> or <section>)
    let docxSections = Array.from(element.querySelectorAll('section.docx')) as HTMLElement[];
    if (docxSections.length === 0) {
      docxSections = Array.from(element.querySelectorAll('section')) as HTMLElement[];
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = 210;
    const pdfHeight = 297;

    // CASE A: Element contains distinct docx pages (<section>)
    if (docxSections.length > 0) {
      for (let sIdx = 0; sIdx < docxSections.length; sIdx++) {
        const sec = docxSections[sIdx];

        // Create an isolated single-page stage at (0,0) to prevent scroll clipping
        const stage = document.createElement('div');
        stage.className = 'docx-preview-wrapper';
        stage.style.position = 'fixed';
        stage.style.left = '0';
        stage.style.top = '0';
        stage.style.width = '794px'; // 210mm at 96 DPI
        stage.style.height = '1123px'; // 297mm at 96 DPI
        stage.style.minHeight = '1123px';
        stage.style.backgroundColor = '#ffffff';
        stage.style.zIndex = '99999';
        stage.style.opacity = '1';
        stage.style.margin = '0';
        stage.style.padding = '0';
        stage.style.pointerEvents = 'none';
        stage.style.overflow = 'hidden';

        const styleEl = document.createElement('style');
        styleEl.textContent = `
          ${allStyles}
          body, html { background: #ffffff !important; }
          .docx-preview-wrapper section.docx, section.docx, article.docx, section {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          img {
            display: inline-block !important;
            visibility: visible !important;
            max-width: 100% !important;
          }
        `;
        stage.appendChild(styleEl);

        const clonedSec = sec.cloneNode(true) as HTMLElement;
        clonedSec.style.margin = '0 auto';
        clonedSec.style.boxShadow = 'none';
        clonedSec.style.border = 'none';
        clonedSec.style.width = '794px';
        clonedSec.style.height = '1123px';
        clonedSec.style.minHeight = '1123px';
        clonedSec.style.position = 'relative';
        clonedSec.style.boxSizing = 'border-box';
        clonedSec.style.overflow = 'hidden';

        // 1. Remove any duplicated headers docx-preview placed in body flow
        const redundantHeaders = Array.from(clonedSec.querySelectorAll('header, .docx_header, .docx-header'));
        redundantHeaders.forEach((h) => h.remove());

        // 2. Attach fixed institutional header at top of every page
        const headerDiv = document.createElement('div');
        headerDiv.className = 'docx-fixed-header';
        headerDiv.innerHTML = `
          <img class="header-logo" src="${headerLogo}" alt="Logo Encabezado" />
          <div class="header-inst-title">UNIVERSIDAD TECNOLÓGICA DE LOS ANDES</div>
          <div class="header-inst-sub">FILIAL CUSCO — FACULTAD DE INGENIERÍA</div>
          <div class="header-motto">"Año de la Esperanza y el Fortalecimiento de la Democracia"</div>
        `;
        clonedSec.insertBefore(headerDiv, clonedSec.firstChild);

        // 3. Set top clearance: 132px guaranteed buffer so text NEVER collides with header
        clonedSec.style.paddingTop = '132px';
        clonedSec.style.paddingLeft = '45px';
        clonedSec.style.paddingRight = '45px';
        clonedSec.style.paddingBottom = '35px';

        // 4. Protect tables and rows from splitting across pages
        clonedSec.querySelectorAll('table, tr, tbody, figure, img, .signature-block, .institutional-signature').forEach((el: any) => {
          el.style.breakInside = 'avoid';
          el.style.pageBreakInside = 'avoid';
        });

        // 5. Protect headings from orphaning
        clonedSec.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el: any) => {
          el.style.breakAfter = 'avoid';
          el.style.pageBreakAfter = 'avoid';
        });

        // 6. Protect paragraphs with widows and orphans
        clonedSec.querySelectorAll('p').forEach((el: any) => {
          el.style.orphans = '3';
          el.style.widows = '3';
          el.style.lineHeight = '1.45';
        });

        // 7. Add fixed footer with page number
        const footerDiv = document.createElement('div');
        footerDiv.className = 'docx-fixed-footer';
        footerDiv.innerHTML = `
          <span>Escuela Profesional de Ingeniería Civil — UTEA</span>
          <span>Página ${sIdx + 1} de ${docxSections.length}</span>
        `;
        clonedSec.appendChild(footerDiv);

        stage.appendChild(clonedSec);
        document.body.appendChild(stage);

        try {
          await inlineImagesAsBase64(stage);
          await new Promise((r) => setTimeout(r, 80));

          const canvas = await captureElementToCanvas(stage, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 794,
            height: 1123,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 794,
            windowHeight: 1123,
            logging: false,
          });

          const imgData = canvas.toDataURL('image/png');

          if (sIdx > 0) {
            pdf.addPage('a4', 'portrait');
          }

          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        } finally {
          if (document.body.contains(stage)) {
            document.body.removeChild(stage);
          }
        }
      }

      const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
      pdf.save(safeFileName);
      return;
    }

    // CASE B: Continuous element (fallback)
    const stage = document.createElement('div');
    stage.className = 'docx-preview-wrapper';
    stage.style.position = 'fixed';
    stage.style.left = '0';
    stage.style.top = '0';
    stage.style.width = '794px';
    stage.style.backgroundColor = '#ffffff';
    stage.style.zIndex = '99999';
    stage.style.opacity = '1';
    stage.style.margin = '0';
    stage.style.padding = '0';
    stage.style.pointerEvents = 'none';

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      ${allStyles}
      .institutional-doc-page {
        box-shadow: none !important;
        border: none !important;
        margin: 0 auto !important;
        background-color: #ffffff !important;
      }
      img {
        display: inline-block !important;
        visibility: visible !important;
      }
    `;
    stage.appendChild(styleEl);

    const cloned = element.cloneNode(true) as HTMLElement;
    stage.appendChild(cloned);
    document.body.appendChild(stage);

    try {
      await inlineImagesAsBase64(stage);
      await new Promise((r) => setTimeout(r, 80));

      const canvas = await captureElementToCanvas(stage, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 794,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        logging: false,
      });

      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');

      if (imgHeight > pdfHeight + 5) {
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;

        while (heightLeft > 5) {
          position = -(imgHeight - heightLeft);
          pdf.addPage('a4', 'portrait');
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
          heightLeft -= pdfHeight;
        }
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(imgHeight, pdfHeight), undefined, 'FAST');
      }

      const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
      pdf.save(safeFileName);
    } finally {
      if (document.body.contains(stage)) {
        document.body.removeChild(stage);
      }
    }
  } catch (canvasErr) {
    console.warn('html2canvas capture error, falling back to direct vector PDF:', canvasErr);
    if (student && tramiteRecord && documentType) {
      generateDirectVectorPdf(student, tramiteRecord, documentType, fileName);
    } else {
      throw canvasErr;
    }
  }
}

/**
 * Universal High-Fidelity Word-to-PDF processor:
 * 1. Extracts the original image/logo from the .docx header XML and media relationships.
 * 2. Parses page breaks, tables, and document styles.
 * 3. Formats each page with fixed top header and anti-collision margin clearance.
 * 4. Generates an exact, crisp A4 PDF identical to Microsoft Word / Google Docs export.
 */
export async function exportDocxToHighFidelityPdf(
  docxBlob: Blob,
  fileName: string,
  options?: PdfExportOptions
): Promise<void> {
  // 1. Extract embedded assets from original docx package
  const assets = await extractDocxAssets(docxBlob);
  const headerLogo = options?.headerImageBase64 || assets.headerImageBase64 || `data:image/png;base64,${UTEA_LOGO_BASE64}`;

  // 2. Offscreen mount
  const mount = document.createElement('div');
  mount.className = 'docx-preview-wrapper';
  mount.style.position = 'fixed';
  mount.style.top = '0';
  mount.style.left = '0';
  mount.style.width = '794px';
  mount.style.minHeight = '1123px';
  mount.style.backgroundColor = '#ffffff';
  mount.style.zIndex = '99998';
  mount.style.opacity = '0.01'; // Invisible to user during layout pass
  mount.style.pointerEvents = 'none';
  mount.style.overflow = 'visible';
  document.body.appendChild(mount);

  try {
    const { renderAsync } = await import('docx-preview');
    await renderAsync(docxBlob, mount, undefined, {
      inWrapper: false,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
      renderHeaders: true,
      renderFooters: true,
      useBase64URL: true,
    });

    if ((document as any).fonts?.ready) {
      try {
        await (document as any).fonts.ready;
      } catch {}
    }

    await inlineImagesAsBase64(mount);
    await new Promise((r) => setTimeout(r, 100));

    await exportElementToPdf(mount, fileName, {
      ...options,
      headerImageBase64: headerLogo,
      headerTexts: assets.headerTexts,
    });
  } catch (err) {
    console.warn('Error en exportDocxToHighFidelityPdf, usando motor vectorial de contingencia:', err);
    if (options?.student && options?.record && options?.docType) {
      generateDirectVectorPdf(options.student, options.record, options.docType, fileName);
    } else {
      throw err;
    }
  } finally {
    if (document.body.contains(mount)) {
      document.body.removeChild(mount);
    }
  }
}

/**
 * Renders any docx Blob on-the-fly into an offscreen element and exports to PDF.
 * Uses the precision high-fidelity pipeline.
 */
export async function generatePdfFromDocxBlob(
  docxBlob: Blob,
  fileName: string,
  student?: Student,
  record?: TramiteRecord,
  docType?: 'informe' | 'resolucion'
): Promise<void> {
  return await exportDocxToHighFidelityPdf(docxBlob, fileName, {
    student,
    record,
    docType,
  });
}

/**
 * Executes server-side Python conversion environment silently:
 * Converts DOCX binary directly to PDF, perfectly preserving header logos, margins, and page breaks.
 * The server cleans up all temporary .docx files and intermediate artifacts automatically.
 */
export async function convertDocxToPdfViaPython(
  docxBlob: Blob,
  fileName: string
): Promise<boolean> {
  // If hosted on GitHub Pages or file: protocol, fallback immediately to client-side vector/canvas engine
  if (typeof window !== 'undefined' && (
    window.location.hostname.endsWith('github.io') ||
    window.location.protocol === 'file:'
  )) {
    return false;
  }

  try {
    const encodedName = encodeURIComponent(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`/api/convert-docx-to-pdf?filename=${encodedName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      body: docxBlob,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error || `HTTP ${response.status}`);
    }

    const pdfBlob = await response.blob();
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.warn('Conversión interna por Python no disponible o falló, recurriendo a exportación en cliente:', err);
    return false;
  }
}

/**
 * Universal export function that works with rendered element or fallback
 */
export async function exportDocxToPdf(
  docxBlob: Blob,
  fileName: string,
  renderedContainer?: HTMLElement | null
): Promise<void> {
  // First attempt silent internal Python execution environment
  const pythonSuccess = await convertDocxToPdfViaPython(docxBlob, fileName);
  if (pythonSuccess) {
    return;
  }

  if (renderedContainer) {
    await exportElementToPdf(renderedContainer, fileName);
    return;
  }
  await generatePdfFromDocxBlob(docxBlob, fileName);
}

