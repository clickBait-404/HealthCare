import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Calendar,
  Clock,
  User,
  Sparkles,
  CheckCircle,
  FileText,
  CalendarX,
  RefreshCw,
  Send,
  AlertTriangle,
  Pill,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PreVisitSummaryCard from '../components/PreVisitSummaryCard';
import PostVisitSummaryCard from '../components/PostVisitSummaryCard';
import PrescriptionBuilder from '../components/PrescriptionBuilder';
import LeaveManagerModal from '../components/LeaveManagerModal';

export default function DoctorPortal({ onOpenAuth }) {
  const { user, role, isAuthenticated, quickDemoLogin } = useAuth();
  const { addToast } = useToast();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Consultation State
  const [activeConsultation, setActiveConsultation] = useState(null); // Selected appointment
  const [doctorNotes, setDoctorNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  const [isSubmittingConsultation, setIsSubmittingConsultation] = useState(false);

  // Leave Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const fetchDoctorAppointments = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await api.getMyAppointments();
      setAppointments(res.appointments || []);
    } catch (e) {
      addToast('Failed to fetch doctor appointments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorAppointments();
  }, [isAuthenticated, role]);

  const openConsultation = (apt) => {
    setActiveConsultation(apt);
    setDoctorNotes(apt.doctorNotes || '');
    setDiagnosis(apt.diagnosis || '');
    setPrescriptions(
      apt.prescriptions && apt.prescriptions.length > 0
        ? apt.prescriptions.map((p) => ({
            medicationName: p.medicationName,
            dosage: p.dosage,
            frequency: p.frequency,
            durationDays: p.durationDays,
            instructions: p.instructions,
          }))
        : [
            {
              medicationName: 'Amoxicillin',
              dosage: '500mg',
              frequency: 'TWICE_DAILY',
              durationDays: 5,
              instructions: 'Take with full glass of water after food',
            },
          ]
    );
  };

  const handleCompleteConsultation = async (e) => {
    e.preventDefault();
    if (!doctorNotes.trim() || !diagnosis.trim()) {
      addToast('Please enter doctor notes and a diagnosis', 'warning');
      return;
    }

    setIsSubmittingConsultation(true);
    try {
      const res = await api.completeConsultation(activeConsultation.id, {
        doctorNotes,
        diagnosis,
        prescriptions,
      });

      addToast('🎉 Consultation completed! AI post-visit summary generated and emailed to patient.', 'success');
      setActiveConsultation(null);
      fetchDoctorAppointments();
    } catch (err) {
      addToast(err.message || 'Failed to complete consultation', 'error');
    } finally {
      setIsSubmittingConsultation(false);
    }
  };

  // If user is not logged in as DOCTOR, offer 1-click doctor login
  if (!isAuthenticated || role !== 'DOCTOR') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto shadow-lg">
          <Stethoscope className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Doctor Clinical Portal
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Review AI-analyzed patient symptoms, conduct consultations, prescribe medications, and automatically generate patient-friendly care summaries.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => quickDemoLogin('dr.jenkins@nexuscare.clinic')}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all"
          >
            1-Click Login as Dr. Sarah Jenkins
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

  const filteredAppointments = appointments.filter((apt) => {
    if (filterStatus === 'CONFIRMED') return apt.status === 'CONFIRMED';
    if (filterStatus === 'COMPLETED') return apt.status === 'COMPLETED';
    if (filterStatus === 'CANCELLED') return apt.status === 'CANCELLED';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-clinic-700 p-8 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-blue-100">
            <Stethoscope className="w-3.5 h-3.5" /> Doctor Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, Dr. {user.name}
          </h1>
          <p className="text-blue-100 text-sm max-w-2xl leading-relaxed">
            Review pre-visit triage urgency metrics, clinical symptoms, and AI-suggested diagnostic questions before patient consultations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold flex items-center gap-2 transition-all"
          >
            <CalendarX className="w-4 h-4" />
            Mark Leave Day
          </button>
          <button
            onClick={fetchDoctorAppointments}
            className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-all"
            title="Refresh Schedule"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
          {['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                filterStatus === st
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {st} ({appointments.filter((a) => (st === 'ALL' ? true : a.status === st)).length})
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500">
          Showing {filteredAppointments.length} patient consultations
        </span>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="text-center py-16 text-sm text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          Loading patient appointments...
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No appointments in this view
          </h4>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAppointments.map((apt) => {
            const isConfirmed = apt.status === 'CONFIRMED';
            const isCompleted = apt.status === 'COMPLETED';

            return (
              <div
                key={apt.id}
                className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5"
              >
                {/* Patient Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        apt.patient.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                          apt.patient.name
                        )}`
                      }
                      alt={apt.patient.name}
                      className="w-12 h-12 rounded-xl object-cover border"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {apt.patient.name}
                        </h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                            isCompleted
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : apt.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {apt.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {apt.patient.email} • Code: <strong>{apt.appointmentCode}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Date & Action Button */}
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{apt.date}</span>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{apt.startTime} - {apt.endTime}</span>
                    </div>

                    {isConfirmed && (
                      <button
                        onClick={() => openConsultation(apt)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Start Consultation</span>
                      </button>
                    )}

                    {isCompleted && (
                      <button
                        onClick={() => openConsultation(apt)}
                        className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
                      >
                        Edit Notes / Prescriptions
                      </button>
                    )}
                  </div>
                </div>

                {/* AI Pre-Visit Triage Card */}
                {apt.preVisitSummary && (
                  <PreVisitSummaryCard summaryJson={apt.preVisitSummary} />
                )}

                {/* Raw Reported Symptoms */}
                <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong>Patient's Submitted Symptoms:</strong> {apt.patientSymptoms} (Severity:{' '}
                  {apt.symptomSeverity || 'Moderate'}, Duration: {apt.symptomDurationDays || 3} days)
                </div>

                {/* Post-Visit Clinical Summary if Completed */}
                {isCompleted && apt.postVisitSummary && (
                  <PostVisitSummaryCard
                    summaryJson={apt.postVisitSummary}
                    diagnosis={apt.diagnosis}
                    doctorNotes={apt.doctorNotes}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Consultation Room Modal */}
      {activeConsultation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">
                    Consultation Room: {activeConsultation.patient.name}
                  </h3>
                  <p className="text-xs text-blue-100">
                    Slot: {activeConsultation.date} ({activeConsultation.startTime} -{' '}
                    {activeConsultation.endTime})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveConsultation(null)}
                disabled={isSubmittingConsultation}
                className="p-1 rounded-lg hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleCompleteConsultation} className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Pre-Visit Triage Reference Card */}
              {activeConsultation.preVisitSummary && (
                <PreVisitSummaryCard summaryJson={activeConsultation.preVisitSummary} />
              )}

              {/* Diagnosis Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Primary Clinical Diagnosis *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acute Streptococcal Pharyngitis / Hypertension Stage 1"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Doctor Clinical Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Examination & Consultation Notes *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g. Physical exam showed bilateral throat congestion. BP: 120/80 mmHg, Pulse: 78 bpm. Advised hydration, warm gargles, and prescribed 5-day antibiotic regimen..."
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Our AI engine will automatically convert these notes into plain-language instructions, medication timetables, and follow-up guidance for the patient.
                </p>
              </div>

              {/* Prescriptions & Medications */}
              <PrescriptionBuilder prescriptions={prescriptions} onChange={setPrescriptions} />

              {/* Footer Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveConsultation(null)}
                  disabled={isSubmittingConsultation}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingConsultation}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2 transition-all transform active:scale-95"
                >
                  {isSubmittingConsultation ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating AI Patient Summary & Reminders...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Complete Visit & Generate AI Summary</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {user.doctorProfile && (
        <LeaveManagerModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          doctor={user.doctorProfile}
          onLeaveSet={() => {
            fetchDoctorAppointments();
          }}
        />
      )}
    </div>
  );
}
