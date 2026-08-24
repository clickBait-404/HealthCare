import React, { useState } from 'react';
import { CalendarX, AlertTriangle, Check, X, Users } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function LeaveManagerModal({ isOpen, onClose, doctor, onLeaveSet }) {
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictResult, setConflictResult] = useState(null);
  const { addToast } = useToast();

  if (!isOpen || !doctor) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date) {
      addToast('Please pick a leave date', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.setDoctorLeave(doctor.id, {
        date,
        reason: reason || 'Scheduled Doctor Leave / Clinic Maintenance',
      });

      setConflictResult(res);
      addToast(res.message, 'success');
      if (onLeaveSet) onLeaveSet();
    } catch (err) {
      addToast(err.message || 'Failed to record leave', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <CalendarX className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Mark Doctor Leave</h3>
              <p className="text-xs text-rose-100">
                Dr. {doctor.user?.name || doctor.name} ({doctor.specialization})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>Cascade Conflict Handling:</strong> Marking this doctor on leave will automatically cancel any existing bookings on that date, release held slots, and dispatch cancellation emails to affected patients.
            </div>
          </div>

          {conflictResult ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                <Check className="w-4 h-4" /> Leave Recorded Successfully!
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                <strong>{conflictResult.affectedCount}</strong> patient appointment(s) were cancelled and notified via email.
              </p>
              {conflictResult.affectedAppointments && conflictResult.affectedAppointments.length > 0 && (
                <div className="mt-2 text-xs space-y-1">
                  <div className="font-semibold text-slate-600 dark:text-slate-400">Affected Patients:</div>
                  {conflictResult.affectedAppointments.map((apt) => (
                    <div key={apt.id} className="p-2 bg-white dark:bg-slate-900 rounded border text-[11px]">
                      • {apt.patientName} ({apt.patientEmail}) at {apt.startTime}
                    </div>
                  ))}
                </div>
              )}
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Leave Date *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                  Reason for Leave
                </label>
                <input
                  type="text"
                  placeholder="e.g. Medical conference, personal emergency, clinic maintenance..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Leave & Notifications...</span>
                    </>
                  ) : (
                    <>
                      <CalendarX className="w-4 h-4" />
                      <span>Confirm Leave & Notify Patients</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
