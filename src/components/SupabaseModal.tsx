import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Check, 
  Copy, 
  ExternalLink, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  DownloadCloud, 
  Trash2,
  Key,
  Globe,
  Radio,
  FileCode
} from 'lucide-react';
import { 
  getSupabaseConfig, 
  saveSupabaseConfig, 
  clearSupabaseConfig, 
  testSupabaseConnection, 
  SUPABASE_INIT_SQL,
  ConnectionTestResult 
} from '../lib/supabase';
import { 
  syncAllStudentsToSupabase, 
  syncAllTramitesToSupabase, 
  fetchStudentsFromSupabase, 
  fetchTramitesFromSupabase 
} from '../utils/supabaseSync';
import { Student, TramiteRecord } from '../types';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  tramites: TramiteRecord[];
  onDataLoadedFromSupabase?: (students: Student[], tramites: TramiteRecord[]) => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  students,
  tramites,
  onDataLoadedFromSupabase,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSqlPreview, setShowSqlPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrl(config.url);
      setAnonKey(config.anonKey);
      setTestResult(null);
      setSyncStatus(null);

      if (config.isConfigured) {
        // Run silent check
        testSupabaseConnection().then(setTestResult);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);
    setSyncStatus(null);

    const result = await testSupabaseConnection(url, anonKey);
    setTestResult(result);
    setIsTesting(false);

    if (result.success) {
      saveSupabaseConfig(url, anonKey);
      setSyncStatus('¡Configuración guardada y conexión activa! Ahora todos los cambios se compartirán entre todas las máquinas.');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_INIT_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleUploadAllToSupabase = async () => {
    setIsSyncing(true);
    setSyncStatus('Subiendo alumnos y trámites actuales a Supabase...');
    try {
      const sOk = await syncAllStudentsToSupabase(students);
      const tOk = await syncAllTramitesToSupabase(tramites);

      if (sOk && tOk) {
        setSyncStatus(`¡Sincronización completada con éxito! Se cargaron ${students.length} alumnos y ${tramites.length} trámites a Supabase.`);
      } else {
        setSyncStatus('Atención: Algunos registros no pudieron sincronizarse. Verifica que las tablas de Supabase hayan sido creadas con el script SQL.');
      }
    } catch (err: any) {
      setSyncStatus(`Error al sincronizar: ${err.message || 'Error de conexión'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromSupabase = async () => {
    setIsSyncing(true);
    setSyncStatus('Descargando datos desde Supabase...');
    try {
      const remoteStudents = await fetchStudentsFromSupabase();
      const remoteTramites = await fetchTramitesFromSupabase();

      if (remoteStudents && remoteTramites) {
        if (onDataLoadedFromSupabase) {
          onDataLoadedFromSupabase(remoteStudents, remoteTramites);
        }
        setSyncStatus(`¡Datos descargados con éxito! ${remoteStudents.length} alumnos y ${remoteTramites.length} trámites recuperados desde la nube.`);
      } else {
        setSyncStatus('No se pudieron recuperar datos de Supabase. Revisa la conexión.');
      }
    } catch (err: any) {
      setSyncStatus(`Error al descargar: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('¿Deseas desconectar Supabase? Los datos locales permanecerán en este navegador pero dejarán de sincronizarse en tiempo real con otras máquinas.')) {
      clearSupabaseConfig();
      setUrl('');
      setAnonKey('');
      setTestResult(null);
      setSyncStatus('Supabase ha sido desconectado.');
    }
  };

  const isConfigured = getSupabaseConfig().isConfigured;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Conexión a Supabase Cloud</h2>
                {isConfigured && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                    En Tiempo Real
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100/70">
                Comparte y sincroniza cualquier modificación para todas las máquinas y usuarios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-sm">
          {/* Status banner */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <p className="font-semibold">{testResult.message}</p>
                {testResult.hasStudentsTable !== undefined && (
                  <div className="flex items-center gap-3 text-[11px] text-slate-600 pt-1">
                    <span>Tabla students: {testResult.hasStudentsTable ? '✅ Lista' : '❌ Falta'}</span>
                    <span>Tabla tramites: {testResult.hasTramitesTable ? '✅ Lista' : '❌ Falta'}</span>
                    <span>Tabla templates: {testResult.hasTemplatesTable ? '✅ Lista' : '❌ Falta'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {syncStatus && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />
              <span>{syncStatus}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleTestAndSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  Supabase Project URL
                </span>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1 lowercase"
                >
                  abrir supabase dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <input
                type="text"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzabcdefghijklmnopq.supabase.co"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Encuéntralo en Supabase &gt; Project Settings &gt; API &gt; Project URL
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-slate-500" />
                Supabase Anon Public Key (Clave Pública)
              </label>
              <input
                type="password"
                required
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Encuéntralo en Supabase &gt; Project Settings &gt; API &gt; Project API keys (anon / public)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isTesting}
                className="flex-1 py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Probando y Conectando...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Probar y Guardar Conexión
                  </>
                )}
              </button>

              {isConfigured && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
                  title="Desconectar Supabase"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Desconectar
                </button>
              )}
            </div>
          </form>

          {/* Sync actions if configured */}
          {isConfigured && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-emerald-600" />
                Acciones de Sincronización Global
              </h3>
              <p className="text-xs text-slate-600">
                Cualquier cambio individual ya se sincroniza en tiempo real automáticamente. También puedes realizar sincronizaciones completas manuales:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handleUploadAllToSupabase}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 hover:border-emerald-600 text-slate-800 hover:text-emerald-700 rounded-lg text-xs font-medium shadow-2xs transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
                  Subir todo lo local a Supabase ({students.length} alumnos, {tramites.length} trámites)
                </button>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={handlePullFromSupabase}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 hover:border-blue-600 text-slate-800 hover:text-blue-700 rounded-lg text-xs font-medium shadow-2xs transition-colors"
                >
                  <DownloadCloud className="w-3.5 h-3.5 text-blue-600" />
                  Descargar todo de Supabase
                </button>
              </div>
            </div>
          )}

          {/* SQL Setup Helper */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Script SQL para Crear Tablas y Tiempo Real
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-2xs transition-colors"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Script SQL
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Para que Supabase admita alumnos, trámites y sincronización en tiempo real, copia este script y pégalo en{' '}
              <strong>Supabase Dashboard &gt; SQL Editor &gt; New Query &gt; Run</strong>.
            </p>

            <button
              type="button"
              onClick={() => setShowSqlPreview(!showSqlPreview)}
              className="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline"
            >
              {showSqlPreview ? 'Ocultar código SQL' : 'Ver código SQL del script'}
            </button>

            {showSqlPreview && (
              <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto max-h-48 border border-slate-800">
                {SUPABASE_INIT_SQL}
              </pre>
            )}
          </div>

          {/* Realtime WebSockets Explanation & Manual Verification */}
          <div className="border border-emerald-200 bg-emerald-50/50 rounded-xl p-4 space-y-2.5">
            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              ¿Cómo configurar Realtime WebSockets en Supabase?
            </h4>
            <div className="text-xs text-slate-700 space-y-2 leading-relaxed">
              <p>
                <strong>Opción 1 (Automática con el script SQL):</strong> Al ejecutar el script SQL arriba, ya se ejecuta automáticamente el comando <code className="bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded font-mono text-[11px]">alter publication supabase_realtime add table ...</code> y réplica completa. ¡No necesitas hacer nada más!
              </p>
              <p>
                <strong>Opción 2 (Visualmente desde la interfaz de Supabase):</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] text-slate-600">
                <li>En tu panel de Supabase, ve al menú lateral izquierdo y haz clic en <strong>Database</strong> &gt; <strong>Publications</strong>.</li>
                <li>Haz clic sobre <strong>supabase_realtime</strong>.</li>
                <li>Verifica que los interruptores de las tablas <strong className="text-slate-800">students</strong>, <strong className="text-slate-800">tramites</strong> y <strong className="text-slate-800">docx_templates</strong> estén en color verde (activadas).</li>
                <li>O desde <strong>Table Editor</strong>, edita cada tabla y marca la casilla <em>"Enable Realtime"</em>.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {isConfigured ? '🟢 Conectado a la nube' : '⚪ Modo sin conexión a la nube'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
