import React from 'react';
import { Plus, Trash2, Pill, Clock, Calendar } from 'lucide-react';

export default function PrescriptionBuilder({ prescriptions, onChange }) {
  const addMedication = () => {
    onChange([
      ...prescriptions,
      {
        medicationName: '',
        dosage: '500mg',
        frequency: 'ONCE_DAILY',
        durationDays: 5,
        instructions: 'Take after meals with water',
      },
    ]);
  };

  const updateMedication = (index, field, value) => {
    const updated = [...prescriptions];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeMedication = (index) => {
    onChange(prescriptions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Pill className="w-4 h-4 text-emerald-600" /> Prescriptions & Medications
        </label>
        <button
          type="button"
          onClick={addMedication}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Medicine
        </button>
      </div>

      {prescriptions.length === 0 ? (
        <div className="p-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-center text-xs text-slate-500">
          No medications prescribed yet. Click "+ Add Medicine" to prescribe drugs with automated patient reminders.
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 space-y-3 relative group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Item #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeMedication(idx)}
                  className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {/* Medication Name */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Medication Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amoxicillin, Paracetamol..."
                    value={rx.medicationName}
                    onChange={(e) => updateMedication(idx, 'medicationName', e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Dosage */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Dosage</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500mg, 10ml"
                    value={rx.dosage}
                    onChange={(e) => updateMedication(idx, 'dosage', e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={rx.durationDays}
                    onChange={(e) => updateMedication(idx, 'durationDays', e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Frequency */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Frequency Schedule</label>
                  <select
                    value={rx.frequency}
                    onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="ONCE_DAILY">Once Daily (09:00 AM)</option>
                    <option value="TWICE_DAILY">Twice Daily (09:00 AM & 08:00 PM)</option>
                    <option value="THRICE_DAILY">Thrice Daily (08:00 AM, 02:00 PM, 08:00 PM)</option>
                    <option value="AS_NEEDED">As Needed (PRN)</option>
                  </select>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Patient Instructions</label>
                  <input
                    type="text"
                    placeholder="e.g. Take after breakfast with water"
                    value={rx.instructions}
                    onChange={(e) => updateMedication(idx, 'instructions', e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
