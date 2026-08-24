const express = require('express');
const router = express.Router();
const { completeConsultation } = require('../controllers/consultationController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

router.post('/:id/complete', requireAuth, requireRole([ROLES.DOCTOR, ROLES.ADMIN]), completeConsultation);

module.exports = router;
