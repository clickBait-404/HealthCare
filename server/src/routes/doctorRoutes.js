const express = require('express');
const router = express.Router();
const {
  getAllDoctors,
  getDoctorById,
  getDoctorSlots,
  updateDoctorProfile,
} = require('../controllers/doctorController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

// Public endpoints to search doctors and view slots
router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/slots', getDoctorSlots);

// Update profile (Doctor or Admin)
router.put('/:id', requireAuth, requireRole([ROLES.DOCTOR, ROLES.ADMIN]), updateDoctorProfile);

module.exports = router;
