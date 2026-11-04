import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  Download, 
  Copy, 
  Check, 
  Edit3, 
  Save, 
  ArrowLeft, 
  FileCheck2, 
  Upload, 
  AlertCircle,
  RotateCcw,
  Eye,
  Loader2,
  FileDown
} from 'lucide-react';
import { renderAsync } from 'docx-preview';
import { 
  exportElementToPdf, 
  generateDirectVectorPdf, 
  generatePdfFromDocxBlob,
  convertDocxToPdfViaPython 
} from '../utils/pdfEngine';
import { Student, TramiteRecord } from '../types';
import { generateDocuments, filterNumeric, toTitleCase } from '../utils/formatters';
import { 
  getStoredDocxTemplates, 
  generateDocxFromTemplate, 
  getTemplateTags, 
  TemplateKey,
  TEMPLATE_LIST,
  generateBaseDocxTemplate,
  initTemplateStorage,
  getActiveDocxTemplateAsync,
  saveDocxTemplateAsync,
  removeDocxTemplateAsync,
  validateAndParseDocxFile
} from '../utils/docxEngine';
import { UTEA_LOGO_BASE64 } from '../data/uteaLogoData';

interface DocumentViewerProps {
  student: Student;
  record: TramiteRecord;
  onUpdateRecord: (updated: TramiteRecord) => void;
  onClose: () => void;
  isAdmin?: boolean;
}

/**
 * Renders document text highlighting all tagged variables in BOLD (negrita)
 */
function renderTextWithBoldTags(content: string, tags: Record<string, string>) {
  if (!content) return null;

  // Gather unique values from tags (excluding empty or very short strings)
  const tagValues = new Set<string>();
  for (const [, val] of Object.entries(tags)) {
    if (val && typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.length >= 2 && !['N°', 'Nº', '01'].includes(trimmed)) {
        tagValues.add(trimmed);
      }
    }
  }

  const valuesArray = Array.from(tagValues).sort((a, b) => b.length - a.length);
  if (valuesArray.length === 0) {
    return content;
  }

  const escaped = valuesArray.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')}|\\{\\{?[^{}]+\\}?\\})`, 'g');

  const parts = content.split(regex);
  return (
    <>
      {parts.map((part, idx) => {
        if (!part) return null;
        if (tagValues.has(part) || /\{\{?[^{}]+\}?/.test(part)) {
          return (
            <strong key={idx} className="font-bold text-slate-950 font-document">
              {part}
            </strong>
          );
        }
        return part;
      })}
    </>
  );
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  student,
  record,
  onUpdateRecord,
  onClose,
  isAdmin = false,
}) => {
  const generated = generateDocuments(student, record);

  const [activeDoc, setActiveDoc] = useState<'informe' | 'resolucion'>('informe');
  const [isEditing, setIsEditing] = useState(false);
  const [fillables, setFillables] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [renderedWithDocx, setRenderedWithDocx] = useState(false);
  const [isRenderingDocx, setIsRenderingDocx] = useState(false);
  const [storedTemplates, setStoredTemplates] = useState(() => getStoredDocxTemplates());

  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const docxContainerRef = useRef<HTMLDivElement>(null);

  // Initialize fillables form from record
  useEffect(() => {
    if (record.type === 'designacion') {
      setFillables({
        futNumber: record.designacion?.futNumber || '',
        futDate: record.designacion?.futDate || '',
        expedienteNumber: record.designacion?.expedienteNumber || '',
        informeNumber: record.designacion?.informeNumber || '',
        informeDate: record.designacion?.informeDate || '',
        advisorName: record.designacion?.advisorName || '',
        adminResolutionNumber: record.designacion?.adminResolutionNumber || '',
        adminResolutionDate: record.designacion?.adminResolutionDate || '',
      });
    } else if (record.type === 'reasignacion') {
      setFillables({
        currentResolution: record.reasignacion?.currentResolution || '',
        currentResolutionDate: record.reasignacion?.currentResolutionDate || '',
        currentAdvisorName: record.reasignacion?.currentAdvisorName || '',
        futNumber: record.reasignacion?.futNumber || '',
        futDate: record.reasignacion?.futDate || '',
        expedienteNumber: record.reasignacion?.expedienteNumber || '',
        informeNumber: record.reasignacion?.informeNumber || '',
        informeDate: record.reasignacion?.informeDate || '',
        newAdvisorName: record.reasignacion?.newAdvisorName || '',
        adminResolutionNumber: record.reasignacion?.adminResolutionNumber || '',
        adminResolutionDate: record.reasignacion?.adminResolutionDate || '',
      });
    } else if (record.type === 'sustentacion') {
      setFillables({
        advisorName: record.sustentacion?.advisorName || '',
        futNumber: record.sustentacion?.futNumber || '',
        futDate: record.sustentacion?.futDate || '',
        expedienteNumber: record.sustentacion?.expedienteNumber || '',
        advisorApprovalReportNumber: record.sustentacion?.advisorApprovalReportNumber || '',
        advisorApprovalReportDate: record.sustentacion?.advisorApprovalReportDate || '',
        juryDesignationReportNumber: record.sustentacion?.juryDesignationReportNumber || '',
        juryDesignationReportDate: record.sustentacion?.juryDesignationReportDate || '',
        presidentName: record.sustentacion?.presidentName || '',
        memberName: record.sustentacion?.memberName || '',
        defenseDate: record.sustentacion?.defenseDate || '',
        defenseTime: record.sustentacion?.defenseTime || '',
        adminResolutionNumber: record.sustentacion?.adminResolutionNumber || '',
        adminResolutionDate: record.sustentacion?.adminResolutionDate || '',
      });
    } else if (record.type === 'aprobacion') {
      setFillables({
        futNumber: record.aprobacion?.futNumber || '',
        futDate: record.aprobacion?.futDate || '',
        expedienteNumber: record.aprobacion?.expedienteNumber || '',
        advisorDesignationReportNumber: record.aprobacion?.advisorDesignationReportNumber || '',
        advisorDesignationReportDate: record.aprobacion?.advisorDesignationReportDate || '',
        advisorReviewerResolution: record.aprobacion?.advisorReviewerResolution || '',
        advisorReviewerResolutionDate: record.aprobacion?.advisorReviewerResolutionDate || '',
        juryApprovalReportNumber: record.aprobacion?.juryApprovalReportNumber || '',
        juryApprovalReportDate: record.aprobacion?.juryApprovalReportDate || '',
        adminResolutionNumber: record.aprobacion?.adminResolutionNumber || '',
        adminResolutionDate: record.aprobacion?.adminResolutionDate || '',
        advisorName: record.aprobacion?.advisorName || '',
        futSustentacionNumber: record.aprobacion?.futSustentacionNumber || '',
        futSustentacionDate: record.aprobacion?.futSustentacionDate || '',
        resolutionSustentacionNumber: record.aprobacion?.resolutionSustentacionNumber || '',
        resolutionSustentacionDate: record.aprobacion?.resolutionSustentacionDate || '',
        juryDesignationReportNumber: record.aprobacion?.juryDesignationReportNumber || '',
        juryDesignationReportDate: record.aprobacion?.juryDesignationReportDate || '',
        presidentName: record.aprobacion?.presidentName || '',
        memberName: record.aprobacion?.memberName || '',
      });
    }
  }, [record]);

  // Listen for IndexedDB template initialization and updates
  useEffect(() => {
    initTemplateStorage().then((tpls) => {
      setStoredTemplates({ ...tpls });
    });

    const handleUpdate = () => {
      setStoredTemplates(getStoredDocxTemplates());
    };
    window.addEventListener('utea_templates_updated', handleUpdate);
    return () => window.removeEventListener('utea_templates_updated', handleUpdate);
  }, []);

  const currentContent = activeDoc === 'informe' ? generated.informe : generated.resolucion;
  const currentTitle = activeDoc === 'informe' ? generated.informeTitle : generated.resolucionTitle;

  const templateKey = `${activeDoc}_${record.type}` as TemplateKey;
  const customDocxTemplate = storedTemplates[templateKey];

  // In-browser high-fidelity DOCX rendering with exact margins and images using docx-preview
  useEffect(() => {
    if (isEditing) {
      return;
    }

    const container = docxContainerRef.current;
    if (!container) return;

    let isCurrent = true;
    setIsRenderingDocx(true);
    setRenderedWithDocx(false);

    // Create an isolated host element that React reconciler does not touch
    const hostNode = document.createElement('div');
    hostNode.className = 'docx-render-host w-full';
    container.replaceChildren(hostNode);

    (async () => {
      try {
        const tags = getTemplateTags(student, record);
        const templateItem = await getActiveDocxTemplateAsync(templateKey);
        if (!templateItem?.base64) {
          throw new Error('Plantilla DOCX no disponible aun');
        }
        const blob = generateDocxFromTemplate(templateItem.base64, tags);
        if (!isCurrent) return;

        await renderAsync(blob, hostNode, undefined, {
          inWrapper: false,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          useBase64URL: true,
        });

        if (isCurrent) {
          setRenderedWithDocx(true);
          setIsRenderingDocx(false);
        }
      } catch (err) {
        console.warn('Docx preview fallback to standard view:', err);
        if (isCurrent) {
          setRenderedWithDocx(false);
          setIsRenderingDocx(false);
        }
      }
    })();

    return () => {
      isCurrent = false;
      // Before React unmounts or re-renders, clean up any imperative DOM nodes
      try {
        if (container) {
          container.replaceChildren();
        }
      } catch {
        // ignore
      }
    };
  }, [activeDoc, record, student, isEditing, customDocxTemplate, templateKey, currentTitle]);

  const handleSaveFillables = () => {
    const updated: TramiteRecord = {
      ...record,
      updatedAt: new Date().toISOString(),
      status: record.status === 'pendiente' ? 'documentos_generados' : record.status,
    };

    if (record.type === 'designacion') {
      updated.designacion = {
        futNumber: filterNumeric(fillables.futNumber || ''),
        futDate: fillables.futDate || '',
        expedienteNumber: filterNumeric(fillables.expedienteNumber || ''),
        informeNumber: filterNumeric(fillables.informeNumber || '') || undefined,
        informeDate: fillables.informeDate || undefined,
        advisorName: fillables.advisorName?.trim() ? toTitleCase(fillables.advisorName.trim()) : undefined,
        adminResolutionNumber: filterNumeric(fillables.adminResolutionNumber || '') || undefined,
        adminResolutionDate: fillables.adminResolutionDate || undefined,
      };
    } else if (record.type === 'reasignacion') {
      updated.reasignacion = {
        currentResolution: fillables.currentResolution?.trim() || '',
        currentResolutionDate: fillables.currentResolutionDate || '',
        currentAdvisorName: toTitleCase(fillables.currentAdvisorName?.trim() || ''),
        futNumber: filterNumeric(fillables.futNumber || ''),
        futDate: fillables.futDate || '',
        expedienteNumber: filterNumeric(fillables.expedienteNumber || ''),
        informeNumber: filterNumeric(fillables.informeNumber || '') || undefined,
        informeDate: fillables.informeDate || undefined,
        newAdvisorName: fillables.newAdvisorName?.trim() ? toTitleCase(fillables.newAdvisorName.trim()) : undefined,
        adminResolutionNumber: filterNumeric(fillables.adminResolutionNumber || '') || undefined,
        adminResolutionDate: fillables.adminResolutionDate || undefined,
      };
    } else if (record.type === 'sustentacion') {
      updated.sustentacion = {
        advisorName: toTitleCase(fillables.advisorName?.trim() || ''),
        futNumber: filterNumeric(fillables.futNumber || ''),
        futDate: fillables.futDate || '',
        expedienteNumber: filterNumeric(fillables.expedienteNumber || ''),
        advisorApprovalReportNumber: filterNumeric(fillables.advisorApprovalReportNumber || ''),
        advisorApprovalReportDate: fillables.advisorApprovalReportDate || '',
        juryDesignationReportNumber: filterNumeric(fillables.juryDesignationReportNumber || '') || undefined,
        juryDesignationReportDate: fillables.juryDesignationReportDate || undefined,
        presidentName: fillables.presidentName?.trim() ? toTitleCase(fillables.presidentName.trim()) : undefined,
        memberName: fillables.memberName?.trim() ? toTitleCase(fillables.memberName.trim()) : undefined,
        defenseDate: fillables.defenseDate || undefined,
        defenseTime: fillables.defenseTime || undefined,
        adminResolutionNumber: filterNumeric(fillables.adminResolutionNumber || '') || undefined,
        adminResolutionDate: fillables.adminResolutionDate || undefined,
      };
    } else if (record.type === 'aprobacion') {
      updated.aprobacion = {
        ...record.aprobacion,
        futNumber: filterNumeric(fillables.futNumber || ''),
        futDate: fillables.futDate || '',
        expedienteNumber: filterNumeric(fillables.expedienteNumber || ''),
        advisorDesignationReportNumber: filterNumeric(fillables.advisorDesignationReportNumber || ''),
        advisorDesignationReportDate: fillables.advisorDesignationReportDate || '',
        advisorReviewerResolution: fillables.advisorReviewerResolution?.trim() || '',
        advisorReviewerResolutionDate: fillables.advisorReviewerResolutionDate || '',
        juryApprovalReportNumber: filterNumeric(fillables.juryApprovalReportNumber || '') || undefined,
        juryApprovalReportDate: fillables.juryApprovalReportDate || undefined,
        adminResolutionNumber: filterNumeric(fillables.adminResolutionNumber || '') || undefined,
        adminResolutionDate: fillables.adminResolutionDate || undefined,
        advisorName: fillables.advisorName?.trim() ? toTitleCase(fillables.advisorName.trim()) : undefined,
        presidentName: fillables.presidentName?.trim() ? toTitleCase(fillables.presidentName.trim()) : undefined,
        memberName: fillables.memberName?.trim() ? toTitleCase(fillables.memberName.trim()) : undefined,
      };
    }

    onUpdateRecord(updated);
    setIsEditing(false);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 3500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadDoc = async () => {
    const tags = getTemplateTags(student, record);
    const activeTemplate = await getActiveDocxTemplateAsync(templateKey);

    if (!activeTemplate?.base64) {
      setPdfFeedback({
        type: 'error',
        message: 'Aún no has subido la plantilla .docx para este documento. Súbela en el botón "Subir Plantilla .docx" para descargar.',
      });
      setTimeout(() => setPdfFeedback(null), 6000);
      return;
    }

    try {
      const docxBlob = generateDocxFromTemplate(activeTemplate.base64, tags);
      const fileName = `${student.fullName.replace(/\s+/g, '_')}_${activeDoc.toUpperCase()}_PPP.docx`;
      const url = URL.createObjectURL(docxBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error al generar documento Word:', err);
      setPdfFeedback({
        type: 'error',
        message: `Error al generar documento Word: ${err.message || 'Error desconocido'}`,
      });
      setTimeout(() => setPdfFeedback(null), 6000);
    }
  };

  /**
   * Generates and downloads a real high-fidelity PDF based strictly on the
   * active DOCX template uploaded by the user.
   */
  const handleDownloadPdf = async () => {
    const activeTemplate = await getActiveDocxTemplateAsync(templateKey);
    if (!activeTemplate?.base64) {
      setPdfFeedback({
        type: 'error',
        message: 'Aún no has subido la plantilla .docx para este documento. Súbela primero para poder generar y descargar el PDF.',
      });
      setTimeout(() => setPdfFeedback(null), 6000);
      return;
    }

    setIsGeneratingPdf(true);
    setPdfFeedback(null);
    const fileName = `${student.fullName.replace(/\s+/g, '_')}_${activeDoc.toUpperCase()}_PPP.pdf`;

    try {
      const tags = getTemplateTags(student, record);
      // Generate the exact filled .docx file from template
      const docxBlob = generateDocxFromTemplate(activeTemplate.base64, tags);

      // 1. Execute the Python conversion environment internally and silently
      const pythonConverted = await convertDocxToPdfViaPython(docxBlob, fileName);
      if (pythonConverted) {
        setPdfFeedback({
          type: 'success',
          message: `¡Documento "${fileName}" procesado internamente con Python y descargado con éxito respetando imágenes, encabezados, márgenes y saltos de página originales!`,
        });
        setTimeout(() => setPdfFeedback(null), 6000);
        return;
      }

      // 2. Fallback to client-side engine if server environment was not available
      const host = (docxContainerRef.current?.querySelector('.docx-render-host') as HTMLElement) || docxContainerRef.current;
      const hasRenderedSections = host && host.querySelectorAll('section.docx, section').length > 0;

      if (renderedWithDocx && hasRenderedSections) {
        await exportElementToPdf(host, fileName, student, record, activeDoc);
      } else {
        await generatePdfFromDocxBlob(docxBlob, fileName, student, record, activeDoc);
      }

      setPdfFeedback({
        type: 'success',
        message: `¡Documento "${fileName}" generado fielmente en base a tu plantilla Word (.docx) y descargado con éxito!`,
      });
      setTimeout(() => setPdfFeedback(null), 6000);
    } catch (err: any) {
      console.warn('Canvas export error, using direct vector PDF:', err);
      try {
        generateDirectVectorPdf(student, record, activeDoc, fileName);
        setPdfFeedback({
          type: 'success',
          message: `¡Documento "${fileName}" descargado con éxito en tu computadora!`,
        });
        setTimeout(() => setPdfFeedback(null), 6000);
      } catch (fallbackErr: any) {
        setPdfFeedback({
          type: 'error',
          message: 'Error al generar el PDF. Puedes verificar que la plantilla .docx subida contenga las etiquetas correctas.',
        });
        setTimeout(() => setPdfFeedback(null), 7000);
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Direct template upload from DocumentViewer
  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const validation = await validateAndParseDocxFile(file);
      if (!validation.valid || !validation.base64) {
        setUploadError(validation.error || 'El archivo seleccionado no es un documento .docx válido.');
        setUploadLoading(false);
        return;
      }

      await saveDocxTemplateAsync(templateKey, validation.base64, file.name, file.size);
      const updated = getStoredDocxTemplates();
      setStoredTemplates({ ...updated });
      setUploadSuccess(`¡Plantilla base actualizada automáticamente con "${file.name}"! Documento Word (.docx) y PDF sincronizados.`);
      setTimeout(() => setUploadSuccess(null), 6000);
    } catch (err: any) {
      setUploadError(err.message || 'Error al procesar plantilla');
    } finally {
      setUploadLoading(false);
      e.target.value = '';
    }
  };

  const handleResetTemplate = async () => {
    if (window.confirm('¿Deseas eliminar la plantilla subida para este documento? Volverá al estado pendiente de subida.')) {
      await removeDocxTemplateAsync(templateKey);
      const updated = getStoredDocxTemplates();
      setStoredTemplates({ ...updated });
      setUploadSuccess('Plantilla eliminada exitosamente. El documento queda pendiente de subida.');
      setTimeout(() => setUploadSuccess(null), 4000);
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-5">
      {/* Top Action Bar (hidden in print) */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
              Documentos Oficiales Generados
            </div>
            <h1 className="text-sm font-bold text-slate-900 truncate max-w-md">
              {student.fullName} · {student.studentCode}
            </h1>
          </div>
        </div>

        {/* Document Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveDoc('informe')}
            className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeDoc === 'informe'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Informe de la Comisión
          </button>
          <button
            onClick={() => setActiveDoc('resolucion')}
            className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeDoc === 'resolucion'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Resolución Sub Directoral
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Admin-only Editing */}
          {isAdmin && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`py-2 px-3 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                isEditing
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-2xs font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Modificar los datos rellenables guardados en la base de datos"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Ver Documento' : 'Editar Rellenables'}</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copiar texto"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
          </button>

          {/* Descarga Word (.docx) - Exclusivo Administrador */}
          {isAdmin && (
            <button
              onClick={handleDownloadDoc}
              className="py-2 px-3 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Descargar archivo Word editable con formato 100% oficial"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Descargar Word (.docx)</span>
              <span className="sm:hidden">Word</span>
            </button>
          )}

          {/* Descargar PDF (generado directamente en base al documento docx) - Disponible para Administrador y Alumnos */}
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="py-2 px-4 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            title="Descargar documento oficial generado en formato PDF a partir del Word"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <FileDown className="w-4 h-4 text-amber-300" />
            )}
            <span>{isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
          </button>

          {/* Botón de Impresión Directa secundario */}
          <button
            onClick={handlePrint}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Imprimir directamente desde el navegador"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Template Direct Status & Fast Upload Bar */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          {customDocxTemplate?.base64 ? (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold text-emerald-900">
                Plantilla Word (.docx) activa:
              </span>
              <span className="font-mono bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-md text-[11px] font-bold">
                {customDocxTemplate.fileName}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="font-bold text-amber-900">
                Sin plantilla subida
              </span>
              <span className="text-slate-500 text-[11px]">
                (Sube tu archivo .docx para este trámite)
              </span>
            </div>
          )}
        </div>

        {/* Direct Actions: Upload / Replace / Remove .docx */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <label className={`cursor-pointer py-1.5 px-3 rounded-lg font-semibold flex items-center gap-1.5 shadow-2xs transition-colors ${
                customDocxTemplate?.base64 
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white' 
                  : 'bg-blue-900 hover:bg-blue-950 text-white'
              }`}>
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {uploadLoading 
                    ? 'Validando...' 
                    : customDocxTemplate?.base64 
                    ? 'Reemplazar .docx' 
                    : 'Subir Plantilla .docx'}
                </span>
                <input
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleDirectUpload}
                  disabled={uploadLoading}
                  className="hidden"
                />
              </label>

              {customDocxTemplate?.base64 && (
                <button
                  onClick={handleResetTemplate}
                  className="py-1.5 px-2.5 text-slate-500 hover:text-red-700 hover:bg-red-50 border border-slate-200 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer"
                  title="Eliminar la plantilla subida para este documento"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Eliminar plantilla</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {uploadSuccess && (
        <div className="no-print p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {uploadError && (
        <div className="no-print p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {saveFeedback && (
        <div className="no-print p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>¡Rellenables guardados exitosamente en la base de datos! El documento, Word (.docx) y PDF se han actualizado dinámicamente.</span>
        </div>
      )}

      {pdfFeedback && (
        <div className={`no-print p-3 rounded-xl text-xs flex items-center gap-2 ${
          pdfFeedback.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
            : 'bg-red-50 border border-red-200 text-red-900'
        }`}>
          {pdfFeedback.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{pdfFeedback.message}</span>
        </div>
      )}

      {/* Main Document Page Container */}
      <div className="max-w-4xl mx-auto">
        {/* Fillables Editor (persistent container) */}
        <div className={isEditing ? 'block' : 'hidden'}>
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-7 space-y-6 no-print">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                  Base de Datos · Solo Rellenables
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1.5">
                  Editar Campos Rellenables: {record.type.toUpperCase()}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Modifica los valores que alimentan la plantilla. Los documentos Word (.docx) y PDF se generan automáticamente a partir de estos rellenables.
                </p>
              </div>
            </div>

            {/* Document Specific Fields (Informe & Resolución) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-700" />
                <span>Parámetros de este Documento ({activeDoc === 'informe' ? 'Informe' : 'Resolución'})</span>
              </h3>

              {activeDoc === 'informe' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número de Informe (solo números)
                    </label>
                    <input
                      type="text"
                      value={fillables.informeNumber ?? fillables.juryDesignationReportNumber ?? fillables.juryApprovalReportNumber ?? ''}
                      onChange={(e) => {
                        const val = filterNumeric(e.target.value);
                        setFillables({
                          ...fillables,
                          informeNumber: val,
                          juryDesignationReportNumber: val,
                          juryApprovalReportNumber: val,
                        });
                      }}
                      placeholder="Ej: 045"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fecha del Informe
                    </label>
                    <input
                      type="date"
                      value={fillables.informeDate ?? fillables.juryDesignationReportDate ?? fillables.juryApprovalReportDate ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFillables({
                          ...fillables,
                          informeDate: val,
                          juryDesignationReportDate: val,
                          juryApprovalReportDate: val,
                        });
                      }}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Número de Resolución (solo números)
                    </label>
                    <input
                      type="text"
                      value={fillables.adminResolutionNumber ?? ''}
                      onChange={(e) => setFillables({ ...fillables, adminResolutionNumber: filterNumeric(e.target.value) })}
                      placeholder="Ej: 583"
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Fecha de la Resolución
                    </label>
                    <input
                      type="date"
                      value={fillables.adminResolutionDate ?? ''}
                      onChange={(e) => setFillables({ ...fillables, adminResolutionDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Trámite Specific Fillables */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Rellenables del Trámite ({record.type.toUpperCase()})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Número de FUT
                  </label>
                  <input
                    type="text"
                    value={fillables.futNumber ?? ''}
                    onChange={(e) => setFillables({ ...fillables, futNumber: filterNumeric(e.target.value) })}
                    placeholder="Solo números"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Fecha del FUT
                  </label>
                  <input
                    type="date"
                    value={fillables.futDate ?? ''}
                    onChange={(e) => setFillables({ ...fillables, futDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Número de Expediente
                  </label>
                  <input
                    type="text"
                    value={fillables.expedienteNumber ?? ''}
                    onChange={(e) => setFillables({ ...fillables, expedienteNumber: filterNumeric(e.target.value) })}
                    placeholder="Solo números"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Specific to Designación */}
              {record.type === 'designacion' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nombre del Asesor Asignado
                  </label>
                  <input
                    type="text"
                    value={fillables.advisorName ?? ''}
                    onChange={(e) => setFillables({ ...fillables, advisorName: e.target.value })}
                    placeholder="Ej: Mg. Ing. Carlos Mendoza Estrada"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none"
                  />
                </div>
              )}

              {/* Specific to Reasignación */}
              {record.type === 'reasignacion' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nuevo Asesor Designado
                    </label>
                    <input
                      type="text"
                      value={fillables.newAdvisorName ?? ''}
                      onChange={(e) => setFillables({ ...fillables, newAdvisorName: e.target.value })}
                      placeholder="Ej: Mg. Ing. Luis Fernando Palomino"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Asesor Anterior
                    </label>
                    <input
                      type="text"
                      value={fillables.currentAdvisorName ?? ''}
                      onChange={(e) => setFillables({ ...fillables, currentAdvisorName: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Specific to Sustentación */}
              {record.type === 'sustentacion' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Presidente de Jurado
                      </label>
                      <input
                        type="text"
                        value={fillables.presidentName ?? ''}
                        onChange={(e) => setFillables({ ...fillables, presidentName: e.target.value })}
                        placeholder="Ej: Mg. Ing. Jorge Cardenas"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Miembro de Jurado
                      </label>
                      <input
                        type="text"
                        value={fillables.memberName ?? ''}
                        onChange={(e) => setFillables({ ...fillables, memberName: e.target.value })}
                        placeholder="Ej: Mg. Ing. Paul Vargas"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Fecha Programada de Sustentación
                      </label>
                      <input
                        type="date"
                        value={fillables.defenseDate ?? ''}
                        onChange={(e) => setFillables({ ...fillables, defenseDate: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Hora Programada
                      </label>
                      <input
                        type="time"
                        value={fillables.defenseTime ?? ''}
                        onChange={(e) => setFillables({ ...fillables, defenseTime: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Specific to Aprobación */}
              {record.type === 'aprobacion' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Presidente de Jurado
                    </label>
                    <input
                      type="text"
                      value={fillables.presidentName ?? ''}
                      onChange={(e) => setFillables({ ...fillables, presidentName: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Miembro de Jurado
                    </label>
                    <input
                      type="text"
                      value={fillables.memberName ?? ''}
                      onChange={(e) => setFillables({ ...fillables, memberName: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveFillables}
                className="px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>Guardar Rellenables en Base de Datos</span>
              </button>
            </div>
          </div>
        </div>

        {/* Document Presentation (persistent container) */}
        <div className={!isEditing ? 'block' : 'hidden'}>
          <div>
            {isRenderingDocx && (
              <div className="flex items-center justify-center p-8 bg-white rounded-2xl border border-slate-200 gap-3 text-slate-600 text-sm mb-4 shadow-2xs no-print">
                <Loader2 className="w-5 h-5 animate-spin text-blue-900" />
                <span>Aplicando datos del alumno y renderizando plantilla Word (.docx)...</span>
              </div>
            )}

            {!customDocxTemplate?.base64 && !isRenderingDocx && (
              <div className="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-8 sm:p-12 text-center shadow-xs space-y-4 no-print my-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-900 flex items-center justify-center mx-auto shadow-inner">
                  <Upload className="w-8 h-8 text-blue-800" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900">
                    Aún no has subido la plantilla Word (.docx) para este documento
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Sube el archivo Word (.docx) oficial que deseas utilizar para <strong>{currentTitle}</strong>. El sistema lo guardará en tu navegador y rellenará automáticamente los campos del estudiante.
                  </p>
                </div>
                <div className="pt-2">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-blue-900 hover:bg-blue-950 text-white rounded-xl text-xs font-bold shadow-md transition-all">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Seleccionar y Subir Plantilla .docx</span>
                    <input
                      type="file"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleDirectUpload}
                      disabled={uploadLoading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Contenedor Fiel Oficial DOCX */}
            <div
              ref={docxContainerRef}
              className={`docx-preview-wrapper ${customDocxTemplate?.base64 ? 'block' : 'hidden'} bg-slate-200/50 p-2 sm:p-5 rounded-2xl overflow-x-auto shadow-inner print:p-0 print:bg-white print:shadow-none min-h-[400px]`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
