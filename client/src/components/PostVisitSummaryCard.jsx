import React from 'react';
import { Pill, CheckCircle, HeartHandshake, ListOrdered, CalendarCheck, Sparkles, FileText } from 'lucide-react';

export default function PostVisitSummaryCard({ summaryJson, diagnosis, doctorNotes }) {
  if (!summaryJson) return null;

  let data = null;
  try {
    data = typeof summaryJson === 'string' ? JSON.parse(summaryJson) : summaryJson;
  } catch (e) {
    return null;
  }

  const {
    patientFriendlySummary,
    medicationSchedule = [],
    followUpSteps = [],
    lifestyleAdvice,
    generatedBy,
  } = data;

  return (
    <div className="p-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 border-b border-emerald-100 dark:border-emerald-900/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Patient-Friendly Care Summary
              <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                AI Post-Visit
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Clear clinical guidance translated for home recovery
            </p>
          </div>
        </div>
      </div>

      {/* Diagnosis Banner */}
      {diagnosis && (
        <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800">
          <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Doctor's Diagnosis
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {diagnosis}
          </div>
        </div>
      )}

      {/* Patient Friendly Narrative */}
      <div className="mb-6">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Summary & Doctor's Advice
        </h4>
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          {patientFriendlySummary}
        </p>
      </div>

      {/* Medication Schedule */}
      {medicationSchedule && medicationSchedule.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Pill className="w-4 h-4 text-emerald-600" /> Prescribed Medication Schedule
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {medicationSchedule.map((med, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-400 transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    💊 {med.medication}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {med.dosage}
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mb-1">
                  <strong>Frequency:</strong> {med.frequency}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mb-2">
                  <strong>Duration:</strong> {med.duration}
                </div>
                {med.instructions && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                    {med.instructions}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Steps */}
      {followUpSteps && followUpSteps.length > 0 && (
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ListOrdered className="w-4 h-4 text-blue-600" /> Recommended Follow-Up Action Steps
          </h4>
          <ul className="space-y-2 bg-white dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            {followUpSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lifestyle Advice */}
      {lifestyleAdvice && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Lifestyle & Recovery Tip:</strong> {lifestyleAdvice}
          </div>
        </div>
      )}
    </div>
  );
}
