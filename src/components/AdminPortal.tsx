import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Search, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Eye, 
  Edit3, 
  Printer, 
  Download, 
  Building2, 
  User, 
  Calendar, 
  Save,
  X,
  AlertCircle,
  FileCheck2,
  RefreshCw,
  Send,
  Layers,
  CheckCircle,
  FileCode,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Award,
  Upload,
  Database,
  Cloud
} from 'lucide-react';
import { getStoredDriveConfig, DriveBackupConfig } from '../utils/driveStorage';
import { Student, TramiteRecord, TramiteType } from '../types';
import { UTEA_LOGO_DATA_URL } from '../data/uteaLogoData';
import { 
  formatDateSpanish, 
  toTitleCase, 
  toUpperCase, 
  filterNumeric, 
  add4MonthsFormatted,
  generateDocuments 
} from '../utils/formatters';
import { TemplateManagerModal } from './TemplateManagerModal';

interface AdminPortalProps {
  students: Student[];
  tramites: TramiteRecord[];
  isAdminLoggedIn: boolean;
  onLoginSuccess: () => void;
  onLogoutAdmin: () => void;
  onUpdateRecord: (record: TramiteRecord) => void;
  onUpdateStudent: (student: Student) => void;
  onOpenDocumentViewer: (student: Student, record: TramiteRecord) => void;
  onOpenBackupModal?: () => void;
}

const ADMIN_SECRET = 'AlexPalizaMorales2026UTEA';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  students,
  tramites,
  isAdminLoggedIn,
  onLoginSuccess,
  onLogoutAdmin,
  onUpdateRecord,
  onUpdateStudent,
  onOpenDocumentViewer,
  onOpenBackupModal,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Google Drive backup status state
  const [driveConfig, setDriveConfig] = useState<DriveBackupConfig>(() => getStoredDriveConfig());
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);

  useEffect(() => {
    const handleSync = (e: any) => {
      setDriveConfig(getStoredDriveConfig());
      setIsDriveSyncing(e.detail?.status === 'syncing');
    };
    const handleConfig = () => {
      setDriveConfig(getStoredDriveConfig());
    };
    window.addEventListener('utea_drive_sync_event', handleSync);
    window.addEventListener('utea_drive_config_updated', handleConfig);
    return () => {
      window.removeEventListener('utea_drive_sync_event', handleSync);
      window.removeEventListener('utea_drive_config_updated', handleConfig);
    };
  }, []);

  // Filters
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'todos' | TramiteType | 'repositorio'>('todos');
  const [studentCodeQuery, setStudentCodeQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendiente' | 'revisado' | 'documentos_generados' | 'enviado'>('todos');

  // Selected Record for Complete Detail & Edit View
  const [activeDetailRecord, setActiveDetailRecord] = useState<TramiteRecord | null>(null);
  const [activeDetailStudent, setActiveDetailStudent] = useState<Student | null>(null);

  // Form edit states for student registration in modal
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentCode, setEditStudentCode] = useState('');
  const [editStudentOrg, setEditStudentOrg] = useState('');
  const [editStudentDate, setEditStudentDate] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');

  // Form edit states for trámite fields
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === ADMIN_SECRET) {
      setLoginError(false);
      onLoginSuccess();
    } else {
      setLoginError(true);
    }
  };

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Dashboard Summary Metrics
  const summaryMetrics = useMemo(() => {
    const total = tramites.length;
    const designacion = tramites.filter((t) => t.type === 'designacion').length;
    const reasignacion = tramites.filter((t) => t.type === 'reasignacion').length;
    const sustentacion = tramites.filter((t) => t.type === 'sustentacion').length;
    const aprobacion = tramites.filter((t) => t.type === 'aprobacion').length;

    const pendientes = tramites.filter((t) => t.status === 'pendiente').length;
    const conDocumentos = tramites.filter((t) => t.status === 'documentos_generados').length;
    const enviados = tramites.filter((t) => t.status === 'enviado').length;

    return {
      total,
      designacion,
      reasignacion,
      sustentacion,
      aprobacion,
      pendientes,
      conDocumentos,
      enviados,
      totalStudents: students.length,
    };
  }, [tramites, students]);

  // Filtered List of Trámites
  const filteredTramites = useMemo(() => {
    return tramites.filter((record) => {
      const student = students.find((s) => s.id === record.studentId || s.studentCode === record.studentCode);
      if (!student) return false;

      // Filter by type
      if (selectedTypeFilter !== 'todos' && record.type !== selectedTypeFilter) {
        return false;
      }

      // Filter by status
      if (statusFilter !== 'todos' && record.status !== statusFilter) {
        return false;
      }

      // Filter by Student Code or Name
      if (studentCodeQuery.trim()) {
        const query = studentCodeQuery.trim().toUpperCase();
        const matchesCode = student.studentCode.toUpperCase().includes(query);
        const matchesName = student.fullName.toUpperCase().includes(query);
        if (!matchesCode && !matchesName) return false;
      }

      return true;
    });
  }, [tramites, students, selectedTypeFilter, statusFilter, studentCodeQuery]);

  // Open Full Detail & Supervision Modal
  const handleOpenDetailModal = (record: TramiteRecord) => {
    const student = students.find((s) => s.id === record.studentId || s.studentCode === record.studentCode);
    if (!student) return;

    setActiveDetailRecord(record);
    setActiveDetailStudent(student);

    // Populate student registration
    setEditStudentName(student.fullName);
    setEditStudentCode(student.studentCode);
    setEditStudentOrg(student.organization);
    setEditStudentDate(student.startDate);
    setEditStudentEmail(student.email);

    // Populate trámite fields
    if (record.type === 'designacion') {
      setFormData({
        futNumber: record.designacion?.futNumber || '',
        futDate: record.designacion?.futDate || '',
        expedienteNumber: record.designacion?.expedienteNumber || '',
        informeNumber: record.designacion?.informeNumber || '',
        informeDate: record.designacion?.informeDate || '',
        advisorName: record.designacion?.advisorName || '',
        adminResolutionNumber: record.designacion?.adminResolutionNumber || '',
        adminResolutionDate: record.designacion?.adminResolutionDate || '',
      });
    } else if (record.type === 'reasignacion') {
      setFormData({
        currentResolution: record.reasignacion?.currentResolution || '',
        currentResolutionDate: record.reasignacion?.currentResolutionDate || '',
        currentAdvisorName: record.reasignacion?.currentAdvisorName || '',
        futNumber: record.reasignacion?.futNumber || '',
        futDate: record.reasignacion?.futDate || '',
        expedienteNumber: record.reasignacion?.expedienteNumber || '',
        informeNumber: record.reasignacion?.informeNumber || '',
        informeDate: record.reasignacion?.informeDate || '',
        newAdvisorName: record.reasignacion?.newAdvisorName || '',
        adminResolutionNumber: record.reasignacion?.adminResolutionNumber || '',
        adminResolutionDate: record.reasignacion?.adminResolutionDate || '',
      });
    } else if (record.type === 'sustentacion') {
      setFormData({
        advisorName: record.sustentacion?.advisorName || '',
        futNumber: record.sustentacion?.futNumber || '',
        futDate: record.sustentacion?.futDate || '',
        expedienteNumber: record.sustentacion?.expedienteNumber || '',
        advisorApprovalReportNumber: record.sustentacion?.advisorApprovalReportNumber || '',
        advisorApprovalReportDate: record.sustentacion?.advisorApprovalReportDate || '',
        juryDesignationReportNumber: record.sustentacion?.juryDesignationReportNumber || '',
        juryDesignationReportDate: record.sustentacion?.juryDesignationReportDate || '',
        presidentName: record.sustentacion?.presidentName || '',
        memberName: record.sustentacion?.memberName || '',
        defenseDate: record.sustentacion?.defenseDate || '',
        defenseTime: record.sustentacion?.defenseTime || '',
        adminResolutionNumber: record.sustentacion?.adminResolutionNumber || '',
        adminResolutionDate: record.sustentacion?.adminResolutionDate || '',
      });
    } else if (record.type === 'aprobacion') {
      setFormData({
        futNumber: record.aprobacion?.futNumber || '',
        futDate: record.aprobacion?.futDate || '',
        expedienteNumber: record.aprobacion?.expedienteNumber || '',
        advisorDesignationReportNumber: record.aprobacion?.advisorDesignationReportNumber || '',
        advisorDesignationReportDate: record.aprobacion?.advisorDesignationReportDate || '',
        advisorReviewerResolution: record.aprobacion?.advisorReviewerResolution || '',
        advisorReviewerResolutionDate: record.aprobacion?.advisorReviewerResolutionDate || '',
        juryApprovalReportNumber: record.aprobacion?.juryApprovalReportNumber || '',
        juryApprovalReportDate: record.aprobacion?.juryApprovalReportDate || '',
        adminResolutionNumber: record.aprobacion?.adminResolutionNumber || '',
        adminResolutionDate: record.aprobacion?.adminResolutionDate || '',
        advisorName: record.aprobacion?.advisorName || '',
        futSustentacionNumber: record.aprobacion?.futSustentacionNumber || '',
        futSustentacionDate: record.aprobacion?.futSustentacionDate || '',
        resolutionSustentacionNumber: record.aprobacion?.resolutionSustentacionNumber || '',
        resolutionSustentacionDate: record.aprobacion?.resolutionSustentacionDate || '',
        juryDesignationReportNumber: record.aprobacion?.juryDesignationReportNumber || '',
        juryDesignationReportDate: record.aprobacion?.juryDesignationReportDate || '',
        presidentName: record.aprobacion?.presidentName || '',
        memberName: record.aprobacion?.memberName || '',
      });
    }
  };

  // Save changes from modal
  const handleSaveChanges = () => {
    if (!activeDetailRecord || !activeDetailStudent) return;

    const formattedCode = toUpperCase(editStudentCode.trim());
    if (!formattedCode) {
      alert('Por favor ingresa el Código del Alumno.');
      return;
    }
    if (!/[A-Z]$/.test(formattedCode)) {
      alert('El Código del Alumno siempre debe finalizar con una letra en mayúscula (Ejemplo: 202300220F).');
      return;
    }

    // 1. Update Student
    const updatedStudent: Student = {
      ...activeDetailStudent,
      fullName: toTitleCase(editStudentName.trim()),
      studentCode: formattedCode,
      organization: toUpperCase(editStudentOrg.trim()),
      startDate: editStudentDate,
      email: editStudentEmail.trim(),
    };
    onUpdateStudent(updatedStudent);
    setActiveDetailStudent(updatedStudent);

    // 2. Update Tramite
    let updatedRecord: TramiteRecord = {
      ...activeDetailRecord,
      studentCode: formattedCode,
      updatedAt: new Date().toISOString(),
      status: activeDetailRecord.status === 'pendiente' ? 'revisado' : activeDetailRecord.status,
    };

    if (activeDetailRecord.type === 'designacion') {
      updatedRecord.designacion = {
        futNumber: filterNumeric(formData.futNumber || ''),
        futDate: formData.futDate || '',
        expedienteNumber: filterNumeric(formData.expedienteNumber || ''),
        informeNumber: filterNumeric(formData.informeNumber || '') || undefined,
        informeDate: formData.informeDate || undefined,
        advisorName: formData.advisorName?.trim() ? toTitleCase(formData.advisorName.trim()) : undefined,
        adminResolutionNumber: filterNumeric(formData.adminResolutionNumber || ''),
        adminResolutionDate: formData.adminResolutionDate || undefined,
      };
    } else if (activeDetailRecord.type === 'reasignacion') {
      updatedRecord.reasignacion = {
        currentResolution: formData.currentResolution?.trim() || '',
        currentResolutionDate: formData.currentResolutionDate || '',
        currentAdvisorName: toTitleCase(formData.currentAdvisorName?.trim() || ''),
        futNumber: filterNumeric(formData.futNumber || ''),
        futDate: formData.futDate || '',
        expedienteNumber: filterNumeric(formData.expedienteNumber || ''),
        informeNumber: filterNumeric(formData.informeNumber || '') || undefined,
        informeDate: formData.informeDate || undefined,
        newAdvisorName: formData.newAdvisorName?.trim() ? toTitleCase(formData.newAdvisorName.trim()) : undefined,
        adminResolutionNumber: filterNumeric(formData.adminResolutionNumber || ''),
        adminResolutionDate: formData.adminResolutionDate || undefined,
      };
    } else if (activeDetailRecord.type === 'sustentacion') {
      updatedRecord.sustentacion = {
        advisorName: toTitleCase(formData.advisorName?.trim() || ''),
        futNumber: filterNumeric(formData.futNumber || ''),
        futDate: formData.futDate || '',
        expedienteNumber: filterNumeric(formData.expedienteNumber || ''),
        advisorApprovalReportNumber: filterNumeric(formData.advisorApprovalReportNumber || ''),
        advisorApprovalReportDate: formData.advisorApprovalReportDate || '',
        juryDesignationReportNumber: filterNumeric(formData.juryDesignationReportNumber || '') || undefined,
        juryDesignationReportDate: formData.juryDesignationReportDate || undefined,
        presidentName: formData.presidentName?.trim() ? toTitleCase(formData.presidentName.trim()) : undefined,
        memberName: formData.memberName?.trim() ? toTitleCase(formData.memberName.trim()) : undefined,
        defenseDate: formData.defenseDate || undefined,
        defenseTime: formData.defenseTime || undefined,
        adminResolutionNumber: filterNumeric(formData.adminResolutionNumber || ''),
        adminResolutionDate: formData.adminResolutionDate || undefined,
      };
    } else if (activeDetailRecord.type === 'aprobacion') {
      updatedRecord.aprobacion = {
        futNumber: filterNumeric(formData.futNumber || ''),
        futDate: formData.futDate || '',
        expedienteNumber: filterNumeric(formData.expedienteNumber || ''),
        advisorDesignationReportNumber: filterNumeric(formData.advisorDesignationReportNumber || ''),
        advisorDesignationReportDate: formData.advisorDesignationReportDate || '',
        advisorReviewerResolution: formData.advisorReviewerResolution?.trim() || '',
        advisorReviewerResolutionDate: formData.advisorReviewerResolutionDate || '',
        juryApprovalReportNumber: filterNumeric(formData.juryApprovalReportNumber || '') || undefined,
        juryApprovalReportDate: formData.juryApprovalReportDate || undefined,
        adminResolutionNumber: filterNumeric(formData.adminResolutionNumber || ''),
        adminResolutionDate: formData.adminResolutionDate || undefined,
        advisorName: formData.advisorName?.trim() ? toTitleCase(formData.advisorName.trim()) : undefined,
        futSustentacionNumber: filterNumeric(formData.futSustentacionNumber || ''),
        futSustentacionDate: formData.futSustentacionDate || undefined,
        resolutionSustentacionNumber: filterNumeric(formData.resolutionSustentacionNumber || ''),
        resolutionSustentacionDate: formData.resolutionSustentacionDate || undefined,
        juryDesignationReportNumber: filterNumeric(formData.juryDesignationReportNumber || '') || undefined,
        juryDesignationReportDate: formData.juryDesignationReportDate || undefined,
        presidentName: formData.presidentName?.trim() ? toTitleCase(formData.presidentName.trim()) : undefined,
        memberName: formData.memberName?.trim() ? toTitleCase(formData.memberName.trim()) : undefined,
      };
    }

    // La base de datos solo almacena los rellenables. Los documentos se generan dinámicamente.
    updatedRecord.status = 'documentos_generados';

    onUpdateRecord(updatedRecord);
    setActiveDetailRecord(updatedRecord);

    setSaveNotification('Parámetros guardados y documentos actualizados exitosamente.');
    setTimeout(() => setSaveNotification(null), 3500);
  };

  // If not authenticated as Admin
  if (!isAdminLoggedIn) {
    return (
      <div className="py-14 px-4 sm:px-6 lg:px-8 max-w-md mx-auto">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div className="w-14 h-16 flex items-center justify-center">
              <img 
                src={UTEA_LOGO_DATA_URL} 
                alt="Escudo Oficial UTEA" 
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-900 text-amber-400 flex items-center justify-center shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-1">
            Comisión de Prácticas Pre Profesionales · UTEA
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Portal Administrador
          </h2>
          <p className="text-xs text-slate-600 mb-6">
            Acceso exclusivo para supervisión y emisión oficial de informes y resoluciones.
          </p>

          {loginError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Contraseña incorrecta.</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Contraseña de Acceso Administrador
              </label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Ingresar contraseña de administrador"
                className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-950 text-white font-medium text-sm rounded-xl transition-colors shadow-xs"
            >
              Ingresar al Panel de Control
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Panel de Control Principal - Header & Authority */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-16 shrink-0 flex items-center justify-center">
            <img 
              src={UTEA_LOGO_DATA_URL} 
              alt="Escudo Oficial UTEA" 
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-blue-900 uppercase tracking-wide">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Panel de Control de Supervisión General · UTEA Filial Cusco</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              MG. ING. ALEX PALIZA MORALES
            </h1>
            <p className="text-xs text-slate-500">
              Presidente de la Comisión de Convenios y Prácticas Pre Profesionales · Escuela Profesional de Ingeniería Civil
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenBackupModal && (
            <button
              onClick={onOpenBackupModal}
              title={
                driveConfig.webhookUrl || driveConfig.folderId
                  ? `Google Drive Auto-Sync activo (${driveConfig.lastSyncTimestamp ? 'Último guardado: ' + new Date(driveConfig.lastSyncTimestamp).toLocaleTimeString() : 'Drive conectado'})`
                  : 'Copia de Seguridad y Configuración de Google Drive'
              }
              className={`py-2 px-3 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs border ${
                driveConfig.webhookUrl || driveConfig.folderId
                  ? 'bg-blue-50/90 hover:bg-blue-100 text-blue-900 border-blue-200'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              {driveConfig.webhookUrl || driveConfig.folderId ? (
                <Cloud className={`w-3.5 h-3.5 text-blue-700 ${isDriveSyncing ? 'animate-pulse' : ''}`} />
              ) : (
                <Database className="w-3.5 h-3.5 text-blue-700" />
              )}
              <span>
                {isDriveSyncing 
                  ? 'Guardando en Drive...' 
                  : (driveConfig.webhookUrl || driveConfig.folderId)
                  ? 'Drive Auto-Sync' 
                  : 'Copia de Seguridad'}
              </span>
              {(driveConfig.webhookUrl || driveConfig.folderId) && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Auto-Sync conectado"></span>
              )}
            </button>
          )}
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            title="Subir y gestionar plantillas oficiales en formato .docx"
            className="py-2 px-3 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-blue-700" />
            <span>Plantillas .docx</span>
          </button>
          <button
            onClick={onLogoutAdmin}
            className="py-2 px-4 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
          >
            Cerrar Sesión Admin
          </button>
        </div>
      </div>

      {/* 2. Resumen Ejecutivo de Todos los Trámites en Curso (KPI Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {/* Total Trámites */}
        <div 
          onClick={() => setSelectedTypeFilter('todos')}
          className={`p-4 bg-white border rounded-xl cursor-pointer transition-all shadow-2xs ${
            selectedTypeFilter === 'todos' ? 'border-blue-900 ring-2 ring-blue-900/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total en Curso
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {summaryMetrics.total}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {summaryMetrics.totalStudents} alumnos registrados
          </div>
        </div>

        {/* 1. Designación */}
        <div 
          onClick={() => setSelectedTypeFilter('designacion')}
          className={`p-4 bg-white border rounded-xl cursor-pointer transition-all shadow-2xs ${
            selectedTypeFilter === 'designacion' ? 'border-blue-900 ring-2 ring-blue-900/10 bg-blue-50/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider mb-1">
            1. Designación
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {summaryMetrics.designacion}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Asesor docente
          </div>
        </div>

        {/* 2. Reasignación */}
        <div 
          onClick={() => setSelectedTypeFilter('reasignacion')}
          className={`p-4 bg-white border rounded-xl cursor-pointer transition-all shadow-2xs ${
            selectedTypeFilter === 'reasignacion' ? 'border-blue-900 ring-2 ring-blue-900/10 bg-blue-50/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider mb-1">
            2. Reasignación
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {summaryMetrics.reasignacion}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Cambio de asesor
          </div>
        </div>

        {/* 3. Sustentación */}
        <div 
          onClick={() => setSelectedTypeFilter('sustentacion')}
          className={`p-4 bg-white border rounded-xl cursor-pointer transition-all shadow-2xs ${
            selectedTypeFilter === 'sustentacion' ? 'border-blue-900 ring-2 ring-blue-900/10 bg-blue-50/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider mb-1">
            3. Sustentación
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {summaryMetrics.sustentacion}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Jurado evaluador
          </div>
        </div>

        {/* 4. Aprobación */}
        <div 
          onClick={() => setSelectedTypeFilter('aprobacion')}
          className={`p-4 bg-white border rounded-xl cursor-pointer transition-all shadow-2xs col-span-2 sm:col-span-1 ${
            selectedTypeFilter === 'aprobacion' ? 'border-blue-900 ring-2 ring-blue-900/10 bg-blue-50/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-blue-900 uppercase tracking-wider mb-1">
            4. Aprobación
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {summaryMetrics.aprobacion}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Resolución final (480h)
          </div>
        </div>
      </div>

      {/* 3. Barra de Filtros y Búsqueda Avanzada */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Tabs por Tipo de Trámite */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedTypeFilter('todos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedTypeFilter === 'todos'
                  ? 'bg-blue-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos ({tramites.length})
            </button>
            <button
              onClick={() => setSelectedTypeFilter('designacion')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedTypeFilter === 'designacion'
                  ? 'bg-blue-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Designación ({summaryMetrics.designacion})
            </button>
            <button
              onClick={() => setSelectedTypeFilter('reasignacion')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedTypeFilter === 'reasignacion'
                  ? 'bg-blue-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Reasignación ({summaryMetrics.reasignacion})
            </button>
            <button
              onClick={() => setSelectedTypeFilter('sustentacion')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedTypeFilter === 'sustentacion'
                  ? 'bg-blue-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Sustentación ({summaryMetrics.sustentacion})
            </button>
            <button
              onClick={() => setSelectedTypeFilter('aprobacion')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                selectedTypeFilter === 'aprobacion'
                  ? 'bg-blue-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Aprobación ({summaryMetrics.aprobacion})
            </button>
            <button
              onClick={() => setSelectedTypeFilter('repositorio')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                selectedTypeFilter === 'repositorio'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>📁 Carpeta de Expedientes Digitales</span>
            </button>
          </div>

          {/* Search por Código del Alumno & Status Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={studentCodeQuery}
                onChange={(e) => setStudentCodeQuery(e.target.value)}
                placeholder="Buscar por Código (Ej: 202300220F) o Nombre..."
                className="w-full pl-9 pr-3 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 focus:bg-white"
              />
              {studentCodeQuery && (
                <button
                  onClick={() => setStudentCodeQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-700"
            >
              <option value="todos">Todos los Estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="revisado">Revisado / Parámetros</option>
              <option value="documentos_generados">Documentos Listos</option>
              <option value="enviado">Completado / Aprobado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Storage Location Explanatory Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-amber-50 border border-blue-200/80 rounded-2xl p-4 text-xs text-slate-700 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-900 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block mb-0.5">
              ¿Dónde se guardan los Informes y Resoluciones?
            </span>
            <span className="text-slate-600 leading-relaxed block">
              <strong>1. En tu computadora:</strong> Al hacer clic en <em>"Descargar Word (.docx)"</em> o <em>"Descargar PDF"</em>, los archivos se descargan en la carpeta <strong>Descargas (Downloads)</strong> de tu equipo, guardados con el nombre del alumno: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[11px] text-blue-950">[Apellidos_y_Nombres]_[DOCUMENTO]_PPP.pdf</code>.<br />
              <strong>2. En la plataforma:</strong> Quedan archivados en la <strong>Base de Datos del Sistema</strong> para cada alumno, listos para ser editados, consultados o reenviados.
            </span>
          </div>
        </div>

        <button
          onClick={() => setSelectedTypeFilter('repositorio')}
          className="self-start md:self-center px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-medium text-xs whitespace-nowrap shrink-0 transition-colors"
        >
          Ver Carpetas por Alumno
        </button>
      </div>

      {selectedTypeFilter === 'repositorio' ? (
        /* VISTA DE CARPETA DE EXPEDIENTES DIGITALES */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📁 Repositorio de Carpetas:</span>
                <span className="font-mono text-xs text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                  /Documentos_PPP_UTEA_Cusco/
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Visualización de archivos organizados por carpeta individual de cada alumno registrado.
              </p>
            </div>
            <button
              onClick={() => setSelectedTypeFilter('todos')}
              className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Volver a la Lista
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {students.map((student) => {
              const studentTramites = tramites.filter(
                (t) => t.studentId === student.id || t.studentCode === student.studentCode
              );

              return (
                <div
                  key={student.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 hover:border-blue-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📁</span>
                      <div>
                        <div className="font-bold text-xs text-slate-900">
                          {student.fullName.replace(/\s+/g, '_')}_{student.studentCode}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Empresa: {student.organization}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600">
                      {studentTramites.length} trámite(s)
                    </span>
                  </div>

                  {/* Archivos generados para este alumno */}
                  <div className="bg-white rounded-lg border border-slate-200 p-2.5 space-y-2">
                    {studentTramites.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic py-1 text-center">
                        Aún no se han generado documentos para este alumno.
                      </div>
                    ) : (
                      studentTramites.map((record) => {
                        const docs = generateDocuments(student, record);

                        return (
                          <div
                            key={record.id}
                            className="p-2 rounded bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                                <span>📄</span>
                                <span>{student.fullName.replace(/\s+/g, '_')}_RESOLUCION_{record.type.toUpperCase()}.doc</span>
                              </div>
                              <div className="text-[10px] text-slate-400 pl-5">
                                {docs.resolucionTitle}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => onOpenDocumentViewer(student, record)}
                                className="px-2 py-1 bg-blue-900 hover:bg-blue-950 text-white rounded text-[10px] font-semibold flex items-center gap-1"
                                title="Abrir y Descargar"
                              >
                                <Eye className="w-3 h-3 text-amber-400" />
                                <span>Abrir</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 4. Tabla Principal de Trámites con Botones "Generar Documento" y "Enviar por Correo" */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Listado Oficial de Trámites en Trámite ({filteredTramites.length})
            </div>
            <div className="text-xs text-slate-400">
              Cada fila cuenta con acceso a supervisión, generar documentos oficiales Word (.docx) e imprimir/exportar a PDF
            </div>
          </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Alumno y Código</th>
                <th className="py-3 px-4">Trámite</th>
                <th className="py-3 px-4">Organización / Empresa</th>
                <th className="py-3 px-4">Fecha Inicio PPP</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones Directas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTramites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No se encontraron trámites con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredTramites.map((record) => {
                  const student = students.find((s) => s.id === record.studentId || s.studentCode === record.studentCode);
                  if (!student) return null;

                  return (
                    <tr key={record.id} className="hover:bg-blue-50/30 transition-colors">
                      {/* Alumno y Código */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{student.fullName}</div>
                        <div className="font-mono text-[11px] text-blue-900 font-bold">
                          {student.studentCode}
                        </div>
                      </td>

                      {/* Tipo de Trámite con Identificadores Independientes */}
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block capitalize">
                          {record.type === 'designacion' && '1. Designación'}
                          {record.type === 'reasignacion' && '2. Reasignación'}
                          {record.type === 'sustentacion' && '3. Sustentación'}
                          {record.type === 'aprobacion' && '4. Aprobación Final'}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-1">
                          <span className="font-mono bg-blue-50 border border-blue-200 text-blue-900 font-semibold px-1.5 py-0.5 rounded">
                            FUT: {
                              record.type === 'designacion' ? record.designacion?.futNumber :
                              record.type === 'reasignacion' ? record.reasignacion?.futNumber :
                              record.type === 'sustentacion' ? record.sustentacion?.futNumber :
                              record.aprobacion?.futNumber || 'Sin reg.'
                            }
                          </span>
                          <span className="font-mono bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                            EXP: {
                              record.type === 'designacion' ? record.designacion?.expedienteNumber :
                              record.type === 'reasignacion' ? record.reasignacion?.expedienteNumber :
                              record.type === 'sustentacion' ? record.sustentacion?.expedienteNumber :
                              record.aprobacion?.expedienteNumber || 'Sin reg.'
                            }
                          </span>
                        </div>
                      </td>

                      {/* Organización */}
                      <td className="py-3 px-4 uppercase text-slate-800 max-w-[190px] truncate" title={student.organization}>
                        {student.organization}
                      </td>

                      {/* Fecha Inicio */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {formatDateSpanish(student.startDate)}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium text-[11px] ${
                            record.status === 'enviado'
                              ? 'bg-emerald-100 text-emerald-800'
                              : record.status === 'documentos_generados'
                              ? 'bg-blue-100 text-blue-800'
                              : record.status === 'revisado'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {record.status === 'enviado' && 'Completado'}
                          {record.status === 'documentos_generados' && 'Documentos Listos'}
                          {record.status === 'revisado' && 'Parámetros Editados'}
                          {record.status === 'pendiente' && 'Pendiente'}
                        </span>
                      </td>

                      {/* Botones de Acción Directa */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* 1. Ver/Editar Detalle Completo */}
                          <button
                            onClick={() => handleOpenDetailModal(record)}
                            className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg text-xs transition-colors flex items-center gap-1"
                            title="Supervisar y editar todos los datos del trámite y del alumno"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                            <span>Supervisar</span>
                          </button>

                          {/* 2. Botón "Generar Documento" */}
                          <button
                            onClick={() => onOpenDocumentViewer(student, record)}
                            className="py-1.5 px-3 bg-blue-900 hover:bg-blue-950 text-white font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
                            title="Generar y previsualizar Informe y Resolución Sub Directoral"
                          >
                            <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Generar Documento</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* 5. VISTA DETALLADA DEL TRÁMITE (Supervisión completa, datos registrados,  */}
      {/* datos obligatorios y opcionales, parámetros del administrador)            */}
      {/* ========================================================================= */}
      {activeDetailRecord && activeDetailStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-blue-900 text-white p-5 sticky top-0 z-10 flex items-center justify-between">
              <div>
                <div className="text-xs text-blue-200 uppercase font-semibold">
                  Vista Integral del Trámite · Comisión de PPP UTEA
                </div>
                <h3 className="text-lg font-bold text-white">
                  {activeDetailStudent.fullName} · CÓDIGO: {activeDetailStudent.studentCode}
                </h3>
              </div>
              <button
                onClick={() => setActiveDetailRecord(null)}
                className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-blue-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {saveNotification && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveNotification}</span>
                </div>
              )}

              {/* SECCIÓN A: Datos de Registro del Estudiante */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-bold text-blue-950 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-700" />
                  <span>1. Datos de Registro del Estudiante (Supervisión y Edición)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Apellidos y Nombres del Alumno (Cada nueva palabra con mayúscula)
                    </label>
                    <input
                      type="text"
                      value={editStudentName}
                      onChange={(e) => setEditStudentName(e.target.value)}
                      onBlur={() => setEditStudentName(toTitleCase(editStudentName))}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Código del Alumno (Siempre en mayúsculas - Llave Única)
                    </label>
                    <input
                      type="text"
                      value={editStudentCode}
                      onChange={(e) => setEditStudentCode(toUpperCase(e.target.value))}
                      placeholder="Ej: 202300220F"
                      className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 font-bold text-blue-900"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Siempre finaliza con una <strong>letra mayúscula</strong> (Ejemplo: <span className="font-mono font-bold text-blue-900">202300220F</span>).
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Organización en la que realiza PPP (Siempre en mayúscula)
                    </label>
                    <input
                      type="text"
                      value={editStudentOrg}
                      onChange={(e) => setEditStudentOrg(toUpperCase(e.target.value))}
                      className="w-full px-3 py-2 text-xs uppercase bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Fecha de Inicio de PPP (Solo fechas)
                    </label>
                    <input
                      type="date"
                      value={editStudentDate}
                      onChange={(e) => setEditStudentDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
                    />
                    <span className="text-[11px] text-blue-900 mt-0.5 block">
                      Formato oficial: {formatDateSpanish(editStudentDate)}
                    </span>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Correo Electrónico para Formatos
                    </label>
                    <input
                      type="email"
                      value={editStudentEmail}
                      onChange={(e) => setEditStudentEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-800"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN B: Datos Registrados por el Alumno (Obligatorios y Opcionales) */}
              <div className="border border-slate-200 rounded-xl p-5">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  2. Datos Registrados por el Alumno según Trámite ({activeDetailRecord.type.toUpperCase()})
                </div>

                {/* Designación */}
                {activeDetailRecord.type === 'designacion' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Nº FUT Solicitud Asesor * (Solo números)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.futNumber || ''}
                          onChange={(e) => setFormData({ ...formData, futNumber: filterNumeric(e.target.value) })}
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Fecha de FUT Solicitud Asesor * (Solo fecha)
                        </label>
                        <input
                          type="date"
                          value={formData.futDate || ''}
                          onChange={(e) => setFormData({ ...formData, futDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Nº Expediente FUT Asesor * (Solo números)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.expedienteNumber || ''}
                          onChange={(e) => setFormData({ ...formData, expedienteNumber: filterNumeric(e.target.value) })}
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                          Informe Designación Asesor (Solo números)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.informeNumber || ''}
                          onChange={(e) => setFormData({ ...formData, informeNumber: filterNumeric(e.target.value) })}
                          placeholder="Solo números (Ej: 024)"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                          Fecha Informe Designación (Opcional)
                        </label>
                        <input
                          type="date"
                          value={formData.informeDate || ''}
                          onChange={(e) => setFormData({ ...formData, informeDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                          Nombre Completo del Asesor (Opcional)
                        </label>
                        <input
                          type="text"
                          value={formData.advisorName || ''}
                          onChange={(e) => setFormData({ ...formData, advisorName: e.target.value })}
                          onBlur={() => setFormData({ ...formData, advisorName: toTitleCase(formData.advisorName || '') })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Reasignación */}
                {activeDetailRecord.type === 'reasignacion' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Resolución Designación Asesor Actual *
                        </label>
                        <input
                          type="text"
                          value={formData.currentResolution || ''}
                          onChange={(e) => setFormData({ ...formData, currentResolution: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Fecha Resolución Asesor Actual *
                        </label>
                        <input
                          type="date"
                          value={formData.currentResolutionDate || ''}
                          onChange={(e) => setFormData({ ...formData, currentResolutionDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Nombre Asesor Actual *
                        </label>
                        <input
                          type="text"
                          value={formData.currentAdvisorName || ''}
                          onChange={(e) => setFormData({ ...formData, currentAdvisorName: e.target.value })}
                          onBlur={() => setFormData({ ...formData, currentAdvisorName: toTitleCase(formData.currentAdvisorName || '') })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Nº FUT Reasignación * (Solo números)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.futNumber || ''}
                          onChange={(e) => setFormData({ ...formData, futNumber: filterNumeric(e.target.value) })}
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Fecha FUT Reasignación *
                        </label>
                        <input
                          type="date"
                          value={formData.futDate || ''}
                          onChange={(e) => setFormData({ ...formData, futDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Nº Expediente Reasignación * (Solo números)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.expedienteNumber || ''}
                          onChange={(e) => setFormData({ ...formData, expedienteNumber: filterNumeric(e.target.value) })}
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                          Informe Reasignación (Solo números)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.informeNumber || ''}
                          onChange={(e) => setFormData({ ...formData, informeNumber: filterNumeric(e.target.value) })}
                          placeholder="Solo números (Ej: 052)"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                          Fecha Informe Reasignación (Opcional)
                        </label>
                        <input
                          type="date"
                          value={formData.informeDate || ''}
                          onChange={(e) => setFormData({ ...formData, informeDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                          Nombre Nuevo Asesor (Opcional)
                        </label>
                        <input
                          type="text"
                          value={formData.newAdvisorName || ''}
                          onChange={(e) => setFormData({ ...formData, newAdvisorName: e.target.value })}
                          onBlur={() => setFormData({ ...formData, newAdvisorName: toTitleCase(formData.newAdvisorName || '') })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Sustentación */}
                {activeDetailRecord.type === 'sustentacion' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Nombre Completo de su Asesor *
                        </label>
                        <input
                          type="text"
                          value={formData.advisorName || ''}
                          onChange={(e) => setFormData({ ...formData, advisorName: e.target.value })}
                          onBlur={() => setFormData({ ...formData, advisorName: toTitleCase(formData.advisorName || '') })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Nº FUT Solicitud Sustentación * (Solo números)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.futNumber || ''}
                          onChange={(e) => setFormData({ ...formData, futNumber: filterNumeric(e.target.value) })}
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Fecha FUT Solicitud Sustentación *
                        </label>
                        <input
                          type="date"
                          value={formData.futDate || ''}
                          onChange={(e) => setFormData({ ...formData, futDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Nº Expediente Sustentación * (Solo números)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.expedienteNumber || ''}
                          onChange={(e) => setFormData({ ...formData, expedienteNumber: filterNumeric(e.target.value) })}
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Informe Aprobación PPP del Asesor (Solo números) *
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.advisorApprovalReportNumber || ''}
                          onChange={(e) => setFormData({ ...formData, advisorApprovalReportNumber: filterNumeric(e.target.value) })}
                          placeholder="Solo números (Ej: 018)"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                          Fecha Informe Aprobación Asesor *
                        </label>
                        <input
                          type="date"
                          value={formData.advisorApprovalReportDate || ''}
                          onChange={(e) => setFormData({ ...formData, advisorApprovalReportDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                          Informe Designación Jurado Revisor (Solo números)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.juryDesignationReportNumber || ''}
                          onChange={(e) => setFormData({ ...formData, juryDesignationReportNumber: filterNumeric(e.target.value) })}
                          placeholder="Solo números (Ej: 088)"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                          Fecha Informe Designación Jurado (Opcional)
                        </label>
                        <input
                          type="date"
                          value={formData.juryDesignationReportDate || ''}
                          onChange={(e) => setFormData({ ...formData, juryDesignationReportDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Aprobación */}
                {activeDetailRecord.type === 'aprobacion' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                      <strong>Identificadores Independientes de Aprobación:</strong> Cada trámite posee su propio número de FUT y de Expediente.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                          Número de FUT de Aprobación * (Solo números)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.futNumber || ''}
                          onChange={(e) => setFormData({ ...formData, futNumber: filterNumeric(e.target.value) })}
                          placeholder="Ej: 71045"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                          Fecha de FUT de Aprobación *
                        </label>
                        <input
                          type="date"
                          value={formData.futDate || ''}
                          onChange={(e) => setFormData({ ...formData, futDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                          Número de Expediente Aprobación * (Solo números)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.expedienteNumber || ''}
                          onChange={(e) => setFormData({ ...formData, expedienteNumber: filterNumeric(e.target.value) })}
                          placeholder="Ej: 31280"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-600 uppercase mb-2">
                        Antecedentes de Asesor Revisor:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                            Nº Informe Designación Asesor PPP * (Solo números)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formData.advisorDesignationReportNumber || ''}
                            onChange={(e) => setFormData({ ...formData, advisorDesignationReportNumber: filterNumeric(e.target.value) })}
                            placeholder="Solo números (Ej: 024)"
                            className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                            Fecha Informe Asignación Asesor PPP *
                          </label>
                          <input
                            type="date"
                            value={formData.advisorDesignationReportDate || ''}
                            onChange={(e) => setFormData({ ...formData, advisorDesignationReportDate: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                            Resolución Designación Asesor Revisor PPP *
                          </label>
                          <input
                            type="text"
                            value={formData.advisorReviewerResolution || ''}
                            onChange={(e) => setFormData({ ...formData, advisorReviewerResolution: e.target.value })}
                            placeholder="Ej: 340 o 583"
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                            Fecha Resolución Designación Asesor Revisor *
                          </label>
                          <input
                            type="date"
                            value={formData.advisorReviewerResolutionDate || ''}
                            onChange={(e) => setFormData({ ...formData, advisorReviewerResolutionDate: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN C: Parámetros del Administrador (Obligatorios y Opcionales) */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 space-y-4">
                <div className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>3. Parámetros Agregados por el Administrador</span>
                </div>

                {/* Designación Admin Fields */}
                {activeDetailRecord.type === 'designacion' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                        Número de Resolución Designación Asesor (Solo números)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formData.adminResolutionNumber || ''}
                        onChange={(e) => setFormData({ ...formData, adminResolutionNumber: filterNumeric(e.target.value) })}
                        placeholder="Ej: 583"
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                        Fecha de Resolución Designación Asesor PPP (Solo fecha)
                      </label>
                      <input
                        type="date"
                        value={formData.adminResolutionDate || ''}
                        onChange={(e) => setFormData({ ...formData, adminResolutionDate: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                      {formData.adminResolutionDate && (
                        <span className="text-[11px] text-amber-900 mt-0.5 block">
                          Formato: {formatDateSpanish(formData.adminResolutionDate)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Reasignación Admin Fields */}
                {activeDetailRecord.type === 'reasignacion' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                        Número de Resolución Reasignación Asesor (Solo números)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formData.adminResolutionNumber || ''}
                        onChange={(e) => setFormData({ ...formData, adminResolutionNumber: filterNumeric(e.target.value) })}
                        placeholder="Ej: 590"
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                        Fecha de Resolución Reasignación Asesor PPP (Solo fecha)
                      </label>
                      <input
                        type="date"
                        value={formData.adminResolutionDate || ''}
                        onChange={(e) => setFormData({ ...formData, adminResolutionDate: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                      {formData.adminResolutionDate && (
                        <span className="text-[11px] text-amber-900 mt-0.5 block">
                          Formato: {formatDateSpanish(formData.adminResolutionDate)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Sustentación Admin Fields */}
                {activeDetailRecord.type === 'sustentacion' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                          Presidente del Jurado Evaluador (Title Case)
                        </label>
                        <input
                          type="text"
                          value={formData.presidentName || ''}
                          onChange={(e) => setFormData({ ...formData, presidentName: e.target.value })}
                          onBlur={() => setFormData({ ...formData, presidentName: toTitleCase(formData.presidentName || '') })}
                          placeholder="Ej: Jorge Armando Cardenas Galiano"
                          className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                          Miembro del Jurado Evaluador (Title Case)
                        </label>
                        <input
                          type="text"
                          value={formData.memberName || ''}
                          onChange={(e) => setFormData({ ...formData, memberName: e.target.value })}
                          onBlur={() => setFormData({ ...formData, memberName: toTitleCase(formData.memberName || '') })}
                          placeholder="Ej: Paul Gerardo Vargas Meza"
                          className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                          Fecha de la Sustentación (Solo fecha)
                        </label>
                        <input
                          type="date"
                          value={formData.defenseDate || ''}
                          onChange={(e) => setFormData({ ...formData, defenseDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                          Hora de la Sustentación (Solo hora)
                        </label>
                        <input
                          type="time"
                          value={formData.defenseTime || ''}
                          onChange={(e) => setFormData({ ...formData, defenseTime: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                          Número de Resolución Sustentación PPP (Solo números)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.adminResolutionNumber || ''}
                          onChange={(e) => setFormData({ ...formData, adminResolutionNumber: filterNumeric(e.target.value) })}
                          placeholder="Ej: 612"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-amber-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                          Fecha de Resolución Sustentación PPP (Solo fecha)
                        </label>
                        <input
                          type="date"
                          value={formData.adminResolutionDate || ''}
                          onChange={(e) => setFormData({ ...formData, adminResolutionDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Aprobación Admin Fields */}
                {activeDetailRecord.type === 'aprobacion' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                          Informe Aprobación PPP del Jurado (Solo números)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.juryApprovalReportNumber || ''}
                          onChange={(e) => setFormData({ ...formData, juryApprovalReportNumber: filterNumeric(e.target.value) })}
                          placeholder="Solo números (Ej: 098)"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-amber-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                          Fecha Informe Aprobación del Jurado (Solo fecha)
                        </label>
                        <input
                          type="date"
                          value={formData.juryApprovalReportDate || ''}
                          onChange={(e) => setFormData({ ...formData, juryApprovalReportDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                          Número de Resolución de Aprobación (Solo números)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formData.adminResolutionNumber || ''}
                          onChange={(e) => setFormData({ ...formData, adminResolutionNumber: filterNumeric(e.target.value) })}
                          placeholder="Ej: 745"
                          className="w-full px-3 py-2 text-xs font-mono bg-white border border-amber-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-800 uppercase mb-1">
                          Fecha de Resolución de Aprobación (Solo fecha)
                        </label>
                        <input
                          type="date"
                          value={formData.adminResolutionDate || ''}
                          onChange={(e) => setFormData({ ...formData, adminResolutionDate: e.target.value })}
                          className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg"
                        />
                      </div>
                    </div>

                    {/* Linked Sustentación Data */}
                    <div className="pt-3 border-t border-amber-200">
                      <div className="text-[11px] font-bold text-amber-950 uppercase mb-2">
                        Datos de Sustentación Vinculados para la Resolución Sub Directoral:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                            Nombre Completo de su Asesor
                          </label>
                          <input
                            type="text"
                            value={formData.advisorName || ''}
                            onChange={(e) => setFormData({ ...formData, advisorName: e.target.value })}
                            onBlur={() => setFormData({ ...formData, advisorName: toTitleCase(formData.advisorName || '') })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                            Nº FUT Solicitud Sustentación PPP (Solo números)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formData.futSustentacionNumber || ''}
                            onChange={(e) => setFormData({ ...formData, futSustentacionNumber: filterNumeric(e.target.value) })}
                            className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                            Fecha FUT Solicitud Sustentación PPP
                          </label>
                          <input
                            type="date"
                            value={formData.futSustentacionDate || ''}
                            onChange={(e) => setFormData({ ...formData, futSustentacionDate: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                            Nº Resolución Sustentación PPP (Solo números)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formData.resolutionSustentacionNumber || ''}
                            onChange={(e) => setFormData({ ...formData, resolutionSustentacionNumber: filterNumeric(e.target.value) })}
                            className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                            Fecha Resolución Sustentación PPP
                          </label>
                          <input
                            type="date"
                            value={formData.resolutionSustentacionDate || ''}
                            onChange={(e) => setFormData({ ...formData, resolutionSustentacionDate: e.target.value })}
                            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                            Informe Designación Jurado Revisor PPP (Solo números)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formData.juryDesignationReportNumber || ''}
                            onChange={(e) => setFormData({ ...formData, juryDesignationReportNumber: filterNumeric(e.target.value) })}
                            placeholder="Solo números (Ej: 088)"
                            className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div className="sm:col-span-2 bg-white/80 p-2.5 rounded-lg border border-amber-200 text-xs">
                          <span className="text-slate-500 block">Cálculo de Período Oficial (04 meses / 480 horas):</span>
                          <span className="font-semibold text-amber-950">
                            {formatDateSpanish(editStudentDate)} al {add4MonthsFormatted(editStudentDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Action Bar */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setActiveDetailRecord(null)}
                  className="py-2.5 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cerrar
                </button>

                <div className="flex items-center gap-2">
                  {/* Guardar Cambios */}
                  <button
                    type="button"
                    onClick={handleSaveChanges}
                    className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Cambios</span>
                  </button>

                  {/* Generar Documento */}
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveChanges();
                      onOpenDocumentViewer(activeDetailStudent, activeDetailRecord);
                    }}
                    className="py-2.5 px-4 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Generar Documento</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gestor de Plantillas .docx */}
      <TemplateManagerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />
    </div>
  );
};
