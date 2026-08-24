import React, { useState, useEffect } from 'react';
import {
  Search,
  Calendar as CalendarIcon,
  Clock,
  User,
  Star,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Download,
  CalendarPlus,
  HeartPulse,
  Pill,
  Sparkles,
  FileText,
  Ban,
  Filter,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import SymptomModal from '../components/SymptomModal';
import PreVisitSummaryCard from '../components/PreVisitSummaryCard';
import PostVisitSummaryCard from '../components/PostVisitSummaryCard';

export default function PatientPortal({ onOpenAuth }) {
  const { user, isAuthenticated } = useAuth();
  const { addToast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState('book'); // 'book' | 'my-appointments' | 'medications'
  const [doctors, setDoctors] = useState([]);
  const [selectedSpecialization, setSelectedSpecialization] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Booking Flow State
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [slotsData, setSlotsData] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [activeHold, setActiveHold] = useState(null); // { slot, holdToken, expiresAt, remainingSeconds }
  const [isSymptomModalOpen, setIsSymptomModalOpen] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Patient Appointments & Reminders State
  const [myAppointments, setMyAppointments] = useState([]);
  const [medReminders, setMedReminders] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Load Doctors
  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const res = await api.getDoctors({
        specialization: selectedSpecialization,
        search: searchQuery,
      });
      setDoctors(res.doctors || []);
      if (res.doctors?.length > 0 && !selectedDoctor) {
        setSelectedDoctor(res.doctors[0]);
      }
    } catch (e) {
      addToast('Failed to load doctors', 'error');
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [selectedSpecialization, searchQuery]);

  // Load Slots when Doctor or Date changes
  const fetchSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;
    setLoadingSlots(true);
    try {
      const res = await api.getDoctorSlots(selectedDoctor.id, selectedDate);
      setSlotsData(res);
    } catch (e) {
      setSlotsData(null);
    } finally {
      setLoadingSlots(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  // Load My Appointments & Reminders
  const fetchMyAppointments = async () => {
    if (!isAuthenticated) return;
    setLoadingAppointments(true);
    try {
      const [aptRes, medRes] = await Promise.all([
        api.getMyAppointments(),
        api.getMedicationReminders(),
      ]);
      setMyAppointments(aptRes.appointments || []);
      setMedReminders(medRes.reminders || []);
    } catch (e) {
      console.warn('Could not load patient records', e);
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    if (activeTab !== 'book') {
      fetchMyAppointments();
    }
  }, [activeTab, isAuthenticated]);

  // Handle Slot Click (Triggers 5-minute atomic hold lock)
  const handleSelectSlot = async (slot) => {
    if (!isAuthenticated) {
      onOpenAuth();
      addToast('Please sign in or use 1-click demo to book an appointment', 'warning');
      return;
    }

    if (slot.status === 'booked' || slot.status === 'held_by_other') {
      addToast('This time slot is unavailable. Please select another slot.', 'warning');
      return;
    }

    try {
      const res = await api.holdSlot({
        doctorId: selectedDoctor.id,
        date: selectedDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });

      setActiveHold({
        slot,
        holdToken: res.holdToken,
        expiresAt: res.expiresAt,
        remainingSeconds: res.durationMinutes * 60,
      });

      setIsSymptomModalOpen(true);
      addToast('Time slot temporarily locked for 5 minutes! Complete symptom form to confirm.', 'info');
      fetchSlots();
    } catch (err) {
      addToast(err.message || 'Failed to lock slot', 'error');
      fetchSlots();
    }
  };

  // Submit Final Booking with Symptoms
  const handleConfirmBooking = async (symptomData) => {
    setIsSubmittingBooking(true);
    try {
      const res = await api.bookAppointment({
        doctorId: selectedDoctor.id,
        date: selectedDate,
        startTime: activeHold.slot.startTime,
        endTime: activeHold.slot.endTime,
        holdToken: activeHold.holdToken,
        symptoms: symptomData.symptoms,
        symptomSeverity: symptomData.symptomSeverity,
        symptomDurationDays: symptomData.symptomDurationDays,
      });

      setIsSymptomModalOpen(false);
      setActiveHold(null);
      addToast('🎉 Appointment confirmed! Confirmation email & calendar invite dispatched.', 'success', 6000);
      setActiveTab('my-appointments');
      fetchSlots();
    } catch (err) {
      addToast(err.message || 'Booking failed', 'error');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Cancel Appointment
  const handleCancelAppointment = async (aptId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.cancelAppointment(aptId, 'Patient requested cancellation');
      addToast('Appointment cancelled successfully', 'info');
      fetchMyAppointments();
    } catch (e) {
      addToast('Failed to cancel appointment', 'error');
    }
  };

  const specializationsList = [
    'All',
    'Cardiology',
    'Neurology',
    'General Medicine & Triage',
    'Dermatology',
    'Pediatrics',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Banner / Triage Callout */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-clinic-600 p-8 text-white shadow-xl shadow-emerald-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-emerald-100">
            <Sparkles className="w-3.5 h-3.5" /> Intelligent Clinical Booking
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Schedule Care with AI-Assisted Symptom Triage
          </h1>
          <p className="text-emerald-100 text-sm max-w-2xl leading-relaxed">
            Reserve consultation slots with real-time atomic locks, provide symptoms for doctor preparation, and receive personalized post-visit care plans.
          </p>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-black/20 backdrop-blur-md rounded-2xl z-10 self-start md:self-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('book')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'book'
                ? 'bg-white text-emerald-800 shadow-md'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Find Doctor & Book
          </button>
          <button
            onClick={() => setActiveTab('my-appointments')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'my-appointments'
                ? 'bg-white text-emerald-800 shadow-md'
                : 'text-white/80 hover:text-white'
            }`}
          >
            My Appointments
          </button>
          <button
            onClick={() => setActiveTab('medications')}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === 'medications'
                ? 'bg-white text-emerald-800 shadow-md'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Medication Tracker
          </button>
        </div>
      </div>

      {/* TAB 1: FIND DOCTOR & BOOK */}
      {activeTab === 'book' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Doctor Directory */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  Select Specialist
                </h3>
                <span className="text-xs text-slate-500">{doctors.length} available</span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search doctor or specialization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Specialization Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {specializationsList.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => setSelectedSpecialization(spec)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-all ${
                      selectedSpecialization === spec
                        ? 'bg-emerald-600 text-white font-bold shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>

            {/* Doctors List Cards */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {loadingDoctors ? (
                <div className="p-8 text-center text-xs text-slate-500">Loading doctors...</div>
              ) : doctors.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No doctors found matching filters.
                </div>
              ) : (
                doctors.map((doc) => {
                  const isSelected = selectedDoctor?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctor(doc)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <img
                          src={
                            doc.user.avatar ||
                            `https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&auto=format&fit=crop&q=80`
                          }
                          alt={doc.user.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              Dr. {doc.user.name}
                            </h4>
                            <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-500" />
                              <span>{doc.rating}</span>
                            </div>
                          </div>

                          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {doc.specialization}
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                            {doc.bio}
                          </p>

                          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                            <span>⏱ {doc.slotDurationMinutes} min slot</span>
                            <span>💼 {doc.experienceYears}+ yrs exp</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              ${doc.consultationFee}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Slot Picker & Hold Engine */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-6">
              {/* Doctor Header & Date Selector */}
              {selectedDoctor && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Booking Consultation with
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Dr. {selectedDoctor.user.name}
                    </h3>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {selectedDoctor.specialization} • Working hours: {selectedDoctor.workingHoursStart} - {selectedDoctor.workingHoursEnd}
                    </p>
                  </div>

                  {/* Date Input */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Date:
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="text-xs font-bold p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Slot Legend */}
              <div className="flex items-center gap-4 text-xs flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-50 border border-emerald-500 dark:bg-emerald-950" />
                  <span className="text-slate-600 dark:text-slate-400">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-amber-400 dark:bg-amber-600" />
                  <span className="text-slate-600 dark:text-slate-400">Held (Locking)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-slate-200 dark:bg-slate-800" />
                  <span className="text-slate-600 dark:text-slate-400">Booked</span>
                </div>
              </div>

              {/* Slots Grid */}
              <div>
                {loadingSlots ? (
                  <div className="text-center py-12 text-xs text-slate-500">
                    Checking slot availability and active locks...
                  </div>
                ) : !slotsData?.isAvailable ? (
                  <div className="p-8 text-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2">
                    <Ban className="w-8 h-8 text-rose-500 mx-auto" />
                    <div className="text-sm font-bold text-rose-800 dark:text-rose-200">
                      Doctor Unavailable on {selectedDate}
                    </div>
                    <p className="text-xs text-rose-600 dark:text-rose-400">
                      {slotsData?.reason || 'Doctor is on official leave or scheduled weekly off.'}
                    </p>
                  </div>
                ) : slotsData?.slots.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500">
                    No consultation slots configured for this date.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                    {slotsData.slots.map((slot) => {
                      let btnClass =
                        'bg-slate-50 dark:bg-slate-950 border-emerald-300 dark:border-emerald-800/80 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 text-slate-800 dark:text-slate-200';
                      let statusLabel = 'Available';

                      if (slot.status === 'booked') {
                        btnClass =
                          'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-60 line-through';
                        statusLabel = 'Booked';
                      } else if (slot.status === 'held_by_other') {
                        btnClass =
                          'bg-amber-100 dark:bg-amber-950/80 border-amber-400 text-amber-900 dark:text-amber-200 cursor-not-allowed';
                        statusLabel = `Held (${slot.holdRemainingSeconds}s)`;
                      } else if (slot.status === 'held_by_you') {
                        btnClass =
                          'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400';
                        statusLabel = 'Selected';
                      }

                      return (
                        <button
                          key={slot.startTime}
                          disabled={slot.status === 'booked' || slot.status === 'held_by_other'}
                          onClick={() => handleSelectSlot(slot)}
                          className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${btnClass}`}
                        >
                          <span className="text-xs font-bold">{slot.startTime}</span>
                          <span className="text-[10px] opacity-80">{statusLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Info Note on Concurrency Locking */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
                  Race-Condition Free Booking Engine
                </div>
                <p className="text-[11px] leading-relaxed">
                  When you select a slot, an atomic 5-minute database reservation hold is established. Simultaneous booking attempts are safely queued and rejected to ensure zero double-booking.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY APPOINTMENTS */}
      {activeTab === 'my-appointments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                My Consultation Records
              </h2>
              <p className="text-xs text-slate-500">
                View your confirmed visits, AI symptom triage, post-visit summaries, and calendar links
              </p>
            </div>
            <button
              onClick={fetchMyAppointments}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 text-slate-700 dark:text-slate-200"
            >
              Refresh
            </button>
          </div>

          {loadingAppointments ? (
            <div className="text-center py-16 text-sm text-slate-500">
              Loading your appointments...
            </div>
          ) : myAppointments.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <CalendarIcon className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No appointments booked yet
              </h4>
              <p className="text-xs text-slate-500">
                Switch to the "Find Doctor & Book" tab to schedule your first consultation.
              </p>
              <button
                onClick={() => setActiveTab('book')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
              >
                Book a Visit Now
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {myAppointments.map((apt) => {
                const isCompleted = apt.status === 'COMPLETED';
                const isCancelled = apt.status === 'CANCELLED';

                return (
                  <div
                    key={apt.id}
                    className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5"
                  >
                    {/* Top Row: Doctor info & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            apt.doctor.user.avatar ||
                            'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&auto=format&fit=crop&q=80'
                          }
                          alt={apt.doctor.user.name}
                          className="w-12 h-12 rounded-xl object-cover border"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900 dark:text-white">
                              Dr. {apt.doctor.user.name}
                            </h4>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                                isCompleted
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                  : isCancelled
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              }`}
                            >
                              {apt.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {apt.doctor.specialization} • Code: <strong>{apt.appointmentCode}</strong>
                          </p>
                        </div>
                      </div>

                      {/* Date / Time & Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>{apt.date}</span>
                          <span>•</span>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{apt.startTime} - {apt.endTime}</span>
                        </div>

                        {apt.googleCalendarLink && !isCancelled && (
                          <a
                            href={apt.googleCalendarLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-100 flex items-center gap-1.5 transition-colors"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span>Add to Google Calendar</span>
                          </a>
                        )}

                        {!isCancelled && (
                          <a
                            href={`/api/appointments/${apt.id}/ics`}
                            download
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                            title="Download .ICS Calendar File"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}

                        {!isCompleted && !isCancelled && (
                          <button
                            onClick={() => handleCancelAppointment(apt.id)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
                          >
                            Cancel Visit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Reported Symptoms & Pre-visit Card */}
                    <div className="space-y-3">
                      <div className="text-xs text-slate-700 dark:text-slate-300">
                        <strong>Reported Symptoms:</strong> {apt.patientSymptoms} (Severity:{' '}
                        {apt.symptomSeverity || 'Moderate'})
                      </div>

                      {apt.preVisitSummary && (
                        <PreVisitSummaryCard summaryJson={apt.preVisitSummary} />
                      )}
                    </div>

                    {/* Post-Visit Clinical Summary if Completed */}
                    {isCompleted && apt.postVisitSummary && (
                      <div className="pt-2">
                        <PostVisitSummaryCard
                          summaryJson={apt.postVisitSummary}
                          diagnosis={apt.diagnosis}
                          doctorNotes={apt.doctorNotes}
                        />
                      </div>
                    )}

                    {/* Leave Cancellation Banner if cancelled by doctor leave */}
                    {isCancelled && apt.cancellationReason && (
                      <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
                        <strong>Cancellation Note:</strong> {apt.cancellationReason} (Cancelled by:{' '}
                        {apt.cancelledBy || 'SYSTEM'})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MEDICATION TRACKER */}
      {activeTab === 'medications' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600" />
                Active Medication Schedule & Reminders
              </h2>
              <p className="text-xs text-slate-500">
                Automated reminders dispatched according to your doctor's prescription frequency
              </p>
            </div>
            <button
              onClick={fetchMyAppointments}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 text-slate-700 dark:text-slate-200"
            >
              Refresh
            </button>
          </div>

          {medReminders.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <Pill className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No active medication reminders
              </h4>
              <p className="text-xs text-slate-500">
                Prescriptions issued by your doctor during consultations will appear here with automated reminders.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medReminders.map((rem) => (
                <div
                  key={rem.id}
                  className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-white dark:bg-slate-900 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      💊 {rem.medicationName}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {rem.dosage}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <div>
                      <strong>Frequency:</strong> {rem.frequency}
                    </div>
                    <div>
                      <strong>Scheduled Dose:</strong> {rem.scheduledTime}
                    </div>
                    {rem.appointment?.doctor?.user?.name && (
                      <div>
                        <strong>Prescribed by:</strong> Dr. {rem.appointment.doctor.user.name}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Email Reminder Sent
                    </span>
                    <span>{new Date(rem.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Symptom Intake Modal */}
      {selectedDoctor && activeHold && (
        <SymptomModal
          isOpen={isSymptomModalOpen}
          onClose={() => {
            setIsSymptomModalOpen(false);
            if (activeHold?.holdToken) {
              api.releaseHold({ holdToken: activeHold.holdToken });
            }
            setActiveHold(null);
            fetchSlots();
          }}
          doctor={selectedDoctor}
          slot={activeHold.slot}
          date={selectedDate}
          holdToken={activeHold.holdToken}
          holdRemainingSeconds={activeHold.remainingSeconds}
          onSubmit={handleConfirmBooking}
          isSubmitting={isSubmittingBooking}
        />
      )}
    </div>
  );
}

function ShieldCheckIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
