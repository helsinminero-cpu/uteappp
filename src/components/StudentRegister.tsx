import React, { useState } from 'react';
import { UserCheck, ArrowLeft, Building2, Mail, Calendar, User, Hash, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Student } from '../types';
import { toTitleCase, toUpperCase, formatDateSpanish } from '../utils/formatters';

interface StudentRegisterProps {
  students: Student[];
  onRegisterSuccess: (student: Student) => void;
  onCancel: () => void;
}

export const StudentRegister: React.FC<StudentRegisterProps> = ({
  students,
  onRegisterSuccess,
  onCancel,
}) => {
  const [fullName, setFullName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [organization, setOrganization] = useState('');
  const [startDate, setStartDate] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successStudent, setSuccessStudent] = useState<Student | null>(null);

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep typed string, auto format on blur or format gently
    setFullName(e.target.value);
    if (error) setError(null);
  };

  const handleFullNameBlur = () => {
    if (fullName.trim()) {
      setFullName(toTitleCase(fullName.trim()));
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Always uppercase
    setStudentCode(toUpperCase(e.target.value).trim());
    if (error) setError(null);
  };

  const handleOrganizationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Always uppercase
    setOrganization(toUpperCase(e.target.value));
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formattedName = toTitleCase(fullName.trim());
    const formattedCode = toUpperCase(studentCode.trim());
    const formattedOrg = toUpperCase(organization.trim());
    const trimmedEmail = email.trim();

    if (!formattedName) {
      setError('Por favor ingresa los Apellidos y Nombres del alumno.');
      return;
    }
    if (!formattedCode) {
      setError('Por favor ingresa el Código del Alumno.');
      return;
    }
    if (!/[A-Z]$/.test(formattedCode)) {
      setError('El Código del Alumno siempre debe finalizar con una letra en mayúscula (Ejemplo: 202300220F).');
      return;
    }
    if (!formattedOrg) {
      setError('Por favor ingresa la Organización o Empresa de prácticas.');
      return;
    }
    if (!startDate) {
      setError('Por favor selecciona la Fecha de inicio de las Prácticas Pre Profesionales.');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setError('Por favor ingresa un correo electrónico válido al cual enviar los formatos.');
      return;
    }

    // Verify unique student code
    const existing = students.find(
      s => s.studentCode.toUpperCase() === formattedCode
    );
    if (existing) {
      setError(`El Código de Alumno "${formattedCode}" ya se encuentra registrado a nombre de: ${existing.fullName}. Si eres este alumno, ingresa directamente a Trámites con tu código.`);
      return;
    }

    const newStudent: Student = {
      id: `std-${Date.now()}`,
      fullName: formattedName,
      studentCode: formattedCode,
      organization: formattedOrg,
      startDate,
      email: trimmedEmail,
      createdAt: new Date().toISOString(),
    };

    setSuccessStudent(newStudent);
  };

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      {/* Back button */}
      <button
        onClick={onCancel}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver a la página de inicio</span>
      </button>

      {/* Success Modal / Banner */}
      {successStudent ? (
        <div className="bg-white border border-emerald-200 rounded-2xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            ¡Registro Exitoso en el Sistema!
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            Tus datos han sido registrados en la base de datos de la Comisión de PPP. Conserva tu Código de Alumno único para realizar tus trámites.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 max-w-md mx-auto text-left mb-6 space-y-2 text-sm">
            <div>
              <span className="text-xs text-slate-500 block">Alumno Registrado:</span>
              <span className="font-semibold text-slate-900">{successStudent.fullName}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Código Único (Llave de Acceso):</span>
              <span className="font-mono font-bold text-blue-900 text-base">{successStudent.studentCode}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Organización / Empresa:</span>
              <span className="text-slate-700">{successStudent.organization}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Fecha de Inicio de Prácticas:</span>
              <span className="text-slate-700 font-medium">{formatDateSpanish(successStudent.startDate)}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Correo para Formatos:</span>
              <span className="text-slate-700">{successStudent.email}</span>
            </div>
          </div>

          <button
            onClick={() => onRegisterSuccess(successStudent)}
            className="w-full max-w-md py-3 px-6 bg-blue-900 hover:bg-blue-950 text-white font-medium rounded-xl transition-colors shadow-sm"
          >
            Continuar a Trámites con mi Código
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="border-b border-slate-100 pb-5 mb-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-900 uppercase tracking-wider mb-1">
              <UserCheck className="w-4 h-4 text-blue-700" />
              <span>Formulario Oficial de Inscripción</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Registro de Alumno para Prácticas Pre Profesionales
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Todos los datos ingresados se utilizarán directamente en la emisión legal de informes y resoluciones.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Apellidos y Nombres */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Apellidos y Nombres del Alumno <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={handleFullNameChange}
                  onBlur={handleFullNameBlur}
                  placeholder="Ej: Mendoza Quispe Carlos Alberto"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-all"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Cada nueva palabra debe iniciar en mayúscula automáticamente.
              </p>
            </div>

            {/* Codigo del Alumno */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Código del Alumno (Único) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={studentCode}
                  onChange={handleCodeChange}
                  placeholder="Ej: 202300220F"
                  className="w-full pl-10 pr-4 py-2.5 text-sm font-mono uppercase bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-all"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                El código siempre finaliza con una <strong>letra mayúscula</strong> (Ejemplo: <span className="font-mono font-bold text-blue-900">202300220F</span>).
              </p>
            </div>

            {/* Organizacion */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Organización en la que está realizando las Prácticas Pre Profesionales <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={organization}
                  onChange={handleOrganizationChange}
                  placeholder="Ej: CONSORCIO VIAL CUSCO S.A.C."
                  className="w-full pl-10 pr-4 py-2.5 text-sm uppercase bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-all"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                El nombre de la empresa o entidad debe estar siempre en MAYÚSCULAS.
              </p>
            </div>

            {/* Fecha de inicio */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Fecha de inicio de Prácticas Pre profesionales <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-all"
                />
              </div>
              {startDate ? (
                <div className="mt-1 text-xs text-blue-900 font-medium flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-700" />
                  <span>Formato oficial: {formatDateSpanish(startDate)}</span>
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-slate-500">
                  Solo permite elegir fechas. En las resoluciones figurará con el formato: 30 de setiembre del 2026.
                </p>
              )}
            </div>

            {/* Correo electronico */}
            <div>
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1.5">
                Correo Electrónico al cual se enviarán los Formatos <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alumno@utea.edu.pe"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent transition-all"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                A esta dirección el Administrador enviará los informes y resoluciones aprobados.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="py-2.5 px-5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="py-2.5 px-6 bg-blue-900 hover:bg-blue-950 text-white font-medium text-sm rounded-xl transition-colors shadow-xs"
              >
                Completar Registro
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
