const prisma = require('../config/db');
const { APPOINTMENT_STATUS, SLOT_HOLD_DURATION_MINUTES } = require('../config/constants');
const { generatePreVisitSummary } = require('./llmService');
const { sendBookingConfirmationEmails, sendDoctorLeaveCancellationEmail } = require('./emailService');
const { generateGoogleCalendarUrl, createGoogleCalendarEvent } = require('./calendarService');

/**
 * Utility: Check if a date string (YYYY-MM-DD) matches a doctor's weekly off days
 */
const isWeeklyOffDay = (dateStr, weeklyOffDaysStr = '0') => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
  const offDays = (weeklyOffDaysStr || '')
    .split(',')
    .map((d) => Number(d.trim()))
    .filter((n) => !isNaN(n));
  return offDays.includes(dayOfWeek);
};

/**
 * Utility: Generate time slots given start, end, and duration
 */
const generateTimeSlots = (startStr = '09:00', endStr = '17:00', durationMinutes = 30) => {
  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);

  let currentMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const slots = [];

  while (currentMinutes + durationMinutes <= endMinutes) {
    const sH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
    const sM = (currentMinutes % 60).toString().padStart(2, '0');

    const nextMinutes = currentMinutes + durationMinutes;
    const eH = Math.floor(nextMinutes / 60).toString().padStart(2, '0');
    const eM = (nextMinutes % 60).toString().padStart(2, '0');

    slots.push({
      startTime: `${sH}:${sM}`,
      endTime: `${eH}:${eM}`,
    });

    currentMinutes = nextMinutes;
  }

  return slots;
};

/**
 * 1. Get Doctor's Availability for a specific Date
 */
const getDoctorAvailability = async (doctorId, dateStr, currentPatientId = null) => {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: { user: true },
  });

  if (!doctor) {
    throw new Error('Doctor not found');
  }

  // Check if doctor is on leave
  const leave = await prisma.leaveDay.findUnique({
    where: {
      doctorId_date: {
        doctorId,
        date: dateStr,
      },
    },
  });

  const isOff = isWeeklyOffDay(dateStr, doctor.weeklyOffDays);

  if (leave || isOff) {
    return {
      doctor: {
        id: doctor.id,
        name: doctor.user.name,
        specialization: doctor.specialization,
      },
      date: dateStr,
      isAvailable: false,
      reason: leave ? `Doctor is on leave: ${leave.reason || 'Personal Leave'}` : 'Doctor scheduled weekly off-day',
      slots: [],
    };
  }

  // Generate all possible slots for doctor's working hours
  const allSlots = generateTimeSlots(
    doctor.workingHoursStart,
    doctor.workingHoursEnd,
    doctor.slotDurationMinutes
  );

  // Fetch confirmed/active appointments for this doctor on this date
  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      date: dateStr,
      status: {
        in: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.IN_PROGRESS],
      },
    },
    select: { startTime: true, endTime: true, status: true },
  });

  const bookedMap = new Map();
  bookedAppointments.forEach((a) => bookedMap.set(a.startTime, true));

  // Fetch active unexpired slot holds
  const now = new Date();
  const activeHolds = await prisma.slotHold.findMany({
    where: {
      doctorId,
      date: dateStr,
      expiresAt: { gt: now },
    },
    select: { startTime: true, patientId: true, holdToken: true, expiresAt: true },
  });

  const holdsMap = new Map();
  activeHolds.forEach((h) => holdsMap.set(h.startTime, h));

  const slotsWithStatus = allSlots.map((slot) => {
    const isBooked = bookedMap.has(slot.startTime);
    const hold = holdsMap.get(slot.startTime);

    let status = 'available'; // 'available' | 'booked' | 'held_by_you' | 'held_by_other'
    let holdRemainingSeconds = 0;
    let holdToken = null;

    if (isBooked) {
      status = 'booked';
    } else if (hold) {
      if (currentPatientId && hold.patientId === currentPatientId) {
        status = 'held_by_you';
        holdRemainingSeconds = Math.max(0, Math.floor((new Date(hold.expiresAt) - now) / 1000));
        holdToken = hold.holdToken;
      } else {
        status = 'held_by_other';
        holdRemainingSeconds = Math.max(0, Math.floor((new Date(hold.expiresAt) - now) / 1000));
      }
    }

    return {
      startTime: slot.startTime,
      endTime: slot.endTime,
      status,
      holdRemainingSeconds,
      holdToken,
    };
  });

  return {
    doctor: {
      id: doctor.id,
      name: doctor.user.name,
      specialization: doctor.specialization,
      consultationFee: doctor.consultationFee,
    },
    date: dateStr,
    isAvailable: true,
    slots: slotsWithStatus,
  };
};

/**
 * 2. Hold a Slot (5-Minute Temporary Lock to prevent race conditions during symptom checkout)
 */
const holdSlot = async (doctorId, patientId, dateStr, startTime, endTime) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SLOT_HOLD_DURATION_MINUTES * 60 * 1000);

  // 1. Check doctor leave
  const leave = await prisma.leaveDay.findUnique({
    where: { doctorId_date: { doctorId, date: dateStr } },
  });
  if (leave) {
    throw new Error('Doctor is on leave on this date');
  }

  // 2. Check if already booked
  const existingBooking = await prisma.appointment.findFirst({
    where: {
      doctorId,
      date: dateStr,
      startTime,
      status: { in: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.IN_PROGRESS] },
    },
  });
  if (existingBooking) {
    throw new Error('This time slot is already booked and confirmed.');
  }

  // 3. Atomically check existing holds
  const existingHold = await prisma.slotHold.findUnique({
    where: {
      doctorId_date_startTime: { doctorId, date: dateStr, startTime },
    },
  });

  const holdToken = `hold_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  if (existingHold) {
    if (existingHold.expiresAt > now && existingHold.patientId !== patientId) {
      throw new Error('This slot is currently being held by another patient. Please select another slot or try again in a few minutes.');
    }

    // Update existing hold
    const updatedHold = await prisma.slotHold.update({
      where: { id: existingHold.id },
      data: {
        patientId,
        holdToken,
        expiresAt,
      },
    });

    return {
      holdToken: updatedHold.holdToken,
      expiresAt: updatedHold.expiresAt,
      durationMinutes: SLOT_HOLD_DURATION_MINUTES,
    };
  }

  // Create new hold
  const newHold = await prisma.slotHold.create({
    data: {
      doctorId,
      patientId,
      date: dateStr,
      startTime,
      endTime,
      holdToken,
      expiresAt,
    },
  });

  return {
    holdToken: newHold.holdToken,
    expiresAt: newHold.expiresAt,
    durationMinutes: SLOT_HOLD_DURATION_MINUTES,
  };
};

/**
 * 3. Release Slot Hold
 */
const releaseHold = async (holdToken, patientId) => {
  try {
    await prisma.slotHold.deleteMany({
      where: {
        holdToken,
        patientId,
      },
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * 4. Confirm Appointment Booking within an ACID Transaction
 */
const confirmAppointment = async ({
  patientId,
  doctorId,
  date,
  startTime,
  endTime,
  holdToken,
  symptoms,
  symptomSeverity = 'Moderate',
  symptomDurationDays = 3,
}) => {
  const now = new Date();

  // Validate doctor exists
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: { user: true },
  });
  if (!doctor) throw new Error('Doctor not found');

  const patient = await prisma.user.findUnique({
    where: { id: patientId },
  });
  if (!patient) throw new Error('Patient not found');

  // Verify doctor is not on leave
  const leave = await prisma.leaveDay.findUnique({
    where: { doctorId_date: { doctorId, date } },
  });
  if (leave) {
    throw new Error(`Doctor is marked on leave for ${date}. Booking cancelled.`);
  }

  // Generate AI Pre-Visit Triage Summary
  const preVisitAI = await generatePreVisitSummary(symptoms, symptomSeverity, symptomDurationDays);

  const appointmentCode = `NX-${date.replace(/-/g, '').substring(2)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // Execute in ACID Database Transaction to guarantee zero double-booking
  const appointment = await prisma.$transaction(async (tx) => {
    // 1. Re-check if already booked in transaction
    const conflict = await tx.appointment.findFirst({
      where: {
        doctorId,
        date,
        startTime,
        status: { in: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.IN_PROGRESS] },
      },
    });

    if (conflict) {
      throw new Error('This slot was just booked by another patient. Please choose a different slot.');
    }

    // 2. If holdToken provided, verify hold
    if (holdToken) {
      const hold = await tx.slotHold.findUnique({
        where: { holdToken },
      });
      if (hold && hold.expiresAt < now && hold.patientId !== patientId) {
        throw new Error('Your slot reservation hold has expired. Please reserve the slot again.');
      }
    }

    // 3. Create the confirmed appointment
    const newAppointment = await tx.appointment.create({
      data: {
        appointmentCode,
        patientId,
        doctorId,
        date,
        startTime,
        endTime,
        status: APPOINTMENT_STATUS.CONFIRMED,
        patientSymptoms: symptoms,
        symptomSeverity,
        symptomDurationDays: Number(symptomDurationDays) || 3,
        preVisitSummary: JSON.stringify(preVisitAI),
      },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    // 4. Release all holds for this doctor/date/startTime
    await tx.slotHold.deleteMany({
      where: {
        doctorId,
        date,
        startTime,
      },
    });

    return newAppointment;
  });

  // Generate Calendar links & events
  const calendarUrl = generateGoogleCalendarUrl(appointment, doctor.user.name, doctor.specialization, patient.name);
  const calendarEvent = await createGoogleCalendarEvent(appointment, doctor.user, doctor, patient);

  // Update appointment with calendar details
  const updatedAppointment = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      googleCalendarEventId: calendarEvent.eventId,
      googleCalendarLink: calendarEvent.htmlLink || calendarUrl,
    },
    include: {
      patient: true,
      doctor: { include: { user: true } },
    },
  });

  // Async dispatch confirmation email to both patient and doctor
  sendBookingConfirmationEmails(updatedAppointment, patient, doctor, doctor.user).catch((err) => {
    console.error('[BookingService] Failed to dispatch confirmation emails:', err.message);
  });

  return updatedAppointment;
};

/**
 * 5. Handle Doctor Leave & Cancel Conflicting Bookings
 */
const markDoctorLeave = async (doctorId, date, reason = 'Doctor unavailable') => {
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: { user: true },
  });
  if (!doctor) throw new Error('Doctor profile not found');

  return await prisma.$transaction(async (tx) => {
    // 1. Create or update leave day
    const leaveDay = await tx.leaveDay.upsert({
      where: { doctorId_date: { doctorId, date } },
      update: { reason },
      create: { doctorId, date, reason },
    });

    // 2. Find all active bookings on that date
    const affectedAppointments = await tx.appointment.findMany({
      where: {
        doctorId,
        date,
        status: { in: [APPOINTMENT_STATUS.CONFIRMED, APPOINTMENT_STATUS.IN_PROGRESS] },
      },
      include: {
        patient: true,
      },
    });

    // 3. Mark affected appointments as CANCELLED due to doctor leave
    if (affectedAppointments.length > 0) {
      await tx.appointment.updateMany({
        where: {
          id: { in: affectedAppointments.map((a) => a.id) },
        },
        data: {
          status: APPOINTMENT_STATUS.CANCELLED,
          cancellationReason: `Doctor leave: ${reason}`,
          cancelledBy: 'SYSTEM_LEAVE',
        },
      });
    }

    // 4. Clean up any active slot holds
    await tx.slotHold.deleteMany({
      where: { doctorId, date },
    });

    // 5. Send cancellation emails to affected patients
    for (const apt of affectedAppointments) {
      sendDoctorLeaveCancellationEmail(apt, apt.patient, doctor.user, reason).catch((e) => {
        console.error(`[BookingService] Failed sending leave cancellation email for apt ${apt.id}:`, e.message);
      });
    }

    return {
      leaveDay,
      affectedCount: affectedAppointments.length,
      affectedAppointments: affectedAppointments.map((a) => ({
        id: a.id,
        appointmentCode: a.appointmentCode,
        patientName: a.patient.name,
        patientEmail: a.patient.email,
        startTime: a.startTime,
      })),
    };
  });
};

module.exports = {
  getDoctorAvailability,
  holdSlot,
  releaseHold,
  confirmAppointment,
  markDoctorLeave,
  generateTimeSlots,
};
