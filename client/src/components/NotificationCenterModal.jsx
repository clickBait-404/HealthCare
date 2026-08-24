import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, Send, AlertTriangle, CheckCircle, ExternalLink, X, Bell } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function NotificationCenterModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const { addToast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getNotificationLogs();
      setLogs(res.logs || []);
    } catch (e) {
      addToast('Failed to load notification logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchLogs();
  }, [isOpen]);

  const handleRetryEmails = async () => {
    setRetrying(true);
    try {
      await api.triggerEmailRetries();
      addToast('Email retry worker triggered! Retrying pending deliveries.', 'success');
      await fetchLogs();
    } catch (e) {
      addToast('Failed to trigger retries', 'error');
    } finally {
      setRetrying(false);
    }
  };

  const handleTriggerMedReminders = async () => {
    try {
      await api.triggerMedicationReminders();
      addToast('Medication reminder background job executed!', 'success');
      await fetchLogs();
    } catch (e) {
      addToast('Failed to trigger reminders', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Notification Audit & Email Delivery Queue
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track real-time emails, leave alerts, and retry worker dispatches
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRetryEmails}
              disabled={retrying}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              Retry Failed Emails
            </button>

            <button
              onClick={handleTriggerMedReminders}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              Simulate Med Reminders
            </button>

            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-sm text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
              Loading notification logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-500">
              No email notifications recorded yet.
            </div>
          ) : (
            logs.map((log) => {
              let meta = {};
              try {
                meta = log.metadata ? JSON.parse(log.metadata) : {};
              } catch (e) {}

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          log.status === 'SENT'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {log.status}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {log.subject}
                      </span>
                    </div>

                    <div className="text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>To: <strong>{log.recipientName || log.recipientEmail}</strong> ({log.recipientEmail})</span>
                      <span>•</span>
                      <span>Role: {log.recipientRole}</span>
                      <span>•</span>
                      <span>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>

                    {log.errorMessage && (
                      <div className="text-rose-600 dark:text-rose-400 font-medium">
                        Error: {log.errorMessage} (Attempt {log.attempts}/3)
                      </div>
                    )}
                  </div>

                  {meta.previewUrl && (
                    <a
                      href={meta.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-100 font-medium self-start sm:self-center transition-colors"
                    >
                      <span>Preview Email</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
