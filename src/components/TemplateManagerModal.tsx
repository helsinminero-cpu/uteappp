import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  FileCheck2, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Download,
  Copy,
  Check,
  Tag,
  Loader2,
  FileCode,
  RotateCcw,
  CheckCircle,
  Database,
  Cloud,
  RefreshCw
} from 'lucide-react';
import { 
  TEMPLATE_LIST, 
  TemplateKey, 
  getStoredDocxTemplates, 
  saveDocxTemplateAsync, 
  removeDocxTemplateAsync,
  validateAndParseDocxFile,
  generateBaseDocxTemplate,
  initTemplateStorage,
  resetAllTemplatesToDefaultAsync,
  getActiveDocxTemplateAsync
} from '../utils/docxEngine';
import { getStoredDriveConfig, DriveBackupConfig } from '../utils/driveStorage';
import { executeDriveSync, resetDriveSyncLock } from '../utils/driveAutoSync';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [storedTemplates, setStoredTemplates] = useState(() => getStoredDocxTemplates());
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [isProcessingKey, setIsProcessingKey] = useState<string | null>(null);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [showTagsGuide, setShowTagsGuide] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);
  const [tagCategoryFilter, setTagCategoryFilter] = useState<'todos' | 'comunes' | 'designacion' | 'reasignacion' | 'sustentacion' | 'aprobacion'>('todos');

  // Drive sync state
  const [driveConfig, setDriveConfig] = useState<DriveBackupConfig>(() => getStoredDriveConfig());
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);

  // Synchronize with storage on open and when templates update
  useEffect(() => {
    if (!isOpen) return;

    initTemplateStorage().then((tpls) => {
      setStoredTemplates({ ...tpls });
    });
    setDriveConfig(getStoredDriveConfig());

    const handleUpdate = () => {
      setStoredTemplates(getStoredDocxTemplates());
      setDriveConfig(getStoredDriveConfig());
    };
    window.addEventListener('utea_templates_updated', handleUpdate);
    window.addEventListener('utea_drive_config_updated', handleUpdate);
    return () => {
      window.removeEventListener('utea_templates_updated', handleUpdate);
      window.removeEventListener('utea_drive_config_updated', handleUpdate);
    };
  }, [isOpen]);

  const handleSyncToDrive = async () => {
    if (!driveConfig.webhookUrl && !driveConfig.folderId) {
      setUploadError('Para guardar en Google Drive, primero ingresa tu enlace o Webhook de Drive en el botón "Respaldo Google Drive" del encabezado.');
      return;
    }

    setIsSyncingDrive(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const res = await executeDriveSync(true);
      if (res.success) {
        setUploadSuccess('¡Todas las plantillas (.docx) y la base de datos se guardaron exitosamente en tu Google Drive!');
        setDriveConfig(getStoredDriveConfig());
        setTimeout(() => setUploadSuccess(null), 8000);
      } else {
        setUploadError(`Error al sincronizar con Google Drive: ${res.error}`);
      }
    } catch (err: any) {
      setUploadError(`Error de sincronización con Google Drive: ${err.message}`);
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleFileUpload = async (key: TemplateKey, e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);

    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingKey(key);

    try {
      // 1. Validar archivo .docx con análisis de estructura ZIP y XML
      const validation = await validateAndParseDocxFile(file);

      if (!validation.valid || !validation.base64) {
        setUploadError(validation.error || 'El archivo seleccionado no es un documento .docx válido.');
        setIsProcessingKey(null);
        return;
      }

      // 2. Guardar de forma persistente en IndexedDB y localStorage
      await saveDocxTemplateAsync(key, validation.base64, file.name, file.size);
      const updated = getStoredDocxTemplates();
      setStoredTemplates({ ...updated });

      // 3. Sincronizar inmediatamente con Google Drive si está configurado
      executeDriveSync().catch(() => {});

      // 4. Notificación de éxito con etiquetas detectadas
      const tagsCount = validation.detectedTags?.length || 0;
      const tagsPreview = tagsCount > 0 
        ? ` (${tagsCount} etiquetas detectadas en el Word: ${validation.detectedTags?.slice(0, 4).map(t => `{${t}}`).join(', ')}${tagsCount > 4 ? '...' : ''})` 
        : ' (Asegúrate de incluir etiquetas institucionales como {ALUMNO})';

      const driveNote = driveConfig.webhookUrl || driveConfig.folderId 
        ? ' y sincronizada con Google Drive' 
        : '';

      setUploadSuccess(`¡Plantilla base actualizada automáticamente con "${file.name}"! Ahora todos los documentos Word (.docx) y descargas PDF se generarán directamente con esta nueva plantilla base.${driveNote} Tamaño: ${validation.fileSizeFormatted}.${tagsPreview}`);
      setTimeout(() => setUploadSuccess(null), 8000);
    } catch (err: any) {
      setUploadError(`Error inesperado al cargar la plantilla: ${err.message || 'Intente nuevamente'}`);
    } finally {
      setIsProcessingKey(null);
      e.target.value = '';
    }
  };

  const handleRemove = async (key: TemplateKey) => {
    if (window.confirm('¿Deseas restablecer esta plantilla al formato oficial UTEA predeterminado?')) {
      await removeDocxTemplateAsync(key);
      const updated = getStoredDocxTemplates();
      setStoredTemplates({ ...updated });
      setUploadSuccess('Plantilla restablecida al formato oficial UTEA.');
      setTimeout(() => setUploadSuccess(null), 5000);
    }
  };

  const handleResetAll = async () => {
    if (window.confirm('¿Seguro que deseas restablecer todas las 8 plantillas al formato oficial UTEA predeterminado?')) {
      setIsResettingAll(true);
      try {
        await resetAllTemplatesToDefaultAsync();
        const updated = getStoredDocxTemplates();
        setStoredTemplates({ ...updated });
        setUploadSuccess('Todas las 8 plantillas se han restablecido y guardado en formato oficial UTEA.');
        setTimeout(() => setUploadSuccess(null), 6000);
      } finally {
        setIsResettingAll(false);
      }
    }
  };

  const handleDownloadBaseTemplate = async (key: TemplateKey, title: string) => {
    try {
      const active = await getActiveDocxTemplateAsync(key);
      const def = TEMPLATE_LIST.find((t) => t.key === key);
      let blob: Blob;
      let downloadFileName = def?.fileName || `${key}.docx`;

      if (active?.base64) {
        const binaryString = window.atob(active.base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        downloadFileName = active.fileName || downloadFileName;
      } else {
        blob = generateBaseDocxTemplate(key, title);
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al generar la plantilla de descarga.');
    }
  };

  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const filteredTemplates = selectedCategory === 'todos' 
    ? TEMPLATE_LIST 
    : TEMPLATE_LIST.filter(t => t.category === selectedCategory);

  const ALL_TAGS = [
    // Comunes Alumno
    { category: 'comunes', label: 'Apellidos y Nombres', tag: '{{Apellidos_y_Nombres}}', desc: 'Nombre completo en formato oficial' },
    { category: 'comunes', label: 'Código Universitario', tag: '{{Codigo_Alumno}}', desc: 'Código oficial del estudiante (Ej: 202300220F)' },
    { category: 'comunes', label: 'Empresa / Organización', tag: '{{Organizacion}}', desc: 'Institución donde realizó las prácticas' },
    { category: 'comunes', label: 'Fecha Inicio PPP', tag: '{{Fecha_Inicio_PPP}}', desc: 'Fecha de inicio (Ej: 02 de marzo del 2026)' },
    { category: 'comunes', label: 'Fecha Fin (+4 meses)', tag: '{{Fecha_Fin_PPP}}', desc: 'Calculado automáticamente a 4 meses' },

    // Trámite 1: Designación
    { category: 'designacion', label: 'FUT Designación', tag: '{{Numero de FUT solicitud de Asesor}}', desc: 'FUT independiente de solicitud de asesor' },
    { category: 'designacion', label: 'Fecha FUT Designación', tag: '{{Fecha de FUT de solicitud de Asesor}}', desc: 'Fecha de emisión del FUT de asesor' },
    { category: 'designacion', label: 'Expediente Designación', tag: '{{Numero de Expediente Fut de Asesor}}', desc: 'Expediente independiente de designación' },
    { category: 'designacion', label: 'Informe Designación', tag: '{{Informe de designacion de asesor de Practicas Pre Profesionales}}', desc: 'Informe Nº de la Comisión (Ej: 045-2026)' },
    { category: 'designacion', label: 'Resolución Designación', tag: '{{numero de resolucion de designacion asesor}}', desc: 'Resolución Sub Directoral Nº de asesor' },
    { category: 'designacion', label: 'Nombre Asesor', tag: '{{Nombre completo del asesor}}', desc: 'Docente propuesto como asesor' },

    // Trámite 2: Reasignación
    { category: 'reasignacion', label: 'FUT Reasignación', tag: '{{Numero de FUT de solicitud de Reasignacion de asesor}}', desc: 'FUT independiente de reasignación' },
    { category: 'reasignacion', label: 'Fecha FUT Reasignación', tag: '{{Fecha de FUT de solicitud de reasignacion de Asesor}}', desc: 'Fecha del FUT de reasignación' },
    { category: 'reasignacion', label: 'Expediente Reasignación', tag: '{{Numero de Expediente de reasignacion de Asesor}}', desc: 'Expediente independiente de reasignación' },
    { category: 'reasignacion', label: 'Informe Reasignación', tag: '{{Informe de reasignacion de asesor de Practicas Pre Profesionales}}', desc: 'Informe Nº de reasignación' },
    { category: 'reasignacion', label: 'Resolución Reasignación', tag: '{{numero de resolucion de reasignacion asesor}}', desc: 'Resolución Sub Directoral Nº de reasignación' },
    { category: 'reasignacion', label: 'Asesor Actual', tag: '{{nombre de asesor actual}}', desc: 'Docente asesor saliente' },
    { category: 'reasignacion', label: 'Nuevo Asesor', tag: '{{Nombre completo del nuevo asesor}}', desc: 'Nuevo docente propuesto' },

    // Trámite 3: Sustentación
    { category: 'sustentacion', label: 'FUT Sustentación', tag: '{{Numero de FUT de solicitud de Sustentacion de Practicas Pre profesionales}}', desc: 'FUT independiente de sustentación' },
    { category: 'sustentacion', label: 'Fecha FUT Sustentación', tag: '{{Fecha de FUT de solicitud de sustentacion de Practicas Pre Profesionales}}', desc: 'Fecha del FUT de sustentación' },
    { category: 'sustentacion', label: 'Expediente Sustentación', tag: '{{Numero de Expediente de sustentacion de Practicas Pre Profesionales}}', desc: 'Expediente independiente de sustentación' },
    { category: 'sustentacion', label: 'Informe Jurado Revisor', tag: '{{Informe de Designacion de jurado revisor de Practicas Pre Profesionales}}', desc: 'Informe de designación de jurados' },
    { category: 'sustentacion', label: 'Resolución Sustentación', tag: '{{numero de resolucion de sustentacion de ppp}}', desc: 'Resolución Sub Directoral de sustentación' },
    { category: 'sustentacion', label: 'Presidente Jurado', tag: '{{Presidente}}', desc: 'Docente presidente del jurado' },
    { category: 'sustentacion', label: 'Miembro Jurado', tag: '{{Miembro}}', desc: 'Docente miembro del jurado' },
    { category: 'sustentacion', label: 'Fecha Sustentación', tag: '{{Fecha_Sustentacion}}', desc: 'Fecha programada para el acto' },
    { category: 'sustentacion', label: 'Hora Sustentación', tag: '{{Hora_Sustentacion}}', desc: 'Hora programada (Ej: 10:00)' },

    // Trámite 4: Aprobación
    { category: 'aprobacion', label: 'FUT Aprobación', tag: '{{Numero de FUT de Aprobacion}}', desc: 'FUT independiente de aprobación final' },
    { category: 'aprobacion', label: 'Fecha FUT Aprobación', tag: '{{Fecha de FUT de Aprobacion}}', desc: 'Fecha del FUT de aprobación' },
    { category: 'aprobacion', label: 'Expediente Aprobación', tag: '{{Numero de Expediente de Aprobacion}}', desc: 'Expediente independiente de aprobación' },
    { category: 'aprobacion', label: 'Informe Jurado Aprobación', tag: '{{Informe de aprobacion de Practicas Pre Profesionales del jurado}}', desc: 'Informe con dictamen Aprobado por Unanimidad' },
    { category: 'aprobacion', label: 'Resolución Aprobación', tag: '{{Numero de resolucion de aprobacion}}', desc: 'Resolución Sub Directoral final de aprobación' },
    { category: 'aprobacion', label: 'FUT Sustentación (Antecedente)', tag: '{{Numero de FUT de solicitud de Sustentacion de PPP}}', desc: 'Cita al FUT previo de sustentación' },
    { category: 'aprobacion', label: 'Resolución Sustentación (Antecedente)', tag: '{{Numero de resolucion sustentacion de PPP}}', desc: 'Cita a la resolución previa de sustentación' },

    // Universales en el Trámite Activo
    { category: 'comunes', label: 'FUT Universal (Trámite Activo)', tag: '{{FUT}}', desc: 'Se reemplaza por el FUT del trámite activo' },
    { category: 'comunes', label: 'Expediente Universal (Trámite Activo)', tag: '{{EXP}}', desc: 'Se reemplaza por el Expediente del trámite activo' },
    { category: 'comunes', label: 'Informe Universal (Trámite Activo)', tag: '{{Informe_Numero}}', desc: 'Se reemplaza por el Nº de informe del trámite activo' },
    { category: 'comunes', label: 'Resolución Universal (Trámite Activo)', tag: '{{numero de resolucion}}', desc: 'Se reemplaza por el Nº de resolución del trámite activo' },
  ];

  const displayedTags = tagCategoryFilter === 'todos' 
    ? ALL_TAGS 
    : ALL_TAGS.filter(t => t.category === tagCategoryFilter);

  const totalSavedCount = Object.keys(storedTemplates).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-blue-900 text-white p-5 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-800 text-amber-400 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Gestor de Plantillas (.docx)</span>
                <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  {totalSavedCount} de 8 Subidas
                </span>
              </h3>
              <p className="text-xs text-blue-200">
                Sube y gestiona tus propios archivos Word (.docx) oficiales para la generación de trámites
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-blue-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Status & Instructions Banner */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 text-xs text-slate-700 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-bold text-blue-950">
                <Database className="w-4 h-4 text-blue-700 shrink-0" />
                <span>
                  {totalSavedCount > 0 
                    ? `Estado de Almacenamiento: ${totalSavedCount} de 8 plantillas subidas y activas`
                    : 'Sin plantillas subidas: sube tus archivos Word (.docx) oficiales'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowTagsGuide(!showTagsGuide)}
                  className="text-blue-800 hover:text-blue-950 font-bold underline flex items-center gap-1 cursor-pointer text-xs"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>{showTagsGuide ? 'Ocultar Guía de Etiquetas' : 'Ver Guía de Etiquetas'}</span>
                </button>
                {totalSavedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleResetAll}
                    disabled={isResettingAll}
                    className="text-slate-600 hover:text-red-700 font-semibold flex items-center gap-1 cursor-pointer text-xs transition-colors"
                    title="Elimina todas las plantillas subidas para empezar desde cero"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar todas las plantillas</span>
                  </button>
                )}
              </div>
            </div>
            <p className="leading-relaxed">
              Sube tus propios archivos Word (.docx) oficiales correspondientes a cada documento. Los archivos se guardan de forma permanente y el sistema sustituirá automáticamente las etiquetas institucionales como <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-[11px] text-blue-950">&#123;&#123;Apellidos_y_Nombres&#125;&#125;</code> o <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-mono text-[11px] text-blue-950">&#123;&#123;FUT&#125;&#125;</code> con los datos del alumno.
            </p>
          </div>

          {/* Google Drive Sync Banner */}
          <div className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            driveConfig.webhookUrl || driveConfig.folderId
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-start sm:items-center gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${
                driveConfig.webhookUrl || driveConfig.folderId
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold flex items-center gap-1.5">
                  <span>{driveConfig.webhookUrl || driveConfig.folderId ? 'Copia en la Nube (Google Drive)' : 'Copia en Google Drive'}</span>
                  {driveConfig.webhookUrl || driveConfig.folderId ? (
                    <span className="text-[10px] bg-emerald-200/80 text-emerald-800 font-semibold px-2 py-0.2 rounded-full">
                      Vinculado
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-200/80 text-amber-800 font-semibold px-2 py-0.2 rounded-full">
                      Sin vincular
                    </span>
                  )}
                </div>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {driveConfig.webhookUrl || driveConfig.folderId ? (
                    <>
                      Las plantillas se guardan en tu Drive en la carpeta <code className="font-mono font-bold bg-white/60 px-1 rounded">Plantillas_DOCX_UTEA</code>.
                      {driveConfig.lastSyncTimestamp && (
                        <span> Última sincronización: {new Date(driveConfig.lastSyncTimestamp).toLocaleString('es-PE')}.</span>
                      )}
                      {driveConfig.templatesFolderUrl && (
                        <span className="block mt-1">
                          <a
                            href={driveConfig.templatesFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-emerald-800 underline hover:text-emerald-950 inline-flex items-center gap-1"
                          >
                            <span>Abrir carpeta Plantillas_DOCX_UTEA en Google Drive ↗</span>
                          </a>
                        </span>
                      )}
                    </>
                  ) : (
                    'Para almacenar automáticamente tus plantillas .docx en Google Drive, abre "Respaldo Google Drive" en la barra superior y pega tu enlace de Webhook.'
                  )}
                </p>
              </div>
            </div>

            {(driveConfig.webhookUrl || driveConfig.folderId) && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSyncToDrive}
                  disabled={isSyncingDrive}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isSyncingDrive ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando en Drive...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Guardar en Drive Ahora</span>
                    </>
                  )}
                </button>

                {(isSyncingDrive || driveConfig.lastSyncStatus === 'syncing') && (
                  <button
                    type="button"
                    onClick={() => {
                      resetDriveSyncLock();
                      setIsSyncingDrive(false);
                      setDriveConfig(getStoredDriveConfig());
                      setUploadError(null);
                    }}
                    className="text-[11px] text-slate-500 hover:text-red-700 underline cursor-pointer"
                    title="Haz clic para desbloquear si la sincronización previa quedó congelada"
                  >
                    ¿Bloqueado? Desbloquear
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Collapsible Tags Guide with Filter Tabs */}
          {showTagsGuide && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-blue-700" />
                  Etiquetas oficiales para Word (Haz clic sobre cualquier etiqueta para copiarla):
                </span>
                <span className="text-[11px] text-slate-500">Puedes usar {'{Etiqueta}'} o {'{{Etiqueta}}'}</span>
              </div>

              {/* Tag Categories Selector */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 mr-1">Filtrar etiquetas:</span>
                {[
                  { id: 'todos', label: 'Todas' },
                  { id: 'comunes', label: 'Alumno & Universales' },
                  { id: 'designacion', label: '1. Designación' },
                  { id: 'reasignacion', label: '2. Reasignación' },
                  { id: 'sustentacion', label: '3. Sustentación' },
                  { id: 'aprobacion', label: '4. Aprobación' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setTagCategoryFilter(cat.id as any)}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                      tagCategoryFilter === cat.id
                        ? 'bg-blue-900 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pt-1">
                {displayedTags.map((t) => (
                  <div 
                    key={t.tag}
                    onClick={() => handleCopyTag(t.tag)}
                    className="p-2 bg-white border border-slate-200 hover:border-blue-400 rounded-lg cursor-pointer transition-all flex items-center justify-between group shadow-2xs"
                    title="Clic para copiar etiqueta"
                  >
                    <div className="truncate pr-2">
                      <div className="text-[11px] font-mono font-bold text-blue-900 truncate">
                        {t.tag}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {t.label} · {t.desc}
                      </div>
                    </div>
                    <div className="shrink-0 p-1 text-slate-400 group-hover:text-blue-700">
                      {copiedTag === t.tag ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Alerts */}
          {uploadSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5 leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {uploadError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Category Filter */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="text-xs font-semibold text-slate-500">Filtrar por trámite:</span>
            {['todos', 'Designación', 'Reasignación', 'Sustentación', 'Aprobación'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-blue-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => {
              const uploaded = storedTemplates[template.key];
              const isUploading = isProcessingKey === template.key;
              const isUploaded = Boolean(uploaded?.base64);

              return (
                <div
                  key={template.key}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isUploaded
                      ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs'
                      : 'bg-slate-50/80 border-slate-200 shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                          {template.category} · {template.type.toUpperCase()}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">
                          {template.title}
                        </h4>
                      </div>

                      {isUploaded ? (
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Plantilla Subida</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>Pendiente</span>
                        </span>
                      )}
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 mb-3 space-y-1 text-xs">
                      {isUploaded ? (
                        <>
                          <div className="flex items-center gap-1.5 text-slate-800 truncate font-mono text-[11px]">
                            <FileCheck2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                            <span className="truncate font-bold">{uploaded.fileName}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center justify-between">
                            <span>Plantilla activa y sincronizada</span>
                            {uploaded.uploadedAt && (
                              <span className="text-slate-400">
                                {new Date(uploaded.uploadedAt).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                            <span>Ningún archivo Word cargado todavía</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Sube el archivo .docx oficial para este documento
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/60">
                    <div className="flex items-center gap-2">
                      {/* Botón de Subida / Reemplazo */}
                      <label className={`cursor-pointer py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs ${
                        isUploading 
                          ? 'bg-slate-400 text-white cursor-not-allowed'
                          : isUploaded
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          : 'bg-blue-900 hover:bg-blue-950 text-white'
                      }`}>
                        {isUploading ? (
                          <Loader2 className="w-3 h-3 animate-spin text-white" />
                        ) : (
                          <Upload className="w-3 h-3 text-amber-400" />
                        )}
                        <span>{isUploading ? 'Validando...' : isUploaded ? 'Reemplazar .docx' : 'Subir Plantilla .docx'}</span>
                        <input
                          type="file"
                          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          onChange={(e) => handleFileUpload(template.key, e)}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>

                      {/* Botón para descargar plantilla si está subida */}
                      {isUploaded && (
                        <button
                          type="button"
                          onClick={() => handleDownloadBaseTemplate(template.key, template.title)}
                          className="py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                          title="Descargar archivo Word .docx subido"
                        >
                          <Download className="w-3 h-3 text-blue-700" />
                          <span>Descargar Word</span>
                        </button>
                      )}
                    </div>

                    {isUploaded && (
                      <button
                        onClick={() => handleRemove(template.key)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar plantilla subida"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Almacenamiento permanente activo (IndexedDB + LocalStorage) · Respaldo seguro
          </div>
          <button
            onClick={onClose}
            className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
