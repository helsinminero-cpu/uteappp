import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Google Drive file scope for least privilege file creation and backup updates
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory access token cache (CRITICAL: never stored in localStorage / sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const BACKUP_FILE_NAME = 'Copia_Seguridad_UTEA_PPP.json';

/**
 * Initialize Firebase Auth listener.
 */
export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

/**
 * Trigger Google Sign-In popup with Google Drive scope.
 */
export const signInWithGoogleDrive = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google Drive.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    console.error('Error durante el inicio de sesión de Google:', err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Sign out from Google account and flush in-memory token.
 */
export const signOutGoogleDrive = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Retrieve cached token in memory.
 */
export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Retrieve current signed-in Firebase user.
 */
export const getCurrentGoogleUser = (): User | null => {
  return auth.currentUser;
};

export interface DriveUploadResult {
  fileId: string;
  fileName: string;
  webViewLink?: string;
  modifiedTime?: string;
  sizeBytes?: number;
  isUpdate: boolean;
}

/**
 * Upload or update backup file in the specified Google Drive folder.
 */
export async function uploadBackupToDriveFolder(
  folderId: string,
  jsonBackupContent: string
): Promise<DriveUploadResult> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('No se ha iniciado sesión con Google Drive o el token ha expirado. Por favor presiona "Conectar con Google".');
  }

  // 1. Check if backup file already exists in the destination folder
  const query = encodeURIComponent(`'${folderId}' in parents and name = '${BACKUP_FILE_NAME}' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink,modifiedTime)&pageSize=1`;

  let existingFileId: string | null = null;
  let existingWebViewLink: string | undefined = undefined;

  try {
    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        existingFileId = searchData.files[0].id;
        existingWebViewLink = searchData.files[0].webViewLink;
      }
    } else if (searchRes.status === 401) {
      cachedAccessToken = null;
      throw new Error('La sesión de Google Drive ha expirado. Por favor vuelve a conectar tu cuenta.');
    } else if (searchRes.status === 404) {
      throw new Error('La carpeta de Google Drive indicada no existe o no tienes permisos de acceso.');
    }
  } catch (err: any) {
    if (err.message && err.message.includes('sesión') || err.message.includes('permisos')) {
      throw err;
    }
    // Proceed to create if search check had non-fatal error
  }

  // 2. If exists, update media content in place (preserves link and folder structure)
  if (existingFileId) {
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: jsonBackupContent,
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      throw new Error(`Error al actualizar archivo en Drive (${updateRes.status}): ${errText}`);
    }

    const updatedData = await updateRes.json();

    return {
      fileId: existingFileId,
      fileName: BACKUP_FILE_NAME,
      webViewLink: existingWebViewLink || `https://drive.google.com/file/d/${existingFileId}/view`,
      modifiedTime: updatedData.modifiedTime || new Date().toISOString(),
      isUpdate: true,
    };
  }

  // 3. If file does not exist, upload as multipart/related
  const boundary = 'utea_ppp_drive_boundary_' + Date.now();
  const metadata = {
    name: BACKUP_FILE_NAME,
    parents: [folderId],
    description: 'Copia de seguridad automática del Sistema de Trámites PPP UTEA (Alumnos, trámites y plantillas .docx)',
    mimeType: 'application/json',
  };

  const multipartBody = 
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(metadata) + `\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    jsonBackupContent + `\r\n` +
    `--${boundary}--`;

  const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,modifiedTime';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Error al crear archivo de respaldo en Drive (${createRes.status}): ${errText}`);
  }

  const createdData = await createRes.json();

  return {
    fileId: createdData.id,
    fileName: BACKUP_FILE_NAME,
    webViewLink: createdData.webViewLink || `https://drive.google.com/file/d/${createdData.id}/view`,
    modifiedTime: createdData.modifiedTime || new Date().toISOString(),
    isUpdate: false,
  };
}

/**
 * Download existing backup from Google Drive folder for restoration.
 */
export async function downloadBackupFromDriveFolder(folderId: string): Promise<string> {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('No se ha iniciado sesión con Google Drive.');
  }

  // Find file ID
  const query = encodeURIComponent(`'${folderId}' in parents and name = '${BACKUP_FILE_NAME}' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!searchRes.ok) {
    throw new Error('Error al buscar archivo de respaldo en la carpeta de Drive.');
  }

  const searchData = await searchRes.json();
  if (!searchData.files || searchData.files.length === 0) {
    throw new Error(`No se encontró el archivo "${BACKUP_FILE_NAME}" en la carpeta indicada.`);
  }

  const fileId = searchData.files[0].id;
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const downloadRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!downloadRes.ok) {
    throw new Error('Error al descargar el contenido del archivo de respaldo desde Google Drive.');
  }

  return await downloadRes.text();
}
