import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'utea_supabase_credentials_v1';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

let cachedClient: SupabaseClient | null = null;
let cachedConfig: SupabaseConfig | null = null;

export function getSupabaseConfig(): SupabaseConfig {
  if (cachedConfig) return cachedConfig;

  let url = '';
  let anonKey = '';

  // 1. Check localStorage first (user-configured in UI)
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      url = parsed.url?.trim() || '';
      anonKey = parsed.anonKey?.trim() || '';
    }
  } catch {
    // ignore
  }

  // 2. Fallback to Vite environment variables
  if (!url && typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) {
    url = String(import.meta.env.VITE_SUPABASE_URL).trim();
  }
  if (!anonKey && typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) {
    anonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY).trim();
  }

  const isConfigured = Boolean(url && anonKey && url.startsWith('http'));
  cachedConfig = { url, anonKey, isConfigured };
  return cachedConfig;
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  const cleanKey = anonKey.trim();

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
}

/**
 * Tests connection to Supabase and verifies required tables exist
 */
export async function testSupabaseConnection(overrideUrl?: string, overrideKey?: string): Promise<ConnectionTestResult> {
  const url = (overrideUrl || getSupabaseConfig().url).trim().replace(/\/+$/, '');
  const key = (overrideKey || getSupabaseConfig().anonKey).trim();

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
      };
    }

    if (errStudents?.message?.includes('does not exist') || errTramites?.message?.includes('does not exist') || errStudents?.code === '42P01') {
      return {
        success: false,
        message: 'Conectado a Supabase pero las tablas (students, tramites) aún no han sido creadas. Ejecuta el script SQL en el editor de Supabase.',
        hasStudentsTable,
        hasTramitesTable,
        hasTemplatesTable,
      };
    }

    // Generic error
    const anyError = errStudents || errTramites || errTemplates;
    return {
      success: false,
      message: `Error al consultar Supabase: ${anyError?.message || 'Verifica la URL y la clave anon.'}`,
      hasStudentsTable,
      hasTramitesTable,
      hasTemplatesTable,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Error de red o conexión: ${err.message || 'No se pudo conectar a Supabase.'}`,
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
