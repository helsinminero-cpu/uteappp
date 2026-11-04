import { exportDataBackup } from '../data/storage';
import { 
  getStoredDriveConfig, 
  saveDriveConfig, 
  DriveBackupConfig 
} from './driveStorage';
import { 
  getDriveAccessToken, 
  uploadBackupToDriveFolder, 
  DriveUploadResult,
  BACKUP_FILE_NAME
} from './googleDriveService';
import { sanitizeWebhookUrl } from './driveStorage';

let debounceTimer: any = null;
let isSyncInProgress = false;
let syncLockTimestamp: number = 0;

// Reset stale syncing status on app load so it never remains permanently stuck
if (typeof window !== 'undefined') {
  try {
    const initialConfig = getStoredDriveConfig();
    if (initialConfig.lastSyncStatus === 'syncing') {
      saveDriveConfig({ lastSyncStatus: 'idle' });
    }
  } catch {
    // Ignore on SSR/init
  }
}

export interface DriveSyncEventDetail {
  status: 'idle' | 'syncing' | 'success' | 'error';
  timestamp?: string;
  message?: string;
  result?: DriveUploadResult;
}

function notifySyncStatus(detail: DriveSyncEventDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('utea_drive_sync_event', { detail }));
  }
}

/**
 * Manually or automatically break a stuck sync lock
 */
export function resetDriveSyncLock(): void {
  isSyncInProgress = false;
  syncLockTimestamp = 0;
  saveDriveConfig({ lastSyncStatus: 'idle', lastSyncError: null });
  notifySyncStatus({ status: 'idle', message: 'Sincronización restablecida.' });
}

/**
 * Execute Webhook sync with Google Apps Script (immune to domain/OAuth restrictions)
 * Includes timeout controller, URL sanitization, and resilient fallback.
 */
async function syncViaWebhook(webhookUrl: string, jsonBackup: string): Promise<DriveUploadResult> {
  const cleanUrl = sanitizeWebhookUrl(webhookUrl);

  // Guard against user accidentally passing a raw Drive folder URL
  if (cleanUrl.includes('drive.google.com/drive/folders') || cleanUrl.includes('drive.google.com/open?id=')) {
    throw new Error(
      'Has ingresado un enlace de carpeta de Google Drive en lugar de un Webhook. Los navegadores web no pueden guardar directamente en carpetas sin el script. Por favor copia el script del modal y pégalo en script.google.com para obtener tu URL /exec.'
    );
  }

  // 1. First attempt: Standard POST fetch with text/plain with 24s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 24000);

  try {
    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: jsonBackup,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (data.status === 'error') {
        throw new Error(data.message || 'Error reportado por el script de Google Drive');
      }

      const fileUrl = data.url || data.fileUrl || 'https://drive.google.com/drive/search?q=name:Copia_Seguridad_UTEA_PPP.json';
      const folderUrl = data.folderUrl;
      const templatesFolderUrl = data.templatesFolderUrl;

      const updates: Partial<DriveBackupConfig> = {};
      if (folderUrl) updates.folderUrl = folderUrl;
      if (templatesFolderUrl) updates.templatesFolderUrl = templatesFolderUrl;
      if (Object.keys(updates).length > 0) {
        saveDriveConfig(updates);
      }

      return {
        fileId: data.fileId || 'apps-script-file',
        fileName: data.fileName || BACKUP_FILE_NAME,
        webViewLink: fileUrl,
        isUpdate: true,
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.warn('Standard CORS fetch to Google Apps Script timed out after 24s.');
    } else {
      console.warn('Standard CORS fetch to Google Apps Script redirected or threw:', err?.message || err);
    }
  }

  // 2. Second attempt: no-cors mode fallback (14s timeout).
  // Google Apps Script 302 redirects to script.googleusercontent.com, which can trigger "Failed to fetch"
  // in browsers. In no-cors mode, the POST payload is transmitted to Google's server and executed by doPost(e)!
  const fallbackController = new AbortController();
  const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 14000);

  try {
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: jsonBackup,
      signal: fallbackController.signal,
    });

    clearTimeout(fallbackTimeoutId);

    const currentConfig = getStoredDriveConfig();
    const fallbackLink = (currentConfig.lastSyncedFileUrl && currentConfig.lastSyncedFileUrl !== 'https://drive.google.com/')
      ? currentConfig.lastSyncedFileUrl
      : 'https://drive.google.com/drive/search?q=name:Copia_Seguridad_UTEA_PPP.json';

    return {
      fileId: 'apps-script-file',
      fileName: BACKUP_FILE_NAME,
      webViewLink: fallbackLink,
      isUpdate: true,
    };
  } catch (noCorsErr: any) {
    clearTimeout(fallbackTimeoutId);
    if (noCorsErr.name === 'AbortError') {
      throw new Error(
        'El script de Google Drive tardó más de 25 segundos en responder. Asegúrate de haber pegado la última versión optimizada del script y haber ejecutado "autorizarYCrearCarpeta".'
      );
    }
    throw new Error(
      'Error de conexión ("Failed to fetch"): Asegúrate de haber ejecutado "autorizarYCrearCarpeta" en script.google.com y que en "Quién tiene acceso" esté seleccionado "Cualquier persona" (Anyone).'
    );
  }
}

/**
 * Test and verify connection to Google Apps Script Webhook
 */
export async function checkWebhookConnection(webhookUrl: string): Promise<{
  success: boolean;
  message: string;
  folderUrl?: string;
  fileUrl?: string;
  templatesFolderUrl?: string;
  lastUpdated?: string;
  needsAuth?: boolean;
  cleanUrl?: string;
}> {
  const cleanUrl = sanitizeWebhookUrl(webhookUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(cleanUrl, { method: 'GET', cache: 'no-store', signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        success: false,
        message: `El Webhook respondió con estado HTTP ${res.status}. Verifica que en Implementar > Acceso esté seleccionado "Cualquier persona" (Anyone).`,
        needsAuth: true,
        cleanUrl,
      };
    }
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      if (data.status === 'error') {
        return {
          success: false,
          message: data.message || 'Error en Apps Script. Ejecuta autorizarYCrearCarpeta en script.google.com para autorizar el acceso.',
          needsAuth: true,
          cleanUrl,
        };
      }
      return {
        success: true,
        message: data.message || 'Conexión exitosa con Google Drive',
        folderUrl: data.folderUrl || data.enlaceCarpeta,
        fileUrl: data.fileUrl || data.enlaceArchivo,
        templatesFolderUrl: data.templatesFolderUrl || data.carpetaPlantillas,
        lastUpdated: data.lastUpdated || data.ultimaActualizacion,
        cleanUrl,
      };
    } catch {
      // If HTML or non-JSON returned, check for Google auth/login screens
      if (text.includes('accounts.google.com') || text.includes('ServiceLogin') || text.includes('Sign in') || text.includes('Iniciar sesión')) {
        return {
          success: false,
          message: 'El Webhook redirige al inicio de sesión de Google. En Implementar > Aplicación web debes seleccionar "Quién tiene acceso: Cualquier persona" (Anyone).',
          needsAuth: true,
          cleanUrl,
        };
      }
      return {
        success: true,
        message: 'Webhook activo y respondiendo.',
        cleanUrl,
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      success: false,
      message: err.name === 'AbortError' 
        ? 'El Webhook tardó más de 12s en responder. Verifica el acceso en script.google.com.' 
        : 'No se pudo conectar con el Webhook. Asegúrate de haber ejecutado "autorizarYCrearCarpeta" en script.google.com para aceptar los permisos de Google Drive y que el acceso sea "Cualquier persona".',
      needsAuth: true,
      cleanUrl,
    };
  }
}

/**
 * Download backup from Google Apps Script Webhook
 */
export async function downloadFromWebhook(webhookUrl: string): Promise<string> {
  const cleanUrl = sanitizeWebhookUrl(webhookUrl);
  const downloadUrl = cleanUrl.includes('?') 
    ? `${cleanUrl}&download=true` 
    : `${cleanUrl}?download=true`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(downloadUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error al leer desde el Webhook de Google Drive (${response.status})`);
    }
    const rawText = await response.text();
    
    try {
      const parsed = JSON.parse(rawText);
      if (parsed.status === 'error') {
        throw new Error(parsed.message || 'Error reportado por el script de Drive');
      }
    } catch (parseErr) {
      // If not JSON error, return raw content
    }

    return rawText;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado al descargar respaldo desde Google Drive.');
    }
    throw err;
  }
}

/**
 * Perform immediate synchronization to Google Drive (via Webhook or OAuth).
 * @param force If true, bypasses any existing lock (useful when user manually clicks sync)
 */
export async function executeDriveSync(force: boolean = false): Promise<{
  success: boolean;
  result?: DriveUploadResult;
  error?: string;
}> {
  const config = getStoredDriveConfig();

  // If webhook is provided (Recommended - zero domain restrictions)
  if (config.webhookUrl) {
    if (isSyncInProgress && !force) {
      // If locked for more than 25 seconds, automatically break stale lock
      if (Date.now() - syncLockTimestamp > 25000) {
        console.warn('Liberando bloqueo previo de sincronización por exceso de tiempo (>25s).');
        isSyncInProgress = false;
      } else {
        return { success: false, error: 'Sincronización en curso. Por favor espera unos segundos...' };
      }
    }

    try {
      isSyncInProgress = true;
      syncLockTimestamp = Date.now();
      saveDriveConfig({ lastSyncStatus: 'syncing', lastSyncError: null });
      notifySyncStatus({ status: 'syncing', message: 'Guardando copia y plantillas en Google Drive...' });

      const jsonBackup = exportDataBackup();
      const result = await syncViaWebhook(config.webhookUrl, jsonBackup);

      const nowIso = new Date().toISOString();
      saveDriveConfig({
        lastSyncTimestamp: nowIso,
        lastSyncStatus: 'success',
        lastSyncError: null,
        lastSyncedFileName: result.fileName,
        lastSyncedFileUrl: result.webViewLink || null,
      });

      notifySyncStatus({
        status: 'success',
        timestamp: nowIso,
        message: 'Base de datos y plantillas guardadas exitosamente en Google Drive.',
        result,
      });

      return { success: true, result };
    } catch (err: any) {
      console.error('Error al sincronizar vía Webhook:', err);
      saveDriveConfig({
        lastSyncStatus: 'error',
        lastSyncError: err.message || 'Error al conectar con Webhook de Drive',
      });
      notifySyncStatus({
        status: 'error',
        message: err.message || 'Error al sincronizar con Google Drive',
      });
      return { success: false, error: err.message };
    } finally {
      isSyncInProgress = false;
      syncLockTimestamp = 0;
    }
  }

  // Fallback to OAuth method if folderId is configured
  if (config.folderId) {
    const token = getDriveAccessToken();
    if (!token) {
      saveDriveConfig({
        lastSyncStatus: 'error',
        lastSyncError: 'Inicia sesión con Google para sincronizar con la carpeta de Drive.',
      });
      notifySyncStatus({
        status: 'error',
        message: 'Inicia sesión con Google para sincronizar con Drive.',
      });
      return { success: false, error: 'No se ha iniciado sesión con Google Drive.' };
    }

    if (isSyncInProgress && !force) {
      if (Date.now() - syncLockTimestamp > 25000) {
        isSyncInProgress = false;
      } else {
        return { success: false, error: 'Sincronización en curso. Por favor espera unos segundos...' };
      }
    }

    try {
      isSyncInProgress = true;
      syncLockTimestamp = Date.now();
      saveDriveConfig({ lastSyncStatus: 'syncing', lastSyncError: null });
      notifySyncStatus({ status: 'syncing', message: 'Sincronizando con Google Drive...' });

      const jsonBackup = exportDataBackup();
      const result = await uploadBackupToDriveFolder(config.folderId, jsonBackup);

      const nowIso = new Date().toISOString();
      saveDriveConfig({
        lastSyncTimestamp: nowIso,
        lastSyncStatus: 'success',
        lastSyncError: null,
        lastSyncedFileName: result.fileName,
        lastSyncedFileUrl: result.webViewLink || null,
      });

      notifySyncStatus({
        status: 'success',
        timestamp: nowIso,
        message: 'Base de datos y plantillas actualizadas en Google Drive.',
        result,
      });

      return { success: true, result };
    } catch (err: any) {
      console.error('Error al sincronizar con Google Drive:', err);
      saveDriveConfig({
        lastSyncStatus: 'error',
        lastSyncError: err.message || 'Error al subir a Google Drive',
      });
      notifySyncStatus({
        status: 'error',
        message: err.message || 'Error al sincronizar con Google Drive',
      });
      return { success: false, error: err.message };
    } finally {
      isSyncInProgress = false;
      syncLockTimestamp = 0;
    }
  }

  return { success: false, error: 'No se ha configurado ningún enlace o Webhook de Google Drive.' };
}

/**
 * Schedule automatic synchronization with debouncing.
 * Automatically called when student, trámite, or template data changes.
 */
export function scheduleDriveAutoSync(delayMs: number = 2500): void {
  const config = getStoredDriveConfig();
  if (!config.autoSyncEnabled) {
    return;
  }

  // If using webhook, it can sync automatically without token
  if (config.webhookUrl) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      executeDriveSync(false).catch(() => {});
    }, delayMs);
    return;
  }

  // If using OAuth, requires token
  if (config.folderId) {
    const token = getDriveAccessToken();
    if (!token) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      executeDriveSync(false).catch(() => {});
    }, delayMs);
  }
}
