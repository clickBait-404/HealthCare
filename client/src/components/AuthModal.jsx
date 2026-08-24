import React, { useState } from 'react';
import { LogIn, UserPlus, Sparkles, X, Shield, Stethoscope, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function AuthModal({ isOpen, onClose, defaultRole = 'PATIENT' }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [name, setName] = useState('');
  const [role, setRole] = useState(defaultRole);
  const [specialization, setSpecialization] = useState('Cardiology');
  const [submitting, setSubmitting] = useState(false);

  const { login, register, quickDemoLogin, demoAccounts } = useAuth();
  const { addToast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isRegister) {
        await register({ name, email, password, role, specialization });
        addToast(`Welcome to NexusCare, ${name}! Account created.`, 'success');
      } else {
        await login(email, password);
        addToast('Successfully signed in!', 'success');
      }
      onClose();
    } catch (err) {
      addToast(err.message || 'Authentication failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (accEmail) => {
    setSubmitting(true);
    try {
      await quickDemoLogin(accEmail);
      addToast('Quick logged in successfully!', 'success');
      onClose();
    } catch (err) {
      addToast(err.message || 'Demo login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              {isRegister ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold">
                {isRegister ? 'Create NexusCare Account' : 'Sign In to Portal'}
              </h3>
              <p className="text-xs text-emerald-100">
                Access your personalized healthcare portal
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {/* Quick Demo Login Switcher */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> 1-Click Fast Switch Demo Accounts
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleQuickLogin('alex.morgan@example.com')}
                className="p-1.5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-semibold flex flex-col items-center gap-1"
              >
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Patient</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('dr.jenkins@nexuscare.clinic')}
                className="p-1.5 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-900 dark:text-blue-200 font-semibold flex flex-col items-center gap-1"
              >
                <Stethoscope className="w-4 h-4 text-blue-600" />
                <span>Doctor</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@nexuscare.clinic')}
                className="p-1.5 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900 text-purple-900 dark:text-purple-200 font-semibold flex flex-col items-center gap-1"
              >
                <Shield className="w-4 h-4 text-purple-600" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eleanor Vance"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Account Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value="PATIENT">Patient</option>
                      <option value="DOCTOR">Doctor</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>

                  {role === 'DOCTOR' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Specialization
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Cardiology"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isRegister ? (
                  'Create Account'
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-emerald-600 hover:underline dark:text-emerald-400 font-semibold"
            >
              {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
