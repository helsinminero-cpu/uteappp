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
import { SupabaseModal } from './components/SupabaseModal';
import { scheduleDriveAutoSync } from './utils/driveAutoSync';
import { initTemplateStorage, getActiveDocxTemplateAsync, saveDocxTemplateAsync } from './utils/docxEngine';
import { getSupabaseConfig } from './lib/supabase';
import {
  fetchStudentsFromSupabase,
  fetchTramitesFromSupabase,
  upsertStudentToSupabase,
  upsertTramiteToSupabase,
  syncAllStudentsToSupabase,
  syncAllTramitesToSupabase,
  subscribeToSupabaseRealtime,
  upsertTemplateToSupabase,
  fetchTemplatesFromSupabase,
} from './utils/supabaseSync';

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'registro' | 'tramites' | 'admin'>('home');
  const [students, setStudents] = useState<Student[]>(() => getStoredStudents());
  const [tramites, setTramites] = useState<TramiteRecord[]>(() => getStoredTramites());
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('utea_admin_auth') === 'true';
  });

  // Modal state for Document Viewer, Local Backup, and Supabase
  const [viewingDocState, setViewingDocState] = useState<{
    student: Student;
    record: TramiteRecord;
  } | null>(null);

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

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

  // Supabase Real-Time Multi-Machine Synchronization
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initSupabaseSync = async () => {
      const config = getSupabaseConfig();
      if (!config.isConfigured) return;

      try {
        const [remoteStudents, remoteTramites] = await Promise.all([
          fetchStudentsFromSupabase(),
          fetchTramitesFromSupabase(),
        ]);

        if (remoteStudents !== null && remoteTramites !== null) {
          if (remoteStudents.length > 0 || remoteTramites.length > 0) {
            // Supabase already has data: sync to this machine
            setStudents(remoteStudents);
            setTramites(remoteTramites);
          } else if (students.length > 0 || tramites.length > 0) {
            // Supabase empty: seed from current local data
            await syncAllStudentsToSupabase(students);
            await syncAllTramitesToSupabase(tramites);
          }
        }

        // Sync remote templates from Supabase to this machine
        const remoteTemplates = await fetchTemplatesFromSupabase();
        if (remoteTemplates && remoteTemplates.length > 0) {
          for (const tpl of remoteTemplates) {
            if (tpl.key && tpl.base64) {
              await saveDocxTemplateAsync(tpl.key as any, tpl.base64, tpl.name || `${tpl.key}.docx`);
            }
          }
        }

        // Live Realtime Subscription: listens to any changes from other computers
        unsubscribe = subscribeToSupabaseRealtime(
          (student, eventType) => {
            setStudents((prev) => {
              if (eventType === 'DELETE') {
                return prev.filter((s) => s.id !== student.id);
              }
              const idx = prev.findIndex((s) => s.id === student.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = student;
                return next;
              }
              return [student, ...prev];
            });
          },
          (tramite, eventType) => {
            setTramites((prev) => {
              if (eventType === 'DELETE') {
                return prev.filter((t) => t.id !== tramite.id);
              }
              const idx = prev.findIndex((t) => t.id === tramite.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = tramite;
                return next;
              }
              return [tramite, ...prev];
            });
          },
          (templateKey, base64) => {
            saveDocxTemplateAsync(templateKey as any, base64, `${templateKey}.docx`);
          }
        );
      } catch (err) {
        console.warn('Error inicializando sincronización con Supabase:', err);
      }
    };

    initSupabaseSync();

    const handleConfigChange = () => {
      if (unsubscribe) unsubscribe();
      initSupabaseSync();
    };

    window.addEventListener('utea_supabase_config_changed', handleConfigChange);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('utea_supabase_config_changed', handleConfigChange);
    };
  }, []);

  // Listen for template changes to automatically back up templates to Google Drive & Supabase
  useEffect(() => {
    const handleTemplateUpdated = async (e: any) => {
      scheduleDriveAutoSync(1000);
      try {
        const key = e?.detail?.key;
        if (key) {
          const item = await getActiveDocxTemplateAsync(key);
          if (item?.base64) {
            await upsertTemplateToSupabase(key, item.fileName || `${key}.docx`, item.base64);
          }
        }
      } catch (err) {
        console.warn('Error sincronizando plantilla a Supabase:', err);
      }
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
    upsertStudentToSupabase(newStudent);
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
    upsertTramiteToSupabase(record);
  };

  // Update Student details (e.g. from Admin supervision)
  const handleUpdateStudent = (updatedStudent: Student) => {
    const updatedList = students.map((s) => (s.id === updatedStudent.id ? updatedStudent : s));
    setStudents(updatedList);
    saveStudents(updatedList);
    upsertStudentToSupabase(updatedStudent);
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
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
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
                onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
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

      {/* Modal Conexión Supabase (Sincronización en tiempo real multi-máquina) */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        students={students}
        tramites={tramites}
        onDataLoadedFromSupabase={(loadedStudents, loadedTramites) => {
          setStudents(loadedStudents);
          setTramites(loadedTramites);
          saveStudents(loadedStudents);
          saveTramites(loadedTramites);
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
