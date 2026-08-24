import React from 'react';
import { Sparkles, AlertCircle, HelpCircle, Activity, ShieldCheck } from 'lucide-react';

export default function PreVisitSummaryCard({ summaryJson, compact = false }) {
  if (!summaryJson) return null;

  let data = null;
  try {
    data = typeof summaryJson === 'string' ? JSON.parse(summaryJson) : summaryJson;
  } catch (e) {
    return null;
  }

  const { urgencyLevel = 'Medium', chiefComplaint, suggestedQuestions = [], generatedBy } = data;

  const urgencyStyles = {
    High: {
      bg: 'bg-rose-500/10 dark:bg-rose-950/40',
      border: 'border-rose-300 dark:border-rose-800',
      badge: 'bg-rose-600 text-white shadow-rose-500/20',
      text: 'text-rose-700 dark:text-rose-300',
      icon: 'text-rose-600 dark:text-rose-400',
    },
    Medium: {
      bg: 'bg-amber-500/10 dark:bg-amber-950/40',
      border: 'border-amber-300 dark:border-amber-800',
      badge: 'bg-amber-500 text-white shadow-amber-500/20',
      text: 'text-amber-700 dark:text-amber-300',
      icon: 'text-amber-600 dark:text-amber-400',
    },
    Low: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-950/40',
      border: 'border-emerald-300 dark:border-emerald-800',
      badge: 'bg-emerald-600 text-white shadow-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: 'text-emerald-600 dark:text-emerald-400',
    },
  }[urgencyLevel] || {
    bg: 'bg-slate-50 dark:bg-slate-900',
    border: 'border-slate-300 dark:border-slate-700',
    badge: 'bg-slate-600 text-white',
    text: 'text-slate-700 dark:text-slate-300',
    icon: 'text-slate-500',
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${urgencyStyles.bg} ${urgencyStyles.border}`}>
        <Sparkles className={`w-3.5 h-3.5 ${urgencyStyles.icon}`} />
        <span className="font-medium text-slate-700 dark:text-slate-300">Triage:</span>
        <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] ${urgencyStyles.badge}`}>
          {urgencyLevel} Urgency
        </span>
      </div>
    );
  }

  return (
    <div className={`p-5 rounded-2xl border transition-all shadow-sm ${urgencyStyles.bg} ${urgencyStyles.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white dark:bg-slate-900 shadow-xs">
            <Sparkles className={`w-5 h-5 ${urgencyStyles.icon}`} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              AI Pre-Visit Clinical Triage
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Automated intake analysis for doctor preparation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${urgencyStyles.badge}`}>
            {urgencyLevel} Urgency
          </span>
        </div>
      </div>

      {/* Chief Complaint */}
      <div className="mb-4 bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-blue-500" /> Chief Clinical Complaint
        </div>
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {chiefComplaint || 'Patient experiencing symptomatic distress.'}
        </p>
      </div>

      {/* Suggested Questions for Doctor */}
      {suggestedQuestions && suggestedQuestions.length > 0 && (
        <div className="bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-purple-500" /> Suggested Diagnostic Questions for Doctor
          </div>
          <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
            {suggestedQuestions.map((q, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="pt-0.5">{q}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {generatedBy && (
        <div className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-end gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Engine: {generatedBy}
        </div>
      )}
    </div>
  );
}
