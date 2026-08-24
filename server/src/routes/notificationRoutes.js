const express = require('express');
const router = express.Router();
const {
  getNotificationLogs,
  triggerEmailRetries,
  triggerMedicationReminders,
  getPatientMedicationReminders,
} = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

router.get('/logs', requireAuth, getNotificationLogs);
router.post('/retry-emails', requireAuth, triggerEmailRetries);
router.post('/trigger-med-reminders', requireAuth, triggerMedicationReminders);
router.get('/medication-reminders', requireAuth, getPatientMedicationReminders);

module.exports = router;
