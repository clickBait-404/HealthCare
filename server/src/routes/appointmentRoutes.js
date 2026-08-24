const express = require('express');
const router = express.Router();
const {
  holdSlotHandler,
  releaseHoldHandler,
  bookAppointmentHandler,
  getMyAppointments,
  getAppointmentById,
  cancelAppointmentHandler,
  downloadIcsHandler,
} = require('../controllers/appointmentController');
const { requireAuth } = require('../middleware/auth');

router.post('/hold', requireAuth, holdSlotHandler);
router.post('/release-hold', requireAuth, releaseHoldHandler);
router.post('/book', requireAuth, bookAppointmentHandler);
router.get('/my', requireAuth, getMyAppointments);
router.get('/:id', requireAuth, getAppointmentById);
router.post('/:id/cancel', requireAuth, cancelAppointmentHandler);
router.get('/:id/ics', downloadIcsHandler);

module.exports = router;
