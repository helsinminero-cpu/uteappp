import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  FolderArchive,
  Cloud,
  RefreshCw,
  Check,
  FileCode2,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Play
} from 'lucide-react';
import { exportDataBackup, importDataBackup } from '../data/storage';
import { Student, TramiteRecord } from '../types';
import { 
  getStoredDriveConfig, 
  saveDriveConfig, 
  extractDriveFolderId, 
  isGoogleScriptWebhookUrl,
  sanitizeWebhookUrl,
  DriveBackupConfig 
} from '../utils/driveStorage';
import { BACKUP_FILE_NAME } from '../utils/googleDriveService';
import { 
  executeDriveSync, 
  downloadFromWebhook, 
  checkWebhookConnection,
  resetDriveSyncLock
} from '../utils/driveAutoSync';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentsCount: number;
  tramitesCount: number;
  onDataRestored: (students: Student[], tramites: TramiteRecord[]) => void;
}

const buildScriptTemplate = (folderId?: string) => {
  const folderCode = folderId 
    ? `var folder = DriveApp.getFolderById("${folderId}");`
    : `var folderName = "UTEA_PPP_Respaldo";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);`;

  return `// =====================================================================================
// SCRIPT DE COPIA DE SEGURIDAD AUTOMÁTICA EN GOOGLE DRIVE - UTEA PPP
// =====================================================================================
// INSTRUCCIONES DE INSTALACIÓN:
// 1. Pega este código completo en script.google.com (reemplazando cualquier código anterior).
//
// 2. ¡PASO CLAVE DE AUTORIZACIÓN (OBLIGATORIO)!:
//    En la barra superior, al lado del botón "Ejecutar", selecciona la función
//    "autorizarYCrearCarpeta" y haz clic en "Ejecutar" (Run).
//    Google te pedirá autorizar: Haz clic en "Revisar permisos" -> Elige tu cuenta ->
//    "Configuración avanzada" -> "Ir a Proyecto sin título (no seguro)" -> "Permitir".
//    ¡Listo! Verás en el registro de Apps Script que la carpeta y el archivo se crearon en tu Drive.
//
// 3. Haz clic en el botón azul "Implementar" -> "Nueva implementación" (o "Gestionar implementaciones" -> ✏️ -> Nueva versión).
// 4. Haz clic en el engranaje ⚙️ y selecciona "Aplicación web".
// 5. Configura:
//    - Descripción: Respaldo UTEA PPP
//    - Ejecutar como: Yo (tu correo de Google)
//    - Quién tiene acceso: Cualquier persona (Anyone)  <--- ¡MUY IMPORTANTE!
// 6. Haz clic en "Implementar", copia la "URL de la aplicación web" (termina en /exec)
//    y pégala en la aplicación web de UTEA PPP.
// =====================================================================================

// FUNCIÓN 1: Ejecútala en el editor para autorizar y crear la carpeta y archivo en Drive
function autorizarYCrearCarpeta() {
  try {
    ${folderCode}
    
    var fileName = "Copia_Seguridad_UTEA_PPP.json";
    var files = folder.getFilesByName(fileName);
    var file;
    
    if (files.hasNext()) {
      file = files.next();
      Logger.log("El archivo de respaldo ya existía.");
    } else {
      var datosIniciales = JSON.stringify({
        sistema: "UTEA PPP Tramites",
        estado: "Conexión exitosa con Google Drive",
        creadoEn: new Date().toISOString(),
        mensaje: "Esta es la copia de seguridad oficial. Se actualiza automáticamente con cada cambio."
      }, null, 2);
      file = folder.createFile(fileName, datosIniciales, MimeType.PLAIN_TEXT);
      Logger.log("¡Archivo Copia_Seguridad_UTEA_PPP.json creado exitosamente!");
    }

    var tplFolders = folder.getFoldersByName("Plantillas_DOCX_UTEA");
    var tplFolder = tplFolders.hasNext() ? tplFolders.next() : folder.createFolder("Plantillas_DOCX_UTEA");
    Logger.log("¡Carpeta Plantillas_DOCX_UTEA creada en Google Drive!");
    
    Logger.log("--------------------------------------------------");
    Logger.log(">>> ÉXITO: Permisos concedidos a Google Drive.");
    Logger.log(">>> Carpeta en Drive: " + folder.getUrl());
    Logger.log(">>> Archivo en Drive: " + file.getUrl());
    Logger.log(">>> Carpeta Plantillas DOCX: " + tplFolder.getUrl());
    Logger.log("--------------------------------------------------");
  } catch (error) {
    Logger.log("Error durante la autorización: " + error.toString());
  }
}

// FUNCIÓN 2: Guarda la base de datos y plantillas cuando el sistema envía un respaldo
function doPost(e) {
  try {
    ${folderCode}
    
    var fileName = "Copia_Seguridad_UTEA_PPP.json";
    var files = folder.getFilesByName(fileName);
    var file = files.hasNext() ? files.next() : null;
    
    var contenido = "";
    if (e && e.postData && e.postData.contents) {
      contenido = e.postData.contents;
    } else if (e && e.parameter && e.parameter.data) {
      contenido = e.parameter.data;
    }
    
    if (!contenido) {
      contenido = JSON.stringify({
        sistema: "UTEA PPP Tramites",
        mensaje: "Sincronización recibida vacía",
        fecha: new Date().toISOString()
      }, null, 2);
    }
    
    var jsonTexto = contenido;
    var parseado = null;
    try {
      parseado = JSON.parse(contenido);
      jsonTexto = JSON.stringify(parseado, null, 2);
    } catch (errJson) {
      // conservar texto original
    }
    
    if (file) {
      file.setContent(jsonTexto);
    } else {
      file = folder.createFile(fileName, jsonTexto, MimeType.PLAIN_TEXT);
    }

    // GUARDA CADA PLANTILLA COMO ARCHIVO WORD (.DOCX) EN LA CARPETA DE GOOGLE DRIVE DE FORMA OPTIMIZADA
    var templatesCount = 0;
    var tpls = (parseado && (parseado.customTemplates || parseado.templates)) ? (parseado.customTemplates || parseado.templates) : null;
    var tplFolder = null;

    if (tpls && typeof tpls === "object") {
      var tplFolders = folder.getFoldersByName("Plantillas_DOCX_UTEA");
      tplFolder = tplFolders.hasNext() ? tplFolders.next() : folder.createFolder("Plantillas_DOCX_UTEA");
      
      // Indexar archivos existentes en un solo paso para evitar lentitud extrema y timeout
      var existingMap = {};
      try {
        var existingIter = tplFolder.getFiles();
        while (existingIter.hasNext()) {
          var ef = existingIter.next();
          existingMap[ef.getName()] = ef;
        }
      } catch (errMap) {
        Logger.log("Aviso al listar archivos existentes: " + errMap);
      }

      var startTime = new Date().getTime();
      for (var tKey in tpls) {
        // Prevenir timeout de Apps Script si son muchos archivos
        if (new Date().getTime() - startTime > 24000) {
          Logger.log("Límite de tiempo preventivo alcanzado en plantillas");
          break;
        }

        var tItem = tpls[tKey];
        if (tItem && tItem.base64) {
          try {
            var docxName = tItem.fileName || ("Plantilla_" + tKey + ".docx");
            if (!docxName.toLowerCase().endsWith(".docx")) {
              docxName += ".docx";
            }
            
            // Limpiar prefijo data: y espacios
            var rawB64 = (tItem.base64 || "").toString().replace(/^data:.*?;base64,/, "").replace(/\\s+/g, "");
            var decodedBytes = Utilities.base64Decode(rawB64);
            var docxBlob = Utilities.newBlob(decodedBytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docxName);
            
            // Reemplazar archivo previo de forma segura (sin fallar si el dominio @utea restringe la papelera)
            if (existingMap[docxName]) {
              try {
                existingMap[docxName].setTrashed(true);
              } catch (eTrash) {
                try {
                  tplFolder.removeFile(existingMap[docxName]);
                } catch (eRem) {}
              }
            }
            
            tplFolder.createFile(docxBlob);
            templatesCount++;
          } catch (errTpl) {
            Logger.log("Aviso guardando docx (" + tKey + "): " + errTpl.toString());
          }
        }
      }
    }
    
    var respuesta = {
      status: "success",
      message: "Respaldo y " + templatesCount + " plantillas Word guardadas exitosamente en Google Drive",
      fileName: fileName,
      fileId: file.getId(),
      url: file.getUrl(),
      fileUrl: file.getUrl(),
      folderUrl: folder.getUrl(),
      templatesFolderUrl: (tplFolder ? tplFolder.getUrl() : null),
      templatesSaved: templatesCount,
      updatedAt: new Date().toISOString()
    };
    
    return ContentService.createTextOutput(JSON.stringify(respuesta))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString(),
      ayuda: "Por favor ejecuta la función 'autorizarYCrearCarpeta' en script.google.com para conceder permisos a Drive."
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// FUNCIÓN 3: Permite consultar el estado o descargar el respaldo desde la aplicación
function doGet(e) {
  try {
    ${folderCode}
    
    var fileName = "Copia_Seguridad_UTEA_PPP.json";
    var files = folder.getFilesByName(fileName);
    var file;
    
    if (files.hasNext()) {
      file = files.next();
    } else {
      var inicial = JSON.stringify({
        sistema: "UTEA PPP Tramites",
        estado: "Inicializado",
        fecha: new Date().toISOString()
      }, null, 2);
      file = folder.createFile(fileName, inicial, MimeType.PLAIN_TEXT);
    }
    
    // Si la aplicación solicita descargar el archivo para restaurar:
    if (e && e.parameter && (e.parameter.download === "true" || e.parameter.raw === "true")) {
      return ContentService.createTextOutput(file.getBlob().getDataAsString())
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Si se visita la URL en el navegador o se prueba conexión:
    var info = {
      status: "success",
      message: "Webhook de UTEA PPP activo y funcionando en Google Drive",
      carpeta: folder.getName(),
      folderUrl: folder.getUrl(),
      fileName: fileName,
      fileUrl: file.getUrl(),
      fileId: file.getId(),
      lastUpdated: file.getLastUpdated().toISOString(),
      size: file.getSize()
    };
    
    return ContentService.createTextOutput(JSON.stringify(info, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString(),
      ayuda: "Ejecuta 'autorizarYCrearCarpeta' en script.google.com para conceder permisos a Drive."
    }, null, 2)).setMimeType(ContentService.MimeType.JSON);
  }
}`;
};

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  studentsCount,
  tramitesCount,
  onDataRestored,
}) => {
  const [driveConfig, setDriveConfig] = useState<DriveBackupConfig>(() => getStoredDriveConfig());
  const [inputUrl, setInputUrl] = useState<string>(() => driveConfig.webhookUrl || driveConfig.folderUrl || '');
  
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isRestoringFromDrive, setIsRestoringFromDrive] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [urlSaveFeedback, setUrlSaveFeedback] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [showScriptGuide, setShowScriptGuide] = useState<boolean>(!driveConfig.webhookUrl);
  const [detectedFolderId, setDetectedFolderId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state on modal open
  useEffect(() => {
    if (!isOpen) return;
    const current = getStoredDriveConfig();
    setDriveConfig(current);
    setInputUrl(current.webhookUrl || current.folderUrl || '');

    // Listen to sync events from background auto-sync
    const handleSyncEvent = (e: any) => {
      const detail = e.detail;
      if (detail?.status === 'syncing') {
        setIsSyncing(true);
      } else {
        setIsSyncing(false);
        setDriveConfig(getStoredDriveConfig());
        if (detail?.status === 'success') {
          setSuccessMsg(detail.message || 'Copia de seguridad sincronizada con Google Drive.');
          setErrorMsg(null);
        } else if (detail?.status === 'error') {
          setErrorMsg(detail.message || 'Error al sincronizar con Google Drive.');
        }
      }
    };

    window.addEventListener('utea_drive_sync_event', handleSyncEvent);

    return () => {
      window.removeEventListener('utea_drive_sync_event', handleSyncEvent);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle saving Google Drive Webhook Link (Permanent in localStorage)
  const handleSaveDriveUrl = async () => {
    setUrlSaveFeedback(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmed = inputUrl.trim();
    if (!trimmed) {
      const updated = saveDriveConfig({
        folderUrl: '',
        folderId: '',
        webhookUrl: '',
        autoSyncEnabled: false,
      });
      setDriveConfig(updated);
      setUrlSaveFeedback('Enlace eliminado. La sincronización automática con Drive queda deshabilitada.');
      return;
    }

    // Check if it's a Google Apps Script Webhook URL
    if (isGoogleScriptWebhookUrl(trimmed)) {
      const cleanUrl = sanitizeWebhookUrl(trimmed);
      const updated = saveDriveConfig({
        webhookUrl: cleanUrl,
        syncType: 'webhook',
        autoSyncEnabled: true,
        lastSyncError: null,
      });
      setDriveConfig(updated);
      setInputUrl(cleanUrl);
      setUrlSaveFeedback('Verificando conexión con Google Drive...');

      // Immediately test webhook connection to retrieve folder and file links
      setIsTestingConnection(true);
      const test = await checkWebhookConnection(cleanUrl);
      setIsTestingConnection(false);

      if (test.success) {
        const configUpdates: Partial<DriveBackupConfig> = {};
        if (test.fileUrl) configUpdates.lastSyncedFileUrl = test.fileUrl;
        if (test.folderUrl) configUpdates.folderUrl = test.folderUrl;
        if (Object.keys(configUpdates).length > 0) {
          const fresh = saveDriveConfig(configUpdates);
          setDriveConfig(fresh);
        }
        setUrlSaveFeedback('¡Enlace guardado y verificado con éxito! La carpeta y el archivo en tu Google Drive están listos.');
        setTimeout(() => setUrlSaveFeedback(null), 6000);
      } else {
        setUrlSaveFeedback(null);
        setErrorMsg(
          `Enlace guardado, pero requiere autorización en Google: ${test.message}`
        );
      }
      return;
    }

    // If user entered a Google Drive folder link
    const folderId = extractDriveFolderId(trimmed);
    if (folderId) {
      setDetectedFolderId(folderId);
      setShowScriptGuide(true);
      setErrorMsg(
        `Has ingresado un enlace de carpeta de Drive (ID: ${folderId}). Como los navegadores web en Netlify no permiten escribir directamente en carpetas sin script intermedio, copia el script de abajo (¡ya incluye el ID de tu carpeta!) y pégalo en script.google.com para obtener tu URL /exec.`
      );
      return;
    }

    setErrorMsg('Por favor ingresa una URL válida de Webhook de Google Apps Script (terminada en /exec).');
  };

  // On demand verification test
  const handleTestConnection = async () => {
    if (!driveConfig.webhookUrl) {
      setErrorMsg('Primero ingresa y guarda tu enlace de Webhook.');
      return;
    }

    setIsTestingConnection(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const test = await checkWebhookConnection(driveConfig.webhookUrl);
    setIsTestingConnection(false);

    if (test.success) {
      const configUpdates: Partial<DriveBackupConfig> = {};
      if (test.fileUrl) configUpdates.lastSyncedFileUrl = test.fileUrl;
      if (test.folderUrl) configUpdates.folderUrl = test.folderUrl;
      if (test.templatesFolderUrl) configUpdates.templatesFolderUrl = test.templatesFolderUrl;
      if (Object.keys(configUpdates).length > 0) {
        const fresh = saveDriveConfig(configUpdates);
        setDriveConfig(fresh);
      }
      setSuccessMsg(
        `¡Conexión verificada con éxito! La carpeta 'UTEA_PPP_Respaldo' y el archivo de respaldo responden en tu Google Drive.`
      );
    } else {
      setErrorMsg(
        `No se pudo conectar: ${test.message}`
      );
    }
  };

  // Copy Google Apps Script code to clipboard
  const handleCopyScript = () => {
    navigator.clipboard.writeText(buildScriptTemplate(detectedFolderId || driveConfig.folderId));
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Immediate sync to Drive
  const handleSyncNow = async () => {
    if (!driveConfig.webhookUrl) {
      setErrorMsg('Por favor ingresa y guarda primero tu enlace Webhook de Google Drive.');
      return;
    }

    setIsSyncing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await executeDriveSync(true);
    setIsSyncing(false);
    setDriveConfig(getStoredDriveConfig());

    if (result.success) {
      setSuccessMsg(`¡Base de datos y plantillas guardadas exitosamente en tu Google Drive! (${result.result?.fileName || 'Copia_Seguridad_UTEA_PPP.json'})`);
    } else {
      setErrorMsg(result.error || 'Ocurrió un error al subir el respaldo a Google Drive.');
    }
  };

  // Restore from Drive Webhook
  const handleRestoreFromDrive = async () => {
    if (!driveConfig.webhookUrl) {
      setErrorMsg('No hay enlace de Webhook de Google Drive configurado.');
      return;
    }

    const confirmed = window.confirm(
      '¿Deseas restaurar la base de datos y plantillas desde Google Drive?\n\n' +
      'Esta acción actualizará los alumnos, trámites y plantillas actuales con el respaldo "' + BACKUP_FILE_NAME + '" almacenado en tu Drive.'
    );
    if (!confirmed) return;

    setIsRestoringFromDrive(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const jsonContent = await downloadFromWebhook(driveConfig.webhookUrl);
      const res = importDataBackup(jsonContent);
      if (res.success) {
        const parsed = JSON.parse(jsonContent);
        onDataRestored(parsed.students, parsed.tramites);
        setSuccessMsg(
          `¡Restauración exitosa desde Drive! Cargados: ${res.countStudents} alumnos, ${res.countTramites} trámites y ${res.countTemplates || 0} plantillas personalizadas.`
        );
      } else {
        setErrorMsg(res.error || 'El archivo en Drive no tiene un formato válido.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al restaurar desde Google Drive.');
    } finally {
      setIsRestoringFromDrive(false);
    }
  };

  // Handle local export (JSON)
  const handleExportBackup = () => {
    try {
      const jsonContent = exportDataBackup();
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `UTEA_PPP_Rellenables_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSuccessMsg('Base de datos de rellenables para Word y PDF descargada exitosamente.');
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(`Error al exportar: ${err.message}`);
      setSuccessMsg(null);
    }
  };

  // Handle local import (JSON)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      `¿Deseas restaurar los datos desde el archivo "${file.name}"?\nEsta acción actualizará los alumnos, trámites y plantillas actuales.`
    );
    if (!confirmed) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const res = importDataBackup(content);
        if (res.success) {
          const parsed = JSON.parse(content);
          onDataRestored(parsed.students, parsed.tramites);
          setSuccessMsg(
            `Base de datos restaurada con éxito: ${res.countStudents} alumnos y ${res.countTramites} trámites con rellenables para Word y PDF.`
          );
          setErrorMsg(null);
        } else {
          setErrorMsg(res.error || 'No se pudo restaurar el archivo.');
          setSuccessMsg(null);
        }
      } catch (err: any) {
        setErrorMsg(`Error al leer archivo: ${err.message}`);
        setSuccessMsg(null);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const isConfigured = !!driveConfig.webhookUrl;

  // Resolve best direct link to Google Drive file
  const getFileDriveLink = () => {
    if (driveConfig.lastSyncedFileUrl && driveConfig.lastSyncedFileUrl !== 'https://drive.google.com/') {
      return driveConfig.lastSyncedFileUrl;
    }
    return 'https://drive.google.com/drive/search?q=name:Copia_Seguridad_UTEA_PPP.json';
  };

  // Resolve best direct link to Google Drive folder
  const getFolderDriveLink = () => {
    if (driveConfig.folderUrl) {
      return driveConfig.folderUrl;
    }
    if (detectedFolderId || driveConfig.folderId) {
      return `https://drive.google.com/drive/folders/${detectedFolderId || driveConfig.folderId}`;
    }
    return 'https://drive.google.com/drive/search?q=name:UTEA_PPP_Respaldo';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-6 overflow-hidden border border-slate-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Copia de Seguridad y Respaldo</h3>
              <p className="text-xs text-blue-200">Sincronización con Google Drive y descarga local</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Status Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <FolderArchive className="w-5 h-5 text-slate-600" />
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Base de Datos del Sistema
                </div>
                <div className="text-sm font-bold text-slate-800">
                  {studentsCount} Alumnos · {tramitesCount} Trámites
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-full flex items-center gap-1">
                <FileCode2 className="w-3.5 h-3.5" />
                Incluye Plantillas .docx
              </span>
            </div>
          </div>

          {/* Messages */}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs font-medium text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Interactive Google Authorization Troubleshooter */}
          {errorMsg && (errorMsg.includes('requiere autorización') || errorMsg.includes('autorizarYCrearCarpeta') || errorMsg.includes('Cualquier persona')) ? (
            <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl space-y-3 text-xs text-amber-950 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-sm text-amber-900">
                    Enlace Guardado — Autorización requerida en Google Drive
                  </div>
                  <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                    Tu enlace ya está registrado en el sistema. Para que Google Drive permita guardar la carpeta <code className="font-mono bg-white/70 px-1 rounded font-bold">UTEA_PPP_Respaldo</code> y las plantillas <code className="font-mono bg-white/70 px-1 rounded font-bold">Plantillas_DOCX_UTEA</code>, debes aceptar los permisos en Google Apps Script:
                  </p>
                </div>
              </div>

              <div className="bg-white/90 border border-amber-200 rounded-xl p-3 space-y-2.5 text-[11px]">
                <div className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                  <Play className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
                  <span>Sigue estos 3 pasos rápidos en script.google.com:</span>
                </div>
                <ol className="list-decimal pl-4 space-y-2 text-slate-700 leading-relaxed">
                  <li>
                    Abre tu proyecto en <strong><a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-700 underline font-semibold">script.google.com</a></strong>.
                  </li>
                  <li>
                    En la barra superior, al lado del botón <strong>"▷ Ejecutar"</strong>, haz clic en el menú desplegable de funciones y selecciona <strong>autorizarYCrearCarpeta</strong>. Luego haz clic en <strong>Ejecutar</strong>.
                    <div className="mt-1 text-[10.5px] text-amber-900 bg-amber-100/70 p-2 rounded-lg border border-amber-200">
                      👉 Google te mostrará <em>"Se necesita autorización"</em>: Haz clic en <strong>Revisar permisos</strong> &gt; Selecciona tu cuenta de Google &gt; <strong>Configuración avanzada</strong> &gt; <strong>Ir a Proyecto (no seguro)</strong> &gt; <strong>Permitir</strong>.
                    </div>
                  </li>
                  <li>
                    Haz clic en el botón azul <strong>Implementar</strong> &gt; <strong>Gestionar implementaciones</strong> &gt; Icono del lápiz ✏️ (o Nueva implementación):
                    <br />
                    En versión selecciona <strong>Nueva versión</strong> y en <strong>"Quién tiene acceso"</strong> selecciona <strong>"Cualquier persona" (Anyone)</strong>. *(Esencial si usas tu correo @utea.edu.pe)*. Haz clic en <strong>Implementar</strong>.
                  </li>
                </ol>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {(inputUrl || driveConfig.webhookUrl) && (
                  <a
                    href={inputUrl || driveConfig.webhookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                    title="Abre el Webhook en una pestaña para ver el diagnóstico directo de Google"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Webhook en nueva pestaña</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingConnection ? 'animate-spin' : ''}`} />
                  <span>{isTestingConnection ? 'Comprobando...' : 'Reintentar Verificación'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{isSyncing ? 'Guardando...' : 'Probar Sincronización Ahora'}</span>
                </button>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs font-medium text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span>{errorMsg}</span>
              </div>
            </div>
          ) : null}

          {urlSaveFeedback && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs font-medium text-blue-800">
              <Check className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{urlSaveFeedback}</span>
            </div>
          )}

          {/* SECTION 1: GOOGLE DRIVE AUTO-SYNC VIA WEBHOOK */}
          <div className="border border-blue-200 bg-blue-50/30 rounded-2xl p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Sincronización Automática con Google Drive
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Guarda la base de datos y plantillas oficiales .docx en tu Drive cada vez que el administrador hace cambios.
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              {isConfigured ? (
                <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 rounded-full flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Drive Activo
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-medium text-slate-500 bg-slate-100 rounded-full shrink-0">
                  Sin Configurar
                </span>
              )}
            </div>

            {/* Input Row for Webhook URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-800">
                Pega aquí tu enlace Webhook de Google Apps Script:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveDriveUrl}
                  disabled={isTestingConnection}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isTestingConnection ? 'Guardando...' : 'Guardar Enlace'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                🔒 <strong>Permanente:</strong> Este enlace se almacena en tu navegador y <strong>no se borrará automáticamente</strong>.
              </p>
            </div>

            {/* Guía Rápida para Google Apps Script */}
            <div className="p-3.5 bg-white border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Configuración en 3 Minutos (Paso a Paso con Permisos)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScriptGuide(!showScriptGuide)}
                  className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>{showScriptGuide ? 'Ocultar Guía' : 'Ver Guía del Script'}</span>
                  {showScriptGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showScriptGuide && (
                <div className="text-xs text-slate-600 space-y-3 pt-2 border-t border-slate-100">
                  <ol className="list-decimal pl-4 space-y-2 text-[11px] leading-relaxed">
                    <li>
                      Entra a <strong><a href="https://script.google.com" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">script.google.com</a></strong> con tu cuenta de Google y haz clic en <strong>Nuevo proyecto</strong>.
                    </li>
                    <li>
                      Haz clic en el botón de abajo para copiar el script completo y pégalo en el editor (reemplazando cualquier código anterior):
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyScript}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span>{copiedScript ? '¡Código Copiado al Portapapeles!' : 'Copiar Código del Script'}</span>
                        </button>
                      </div>
                    </li>
                    
                    {/* Highlighted Step: Authorization & Run */}
                    <li className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-950">
                      <div className="font-bold flex items-center gap-1.5 text-amber-900">
                        <Play className="w-3.5 h-3.5 fill-amber-600 text-amber-600" />
                        <span>¡PASO OBLIGATORIO PARA QUE SE CREE EL ARCHIVO!</span>
                      </div>
                      <p className="mt-1 text-[11px] text-amber-900">
                        En la barra superior de <code>script.google.com</code>, al lado del botón <strong>Ejecutar</strong>, selecciona en la lista desplegable la función <strong>autorizarYCrearCarpeta</strong> y presiona <strong>Ejecutar</strong> (Run).
                      </p>
                      <p className="mt-1 text-[10.5px] text-amber-800 leading-snug">
                        Google te pedirá autorizar: Haz clic en <em>"Revisar permisos"</em> &gt; Selecciona tu cuenta de Google &gt; <em>"Configuración avanzada"</em> &gt; <em>"Ir a Proyecto (no seguro)"</em> &gt; <em>"Permitir"</em>.
                        <br />
                        ✅ <strong>Al hacer esto, Google creará al instante la carpeta <code>UTEA_PPP_Respaldo</code> y el archivo <code>Copia_Seguridad_UTEA_PPP.json</code> en tu Google Drive.</strong>
                      </p>
                    </li>

                    <li>
                      Haz clic en el botón azul <strong>Implementar</strong> &gt; <strong>Nueva implementación</strong>:
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[10.5px] text-slate-600">
                        <li>Haz clic en el engranaje ⚙️ y selecciona: <strong>Aplicación web</strong></li>
                        <li>Ejecutar como: <strong>Yo (tu correo)</strong></li>
                        <li>Quién tiene acceso: <strong>Cualquier persona</strong> (Anyone) — <em>¡Esencial para que funcione en Netlify!</em></li>
                      </ul>
                    </li>
                    <li>
                      Haz clic en <strong>Implementar</strong>, copia la <strong>URL de la aplicación web</strong> (terminada en <code>/exec</code>) y pégala arriba en el campo de texto.
                    </li>
                  </ol>
                </div>
              )}
            </div>

            {/* Configured Details & Actions */}
            {isConfigured && (
              <div className="p-3.5 bg-white border border-blue-200 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-slate-600 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-800">Estado: </span>
                    <span className="text-emerald-700 font-mono font-semibold">Webhook Conectado</span>
                  </div>

                  {/* Test Connection Button */}
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className="px-2.5 py-1 text-[11px] font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTestingConnection ? 'animate-spin' : ''}`} />
                    <span>{isTestingConnection ? 'Comprobando...' : 'Verificar Conexión'}</span>
                  </button>
                </div>

                {/* Auto-Sync Toggle */}
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={driveConfig.autoSyncEnabled}
                    onChange={(e) => {
                      const updated = saveDriveConfig({ autoSyncEnabled: e.target.checked });
                      setDriveConfig(updated);
                    }}
                    className="w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-800 cursor-pointer"
                  />
                  <span className="text-xs font-medium text-slate-800">
                    Guardar automáticamente cada vez que el administrador realice cambios en la base de datos
                  </span>
                </label>

                {/* Direct Links in Drive */}
                <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                  <div className="text-[11px] text-slate-600">
                    {driveConfig.lastSyncTimestamp ? (
                      <span>
                        Última sincronización: <strong>{new Date(driveConfig.lastSyncTimestamp).toLocaleString('es-PE')}</strong>
                      </span>
                    ) : (
                      <span className="text-slate-400">Listo para sincronizar la base de datos y plantillas.</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={getFileDriveLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Ver "{BACKUP_FILE_NAME}" en Drive</span>
                    </a>

                    <a
                      href={getFolderDriveLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <FolderArchive className="w-3.5 h-3.5 text-blue-600" />
                      <span>Abrir Carpeta en Drive</span>
                    </a>

                    <a
                      href={driveConfig.templatesFolderUrl || 'https://drive.google.com/drive/search?q=Plantillas_DOCX_UTEA'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Carpeta de plantillas Word en Google Drive"
                    >
                      <FileCode2 className="w-3.5 h-3.5 text-purple-600" />
                      <span>Ver Carpeta "Plantillas_DOCX_UTEA"</span>
                    </a>
                  </div>
                </div>

                {/* Buttons: Sincronizar Ahora & Restaurar desde Drive */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs bg-blue-900 hover:bg-blue-950 text-white cursor-pointer disabled:opacity-70"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Guardando en Drive...' : 'Sincronizar Ahora con Drive'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRestoreFromDrive}
                    disabled={isRestoringFromDrive}
                    className="py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors border border-blue-300 text-blue-900 bg-blue-50 hover:bg-blue-100 cursor-pointer disabled:opacity-50"
                  >
                    <Download className={`w-3.5 h-3.5 ${isRestoringFromDrive ? 'animate-pulse' : ''}`} />
                    <span>{isRestoringFromDrive ? 'Restaurando...' : 'Restaurar desde Drive'}</span>
                  </button>

                  {(isSyncing || driveConfig.lastSyncStatus === 'syncing') && (
                    <button
                      type="button"
                      onClick={() => {
                        resetDriveSyncLock();
                        setIsSyncing(false);
                        setDriveConfig(getStoredDriveConfig());
                        setErrorMsg(null);
                      }}
                      className="py-1.5 px-2 text-[11px] font-medium text-slate-500 hover:text-red-700 underline cursor-pointer"
                      title="Haz clic para desbloquear si la sincronización previa quedó congelada"
                    >
                      ¿Bloqueado? Forzar desbloqueo
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: ARCHIVO LOCAL (DESCARGAR / RESTAURAR JSON) */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Respaldo Local en Tu Computadora (Sin Conexión)
            </div>

            {/* Export Card */}
            <div className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Download className="w-4 h-4 text-blue-600" />
                    Descargar Copia de Seguridad (.json)
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Descarga en tu PC un archivo con todos los alumnos registrados, trámites e informes, y las plantillas oficiales Word (.docx).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  Exportar
                </button>
              </div>
            </div>

            {/* Import Card */}
            <div className="p-4 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    Restaurar desde Archivo Local (.json)
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Carga un archivo de respaldo previo para restaurar los alumnos, trámites y plantillas en cualquier momento.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  Importar
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Respaldo íntegro: Alumnos · Trámites · Resoluciones · Plantillas Word .docx
          </div>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
