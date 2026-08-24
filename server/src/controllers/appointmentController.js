const prisma = require('../config/db');
const { APPOINTMENT_STATUS, ROLES } = require('../config/constants');
const { holdSlot, releaseHold, confirmAppointment } = require('../services/bookingService');
const { generateIcsContent } = require('../services/calendarService');

// Hold a slot
const holdSlotHandler = async (req, res) => {
  try {
    const { doctorId, date, startTime, endTime } = req.body;
    const patientId = req.user.id;

    if (!doctorId || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'doctorId, date, startTime, and endTime are required' });
    }

    const holdResult = await holdSlot(doctorId, patientId, date, startTime, endTime);
    return res.status(200).json({
      message: 'Slot temporarily reserved for 5 minutes',
      ...holdResult,
    });
  } catch (error) {
    console.error('[AppointmentController:holdSlot]', error);
    return res.status(400).json({ error: error.message || 'Failed to hold slot' });
  }
};

// Release hold
const releaseHoldHandler = async (req, res) => {
  try {
    const { holdToken } = req.body;
    const patientId = req.user.id;

    if (!holdToken) {
      return res.status(400).json({ error: 'holdToken is required' });
    }

    await releaseHold(holdToken, patientId);
    return res.json({ message: 'Slot hold released' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to release hold' });
  }
};

// Book appointment with Symptoms & AI Pre-visit summary
const bookAppointmentHandler = async (req, res) => {
  try {
    const {
      doctorId,
      date,
      startTime,
      endTime,
      holdToken,
      symptoms,
      symptomSeverity = 'Moderate',
      symptomDurationDays = 3,
    } = req.body;
    const patientId = req.user.id;

    if (!doctorId || !date || !startTime || !endTime || !symptoms) {
      return res.status(400).json({
        error: 'doctorId, date, startTime, endTime, and symptoms are required',
      });
    }

    const appointment = await confirmAppointment({
      patientId,
      doctorId,
      date,
      startTime,
      endTime,
      holdToken,
      symptoms,
      symptomSeverity,
      symptomDurationDays,
    });

    return res.status(201).json({
      message: 'Appointment booked successfully!',
      appointment,
    });
  } catch (error) {
    console.error('[AppointmentController:bookAppointment]', error);
    return res.status(400).json({ error: error.message || 'Booking failed' });
  }
};

// Get current user's appointments (Patient or Doctor)
const getMyAppointments = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let whereClause = {};

    if (role === ROLES.PATIENT) {
      whereClause.patientId = userId;
    } else if (role === ROLES.DOCTOR) {
      const doctorProfile = await prisma.doctorProfile.findUnique({
        where: { userId },
      });
      if (!doctorProfile) {
        return res.json({ appointments: [] });
      }
      whereClause.doctorId = doctorProfile.id;
    } else if (role === ROLES.ADMIN) {
      // Admins see all
      whereClause = {};
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        patient: {
          select: { id: true, name: true, email: true, phone: true, avatar: true },
        },
        doctor: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, avatar: true },
            },
          },
        },
        prescriptions: true,
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    });

    return res.json({ appointments });
  } catch (error) {
    console.error('[AppointmentController:getMyAppointments]', error);
    return res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

// Get single appointment by ID
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        prescriptions: true,
        medicationReminders: true,
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Access control check
    if (
      req.user.role !== ROLES.ADMIN &&
      appointment.patientId !== req.user.id &&
      appointment.doctor.userId !== req.user.id
    ) {
      return res.status(403).json({ error: 'Unauthorized to view this appointment' });
    }

    return res.json({ appointment });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch appointment' });
  }
};

// Cancel appointment
const cancelAppointmentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelled by user' } = req.body;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { doctor: true },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check authority
    const isPatient = appointment.patientId === req.user.id;
    const isDoctor = appointment.doctor.userId === req.user.id;
    const isAdmin = req.user.role === ROLES.ADMIN;

    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to cancel this appointment' });
    }

    const cancelledBy = isPatient ? 'PATIENT' : isDoctor ? 'DOCTOR' : 'ADMIN';

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: APPOINTMENT_STATUS.CANCELLED,
        cancellationReason: reason,
        cancelledBy,
      },
    });

    return res.json({ message: 'Appointment cancelled successfully', appointment: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to cancel appointment' });
  }
};

// Download standard .ics file
const downloadIcsHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const icsString = generateIcsContent(
      appointment,
      appointment.doctor.user.name,
      appointment.doctor.specialization,
      appointment.patient.name
    );

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=appointment-${appointment.appointmentCode}.ics`);
    return res.send(icsString);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate ICS file' });
  }
};

module.exports = {
  holdSlotHandler,
  releaseHoldHandler,
  bookAppointmentHandler,
  getMyAppointments,
  getAppointmentById,
  cancelAppointmentHandler,
  downloadIcsHandler,
};
