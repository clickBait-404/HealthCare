const express = require('express');
const router = express.Router();
const {
  createDoctor,
  setDoctorLeave,
  removeDoctorLeave,
  getSystemAnalytics,
} = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

router.use(requireAuth, requireRole([ROLES.ADMIN]));

router.post('/doctors', createDoctor);
router.post('/doctors/:doctorId/leave', setDoctorLeave);
router.delete('/doctors/:doctorId/leave/:date', removeDoctorLeave);
router.get('/analytics', getSystemAnalytics);

module.exports = router;
