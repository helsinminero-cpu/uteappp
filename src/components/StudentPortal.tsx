import React, { useState } from 'react';
import { 
  Building2, 
  Calendar, 
  Mail, 
  User, 
  Hash, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Send,
  Eye, 
  ArrowRight,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { Student, TramiteRecord, TramiteType } from '../types';
import { 
  formatDateSpanish, 
  toTitleCase, 
  toUpperCase, 
  filterNumeric,
  generateDocuments
} from '../utils/formatters';

interface StudentPortalProps {
  activeStudent: Student | null;
  students: Student[];
  tramites: TramiteRecord[];
  onLoginWithCode: (code: string) => boolean;
  onSaveTramite: (tramite: TramiteRecord) => void;
  onViewDocument: (student: Student, record: TramiteRecord) => void;
  onGoToRegister: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  activeStudent,
  students,
  tramites,
  onLoginWithCode,
  onSaveTramite,
  onViewDocument,
  onGoToRegister,
}) => {
  const [codeInput, setCodeInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TramiteType>('designacion');
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form states for each tramite type
  // 1. Designacion
  const [desFutNum, setDesFutNum] = useState('');
  const [desFutDate, setDesFutDate] = useState('');
  const [desExpNum, setDesExpNum] = useState('');
  const [desInfNum, setDesInfNum] = useState('');
  const [desInfDate, setDesInfDate] = useState('');
  const [desAdvisor, setDesAdvisor] = useState('');

  // 2. Reasignacion
  const [reaCurrentResol, setReaCurrentResol] = useState('');
  const [reaCurrentResolDate, setReaCurrentResolDate] = useState('');
  const [reaCurrentAdvisor, setReaCurrentAdvisor] = useState('');
  const [reaFutNum, setReaFutNum] = useState('');
  const [reaFutDate, setReaFutDate] = useState('');
  const [reaExpNum, setReaExpNum] = useState('');
  const [reaInfNum, setReaInfNum] = useState('');
  const [reaInfDate, setReaInfDate] = useState('');
  const [reaNewAdvisor, setReaNewAdvisor] = useState('');

  // 3. Sustentacion
  const [susAdvisorName, setSusAdvisorName] = useState('');
  const [susFutNum, setSusFutNum] = useState('');
  const [susFutDate, setSusFutDate] = useState('');
  const [susExpNum, setSusExpNum] = useState('');
  const [susAdvisorApprovalRepNum, setSusAdvisorApprovalRepNum] = useState('');
  const [susAdvisorApprovalRepDate, setSusAdvisorApprovalRepDate] = useState('');
  const [susJuryDesignationNum, setSusJuryDesignationNum] = useState('');
  const [susJuryDesignationDate, setSusJuryDesignationDate] = useState('');

  // 4. Aprobacion
  const [aprFutNum, setAprFutNum] = useState('');
  const [aprFutDate, setAprFutDate] = useState('');
  const [aprExpNum, setAprExpNum] = useState('');
  const [aprAdvisorDesignationRepNum, setAprAdvisorDesignationRepNum] = useState('');
  const [aprAdvisorDesignationRepDate, setAprAdvisorDesignationRepDate] = useState('');
  const [aprAdvisorReviewerResol, setAprAdvisorReviewerResol] = useState('');
  const [aprAdvisorReviewerResolDate, setAprAdvisorReviewerResolDate] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const cleaned = toUpperCase(codeInput.trim());
    if (!cleaned) {
      setLoginError('Ingresa tu Código de Alumno registrado.');
      return;
    }
    if (!/[A-Z]$/.test(cleaned)) {
      setLoginError('El Código del Alumno siempre finaliza con una letra en mayúscula (Ejemplo: 202300220F).');
      return;
    }
    const success = onLoginWithCode(cleaned);
    if (!success) {
      setLoginError(`No se encontró ningún alumno registrado con el código "${cleaned}". Por favor regístrate primero en el formulario de inscripción.`);
    }
  };

  if (!activeStudent) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl p-7 sm:p-9 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-blue-900 text-amber-400 flex items-center justify-center mb-5">
            <Hash className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Ingreso al Módulo de Trámites
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Solo podrás ingresar a los trámites con el código único con el que te registraste (Código del Alumno).
          </p>

          {loginError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>{loginError}</div>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Código del Alumno
              </label>
              <input
                type="text"
                required
                value={codeInput}
                onChange={(e) => setCodeInput(toUpperCase(e.target.value))}
                placeholder="Ej: 202300220F"
                className="w-full px-4 py-3 text-base font-mono uppercase bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-all"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                El código siempre se escribe en <strong>mayúsculas</strong> y lleva una <strong>letra al final</strong> (Ejemplo: <span className="font-mono font-bold text-blue-900">202300220F</span>).
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-900 hover:bg-blue-950 text-white font-medium rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <span>Acceder a Mis Trámites</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">¿Aún no te has registrado?</span>
            <button
              onClick={onGoToRegister}
              className="font-semibold text-blue-900 hover:text-blue-950 hover:underline"
            >
              Registrarme ahora
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active student is logged in
  const studentTramites = tramites.filter(t => t.studentId === activeStudent.id || t.studentCode === activeStudent.studentCode);
  const activeRecord = studentTramites.find(t => t.type === activeTab);

  const handleSaveDesignacion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desFutNum || !desFutDate || !desExpNum) {
      alert('Por favor completa todos los campos obligatorios (*).');
      return;
    }

    const updatedRecord: TramiteRecord = {
      id: activeRecord ? activeRecord.id : `tram-${Date.now()}`,
      studentId: activeStudent.id,
      studentCode: activeStudent.studentCode,
      type: 'designacion',
      submittedAt: activeRecord ? activeRecord.submittedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: activeRecord ? activeRecord.status : 'pendiente',
      designacion: {
        futNumber: filterNumeric(desFutNum),
        futDate: desFutDate,
        expedienteNumber: filterNumeric(desExpNum),
        informeNumber: filterNumeric(desInfNum) || undefined,
        informeDate: desInfDate || undefined,
        advisorName: desAdvisor.trim() ? toTitleCase(desAdvisor.trim()) : undefined,
        adminResolutionNumber: activeRecord?.designacion?.adminResolutionNumber,
        adminResolutionDate: activeRecord?.designacion?.adminResolutionDate,
      },
    };

    onSaveTramite(updatedRecord);
    setSuccessNotice('Trámite de Designación de Asesor enviado correctamente para revisión de la Comisión.');
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  const handleSaveReasignacion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reaCurrentResol || !reaCurrentResolDate || !reaCurrentAdvisor || !reaFutNum || !reaFutDate || !reaExpNum) {
      alert('Por favor completa todos los campos obligatorios (*).');
      return;
    }

    const updatedRecord: TramiteRecord = {
      id: activeRecord ? activeRecord.id : `tram-${Date.now()}`,
      studentId: activeStudent.id,
      studentCode: activeStudent.studentCode,
      type: 'reasignacion',
      submittedAt: activeRecord ? activeRecord.submittedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: activeRecord ? activeRecord.status : 'pendiente',
      reasignacion: {
        currentResolution: reaCurrentResol.trim(),
        currentResolutionDate: reaCurrentResolDate,
        currentAdvisorName: toTitleCase(reaCurrentAdvisor.trim()),
        futNumber: filterNumeric(reaFutNum),
        futDate: reaFutDate,
        expedienteNumber: filterNumeric(reaExpNum),
        informeNumber: filterNumeric(reaInfNum) || undefined,
        informeDate: reaInfDate || undefined,
        newAdvisorName: reaNewAdvisor.trim() ? toTitleCase(reaNewAdvisor.trim()) : undefined,
        adminResolutionNumber: activeRecord?.reasignacion?.adminResolutionNumber,
        adminResolutionDate: activeRecord?.reasignacion?.adminResolutionDate,
      },
    };

    onSaveTramite(updatedRecord);
    setSuccessNotice('Trámite de Reasignación de Asesor registrado exitosamente.');
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  const handleSaveSustentacion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!susAdvisorName || !susFutNum || !susFutDate || !susExpNum || !susAdvisorApprovalRepNum || !susAdvisorApprovalRepDate) {
      alert('Por favor completa todos los campos obligatorios (*).');
      return;
    }

    const updatedRecord: TramiteRecord = {
      id: activeRecord ? activeRecord.id : `tram-${Date.now()}`,
      studentId: activeStudent.id,
      studentCode: activeStudent.studentCode,
      type: 'sustentacion',
      submittedAt: activeRecord ? activeRecord.submittedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: activeRecord ? activeRecord.status : 'pendiente',
      sustentacion: {
        advisorName: toTitleCase(susAdvisorName.trim()),
        futNumber: filterNumeric(susFutNum),
        futDate: susFutDate,
        expedienteNumber: filterNumeric(susExpNum),
        advisorApprovalReportNumber: filterNumeric(susAdvisorApprovalRepNum),
        advisorApprovalReportDate: susAdvisorApprovalRepDate,
        juryDesignationReportNumber: filterNumeric(susJuryDesignationNum) || undefined,
        juryDesignationReportDate: susJuryDesignationDate || undefined,
        presidentName: activeRecord?.sustentacion?.presidentName,
        memberName: activeRecord?.sustentacion?.memberName,
        defenseDate: activeRecord?.sustentacion?.defenseDate,
        defenseTime: activeRecord?.sustentacion?.defenseTime,
        adminResolutionNumber: activeRecord?.sustentacion?.adminResolutionNumber,
        adminResolutionDate: activeRecord?.sustentacion?.adminResolutionDate,
      },
    };

    onSaveTramite(updatedRecord);
    setSuccessNotice('Trámite de Sustentación de PPP guardado para designación de jurado.');
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  const handleSaveAprobacion = (e: React.FormEvent) => {
    e.preventDefault();
    const finalFut = aprFutNum || activeRecord?.aprobacion?.futNumber || '';
    const finalFutDate = aprFutDate || activeRecord?.aprobacion?.futDate || '';
    const finalExp = aprExpNum || activeRecord?.aprobacion?.expedienteNumber || '';
    const finalAdvisorInfNum = aprAdvisorDesignationRepNum || activeRecord?.aprobacion?.advisorDesignationReportNumber || '';
    const finalAdvisorInfDate = aprAdvisorDesignationRepDate || activeRecord?.aprobacion?.advisorDesignationReportDate || '';
    const finalAdvisorResol = aprAdvisorReviewerResol || activeRecord?.aprobacion?.advisorReviewerResolution || '';
    const finalAdvisorResolDate = aprAdvisorReviewerResolDate || activeRecord?.aprobacion?.advisorReviewerResolutionDate || '';

    if (!finalFut || !finalFutDate || !finalExp || !finalAdvisorInfNum || !finalAdvisorInfDate || !finalAdvisorResol || !finalAdvisorResolDate) {
      alert('Por favor completa todos los campos obligatorios (*), incluyendo el Número de FUT y Expediente independientes de Aprobación.');
      return;
    }

    const updatedRecord: TramiteRecord = {
      id: activeRecord ? activeRecord.id : `tram-${Date.now()}`,
      studentId: activeStudent.id,
      studentCode: activeStudent.studentCode,
      type: 'aprobacion',
      submittedAt: activeRecord ? activeRecord.submittedAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: activeRecord ? activeRecord.status : 'pendiente',
      aprobacion: {
        futNumber: filterNumeric(finalFut),
        futDate: finalFutDate,
        expedienteNumber: filterNumeric(finalExp),
        advisorDesignationReportNumber: filterNumeric(finalAdvisorInfNum),
        advisorDesignationReportDate: finalAdvisorInfDate,
        advisorReviewerResolution: finalAdvisorResol.trim(),
        advisorReviewerResolutionDate: finalAdvisorResolDate,
        juryApprovalReportNumber: activeRecord?.aprobacion?.juryApprovalReportNumber,
        juryApprovalReportDate: activeRecord?.aprobacion?.juryApprovalReportDate,
        adminResolutionNumber: activeRecord?.aprobacion?.adminResolutionNumber,
        adminResolutionDate: activeRecord?.aprobacion?.adminResolutionDate,
        advisorName: activeRecord?.aprobacion?.advisorName,
        futSustentacionNumber: activeRecord?.aprobacion?.futSustentacionNumber,
        futSustentacionDate: activeRecord?.aprobacion?.futSustentacionDate,
        resolutionSustentacionNumber: activeRecord?.aprobacion?.resolutionSustentacionNumber,
        resolutionSustentacionDate: activeRecord?.aprobacion?.resolutionSustentacionDate,
        juryDesignationReportNumber: activeRecord?.aprobacion?.juryDesignationReportNumber,
        juryDesignationReportDate: activeRecord?.aprobacion?.juryDesignationReportDate,
        presidentName: activeRecord?.aprobacion?.presidentName,
        memberName: activeRecord?.aprobacion?.memberName,
      },
    };

    onSaveTramite(updatedRecord);
    setSuccessNotice('Trámite de Aprobación de PPP registrado exitosamente con su propio FUT y Expediente.');
    setTimeout(() => setSuccessNotice(null), 5000);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      {/* Student Profile Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide">
              Alumno Registrado
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {activeStudent.fullName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg">
              CÓD: {activeStudent.studentCode}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Organización / Empresa:</span>
            <span className="font-semibold text-slate-800 uppercase">{activeStudent.organization}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Fecha Inicio Prácticas:</span>
            <span className="font-semibold text-slate-800">{formatDateSpanish(activeStudent.startDate)}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Correo para Formatos:</span>
            <span className="font-semibold text-slate-800">{activeStudent.email}</span>
          </div>
        </div>
      </div>

      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* The 4 Trámites Navigation Tabs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          <button
            onClick={() => setActiveTab('designacion')}
            className={`py-3 px-3 text-xs font-semibold rounded-xl transition-all text-center flex flex-col items-center justify-center gap-1 ${
              activeTab === 'designacion'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>1. Designación</span>
            <span className="text-[10px] font-normal opacity-85">Asesor de PPP</span>
          </button>

          <button
            onClick={() => setActiveTab('reasignacion')}
            className={`py-3 px-3 text-xs font-semibold rounded-xl transition-all text-center flex flex-col items-center justify-center gap-1 ${
              activeTab === 'reasignacion'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>2. Reasignación</span>
            <span className="text-[10px] font-normal opacity-85">Cambio de Asesor</span>
          </button>

          <button
            onClick={() => setActiveTab('sustentacion')}
            className={`py-3 px-3 text-xs font-semibold rounded-xl transition-all text-center flex flex-col items-center justify-center gap-1 ${
              activeTab === 'sustentacion'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>3. Sustentación</span>
            <span className="text-[10px] font-normal opacity-85">Jurado Evaluador</span>
          </button>

          <button
            onClick={() => setActiveTab('aprobacion')}
            className={`py-3 px-3 text-xs font-semibold rounded-xl transition-all text-center flex flex-col items-center justify-center gap-1 ${
              activeTab === 'aprobacion'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>4. Aprobación</span>
            <span className="text-[10px] font-normal opacity-85">Resolución Final (480h)</span>
          </button>
        </div>
      </div>

      {/* Active Record Status Banner if already exists */}
      {activeRecord && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-slate-500">Estado del Trámite:</span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                activeRecord.status === 'enviado'
                  ? 'bg-emerald-100 text-emerald-800'
                  : activeRecord.status === 'documentos_generados'
                  ? 'bg-blue-100 text-blue-800'
                  : activeRecord.status === 'revisado'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {activeRecord.status === 'enviado' && 'Aprobado y Generado'}
                {activeRecord.status === 'documentos_generados' && 'Documentos Generados'}
                {activeRecord.status === 'revisado' && 'Revisado por Comisión'}
                {activeRecord.status === 'pendiente' && 'Pendiente de Revisión'}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Registrado el {formatDateSpanish(activeRecord.submittedAt.split('T')[0])}
            </div>
          </div>

          <button
            onClick={() => onViewDocument(activeStudent, activeRecord)}
            className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Ver Documentos Oficiales (Informe y Resolución)</span>
          </button>
        </div>
      )}

      {/* The 4 Process Forms */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        {/* ===================== 1. DESIGNACION ===================== */}
        {activeTab === 'designacion' && (
          <div>
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                1. Trámite de Designación de Asesor de Prácticas Pre Profesionales
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Ingresa los datos para la designación oficial de tu asesor docente de prácticas pre profesionales.
              </p>
            </div>

            <form onSubmit={handleSaveDesignacion} className="space-y-6">
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs font-medium text-blue-900">
                Requisitos Obligatorios marcados con asterisco (*). Los campos numéricos solo aceptan dígitos.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Obligatorio: Numero de FUT */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Número de FUT Solicitud de Asesor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={desFutNum || activeRecord?.designacion?.futNumber || ''}
                    onChange={(e) => setDesFutNum(filterNumeric(e.target.value))}
                    placeholder="Solo números (Ej: 48291)"
                    className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Donde diga número solo se pueden colocar números.</p>
                </div>

                {/* Obligatorio: Fecha de FUT */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Fecha de FUT de Solicitud de Asesor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={desFutDate || activeRecord?.designacion?.futDate || ''}
                    onChange={(e) => setDesFutDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                  {(desFutDate || activeRecord?.designacion?.futDate) && (
                    <p className="text-xs text-blue-900 mt-1">
                      Formato: {formatDateSpanish(desFutDate || activeRecord?.designacion?.futDate)}
                    </p>
                  )}
                </div>

                {/* Obligatorio: Numero de Expediente */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Número de Expediente FUT de Asesor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={desExpNum || activeRecord?.designacion?.expedienteNumber || ''}
                    onChange={(e) => setDesExpNum(filterNumeric(e.target.value))}
                    placeholder="Solo números (Ej: 19042)"
                    className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>
              </div>

              {/* Opcionales */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4">
                  Datos Opcionales
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Informe de designación de asesor (Solo números)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={desInfNum || activeRecord?.designacion?.informeNumber || ''}
                      onChange={(e) => setDesInfNum(filterNumeric(e.target.value))}
                      placeholder="Solo números (Ej: 045)"
                      className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Solo se pueden colocar números.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Fecha de Informe de designación
                    </label>
                    <input
                      type="date"
                      value={desInfDate || activeRecord?.designacion?.informeDate || ''}
                      onChange={(e) => setDesInfDate(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Nombre Completo del Asesor Propuesto
                    </label>
                    <input
                      type="text"
                      value={desAdvisor || activeRecord?.designacion?.advisorName || ''}
                      onChange={(e) => setDesAdvisor(e.target.value)}
                      onBlur={() => setDesAdvisor(toTitleCase(desAdvisor))}
                      placeholder="Ej: Carlos Mendoza Estrada"
                      className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  className="py-2.5 px-6 bg-blue-900 hover:bg-blue-950 text-white font-medium text-sm rounded-xl transition-colors shadow-xs"
                >
                  {activeRecord ? 'Guardar Cambios del Trámite' : 'Registrar Solicitud de Designación'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===================== 2. REASIGNACION ===================== */}
        {activeTab === 'reasignacion' && (
          <div>
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                2. Trámite de Reasignación de Asesor de Práctica Pre Profesionales
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Solicitud de cambio de asesor docente conforme al Art. 25 del Reglamento de Prácticas.
              </p>
            </div>

            <form onSubmit={handleSaveReasignacion} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Resolución de Designación de Asesor Actual <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={reaCurrentResol || activeRecord?.reasignacion?.currentResolution || ''}
                    onChange={(e) => setReaCurrentResol(e.target.value)}
                    placeholder="Ej: 412-2025-UTEA-FC-FI-EPIC"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Fecha Resolución de Designación Asesor Actual <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={reaCurrentResolDate || activeRecord?.reasignacion?.currentResolutionDate || ''}
                    onChange={(e) => setReaCurrentResolDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Nombre de Asesor Actual <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={reaCurrentAdvisor || activeRecord?.reasignacion?.currentAdvisorName || ''}
                    onChange={(e) => setReaCurrentAdvisor(e.target.value)}
                    onBlur={() => setReaCurrentAdvisor(toTitleCase(reaCurrentAdvisor))}
                    placeholder="Ej: Jesseliz Beatriz Ortiz Cruz"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Número de FUT de Reasignación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={reaFutNum || activeRecord?.reasignacion?.futNumber || ''}
                    onChange={(e) => setReaFutNum(filterNumeric(e.target.value))}
                    placeholder="Solo números (Ej: 51204)"
                    className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Fecha de FUT de Reasignación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={reaFutDate || activeRecord?.reasignacion?.futDate || ''}
                    onChange={(e) => setReaFutDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Número de Expediente de Reasignación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={reaExpNum || activeRecord?.reasignacion?.expedienteNumber || ''}
                    onChange={(e) => setReaExpNum(filterNumeric(e.target.value))}
                    placeholder="Solo números (Ej: 20185)"
                    className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>
              </div>

              {/* Opcionales */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4">
                  Datos Opcionales
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Informe de Reasignación (Solo números)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={reaInfNum || activeRecord?.reasignacion?.informeNumber || ''}
                      onChange={(e) => setReaInfNum(filterNumeric(e.target.value))}
                      placeholder="Solo números (Ej: 052)"
                      className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Solo se pueden colocar números.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Fecha de Informe de Reasignación
                    </label>
                    <input
                      type="date"
                      value={reaInfDate || activeRecord?.reasignacion?.informeDate || ''}
                      onChange={(e) => setReaInfDate(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Nombre Completo del Nuevo Asesor
                    </label>
                    <input
                      type="text"
                      value={reaNewAdvisor || activeRecord?.reasignacion?.newAdvisorName || ''}
                      onChange={(e) => setReaNewAdvisor(e.target.value)}
                      onBlur={() => setReaNewAdvisor(toTitleCase(reaNewAdvisor))}
                      placeholder="Ej: Luis Fernando Palomino Rivas"
                      className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  className="py-2.5 px-6 bg-blue-900 hover:bg-blue-950 text-white font-medium text-sm rounded-xl transition-colors shadow-xs"
                >
                  {activeRecord ? 'Guardar Cambios del Trámite' : 'Registrar Solicitud de Reasignación'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===================== 3. SUSTENTACION ===================== */}
        {activeTab === 'sustentacion' && (
          <div>
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                3. Trámite de Sustentación de Prácticas Pre Profesionales
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Solicitud de designación de Jurado Evaluador y programación de fecha y hora para la sustentación.
              </p>
            </div>

            <form onSubmit={handleSaveSustentacion} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Nombre Completo de su Asesor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={susAdvisorName || activeRecord?.sustentacion?.advisorName || ''}
                    onChange={(e) => setSusAdvisorName(e.target.value)}
                    onBlur={() => setSusAdvisorName(toTitleCase(susAdvisorName))}
                    placeholder="Ej: Herbert Quispe Castillo"
                    className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Número de FUT de Sustentación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={susFutNum || activeRecord?.sustentacion?.futNumber || ''}
                    onChange={(e) => setSusFutNum(filterNumeric(e.target.value))}
                    placeholder="Solo números (Ej: 62110)"
                    className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Fecha de FUT de Sustentación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={susFutDate || activeRecord?.sustentacion?.futDate || ''}
                    onChange={(e) => setSusFutDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Número de Expediente de Sustentación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={susExpNum || activeRecord?.sustentacion?.expedienteNumber || ''}
                    onChange={(e) => setSusExpNum(filterNumeric(e.target.value))}
                    placeholder="Solo números (Ej: 25490)"
                    className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Informe de Aprobación de PPP del Asesor (Solo números) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={susAdvisorApprovalRepNum || activeRecord?.sustentacion?.advisorApprovalReportNumber || ''}
                    onChange={(e) => setSusAdvisorApprovalRepNum(filterNumeric(e.target.value))}
                    placeholder="Solo números (Ej: 018)"
                    className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Solo se pueden colocar números.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Fecha de Informe de Aprobación del Asesor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={susAdvisorApprovalRepDate || activeRecord?.sustentacion?.advisorApprovalReportDate || ''}
                    onChange={(e) => setSusAdvisorApprovalRepDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                </div>
              </div>

              {/* Opcionales */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4">
                  Datos Opcionales
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Informe de Designación de Jurado Revisor (Solo números)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={susJuryDesignationNum || activeRecord?.sustentacion?.juryDesignationReportNumber || ''}
                      onChange={(e) => setSusJuryDesignationNum(filterNumeric(e.target.value))}
                      placeholder="Solo números (Ej: 088)"
                      className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Solo se pueden colocar números.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Fecha de Informe de Designación de Jurado
                    </label>
                    <input
                      type="date"
                      value={susJuryDesignationDate || activeRecord?.sustentacion?.juryDesignationReportDate || ''}
                      onChange={(e) => setSusJuryDesignationDate(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  className="py-2.5 px-6 bg-blue-900 hover:bg-blue-950 text-white font-medium text-sm rounded-xl transition-colors shadow-xs"
                >
                  {activeRecord ? 'Guardar Cambios del Trámite' : 'Registrar Solicitud de Sustentación'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===================== 4. APROBACION ===================== */}
        {activeTab === 'aprobacion' && (
          <div>
            <div className="border-b border-slate-100 pb-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    4. Trámite de Aprobación de Prácticas Preprofesionales
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Conclusión final de prácticas pre profesionales extracurriculares (04 meses / 480 horas).
                  </p>
                </div>
                {/* Botón de auto-completar desde trámites anteriores si existen */}
                {(studentTramites.some(t => t.type === 'designacion' || t.type === 'sustentacion')) && (
                  <button
                    type="button"
                    onClick={() => {
                      const des = studentTramites.find(t => t.type === 'designacion')?.designacion;
                      if (des) {
                        if (des.informeNumber) setAprAdvisorDesignationRepNum(filterNumeric(des.informeNumber));
                        if (des.informeDate) setAprAdvisorDesignationRepDate(des.informeDate);
                        if (des.adminResolutionNumber) setAprAdvisorReviewerResol(des.adminResolutionNumber);
                        if (des.adminResolutionDate) setAprAdvisorReviewerResolDate(des.adminResolutionDate);
                        alert('¡Datos de asesor y resolución previa cargados exitosamente! Por favor ingresa el número de FUT y Expediente propios de esta solicitud de Aprobación.');
                      } else {
                        alert('No se encontraron datos de trámites previos para autocompletar.');
                      }
                    }}
                    className="py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    Auto-completar antecedentes de Asesor
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveAprobacion} className="space-y-6">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Atención:</strong> El Número de FUT y el Número de Expediente son <strong>independientes</strong> para cada trámite. Aquí debes ingresar el FUT y Expediente específicos de la solicitud de Aprobación Final.
                </span>
              </div>

              {/* Obligatorios Independientes de Aprobación */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Número de FUT de Aprobación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={aprFutNum || activeRecord?.aprobacion?.futNumber || ''}
                    onChange={(e) => setAprFutNum(filterNumeric(e.target.value))}
                    placeholder="Solo números (Ej: 71045)"
                    className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">FUT independiente de este trámite.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Fecha de FUT de Aprobación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={aprFutDate || activeRecord?.aprobacion?.futDate || ''}
                    onChange={(e) => setAprFutDate(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                  {(aprFutDate || activeRecord?.aprobacion?.futDate) && (
                    <p className="text-xs text-blue-900 mt-1">
                      Formato: {formatDateSpanish(aprFutDate || activeRecord?.aprobacion?.futDate)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                    Número de Expediente de Aprobación <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={aprExpNum || activeRecord?.aprobacion?.expedienteNumber || ''}
                    onChange={(e) => setAprExpNum(filterNumeric(e.target.value))}
                    placeholder="Solo números (Ej: 31280)"
                    className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Expediente independiente de este trámite.</p>
                </div>
              </div>

              {/* Antecedentes de Designación */}
              <div className="pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4">
                  Antecedentes de Designación de Asesor Revisor
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                      Número de Informe de Designación de Asesor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={aprAdvisorDesignationRepNum || activeRecord?.aprobacion?.advisorDesignationReportNumber || ''}
                      onChange={(e) => setAprAdvisorDesignationRepNum(filterNumeric(e.target.value))}
                      placeholder="Solo números (Ej: 024)"
                      className="w-full px-4 py-2.5 text-sm font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Solo se pueden colocar números.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                      Fecha de Informe de Asignación de Asesor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={aprAdvisorDesignationRepDate || activeRecord?.aprobacion?.advisorDesignationReportDate || ''}
                      onChange={(e) => setAprAdvisorDesignationRepDate(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                      Resolución de Designación de Asesor Revisor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={aprAdvisorReviewerResol || activeRecord?.aprobacion?.advisorReviewerResolution || ''}
                      onChange={(e) => setAprAdvisorReviewerResol(e.target.value)}
                      placeholder="Ej: 340 o 583"
                      className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                      Fecha Resolución Designación Asesor Revisor <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={aprAdvisorReviewerResolDate || activeRecord?.aprobacion?.advisorReviewerResolutionDate || ''}
                      onChange={(e) => setAprAdvisorReviewerResolDate(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  className="py-2.5 px-6 bg-blue-900 hover:bg-blue-950 text-white font-medium text-sm rounded-xl transition-colors shadow-xs"
                >
                  {activeRecord ? 'Guardar Cambios del Trámite' : 'Registrar Solicitud de Aprobación Final'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
