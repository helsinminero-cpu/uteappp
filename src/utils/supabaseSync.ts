import { Student, TramiteRecord } from '../types';
import { getSupabaseClient, getSupabaseConfig } from '../lib/supabase';
import { sanitizeTramiteRecord } from '../data/storage';

export interface SupabaseSyncState {
  isConfigured: boolean;
  isConnected: boolean;
  lastSyncTime: string | null;
  error: string | null;
  isSyncing: boolean;
}

// Convert Student to Supabase row
export function studentToRow(s: Student) {
  return {
    id: s.id,
    full_name: s.fullName,
    student_code: s.studentCode.trim().toUpperCase(),
    organization: s.organization,
    start_date: s.startDate,
    email: s.email || '',
    created_at: s.createdAt || new Date().toISOString(),
  };
}

// Convert Supabase row to Student
export function rowToStudent(r: any): Student {
  return {
    id: r.id,
    fullName: r.full_name || '',
    studentCode: (r.student_code || '').trim().toUpperCase(),
    organization: r.organization || '',
    startDate: r.start_date || '',
    email: r.email || '',
    createdAt: r.created_at || new Date().toISOString(),
  };
}

// Convert TramiteRecord to Supabase row
export function tramiteToRow(t: TramiteRecord) {
  const clean = sanitizeTramiteRecord(t);
  return {
    id: clean.id,
    student_id: clean.studentId,
    student_code: (clean.studentCode || '').trim().toUpperCase(),
    type: clean.type,
    status: clean.status,
    submitted_at: clean.submittedAt || new Date().toISOString(),
    updated_at: clean.updatedAt || new Date().toISOString(),
    designacion: clean.designacion || null,
    reasignacion: clean.reasignacion || null,
    sustentacion: clean.sustentacion || null,
    aprobacion: clean.aprobacion || null,
  };
}

// Convert Supabase row to TramiteRecord
export function rowToTramite(r: any): TramiteRecord {
  const record: TramiteRecord = {
    id: r.id,
    studentId: r.student_id,
    studentCode: (r.student_code || '').trim().toUpperCase(),
    type: r.type,
    status: r.status,
    submittedAt: r.submitted_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
    designacion: r.designacion || undefined,
    reasignacion: r.reasignacion || undefined,
    sustentacion: r.sustentacion || undefined,
    aprobacion: r.aprobacion || undefined,
  };
  return sanitizeTramiteRecord(record);
}

/**
 * Fetch all students from Supabase
 */
export async function fetchStudentsFromSupabase(): Promise<Student[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching students from Supabase:', error);
      return null;
    }

    if (!data) return [];
    return data.map(rowToStudent);
  } catch (err) {
    console.warn('Supabase students fetch exception:', err);
    return null;
  }
}

/**
 * Fetch all tramites from Supabase
 */
export async function fetchTramitesFromSupabase(): Promise<TramiteRecord[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('tramites')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Error fetching tramites from Supabase:', error);
      return null;
    }

    if (!data) return [];
    return data.map(rowToTramite);
  } catch (err) {
    console.warn('Supabase tramites fetch exception:', err);
    return null;
  }
}

/**
 * Upsert a single student to Supabase
 */
export async function upsertStudentToSupabase(student: Student): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = studentToRow(student);
    const { error } = await client.from('students').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Error upserting student to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase student upsert exception:', err);
    return false;
  }
}

/**
 * Upsert a batch of students to Supabase with fallback to individual items
 */
export async function syncAllStudentsToSupabase(students: Student[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || students.length === 0) return false;

  try {
    const rows = students.map(studentToRow);
    const { error } = await client.from('students').upsert(rows, { onConflict: 'id' });
    if (!error) return true;

    console.warn('Batch student upsert failed, retrying individually:', error.message);
    let anySuccess = false;
    for (const s of students) {
      const ok = await upsertStudentToSupabase(s);
      if (ok) anySuccess = true;
    }
    return anySuccess;
  } catch (err) {
    console.warn('Supabase students batch sync exception:', err);
    return false;
  }
}

/**
 * Delete a student from Supabase
 */
export async function deleteStudentFromSupabase(studentId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('students').delete().eq('id', studentId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Upsert a single trámite to Supabase
 */
export async function upsertTramiteToSupabase(tramite: TramiteRecord): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = tramiteToRow(tramite);
    const { error } = await client.from('tramites').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Error upserting tramite to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase tramite upsert exception:', err);
    return false;
  }
}

/**
 * Delete a tramite from Supabase
 */
export async function deleteTramiteFromSupabase(tramiteId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('tramites').delete().eq('id', tramiteId);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Upsert a batch of trámites to Supabase with fallback to individual items
 */
export async function syncAllTramitesToSupabase(tramites: TramiteRecord[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || tramites.length === 0) return false;

  try {
    const rows = tramites.map(tramiteToRow);
    const { error } = await client.from('tramites').upsert(rows, { onConflict: 'id' });
    if (!error) return true;

    console.warn('Batch tramites upsert failed, retrying individually:', error.message);
    let anySuccess = false;
    for (const t of tramites) {
      const ok = await upsertTramiteToSupabase(t);
      if (ok) anySuccess = true;
    }
    return anySuccess;
  } catch (err) {
    console.warn('Supabase tramites batch sync exception:', err);
    return false;
  }
}

/**
 * Upsert a docx template to Supabase
 */
export async function upsertTemplateToSupabase(key: string, name: string, base64: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('docx_templates').upsert({
      key,
      name,
      base64,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' });

    if (error) {
      console.warn('Error upserting template to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase template upsert exception:', err);
    return false;
  }
}

/**
 * Fetch all docx templates from Supabase
 */
export async function fetchTemplatesFromSupabase(): Promise<Array<{ key: string; name: string; base64: string }> | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('docx_templates').select('key, name, base64');
    if (error) {
      console.warn('Error fetching templates from Supabase:', error);
      return null;
    }
    return data || [];
  } catch (err) {
    console.warn('Supabase templates fetch exception:', err);
    return null;
  }
}

/**
 * Setup Realtime channel to subscribe to live updates across all connected computers
 */
export function subscribeToSupabaseRealtime(
  onStudentChanged: (student: Student, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void,
  onTramiteChanged: (tramite: TramiteRecord, eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void,
  onTemplateChanged?: (key: string, base64: string) => void,
  onStatusChange?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CHANNEL_ERROR' | 'CLOSED') => void
): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel('utea-ppp-realtime-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'students' },
      (payload) => {
        const oldRow = payload.old as any;
        const newRow = payload.new as any;
        if (payload.eventType === 'DELETE' && oldRow?.id) {
          onStudentChanged({ id: oldRow.id } as Student, 'DELETE');
        } else if (newRow && newRow.id) {
          const student = rowToStudent(newRow);
          onStudentChanged(student, payload.eventType as any);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tramites' },
      (payload) => {
        const oldRow = payload.old as any;
        const newRow = payload.new as any;
        if (payload.eventType === 'DELETE' && oldRow?.id) {
          onTramiteChanged({ id: oldRow.id } as TramiteRecord, 'DELETE');
        } else if (newRow && newRow.id) {
          const tramite = rowToTramite(newRow);
          onTramiteChanged(tramite, payload.eventType as any);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'docx_templates' },
      (payload) => {
        const newRow = payload.new as any;
        if (newRow?.key && newRow?.base64 && onTemplateChanged) {
          onTemplateChanged(newRow.key, newRow.base64);
        }
      }
    )
    .subscribe((status) => {
      console.log('📡 Realtime status:', status);
      if (onStatusChange) {
        onStatusChange(status as any);
      }
    });

  return () => {
    try {
      client.removeChannel(channel);
    } catch {
      // ignore
    }
  };
}
