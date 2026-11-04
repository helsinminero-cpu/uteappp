import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_SUPABASE_CONFIG } from '../config/supabaseConfig';

const STORAGE_KEY = 'utea_supabase_credentials_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

let cachedClient: SupabaseClient | null = null;
let cachedConfig: SupabaseConfig | null = null;

/**
 * Cleans and formats Supabase Project URLs automatically:
 * - Strips /rest/v1 or /auth/v1
 * - Converts dashboard URLs (supabase.com/dashboard/project/xxx) into https://xxx.supabase.co
 * - Converts plain project refs into https://xxx.supabase.co
 * - Strips quotes, spaces and trailing slashes
 */
export function sanitizeSupabaseUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  let url = rawUrl.trim().replace(/^['"`]|['"`]$/g, '').trim();

  // 1. If user pasted Dashboard URL from browser address bar: https://supabase.com/dashboard/project/abcdefghijk...
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/i);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // 2. If user pasted just the 20-character reference code (e.g. mbzldtqygryqevgoyekc)
  if (/^[a-z0-9]{15,25}$/i.test(url)) {
    return `https://${url.toLowerCase()}.supabase.co`;
  }

  // 3. If user pasted standard supabase.co domain with trailing path (like /rest/v1 or /auth/v1)
  const supabaseDomainMatch = url.match(/^(?:https?:\/\/)?([a-zA-Z0-9_-]+\.supabase\.co)(?:\/.*)?$/i);
  if (supabaseDomainMatch && supabaseDomainMatch[1]) {
    return `https://${supabaseDomainMatch[1].toLowerCase()}`;
  }

  // 4. For custom domains or localhost, remove any trailing /rest/v1 or trailing slashes
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/auth\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  return url;
}

/**
 * Sanitizes Anon Public Key (removes accidental quotes, spaces, or labels)
 */
export function sanitizeSupabaseKey(rawKey: string): string {
  if (!rawKey) return '';
  let key = rawKey.trim().replace(/^['"`]|['"`]$/g, '').trim();
  const jwtMatch = key.match(/(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/);
  if (jwtMatch) {
    return jwtMatch[1];
  }
  return key;
}

/**
 * Generates a shareable URL containing the Supabase credentials so any other computer
 * or phone can connect in 1 click without manually entering credentials.
 */
export function generateSupabaseShareLink(): string {
  const config = getSupabaseConfig();
  if (!config.isConfigured || typeof window === 'undefined') return '';
  const base = window.location.origin + window.location.pathname;
  return `${base}?sb_url=${encodeURIComponent(config.url)}&sb_key=${encodeURIComponent(config.anonKey)}`;
}

export function getSupabaseConfig(): SupabaseConfig {
  if (cachedConfig) return cachedConfig;

  let url = '';
  let anonKey = '';

  // 0. Check URL search parameters for Magic Link (e.g. ?sb_url=...&sb_key=...)
  if (typeof window !== 'undefined') {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const paramUrl = searchParams.get('sb_url') || searchParams.get('supabase_url');
      const paramKey = searchParams.get('sb_key') || searchParams.get('supabase_key') || searchParams.get('supabase_anon');

      if (paramUrl && paramKey) {
        url = sanitizeSupabaseUrl(paramUrl);
        anonKey = sanitizeSupabaseKey(paramKey);
        if (url && anonKey) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, anonKey }));
          } catch {
            // ignore
          }
          // Clean parameters from address bar cleanly without page reload
          try {
            const cleanPath = window.location.pathname + (window.location.hash || '');
            window.history.replaceState({}, document.title, cleanPath);
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 1. Check localStorage (user-configured or saved via Magic Link)
  if (!url || !anonKey) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        url = sanitizeSupabaseUrl(parsed.url || '');
        anonKey = sanitizeSupabaseKey(parsed.anonKey || '');
      }
    } catch {
      // ignore
    }
  }

  // 2. Fallback to Vite environment variables
  if (!url && typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) {
    url = sanitizeSupabaseUrl(String(import.meta.env.VITE_SUPABASE_URL));
  }
  if (!anonKey && typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) {
    anonKey = sanitizeSupabaseKey(String(import.meta.env.VITE_SUPABASE_ANON_KEY));
  }

  // 3. Fallback to default configuration committed to the repository (src/config/supabaseConfig.ts)
  if (!url && DEFAULT_SUPABASE_CONFIG?.url) {
    url = sanitizeSupabaseUrl(DEFAULT_SUPABASE_CONFIG.url);
  }
  if (!anonKey && DEFAULT_SUPABASE_CONFIG?.anonKey) {
    anonKey = sanitizeSupabaseKey(DEFAULT_SUPABASE_CONFIG.anonKey);
  }

  const isConfigured = Boolean(url && anonKey && url.startsWith('http'));
  cachedConfig = { url, anonKey, isConfigured };
  return cachedConfig;
}

export function saveSupabaseConfig(rawUrl: string, rawKey: string): void {
  const cleanUrl = sanitizeSupabaseUrl(rawUrl);
  const cleanKey = sanitizeSupabaseKey(rawKey);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: cleanUrl, anonKey: cleanKey }));
  } catch (err) {
    console.error('Error saving Supabase config to localStorage:', err);
  }

  cachedConfig = {
    url: cleanUrl,
    anonKey: cleanKey,
    isConfigured: Boolean(cleanUrl && cleanKey && cleanUrl.startsWith('http')),
  };

  if (cachedConfig.isConfigured) {
    cachedClient = createClient(cleanUrl, cleanKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } else {
    cachedClient = null;
  }

  // Notify components of connection change
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('utea_supabase_config_changed', { detail: cachedConfig }));
  }
}

export function clearSupabaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  cachedConfig = { url: '', anonKey: '', isConfigured: false };
  cachedClient = null;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('utea_supabase_config_changed', { detail: cachedConfig }));
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const config = getSupabaseConfig();
  if (config.isConfigured) {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return cachedClient;
  }

  return null;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  hasStudentsTable?: boolean;
  hasTramitesTable?: boolean;
  hasTemplatesTable?: boolean;
  cleanedUrl?: string;
}

/**
 * Tests connection to Supabase and verifies required tables exist
 */
export async function testSupabaseConnection(overrideUrl?: string, overrideKey?: string): Promise<ConnectionTestResult> {
  const rawUrl = overrideUrl !== undefined ? overrideUrl : getSupabaseConfig().url;
  const rawKey = overrideKey !== undefined ? overrideKey : getSupabaseConfig().anonKey;

  const url = sanitizeSupabaseUrl(rawUrl);
  const key = sanitizeSupabaseKey(rawKey);

  if (!url || !key) {
    return {
      success: false,
      message: 'Debe ingresar la URL del Proyecto y la clave pública (Anon Key).',
    };
  }

  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    return {
      success: false,
      message: 'La URL de Supabase debe comenzar con https:// (ej. https://xyz.supabase.co).',
    };
  }

  try {
    const testClient = createClient(url, key);

    // Test students table
    const { error: errStudents } = await testClient.from('students').select('id').limit(1);
    const hasStudentsTable = !errStudents;

    // Test tramites table
    const { error: errTramites } = await testClient.from('tramites').select('id').limit(1);
    const hasTramitesTable = !errTramites;

    // Test docx_templates table
    const { error: errTemplates } = await testClient.from('docx_templates').select('key').limit(1);
    const hasTemplatesTable = !errTemplates;

    if (hasStudentsTable && hasTramitesTable) {
      return {
        success: true,
        message: '¡Conexión exitosa con Supabase! Las tablas están listas para sincronización.',
        hasStudentsTable: true,
        hasTramitesTable: true,
        hasTemplatesTable,
        cleanedUrl: url,
      };
    }

    // Check if error is missing tables (e.g. 42P01 or table does not exist)
    const isMissingTables = 
      errStudents?.message?.toLowerCase().includes('does not exist') || 
      errTramites?.message?.toLowerCase().includes('does not exist') || 
      errStudents?.code === '42P01' || 
      errTramites?.code === '42P01' ||
      errStudents?.code === 'PGRST204' ||
      errTramites?.code === 'PGRST204';

    if (isMissingTables) {
      return {
        success: false,
        message: 'Conectado al proyecto de Supabase, pero las tablas aún no existen. Ejecuta el Script SQL abajo en el SQL Editor de Supabase.',
        hasStudentsTable,
        hasTramitesTable,
        hasTemplatesTable,
        cleanedUrl: url,
      };
    }

    // Diagnostic on generic error
    const anyError = errStudents || errTramites || errTemplates;
    let detailMsg = anyError?.message || 'Verifica la URL y la clave anon.';

    if (detailMsg.includes('Invalid path specified in request URL')) {
      detailMsg = 'La URL ingresada tenía rutas adicionales (como /rest/v1 o dashboard). La hemos corregido a "' + url + '". Vuelve a hacer clic en "Probar y Guardar Conexión".';
    } else if (anyError?.code === 'PGRST301' || detailMsg.toLowerCase().includes('jwt') || detailMsg.includes('Invalid API key')) {
      detailMsg = 'La clave pública (Anon Key) es inválida o ha expirado. Cópiala en Supabase > Project Settings > API > Project API keys (anon / public).';
    } else if (detailMsg.includes('Failed to fetch') || detailMsg.includes('NetworkError')) {
      detailMsg = 'Error de conexión: No se pudo contactar a Supabase. Verifica tu conexión a internet o que el proyecto no esté pausado.';
    }

    return {
      success: false,
      message: `Error al consultar Supabase: ${detailMsg}`,
      hasStudentsTable,
      hasTramitesTable,
      hasTemplatesTable,
      cleanedUrl: url,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error de red o conexión: ${err.message || 'No se pudo conectar a Supabase.'}`,
      cleanedUrl: url,
    };
  }
}

/**
 * SQL script for creating tables in Supabase with RLS and Realtime
 */
export const SUPABASE_INIT_SQL = `-- SCRIPT DE INICIALIZACIÓN PARA SUPABASE
-- UTEA Filial Cusco - Gestor de Trámites PPP
-- Pega este script en: Supabase Dashboard > SQL Editor > New Query > Run

-- 1. Tabla de Alumnos
create table if not exists public.students (
  id text primary key,
  full_name text not null,
  student_code text unique not null,
  organization text not null,
  start_date text not null,
  email text default '',
  created_at text default to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

-- 2. Tabla de Trámites y Documentos
create table if not exists public.tramites (
  id text primary key,
  student_id text not null,
  student_code text not null,
  type text not null,
  status text not null,
  submitted_at text not null,
  updated_at text not null,
  designacion jsonb,
  reasignacion jsonb,
  sustentacion jsonb,
  aprobacion jsonb
);

-- 3. Tabla de Plantillas Word (.docx)
create table if not exists public.docx_templates (
  key text primary key,
  name text not null,
  base64 text not null,
  updated_at text default to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

-- Habilitar Seguridad a Nivel de Fila (RLS)
alter table public.students enable row level security;
alter table public.tramites enable row level security;
alter table public.docx_templates enable row level security;

-- Políticas de acceso para permitir lectura, inserción y actualización desde la aplicación web
drop policy if exists "Acceso total estudiantes" on public.students;
create policy "Acceso total estudiantes" on public.students for all using (true) with check (true);

drop policy if exists "Acceso total tramites" on public.tramites;
create policy "Acceso total tramites" on public.tramites for all using (true) with check (true);

drop policy if exists "Acceso total plantillas" on public.docx_templates;
create policy "Acceso total plantillas" on public.docx_templates for all using (true) with check (true);

-- Habilitar réplica completa para que Realtime WebSockets envíe todos los campos en cambios y eliminaciones
alter table public.students replica identity full;
alter table public.tramites replica identity full;
alter table public.docx_templates replica identity full;

-- Habilitar Publicación en Tiempo Real (Realtime WebSockets) de forma segura y sin errores si ya existe
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'students'
  ) then
    alter publication supabase_realtime add table public.students;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tramites'
  ) then
    alter publication supabase_realtime add table public.tramites;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'docx_templates'
  ) then
    alter publication supabase_realtime add table public.docx_templates;
  end if;
end $$;
`;
