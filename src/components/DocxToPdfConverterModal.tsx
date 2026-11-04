import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileCheck2, 
  Download, 
  Printer, 
  Eye, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Layers, 
  FileText, 
  Sparkles,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { renderAsync } from 'docx-preview';
import { 
  extractDocxAssets, 
  ExtractedDocxAssets, 
  generateDocxFromTemplate 
} from '../utils/docxEngine';
import { 
  exportDocxToHighFidelityPdf, 
  exportElementToPdf,
  convertDocxToPdfViaPython 
} from '../utils/pdfEngine';
import { UTEA_LOGO_BASE64 } from '../data/uteaLogoData';

interface DocxToPdfConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocxBlob?: Blob | null;
  initialFileName?: string;
}

export const DocxToPdfConverterModal: React.FC<DocxToPdfConverterModalProps> = ({
  isOpen,
  onClose,
  initialDocxBlob,
  initialFileName,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docxBlob, setDocxBlob] = useState<Blob | null>(initialDocxBlob || null);
  const [fileName, setFileName] = useState<string>(initialFileName || 'Documento_UTEA.docx');
  const [assets, setAssets] = useState<ExtractedDocxAssets | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [pageCount, setPageCount] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isDragging, setIsDragging] = useState(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If initialDocxBlob changes, process it
  useEffect(() => {
    if (initialDocxBlob) {
      setDocxBlob(initialDocxBlob);
      if (initialFileName) setFileName(initialFileName);
      processDocxBlob(initialDocxBlob, initialFileName || 'Documento.docx');
    }
  }, [initialDocxBlob, initialFileName]);

  // Handle processing of a docx file/blob
  const processDocxBlob = async (blob: Blob, name: string) => {
    setIsProcessing(true);
    setExportFeedback(null);
    setFileName(name);

    try {
      // 1. Extract embedded assets (header logo, header xml, manual page breaks, tables)
      const extracted = await extractDocxAssets(blob);
      setAssets(extracted);

      // 2. Render into the preview container
      const container = previewContainerRef.current;
      if (container) {
        container.replaceChildren(); // clear previous
        const hostNode = document.createElement('div');
        hostNode.className = 'docx-preview-host w-full';
        container.appendChild(hostNode);

        await renderAsync(blob, hostNode, undefined, {
          inWrapper: false,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          useBase64URL: true,
        });

        const sections = Array.from(hostNode.querySelectorAll('section.docx, section')) as HTMLElement[];
        setPageCount(sections.length || 1);
      }
    } catch (err: any) {
      console.error('Error al procesar archivo DOCX:', err);
      setExportFeedback({
        type: 'error',
        message: `Error al procesar el documento Word: ${err.message || 'Formato de archivo inválido.'}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      setExportFeedback({
        type: 'error',
        message: 'Por favor selecciona un archivo con extensión .docx de Microsoft Word.',
      });
      return;
    }

    setSelectedFile(file);
    setDocxBlob(file);
    processDocxBlob(file, file.name);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.docx')) {
      setExportFeedback({
        type: 'error',
        message: 'Por favor arrastra un archivo con extensión .docx.',
      });
      return;
    }

    setSelectedFile(file);
    setDocxBlob(file);
    processDocxBlob(file, file.name);
  };

  const handleDownloadPdf = async () => {
    if (!docxBlob) {
      setExportFeedback({
        type: 'error',
        message: 'No hay ningún archivo .docx cargado para convertir.',
      });
      return;
    }

    setIsExportingPdf(true);
    setExportFeedback(null);

    const pdfName = fileName.replace(/\.docx$/i, '') + '_Alta_Fidelidad.pdf';

    try {
      // 1. Internal silent Python execution environment with LibreOffice headless
      const pythonConverted = await convertDocxToPdfViaPython(docxBlob, pdfName);
      if (pythonConverted) {
        setExportFeedback({
          type: 'success',
          message: `¡Documento "${pdfName}" procesado internamente con Python y descargado exitosamente con imágenes de encabezado, márgenes y saltos de página intactos!`,
        });
        return;
      }

      // 2. Client-side fallback if server was unavailable
      const headerLogo = assets?.headerImageBase64 || `data:image/png;base64,${UTEA_LOGO_BASE64}`;
      await exportDocxToHighFidelityPdf(docxBlob, pdfName, {
        headerImageBase64: headerLogo,
        headerTexts: assets?.headerTexts,
      });

      setExportFeedback({
        type: 'success',
        message: `¡Documento "${pdfName}" generado y descargado exitosamente con encabezado fijo en cada página y tablas protegidas!`,
      });
    } catch (err: any) {
      console.error('Error al exportar a PDF:', err);
      setExportFeedback({
        type: 'error',
        message: `Error al generar el PDF: ${err.message || 'Error en el proceso de maquetación.'}`,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDocx = () => {
    if (!docxBlob) return;
    const url = URL.createObjectURL(docxBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-xs no-print overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[96vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Conversor y Procesador DOCX a PDF de Alta Fidelidad
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Precisión Institucional A4
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Procesa íntegramente archivos Word (.docx), fijando el logotipo de encabezado en cada página sin solapamiento y evitando cortes en tablas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split in Top Control Bar + Preview Area */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-100/60 overflow-hidden">
          {/* Top Control Bar: Upload, Actions & Verification Badges */}
          <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs">
            {/* Left: Upload and Current File details */}
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>{docxBlob ? 'Cargar otro archivo .docx' : 'Subir archivo .docx'}</span>
              </button>

              {fileName && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold max-w-[220px] truncate" title={fileName}>
                    {fileName}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({pageCount} {pageCount === 1 ? 'página' : 'páginas'})
                  </span>
                </div>
              )}
            </div>

            {/* Center: Zoom Controls */}
            <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 px-2 py-1 rounded-lg text-xs text-slate-600">
              <button
                onClick={() => setZoomLevel((prev) => Math.max(prev - 10, 60))}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors cursor-pointer"
                title="Reducir zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-semibold px-1 min-w-[45px] text-center">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel((prev) => Math.min(prev + 10, 150))}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors cursor-pointer"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-200 hover:bg-slate-300 rounded text-slate-700 cursor-pointer ml-1"
                title="Restablecer zoom a 100%"
              >
                100%
              </button>
            </div>

            {/* Right: Actions (Download PDF, Print, Download DOCX) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={!docxBlob || isProcessing}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Imprimir directamente en hoja A4"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Imprimir</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadDocx}
                disabled={!docxBlob || isProcessing}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Descargar archivo Word original"
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Descargar Word</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={!docxBlob || isProcessing || isExportingPdf}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-lg text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generando PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Descargar PDF de Alta Fidelidad</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Verification Status Badges Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex flex-wrap items-center gap-4 text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Controles de Precisión Activos:
            </span>

            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Logotipo fijado en cada página
            </span>

            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Margen anti-colisión (132px)
            </span>

            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Tablas protegidas (break-inside: avoid)
            </span>

            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Control de viudas y huérfanas
            </span>

            {assets?.hasTables && (
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                Tablas con bordes limpios
              </span>
            )}
          </div>

          {/* User Feedback Messages */}
          {exportFeedback && (
            <div
              className={`px-6 py-2.5 text-xs font-medium flex items-center gap-2 border-b ${
                exportFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {exportFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span className="flex-1">{exportFeedback.message}</span>
            </div>
          )}

          {/* Main Preview Work Area */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
            {/* If no file is loaded, show welcoming Drag and Drop area */}
            {!docxBlob && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-2xl my-auto p-12 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50/70 scale-102'
                    : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50/80 shadow-sm'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Arrastra y suelta tu archivo Word (.docx) aquí
                </h3>
                <p className="text-xs text-slate-500 max-w-md mb-4">
                  El sistema extraerá automáticamente el logotipo de encabezado, los estilos tipográficos, los saltos de página y las tablas para generar un PDF de alta fidelidad.
                </p>
                <button
                  type="button"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  Seleccionar archivo de tu computadora
                </button>
              </div>
            )}

            {/* Loading indicator during rendering */}
            {isProcessing && (
              <div className="flex flex-col items-center justify-center my-auto py-12">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
                <span className="text-sm font-semibold text-slate-700">
                  Procesando documento Word y extrayendo elementos de encabezado...
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Garantizando márgenes anti-colisión y maquetación de precisión A4
                </span>
              </div>
            )}

            {/* Document Pages Container */}
            <div
              className={`transition-transform origin-top flex flex-col items-center ${
                isProcessing || !docxBlob ? 'hidden' : 'block'
              }`}
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              <div ref={previewContainerRef} className="docx-preview-wrapper w-full flex flex-col items-center" />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span>Universidad Tecnológica de los Andes</span>
            <span>•</span>
            <span>Motor de Conversión Documental A4</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
