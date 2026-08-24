import React, { useState } from 'react';
import { Stethoscope, AlertCircle, Clock, Check, X } from 'lucide-react';
import SlotHoldTimer from './SlotHoldTimer';

export default function SymptomModal({
  isOpen,
  onClose,
  doctor,
  slot,
  date,
  holdToken,
  holdRemainingSeconds = 300,
  onSubmit,
  isSubmitting = false,
}) {
  const [symptoms, setSymptoms] = useState('');
  const [severity, setSeverity] = useState('Moderate');
  const [durationDays, setDurationDays] = useState(3);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!symptoms.trim() || symptoms.trim().length < 5) {
      setError('Please provide a descriptive explanation of your symptoms (at least 5 characters).');
      return;
    }
    setError('');
    onSubmit({
      symptoms: symptoms.trim(),
      symptomSeverity: severity,
      symptomDurationDays: Number(durationDays),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Pre-Visit Symptom Form</h3>
              <p className="text-xs text-emerald-100">
                Dr. {doctor?.user?.name || doctor?.name} • {date} at {slot?.startTime}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Active Hold Countdown Timer */}
          <SlotHoldTimer
            initialSeconds={holdRemainingSeconds}
            onExpire={() => {
              setError('Your 5-minute slot reservation hold has expired. Please select a slot again.');
            }}
            onCancel={onClose}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Symptoms Description */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                Describe Symptoms & Reason for Visit *
              </label>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                rows={4}
                required
                placeholder="e.g. Sharp pain in lower back after lifting weights, mild fever for 2 days, accompanied by nausea..."
                className="w-full text-sm p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Our AI Triage engine will analyze your inputs to generate clinical questions for your doctor before the consultation.
              </p>
            </div>

            {/* Severity Rating */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1.5">
                Severity Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Mild', 'Moderate', 'Severe'].map((lvl) => {
                  const isSelected = severity === lvl;
                  return (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setSeverity(lvl)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                        isSelected
                          ? lvl === 'Severe'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-500/20'
                            : lvl === 'Moderate'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                            : 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {lvl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration in Days */}
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-300 mb-1">
                How many days have symptoms lasted?
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="w-24 text-sm p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Days
                </span>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2 transition-all transform active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Booking & Generating AI Triage...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirm & Book Appointment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
