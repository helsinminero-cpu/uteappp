import React, { useState, useEffect } from 'react';
import { Student, TramiteRecord } from './types';
import { 
  getStoredStudents, 
  saveStudents, 
  getStoredTramites, 
  saveTramites 
} from './data/storage';
import { Header } from './components/Header';
import { HomeHero } from './components/HomeHero';
import { StudentRegister } from './components/StudentRegister';
import { StudentPortal } from './components/StudentPortal';
import { AdminPortal } from './components/AdminPortal';
import { DocumentViewer } from './components/DocumentViewer';
import { BackupModal } from './components/BackupModal';
import { scheduleDriveAutoSync } from './utils/driveAutoSync';
import { initTemplateStorage } from './utils/docxEngine';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'registro' | 'tramites' | 'admin'>('home');
  const [students, setStudents] = useState<Student[]>(() => getStoredStudents());
  const [tramites, setTramites] = useState<TramiteRecord[]>(() => getStoredTramites());
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('utea_admin_auth') === 'true';
  });

  // Modal state for Document Viewer and Local Backup
  const [viewingDocState, setViewingDocState] = useState<{
    student: Student;
    record: TramiteRecord;
  } | null>(null);

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Sync state changes to storage and schedule Google Drive backup
  useEffect(() => {
    saveStudents(students);
    scheduleDriveAutoSync();
  }, [students]);

  useEffect(() => {
    saveTramites(tramites);
    scheduleDriveAutoSync();
  }, [tramites]);

  // Ensure all 8 templates are permanently seeded and loaded from IndexedDB/localStorage
  useEffect(() => {
    initTemplateStorage();
  }, []);

  // Listen for template changes to automatically back up templates to Google Drive
  useEffect(() => {
    const handleTemplateUpdated = () => {
      scheduleDriveAutoSync(1000);
    };
    window.addEventListener('utea_templates_updated', handleTemplateUpdated);
    return () => {
      window.removeEventListener('utea_templates_updated', handleTemplateUpdated);
    };
  }, []);

  // Login student by unique code
  const handleLoginWithCode = (code: string): boolean => {
    const found = students.find(
      (s) => s.studentCode.toUpperCase() === code.trim().toUpperCase()
    );
    if (found) {
      setActiveStudent(found);
      setCurrentView('tramites');
      return true;
    }
    return false;
  };

  const handleLogoutStudent = () => {
    setActiveStudent(null);
  };

  // Admin login / logout
  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    sessionStorage.setItem('utea_admin_auth', 'true');
  };

  const handleLogoutAdmin = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('utea_admin_auth');
    setCurrentView('home');
  };

  // Student Registration Success
  const handleRegisterSuccess = (newStudent: Student) => {
    const updated = [newStudent, ...students];
    setStudents(updated);
    saveStudents(updated);
    setActiveStudent(newStudent);
    setCurrentView('tramites');
  };

  // Upsert Tramite Record
  const handleSaveTramite = (record: TramiteRecord) => {
    const exists = tramites.find((t) => t.id === record.id);
    let updatedList: TramiteRecord[];
    if (exists) {
      updatedList = tramites.map((t) => (t.id === record.id ? record : t));
    } else {
      updatedList = [record, ...tramites];
    }
    setTramites(updatedList);
    saveTramites(updatedList);
  };

  // Update Student details (e.g. from Admin supervision)
  const handleUpdateStudent = (updatedStudent: Student) => {
    const updatedList = students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s));
    setStudents(updatedList);
    saveStudents(updatedList);
    if (activeStudent?.id === updatedStudent.id) {
      setActiveStudent(updatedStudent);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      {/* Global Navigation Header */}
      <Header
        currentView={currentView}
        setCurrentView={(view) => {
          setViewingDocState(null);
          setCurrentView(view);
        }}
        activeStudent={activeStudent}
        onLogoutStudent={handleLogoutStudent}
        isAdminLoggedIn={isAdminLoggedIn}
        onLogoutAdmin={handleLogoutAdmin}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* If viewing official document, show DocumentViewer full screen */}
        {viewingDocState ? (
          <DocumentViewer
            student={viewingDocState.student}
            record={viewingDocState.record}
            onUpdateRecord={(updated) => {
              handleSaveTramite(updated);
              setViewingDocState({
                student: viewingDocState.student,
                record: updated,
              });
            }}
            onClose={() => setViewingDocState(null)}
            isAdmin={isAdminLoggedIn}
          />
        ) : (
          <>
            {currentView === 'home' && (
              <HomeHero
                onSelectOption={(option) => {
                  if (option === 'tramite') setCurrentView('tramites');
                  if (option === 'registro') setCurrentView('registro');
                  if (option === 'admin') setCurrentView('admin');
                }}
                studentCount={students.length}
                tramiteCount={tramites.length}
              />
            )}

            {currentView === 'registro' && (
              <StudentRegister
                students={students}
                onRegisterSuccess={handleRegisterSuccess}
                onCancel={() => setCurrentView('home')}
              />
            )}

            {currentView === 'tramites' && (
              <StudentPortal
                activeStudent={activeStudent}
                students={students}
                tramites={tramites}
                onLoginWithCode={handleLoginWithCode}
                onSaveTramite={handleSaveTramite}
                onViewDocument={(student, record) => {
                  setViewingDocState({ student, record });
                }}
                onGoToRegister={() => setCurrentView('registro')}
              />
            )}

            {currentView === 'admin' && (
              <AdminPortal
                students={students}
                tramites={tramites}
                isAdminLoggedIn={isAdminLoggedIn}
                onLoginSuccess={handleAdminLoginSuccess}
                onLogoutAdmin={handleLogoutAdmin}
                onUpdateRecord={handleSaveTramite}
                onUpdateStudent={handleUpdateStudent}
                onOpenDocumentViewer={(student, record) => {
                  setViewingDocState({ student, record });
                }}
                onOpenBackupModal={() => setIsBackupModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Modal Copia de Seguridad y Datos */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        studentsCount={students.length}
        tramitesCount={tramites.length}
        onDataRestored={(restoredStudents, restoredTramites) => {
          setStudents(restoredStudents);
          setTramites(restoredTramites);
        }}
      />

      {/* Global Minimal Footer */}
      <footer className="no-print bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Universidad Tecnológica de los Andes · Filial Cusco · Escuela Profesional de Ingeniería Civil
          </div>
          <div className="text-[11px] text-slate-400">
            Comisión de Convenios y Prácticas Pre Profesionales · Año 2026
          </div>
        </div>
      </footer>
    </div>
  );
}
