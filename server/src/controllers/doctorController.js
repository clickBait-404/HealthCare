const prisma = require('../config/db');
const { getDoctorAvailability } = require('../services/bookingService');

// Get all doctors (with search & specialization filter)
const getAllDoctors = async (req, res) => {
  try {
    const { specialization, search } = req.query;

    const whereClause = {};

    if (specialization && specialization !== 'All') {
      whereClause.specialization = {
        contains: specialization,
      };
    }

    if (search && search.trim()) {
      whereClause.OR = [
        { specialization: { contains: search.trim() } },
        { user: { name: { contains: search.trim() } } },
        { bio: { contains: search.trim() } },
      ];
    }

    const doctors = await prisma.doctorProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        leaveDays: true,
      },
      orderBy: { rating: 'desc' },
    });

    return res.json({ doctors });
  } catch (error) {
    console.error('[DoctorController:getAllDoctors]', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch doctors' });
  }
};

// Get single doctor details
const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await prisma.doctorProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
          },
        },
        leaveDays: {
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    return res.json({ doctor });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch doctor profile' });
  }
};

// Get Doctor availability & slots for a given date
const getDoctorSlots = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date query parameter (YYYY-MM-DD) is required' });
    }

    const patientId = req.user?.id || null;
    const availability = await getDoctorAvailability(id, date, patientId);

    return res.json(availability);
  } catch (error) {
    console.error('[DoctorController:getDoctorSlots]', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch slot availability' });
  }
};

// Update Doctor Profile (Self or Admin)
const updateDoctorProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      specialization,
      bio,
      experienceYears,
      consultationFee,
      workingHoursStart,
      workingHoursEnd,
      slotDurationMinutes,
      weeklyOffDays,
    } = req.body;

    const doctor = await prisma.doctorProfile.findUnique({ where: { id } });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    // Authorization check
    if (req.user.role !== 'ADMIN' && doctor.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to update this doctor profile' });
    }

    const updated = await prisma.doctorProfile.update({
      where: { id },
      data: {
        specialization: specialization || doctor.specialization,
        bio: bio !== undefined ? bio : doctor.bio,
        experienceYears: experienceYears ? Number(experienceYears) : doctor.experienceYears,
        consultationFee: consultationFee ? Number(consultationFee) : doctor.consultationFee,
        workingHoursStart: workingHoursStart || doctor.workingHoursStart,
        workingHoursEnd: workingHoursEnd || doctor.workingHoursEnd,
        slotDurationMinutes: slotDurationMinutes ? Number(slotDurationMinutes) : doctor.slotDurationMinutes,
        weeklyOffDays: weeklyOffDays !== undefined ? weeklyOffDays : doctor.weeklyOffDays,
      },
      include: { user: true },
    });

    return res.json({ message: 'Profile updated successfully', doctor: updated });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update doctor profile' });
  }
};

module.exports = {
  getAllDoctors,
  getDoctorById,
  getDoctorSlots,
  updateDoctorProfile,
};
