import React from 'react';
import { 
  FileCheck2, 
  UserPlus, 
  ShieldAlert, 
  ArrowRight, 
  Calendar, 
  CheckCircle2, 
  Building2, 
  Award, 
  Users,
  Clock,
  Sparkles
} from 'lucide-react';
import { UTEA_LOGO_DATA_URL } from '../data/uteaLogoData';

interface HomeHeroProps {
  onSelectOption: (option: 'tramite' | 'registro' | 'admin') => void;
  studentCount: number;
  tramiteCount: number;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  onSelectOption,
  studentCount,
  tramiteCount,
}) => {
  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Institutional Banner */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="flex justify-center mb-4">
          <img 
            src={UTEA_LOGO_DATA_URL} 
            alt="Escudo Oficial UTEA" 
            className="w-20 h-24 object-contain drop-shadow-md hover:scale-105 transition-transform"
          />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold mb-4">
          <Building2 className="w-3.5 h-3.5 text-blue-700" />
          <span>Universidad Tecnológica de los Andes · Filial Cusco</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight text-balance">
          Sistema Oficial de Trámites y Resoluciones de Prácticas Pre Profesionales (PPP)
        </h1>
        <p className="mt-3 text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Plataforma de la Comisión de Prácticas Pre Profesionales de la Escuela Profesional de Ingeniería Civil para la emisión automática de Informes y Resoluciones Sub Directorales.
        </p>
      </div>

      {/* The Core Options: 1. Registro de Alumno (Primero), 2. Trámites de PPP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
        {/* Option 1: Registro de Alumno (Paso Obligatorio Inicial) */}
        <div 
          onClick={() => onSelectOption('registro')}
          className="group relative bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-7 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="w-14 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-5 group-hover:scale-105 transition-transform shadow-xs">
              <UserPlus className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
              Paso 1 · Obligatorio Inicial
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Registro de Alumno
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Las personas que deseen realizar un trámite primero deben registrarse. Tu Código de Alumno será tu llave única para gestionar tus expedientes.
            </p>

            <div className="space-y-2 mb-6 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Apellidos y Nombres con mayúscula inicial por palabra</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Organización y Código siempre en Mayúsculas</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Fecha de inicio con formato estándar oficial UTEA</span>
              </div>
            </div>
          </div>

          <button 
            type="button"
            className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs group-hover:bg-emerald-800"
          >
            <span>Registrarme como Alumno</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Option 2: Trámites de PPP */}
        <div 
          onClick={() => onSelectOption('tramite')}
          className="group relative bg-white border border-slate-200 hover:border-blue-500 rounded-2xl p-7 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="w-14 h-14 rounded-xl bg-blue-900 text-white flex items-center justify-center mb-5 group-hover:scale-105 transition-transform shadow-xs">
              <FileCheck2 className="w-7 h-7 text-amber-400" />
            </div>
            <div className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">
              Paso 2 · Trámite Académico
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Trámites de PPP
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Ingresa con tu Código de Alumno registrado para iniciar o consultar tus 4 procesos oficiales: Designación, Reasignación, Sustentación o Aprobación.
            </p>

            <div className="space-y-2 mb-6 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Acceso exclusivo con Código Único registrado</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Validación rigurosa de fechas y campos obligatorios</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Seguimiento de estado de aprobación y resoluciones</span>
              </div>
            </div>
          </div>

          <button 
            type="button"
            className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-950 text-white font-medium text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs group-hover:bg-blue-800"
          >
            <span>Ingresar a Trámites</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Option 3: Administrator (Small option requested: "1 opcion pequeña que diga administrador que será don") */}
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-100 border border-slate-200 rounded-xl mb-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-800 text-amber-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">
              Acceso a Supervisión de la Comisión
            </div>
            <div className="text-xs text-slate-500">
              Supervisión, edición de parámetros, numeración de resoluciones y emisión de informes
            </div>
          </div>
        </div>

        <button
          onClick={() => onSelectOption('admin')}
          className="text-xs font-semibold px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg shadow-2xs hover:shadow-xs transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-blue-700" />
          <span>Administrador</span>
        </button>
      </div>

      {/* Process overview grid (The 4 PPP events) */}
      <div className="max-w-5xl mx-auto border-t border-slate-200 pt-10">
        <div className="text-center mb-8">
          <h3 className="text-lg font-bold text-slate-900">
            Los 4 Procesos de Prácticas Pre Profesionales Reglamentados
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Conforme a la Resolución Decanal N° 0932-2022-UTEA-FI y Resolución Rectoral N° 104-2025-UTEA-R
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="text-xs font-bold text-blue-900 mb-1">01. Designación</div>
            <div className="font-semibold text-sm text-slate-900 mb-1">Designación de Asesor</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Solicitud con FUT, Expediente y propuesta de docente asesor para supervisión.
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="text-xs font-bold text-blue-900 mb-1">02. Reasignación</div>
            <div className="font-semibold text-sm text-slate-900 mb-1">Reasignación de Asesor</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Cambio justificado de asesor con resolución previa y asignación de nuevo docente.
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="text-xs font-bold text-blue-900 mb-1">03. Sustentación</div>
            <div className="font-semibold text-sm text-slate-900 mb-1">Sustentación de PPP</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Designación de Jurado Evaluador (Presidente y Miembro), fecha y hora virtual.
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-xl">
            <div className="text-xs font-bold text-blue-900 mb-1">04. Aprobación</div>
            <div className="font-semibold text-sm text-slate-900 mb-1">Aprobación de PPP</div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Emisión de informe final unánime y Resolución Sub Directoral de 4 meses (480 horas).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
