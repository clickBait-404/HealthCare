import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import PatientPortal from './pages/PatientPortal';
import DoctorPortal from './pages/DoctorPortal';
import AdminPortal from './pages/AdminPortal';
import NotificationCenterModal from './components/NotificationCenterModal';
import AuthModal from './components/AuthModal';
import { HeartPulse, Sparkles, Shield, Stethoscope, Mail, Calendar, Bell } from 'lucide-react';

function MainApp() {
  const { user, role } = useAuth();
  const [currentView, setCurrentView] = useState('patient'); // 'patient' | 'doctor' | 'admin'
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Automatically adjust view if user logs in with a specific role
  useEffect(() => {
    if (role === 'DOCTOR') {
      setCurrentView('doctor');
    } else if (role === 'ADMIN') {
      setCurrentView('admin');
    }
  }, [role]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main View Portals */}
      <main className="flex-1 pb-16">
        {currentView === 'patient' && (
          <PatientPortal onOpenAuth={() => setIsAuthOpen(true)} />
        )}
        {currentView === 'doctor' && (
          <DoctorPortal onOpenAuth={() => setIsAuthOpen(true)} />
        )}
        {currentView === 'admin' && (
          <AdminPortal onOpenAuth={() => setIsAuthOpen(true)} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md py-8 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              NX
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              NexusCare Healthcare Appointment & Follow-up Manager
            </span>
          </div>

          <div className="flex items-center gap-6 text-slate-400">
            <span>• Concurrency Slot Locking (5-Min TTL)</span>
            <span>• AI Triage & Care Summary</span>
            <span>• Leave Conflict Auto-Cancellation</span>
            <span>• Nodemailer & Google Calendar Sync</span>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <NotificationCenterModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        defaultRole={currentView === 'doctor' ? 'DOCTOR' : currentView === 'admin' ? 'ADMIN' : 'PATIENT'}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
