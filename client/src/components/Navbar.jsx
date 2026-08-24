import React, { useState } from 'react';
import {
  HeartPulse,
  User,
  Shield,
  Stethoscope,
  Bell,
  LogOut,
  ChevronDown,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  currentView,
  setCurrentView,
  onOpenNotifications,
  onOpenAuth,
}) {
  const { user, role, logout, quickDemoLogin, demoAccounts } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setCurrentView('patient')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <HeartPulse className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
                NexusCare
              </span>
              <span className="hidden sm:block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Clinical Scheduling & AI Follow-Up
              </span>
            </div>
          </button>

          {/* Navigation tabs */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setCurrentView('patient')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                currentView === 'patient'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Patient Portal</span>
            </button>

            <button
              onClick={() => setCurrentView('doctor')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                currentView === 'doctor'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Doctor Portal</span>
            </button>

            <button
              onClick={() => setCurrentView('admin')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                currentView === 'admin'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </button>
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Notification Center Trigger */}
          <button
            onClick={onOpenNotifications}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 relative transition-colors"
            title="Notification Queue & Email Audit"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950 animate-ping" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          {/* Quick Demo Persona Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Switch Persona</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 text-xs animate-slide-up">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Switch Demo Account
                </div>
                <button
                  onClick={() => {
                    quickDemoLogin('alex.morgan@example.com');
                    setCurrentView('patient');
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Alex Morgan</div>
                    <div className="text-[10px] text-slate-500">Patient • Booking & Prescriptions</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">PATIENT</span>
                </button>

                <button
                  onClick={() => {
                    quickDemoLogin('dr.jenkins@nexuscare.clinic');
                    setCurrentView('doctor');
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Dr. Sarah Jenkins</div>
                    <div className="text-[10px] text-slate-500">Cardiologist • Pre-visit Triage</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-bold">DOCTOR</span>
                </button>

                <button
                  onClick={() => {
                    quickDemoLogin('admin@nexuscare.clinic');
                    setCurrentView('admin');
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">Dr. Arthur Vance</div>
                    <div className="text-[10px] text-slate-500">Admin • Leave & Doctor Setup</div>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-bold">ADMIN</span>
                </button>
              </div>
            )}
          </div>

          {/* User Account / Login Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                <img
                  src={
                    user.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`
                  }
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
                />
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold leading-tight text-slate-900 dark:text-white">
                    {user.name}
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                    {user.role}
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
