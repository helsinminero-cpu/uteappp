export interface DriveBackupConfig {
  folderUrl: string;
  folderId: string;
  webhookUrl: string;
  syncType: 'webhook' | 'oauth';
  autoSyncEnabled: boolean;
  lastSyncTimestamp: string | null;
  lastSyncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncError: string | null;
  lastSyncedFileName: string | null;
  lastSyncedFileUrl: string | null;
  templatesFolderUrl?: string | null;
  lastSyncedItemCount?: {
    students: number;
    tramites: number;
    templates: number;
  };
}

const STORAGE_DRIVE_CONFIG_KEY = 'utea_drive_backup_config_permanent_v1';

export const DEFAULT_DRIVE_CONFIG: DriveBackupConfig = {
  folderUrl: '',
  folderId: '',
  webhookUrl: '',
  syncType: 'webhook',
  autoSyncEnabled: true,
  lastSyncTimestamp: null,
  lastSyncStatus: 'idle',
  lastSyncError: null,
  lastSyncedFileName: null,
  lastSyncedFileUrl: null,
  templatesFolderUrl: null,
};

/**
 * Check if the input is a Google Apps Script Webhook URL
 */
export function isGoogleScriptWebhookUrl(input: string): boolean {
  if (!input) return false;
  return input.includes('script.google.com/macros/s/') || input.includes('script.google.com/a/');
}

/**
 * Sanitizes Webhook URL by replacing /edit or /dev with /exec
 */
export function sanitizeWebhookUrl(input: string): string {
  let url = (input || '').trim();
  if (url.includes('/edit')) {
    url = url.replace(/\/edit.*$/, '/exec');
  }
  if (url.includes('/dev')) {
    url = url.replace(/\/dev.*$/, '/exec');
  }
  return url;
}

/**
 * Extract Google Drive Folder ID from diverse URL formats or raw folder IDs:
 * - https://drive.google.com/drive/folders/1A2B3C...
 * - https://drive.google.com/drive/u/0/folders/1A2B3C...
 * - https://drive.google.com/open?id=1A2B3C...
 * - 1A2B3C... (raw ID)
 */
export function extractDriveFolderId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // Match /folders/ID (with optional query parameters like ?usp=sharing)
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    return folderMatch[1];
  }

  // Match ?id=ID or &id=ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    return idMatch[1];
  }

  // If already a clean alphanumeric ID of typical Drive ID length (15 to 65 chars)
  if (/^[a-zA-Z0-9_-]{15,70}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Retrieve saved Google Drive config.
 * Guaranteed to persist across page reloads, browser restarts, and admin sessions.
 */
export function getStoredDriveConfig(): DriveBackupConfig {
  try {
    const raw = localStorage.getItem(STORAGE_DRIVE_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_DRIVE_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_DRIVE_CONFIG,
      ...parsed,
    };
  } catch {
    return { ...DEFAULT_DRIVE_CONFIG };
  }
}

/**
 * Persist Google Drive config into localStorage permanently.
 */
export function saveDriveConfig(config: Partial<DriveBackupConfig>): DriveBackupConfig {
  try {
    const current = getStoredDriveConfig();
    const updated: DriveBackupConfig = {
      ...current,
      ...config,
    };
    localStorage.setItem(STORAGE_DRIVE_CONFIG_KEY, JSON.stringify(updated));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('utea_drive_config_updated', { detail: updated }));
    }
    return updated;
  } catch (err) {
    console.error('Error saving Drive config to localStorage', err);
    return getStoredDriveConfig();
  }
}
