import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Stethoscope,
  CalendarCheck,
  CalendarX,
  TrendingUp,
  Plus,
  Mail,
  AlertCircle,
  RefreshCw,
  Clock,
  DollarSign,
  Check,
  Ban,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LeaveManagerModal from '../components/LeaveManagerModal';

export default function AdminPortal({ onOpenAuth }) {
  const { user, role, isAuthenticated, quickDemoLogin } = useAuth();
  const { addToast } = useToast();

  const [analytics, setAnalytics] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

  // Add Doctor Modal State
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [newDoctorData, setNewDoctorData] = useState({
    name: '',
    email: '',
    password: 'Password123!',
    phone: '',
    specialization: 'Cardiology',
    bio: '',
    experienceYears: 5,
    consultationFee: 75,
    workingHoursStart: '09:00',
    workingHoursEnd: '17:00',
    slotDurationMinutes: 30,
    weeklyOffDays: '0',
  });
  const [submittingDoctor, setSubmittingDoctor] = useState(false);

  // Leave Management State
  const [selectedDoctorForLeave, setSelectedDoctorForLeave] = useState(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const fetchAdminData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [analyticsRes, docRes] = await Promise.all([
        api.getAdminAnalytics(),
        api.getDoctors(),
      ]);
      setAnalytics(analyticsRes);
      setDoctors(docRes.doctors || []);
    } catch (e) {
      console.warn('Failed to load admin data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [isAuthenticated, role]);

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    setSubmittingDoctor(true);
    try {
      await api.createDoctor(newDoctorData);
      addToast('Doctor profile registered successfully!', 'success');
      setIsAddDoctorOpen(false);
      setNewDoctorData({
        name: '',
        email: '',
        password: 'Password123!',
        phone: '',
        specialization: 'Cardiology',
        bio: '',
        experienceYears: 5,
        consultationFee: 75,
        workingHoursStart: '09:00',
        workingHoursEnd: '17:00',
        slotDurationMinutes: 30,
        weeklyOffDays: '0',
      });
      fetchAdminData();
    } catch (err) {
      addToast(err.message || 'Failed to create doctor', 'error');
    } finally {
      setSubmittingDoctor(false);
    }
  };

  if (!isAuthenticated || role !== 'ADMIN') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto shadow-lg">
          <Shield className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Clinic Administration Portal
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Manage doctor profiles, consultation working hours, slot durations, leave days with auto-cancellation cascade, and inspect system audit metrics.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => quickDemoLogin('admin@nexuscare.clinic')}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-lg shadow-purple-500/20 transition-all"
          >
            1-Click Login as Admin (Dr. Arthur Vance)
          </button>
          <button
            onClick={onOpenAuth}
            className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Custom Sign In
          </button>
        </div>
      </div>
    );
  }

  const counts = analytics?.counts || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-purple-800 via-indigo-800 to-slate-900 p-8 text-white shadow-xl shadow-purple-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-purple-100">
            <Shield className="w-3.5 h-3.5" /> Clinic Administration & Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Clinic Management Dashboard
          </h1>
          <p className="text-purple-100 text-sm max-w-2xl leading-relaxed">
            Configure doctors, set operational schedules, declare leave days with cascade patient conflict notifications, and audit real-time bookings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddDoctorOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Doctor Profile
          </button>

          <button
            onClick={fetchAdminData}
            className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-blue-500" /> Patients
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {counts.totalPatients || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Stethoscope className="w-3.5 h-3.5 text-emerald-500" /> Doctors
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {counts.totalDoctors || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <CalendarCheck className="w-3.5 h-3.5 text-purple-500" /> Total Bookings
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {counts.totalAppointments || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Confirmed
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {counts.confirmedAppointments || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Completed
          </div>
          <div className="text-2xl font-extrabold text-blue-600">
            {counts.completedAppointments || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-1">
          <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider flex items-center gap-1">
            <Ban className="w-3.5 h-3.5" /> Cancelled
          </div>
          <div className="text-2xl font-extrabold text-rose-600">
            {counts.cancelledAppointments || 0}
          </div>
        </div>
      </div>

      {/* Doctor Roster & Operational Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-purple-600" />
              Doctor Roster & Operational Schedule
            </h3>
            <p className="text-xs text-slate-500">
              Manage slot durations, working hours, and trigger leave cascade handling
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={
                      doc.user.avatar ||
                      `https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&auto=format&fit=crop&q=80`
                    }
                    alt={doc.user.name}
                    className="w-12 h-12 rounded-xl object-cover border"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Dr. {doc.user.name}
                    </h4>
                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                      {doc.specialization}
                    </p>
                    <p className="text-[11px] text-slate-400">{doc.user.email}</p>
                  </div>
                </div>

                <div className="text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Working Hours:</span>
                    <strong className="text-slate-900 dark:text-slate-200">
                      {doc.workingHoursStart} - {doc.workingHoursEnd}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Slot Duration:</span>
                    <strong className="text-slate-900 dark:text-slate-200">
                      {doc.slotDurationMinutes} mins
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Consultation Fee:</span>
                    <strong className="text-slate-900 dark:text-slate-200">
                      ${doc.consultationFee}
                    </strong>
                  </div>
                </div>

                {/* Leave Days Badges */}
                {doc.leaveDays && doc.leaveDays.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                      Upcoming Leaves:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {doc.leaveDays.map((ld) => (
                        <span
                          key={ld.id}
                          className="px-2 py-0.5 rounded-md text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold"
                          title={ld.reason}
                        >
                          {ld.date}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setSelectedDoctorForLeave(doc);
                    setIsLeaveModalOpen(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CalendarX className="w-3.5 h-3.5" />
                  <span>Mark Leave Day</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Doctor Modal */}
      {isAddDoctorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="p-5 bg-gradient-to-r from-purple-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Register New Doctor</h3>
                  <p className="text-xs text-purple-100">
                    Add clinical profile with custom hours & slot durations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddDoctorOpen(false)}
                className="p-1 rounded-lg hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Doctor Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Julian Thorne, MD"
                  value={newDoctorData.name}
                  onChange={(e) => setNewDoctorData({ ...newDoctorData, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="dr.thorne@nexuscare.clinic"
                    value={newDoctorData.email}
                    onChange={(e) => setNewDoctorData({ ...newDoctorData, email: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Specialization *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cardiology, Dermatology"
                    value={newDoctorData.specialization}
                    onChange={(e) =>
                      setNewDoctorData({ ...newDoctorData, specialization: e.target.value })
                    }
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Slot Duration
                  </label>
                  <select
                    value={newDoctorData.slotDurationMinutes}
                    onChange={(e) =>
                      setNewDoctorData({
                        ...newDoctorData,
                        slotDurationMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Hours Start
                  </label>
                  <input
                    type="text"
                    placeholder="09:00"
                    value={newDoctorData.workingHoursStart}
                    onChange={(e) =>
                      setNewDoctorData({ ...newDoctorData, workingHoursStart: e.target.value })
                    }
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Hours End
                  </label>
                  <input
                    type="text"
                    placeholder="17:00"
                    value={newDoctorData.workingHoursEnd}
                    onChange={(e) =>
                      setNewDoctorData({ ...newDoctorData, workingHoursEnd: e.target.value })
                    }
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddDoctorOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDoctor}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-lg shadow-purple-500/20 disabled:opacity-50"
                >
                  {submittingDoctor ? 'Creating...' : 'Save Doctor Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Manager Modal */}
      {selectedDoctorForLeave && (
        <LeaveManagerModal
          isOpen={isLeaveModalOpen}
          onClose={() => {
            setIsLeaveModalOpen(false);
            setSelectedDoctorForLeave(null);
          }}
          doctor={selectedDoctorForLeave}
          onLeaveSet={() => {
            fetchAdminData();
          }}
        />
      )}
    </div>
  );
}
