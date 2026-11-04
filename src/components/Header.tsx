import React from 'react';
import { FileText, UserPlus, Shield, LogOut, GraduationCap, ChevronRight, Database, FileCheck2 } from 'lucide-react';
import { Student } from '../types';
import { UTEA_LOGO_DATA_URL } from '../data/uteaLogoData';

import { getSupabaseConfig } from '../lib/supabase';

interface HeaderProps {
  currentView: 'home' | 'registro' | 'tramites' | 'admin';
  setCurrentView: (view: 'home' | 'registro' | 'tramites' | 'admin') => void;
  activeStudent: Student | null;
  onLogoutStudent: () => void;
  isAdminLoggedIn: boolean;
  onLogoutAdmin: () => void;
  onOpenBackupModal: () => void;
  onOpenSupabaseModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  activeStudent,
  onLogoutStudent,
  isAdminLoggedIn,
  onLogoutAdmin,
  onOpenBackupModal,
  onOpenSupabaseModal,
}) => {
  const [isSupabaseConfigured, setIsSupabaseConfigured] = React.useState<boolean>(
    () => getSupabaseConfig().isConfigured
  );

  React.useEffect(() => {
    const handleConfigChange = () => {
      setIsSupabaseConfigured(getSupabaseConfig().isConfigured);
    };
    window.addEventListener('utea_supabase_config_changed', handleConfigChange);
    return () => {
      window.removeEventListener('utea_supabase_config_changed', handleConfigChange);
    };
  }, []);
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-8">
          {/* Zone 1: Brand Wordmark */}
          <div 
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-3 cursor-pointer shrink-0 select-none group"
          >
            <div className="h-12 w-10 flex items-center justify-center shrink-0">
              <img 
                src={UTEA_LOGO_DATA_URL} 
                alt="Escudo Oficial UTEA" 
                className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
              />
            </div>
            <div>
              <span className="text-base font-bold text-blue-950 tracking-tight block leading-tight">
                UTEA · Filial Cusco
              </span>
              <span className="text-xs font-medium text-slate-500 block leading-tight">
                Escuela Profesional de Ingeniería Civil
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              onClick={() => setCurrentView('home')}
              className={`hover:text-blue-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                currentView === 'home' ? 'text-blue-950 font-semibold border-b-2 border-blue-900' : ''
              }`}
            >
              Inicio
            </button>
            <button
              onClick={() => setCurrentView('registro')}
              className={`hover:text-blue-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                currentView === 'registro' ? 'text-blue-950 font-semibold border-b-2 border-blue-900' : ''
              }`}
            >
              Registro de Alumno
            </button>
            <button
              onClick={() => setCurrentView('tramites')}
              className={`hover:text-blue-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                currentView === 'tramites' ? 'text-blue-950 font-semibold border-b-2 border-blue-900' : ''
              }`}
            >
              Trámites de PPP
            </button>
            {isAdminLoggedIn && (
              <button
                onClick={() => setCurrentView('admin')}
                className={`hover:text-blue-900 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
                  currentView === 'admin' ? 'text-blue-950 font-semibold border-b-2 border-blue-900' : ''
                }`}
              >
                Panel de Supervisión
              </button>
            )}
          </nav>

          {/* Zone 3: Primary Action / User Profile & Admin Option */}
          <div className="flex items-center gap-2.5 shrink-0">
            {activeStudent ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-semibold text-slate-800 truncate max-w-[150px]">
                    {activeStudent.fullName}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500">
                    CÓD: {activeStudent.studentCode}
                  </div>
                </div>
                <button
                  onClick={onLogoutStudent}
                  title="Cerrar sesión de alumno"
                  className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : null}

            {/* Cloud Sync Supabase Button */}
            <button
              onClick={onOpenSupabaseModal}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-2xs flex items-center gap-1.5 ${
                isSupabaseConfigured
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 hover:text-emerald-700 border-slate-200 hover:border-emerald-300'
              }`}
              title={
                isSupabaseConfigured
                  ? 'Supabase Conectado: Sincronización en tiempo real activa entre todas las computadoras'
                  : 'Conectar a Supabase para sincronizar modificaciones entre todas las computadoras'
              }
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <Database className={`w-3.5 h-3.5 ${isSupabaseConfigured ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">
                {isSupabaseConfigured ? 'Supabase Activo' : 'Conectar Supabase'}
              </span>
            </button>

            {/* Administrator Section */}
            {isAdminLoggedIn ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                {/* Copia de Seguridad y Datos - Solo para Administrador */}
                <button
                  onClick={onOpenBackupModal}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-900 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
                  title="Exportar o importar copia de seguridad local (JSON)"
                >
                  <Database className="w-3.5 h-3.5 text-blue-700" />
                  <span className="hidden md:inline">Copia de Seguridad</span>
                </button>

                <button
                  onClick={() => setCurrentView('admin')}
                  className="px-3 py-1.5 text-xs font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5 text-blue-700" />
                  <span>Admin Activo</span>
                </button>
                <button
                  onClick={onLogoutAdmin}
                  title="Salir de modo Administrador"
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCurrentView('admin')}
                className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
                title="Acceso exclusivo para el Administrador de la Comisión"
              >
                <Shield className="w-3 h-3 text-slate-500" />
                <span>Administrador</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
