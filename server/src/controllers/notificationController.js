const prisma = require('../config/db');
const { processFailedEmailRetries, processMedicationReminders } = require('../jobs/cronScheduler');

// Get notification audit logs
const getNotificationLogs = async (req, res) => {
  try {
    const logs = await prisma.notificationLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ logs });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch notification logs' });
  }
};

// Manually trigger background email retries
const triggerEmailRetries = async (req, res) => {
  try {
    await processFailedEmailRetries();
    return res.json({ message: 'Email retry worker executed successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to trigger retries' });
  }
};

// Manually trigger medication reminders
const triggerMedicationReminders = async (req, res) => {
  try {
    await processMedicationReminders();
    return res.json({ message: 'Medication reminder job executed successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to trigger medication reminders' });
  }
};

// Get patient's medication reminders
const getPatientMedicationReminders = async (req, res) => {
  try {
    const patientId = req.user.id;
    const reminders = await prisma.medicationReminder.findMany({
      where: { patientId },
      include: {
        prescription: true,
        appointment: {
          include: {
            doctor: { include: { user: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ reminders });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch medication reminders' });
  }
};

module.exports = {
  getNotificationLogs,
  triggerEmailRetries,
  triggerMedicationReminders,
  getPatientMedicationReminders,
};
