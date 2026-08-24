const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { ROLES, APPOINTMENT_STATUS } = require('../config/constants');
const { markDoctorLeave } = require('../services/bookingService');

// Create a new doctor (User + DoctorProfile)
const createDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      specialization,
      bio,
      experienceYears,
      consultationFee,
      workingHoursStart = '09:00',
      workingHoursEnd = '17:00',
      slotDurationMinutes = 30,
      weeklyOffDays = '0',
    } = req.body;

    if (!name || !email || !password || !specialization) {
      return res.status(400).json({ error: 'Name, email, password, and specialization are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const doctor = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: ROLES.DOCTOR,
        phone,
        doctorProfile: {
          create: {
            specialization,
            bio: bio || `Specialist in ${specialization}`,
            experienceYears: Number(experienceYears) || 5,
            consultationFee: Number(consultationFee) || 50.0,
            workingHoursStart,
            workingHoursEnd,
            slotDurationMinutes: Number(slotDurationMinutes) || 30,
            weeklyOffDays,
          },
        },
      },
      include: {
        doctorProfile: true,
      },
    });

    return res.status(201).json({
      message: 'Doctor profile created successfully',
      doctor: {
        id: doctor.doctorProfile.id,
        userId: doctor.id,
        name: doctor.name,
        email: doctor.email,
        specialization: doctor.doctorProfile.specialization,
        workingHoursStart: doctor.doctorProfile.workingHoursStart,
        workingHoursEnd: doctor.doctorProfile.workingHoursEnd,
        slotDurationMinutes: doctor.doctorProfile.slotDurationMinutes,
      },
    });
  } catch (error) {
    console.error('[AdminController:createDoctor]', error);
    return res.status(500).json({ error: error.message || 'Failed to create doctor' });
  }
};

// Set Doctor Leave Day (Triggers conflict detection & patient notification)
const setDoctorLeave = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, reason = 'Doctor unavailable / Emergency leave' } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Leave date (YYYY-MM-DD) is required' });
    }

    const result = await markDoctorLeave(doctorId, date, reason);

    return res.json({
      message: `Doctor marked on leave for ${date}. ${result.affectedCount} conflicting booking(s) cancelled and notified.`,
      ...result,
    });
  } catch (error) {
    console.error('[AdminController:setDoctorLeave]', error);
    return res.status(500).json({ error: error.message || 'Failed to set doctor leave' });
  }
};

// Remove Doctor Leave Day
const removeDoctorLeave = async (req, res) => {
  try {
    const { doctorId, date } = req.params;

    await prisma.leaveDay.delete({
      where: {
        doctorId_date: {
          doctorId,
          date,
        },
      },
    });

    return res.json({ message: `Leave for ${date} removed successfully` });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to remove leave day' });
  }
};

// Get System Dashboard Analytics
const getSystemAnalytics = async (req, res) => {
  try {
    const [
      totalPatients,
      totalDoctors,
      totalAppointments,
      confirmedAppointments,
      completedAppointments,
      cancelledAppointments,
      recentAppointments,
      recentNotificationLogs,
    ] = await Promise.all([
      prisma.user.count({ where: { role: ROLES.PATIENT } }),
      prisma.doctorProfile.count(),
      prisma.appointment.count(),
      prisma.appointment.count({ where: { status: APPOINTMENT_STATUS.CONFIRMED } }),
      prisma.appointment.count({ where: { status: APPOINTMENT_STATUS.COMPLETED } }),
      prisma.appointment.count({ where: { status: APPOINTMENT_STATUS.CANCELLED } }),
      prisma.appointment.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: { select: { name: true, email: true } },
          doctor: { include: { user: { select: { name: true } } } },
        },
      }),
      prisma.notificationLog.findMany({
        take: 15,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.json({
      counts: {
        totalPatients,
        totalDoctors,
        totalAppointments,
        confirmedAppointments,
        completedAppointments,
        cancelledAppointments,
      },
      recentAppointments,
      recentNotificationLogs,
    });
  } catch (error) {
    console.error('[AdminController:getSystemAnalytics]', error);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

module.exports = {
  createDoctor,
  setDoctorLeave,
  removeDoctorLeave,
  getSystemAnalytics,
};
