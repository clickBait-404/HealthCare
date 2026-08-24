const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { ROLES } = require('../config/constants');

const signToken = (userId, role) => {
  const secret = process.env.JWT_SECRET || 'super_secret_healthcare_jwt_key_2026_antigravity';
  return jwt.sign({ userId, role }, secret, { expiresIn: '7d' });
};

// Register
const register = async (req, res) => {
  try {
    const { name, email, password, role = ROLES.PATIENT, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: Object.values(ROLES).includes(role) ? role : ROLES.PATIENT,
        phone,
      },
    });

    // If role is DOCTOR, create empty doctor profile
    if (user.role === ROLES.DOCTOR) {
      await prisma.doctorProfile.create({
        data: {
          userId: user.id,
          specialization: req.body.specialization || 'General Physician',
          bio: req.body.bio || 'Experienced medical professional dedicated to patient care.',
          experienceYears: Number(req.body.experienceYears) || 5,
          consultationFee: Number(req.body.consultationFee) || 50.0,
          workingHoursStart: req.body.workingHoursStart || '09:00',
          workingHoursEnd: req.body.workingHoursEnd || '17:00',
          slotDurationMinutes: Number(req.body.slotDurationMinutes) || 30,
        },
      });
    }

    const token = signToken(user.id, user.role);

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[AuthController:register]', error);
    return res.status(500).json({ error: error.message || 'Registration failed' });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { doctorProfile: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken(user.id, user.role);

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        doctorProfile: user.doctorProfile,
      },
    });
  } catch (error) {
    console.error('[AuthController:login]', error);
    return res.status(500).json({ error: 'Login failed' });
  }
};

// Get current user profile
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatar: true,
        doctorProfile: true,
      },
    });

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

// List Demo Accounts for quick 1-click login in frontend
const getDemoAccounts = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        doctorProfile: {
          select: {
            id: true,
            specialization: true,
          },
        },
      },
    });
    return res.json({ demoAccounts: users });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch demo accounts' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  getDemoAccounts,
};
