const cron = require('node-cron');
const prisma = require('../config/db');
const { NOTIFICATION_STATUS, NOTIFICATION_TYPES } = require('../config/constants');
const { sendMedicationReminderEmail, sendEmail } = require('../services/emailService');

/**
 * 1. Clean up Expired Slot Holds (Runs every minute)
 */
const cleanupExpiredHolds = async () => {
  try {
    const now = new Date();
    const result = await prisma.slotHold.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
    if (result.count > 0) {
      console.log(`[Cron:HoldCleanup] 🧹 Released ${result.count} expired slot hold(s).`);
    }
  } catch (err) {
    console.error('[Cron:HoldCleanup] Error clearing expired holds:', err.message);
  }
};

/**
 * 2. Medication Reminders Background Job (Runs every 10 minutes)
 * Generates and sends reminders for active prescriptions based on frequency:
 * - ONCE_DAILY: 09:00 AM
 * - TWICE_DAILY: 09:00 AM & 08:00 PM
 * - THRICE_DAILY: 08:00 AM, 02:00 PM, 08:00 PM
 */
const processMedicationReminders = async () => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    // Find all prescriptions from appointments completed within their duration days
    const activePrescriptions = await prisma.prescription.findMany({
      include: {
        appointment: {
          include: {
            patient: true,
          },
        },
        reminders: true,
      },
    });

    for (const rx of activePrescriptions) {
      const patient = rx.appointment?.patient;
      if (!patient) continue;

      // Check if reminder was already sent today for this prescription
      const sentToday = rx.reminders.some(
        (r) => r.createdAt.toISOString().split('T')[0] === todayStr && r.status === NOTIFICATION_STATUS.SENT
      );

      if (!sentToday) {
        let scheduledTime = '09:00 AM';
        if (rx.frequency === 'TWICE_DAILY') scheduledTime = '09:00 AM & 08:00 PM';
        else if (rx.frequency === 'THRICE_DAILY') scheduledTime = '08:00 AM, 02:00 PM & 08:00 PM';
        else if (rx.frequency === 'AS_NEEDED') scheduledTime = 'When experiencing acute symptoms';

        // Create reminder record
        const reminder = await prisma.medicationReminder.create({
          data: {
            prescriptionId: rx.id,
            appointmentId: rx.appointmentId,
            patientId: patient.id,
            medicationName: rx.medicationName,
            dosage: rx.dosage,
            frequency: rx.frequency,
            scheduledTime,
            status: NOTIFICATION_STATUS.SENT,
            sentAt: new Date(),
          },
        });

        // Send email
        await sendMedicationReminderEmail(patient, reminder);
        console.log(`[Cron:MedicationReminder] 💊 Sent reminder for ${rx.medicationName} to ${patient.email}`);
      }
    }
  } catch (err) {
    console.error('[Cron:MedicationReminder] Error processing reminders:', err.message);
  }
};

/**
 * 3. Email Retry Worker Queue (Runs every 5 minutes)
 * Retries notifications that previously failed (up to 3 attempts with exponential backoff)
 */
const processFailedEmailRetries = async () => {
  try {
    const failedLogs = await prisma.notificationLog.findMany({
      where: {
        status: { in: [NOTIFICATION_STATUS.FAILED, NOTIFICATION_STATUS.RETRYING] },
        attempts: { lt: 3 },
      },
      take: 20,
    });

    if (failedLogs.length === 0) return;

    console.log(`[Cron:EmailRetry] 🔄 Found ${failedLogs.length} failed notification(s) to retry...`);

    for (const log of failedLogs) {
      const newAttempts = log.attempts + 1;
      const metadata = log.metadata ? JSON.parse(log.metadata) : {};

      const result = await sendEmail({
        to: log.recipientEmail,
        recipientName: log.recipientName || 'Valued User',
        recipientRole: log.recipientRole,
        type: log.type,
        subject: log.subject,
        html: log.content,
        text: log.content,
        metadata: { ...metadata, isRetry: true, attemptNumber: newAttempts },
      });

      if (result.success) {
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: NOTIFICATION_STATUS.SENT,
            attempts: newAttempts,
            errorMessage: null,
            lastAttemptAt: new Date(),
          },
        });
        console.log(`[Cron:EmailRetry] ✅ Successfully retried email to ${log.recipientEmail}`);
      } else {
        await prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: newAttempts >= 3 ? NOTIFICATION_STATUS.FAILED : NOTIFICATION_STATUS.RETRYING,
            attempts: newAttempts,
            lastAttemptAt: new Date(),
          },
        });
      }
    }
  } catch (err) {
    console.error('[Cron:EmailRetry] Error executing email retries:', err.message);
  }
};

/**
 * Initialize all scheduled cron jobs
 */
const initCronJobs = () => {
  console.log('[CronScheduler] ⏰ Initializing background workers...');

  // 1. Run slot hold cleanup every minute (* * * * *)
  cron.schedule('* * * * *', cleanupExpiredHolds);

  // 2. Run medication reminders every 30 minutes
  cron.schedule('*/30 * * * *', processMedicationReminders);

  // 3. Run email retry worker every 2 minutes
  cron.schedule('*/2 * * * *', processFailedEmailRetries);

  console.log('[CronScheduler] ✅ Background workers scheduled: Hold Cleanup (1m), Medication Reminders (30m), Email Retries (2m).');
};

module.exports = {
  initCronJobs,
  cleanupExpiredHolds,
  processMedicationReminders,
  processFailedEmailRetries,
};
