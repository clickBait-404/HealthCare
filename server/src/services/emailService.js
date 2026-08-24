const nodemailer = require('nodemailer');
const prisma = require('../config/db');
const { NOTIFICATION_TYPES, NOTIFICATION_STATUS } = require('../config/constants');

// Singleton transporter
let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST || 'smtp.ethereal.email',
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  } else {
    // Generate an automatic Ethereal test account for seamless testing
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log('[EmailService] Created temporary Ethereal test account:', testAccount.user);
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (e) {
      console.warn('[EmailService] Falling back to mocked transporter:', e.message);
      transporter = {
        sendMail: async (opts) => ({
          messageId: 'mock-' + Date.now(),
          previewUrl: 'https://ethereal.email/message/mock',
        }),
      };
    }
  }

  return transporter;
};

/**
 * Dispatch Email and log into NotificationLog for auditing & retries
 */
const sendEmail = async ({
  to,
  recipientName = 'Valued User',
  recipientRole = 'PATIENT',
  type,
  subject,
  html,
  text,
  metadata = null,
}) => {
  let status = NOTIFICATION_STATUS.SENT;
  let errorMessage = null;
  let previewUrl = null;

  try {
    const mailer = await getTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"NexusCare Clinic" <appointments@nexuscare.clinic>',
      to,
      subject,
      text: text || subject,
      html,
    };

    const info = await mailer.sendMail(mailOptions);
    if (nodemailer.getTestMessageUrl && info) {
      previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[EmailService] ✉️  Preview URL for "${subject}" to <${to}>: ${previewUrl}`);
      }
    }
  } catch (error) {
    console.error(`[EmailService] ❌ Failed sending email to ${to}:`, error.message);
    status = NOTIFICATION_STATUS.FAILED;
    errorMessage = error.message;
  }

  // Persist notification log
  try {
    const log = await prisma.notificationLog.create({
      data: {
        recipientEmail: to,
        recipientName,
        recipientRole,
        type,
        subject,
        content: text || subject,
        status,
        errorMessage,
        metadata: metadata ? JSON.stringify({ ...metadata, previewUrl }) : (previewUrl ? JSON.stringify({ previewUrl }) : null),
      },
    });
    return { success: status === NOTIFICATION_STATUS.SENT, log, previewUrl };
  } catch (dbErr) {
    console.error('[EmailService] Failed writing notification log:', dbErr.message);
    return { success: status === NOTIFICATION_STATUS.SENT, previewUrl };
  }
};

/**
 * Booking Confirmation Email Template
 */
const sendBookingConfirmationEmails = async (appointment, patient, doctor, doctorUser) => {
  const patientHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #059669, #0284c7); padding: 20px; border-radius: 8px; color: #ffffff; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">Appointment Confirmed!</h1>
        <p style="margin: 6px 0 0 0; opacity: 0.9;">Booking Code: <strong>${appointment.appointmentCode}</strong></p>
      </div>
      <div style="padding: 20px 0;">
        <p>Dear <strong>${patient.name}</strong>,</p>
        <p>Your appointment with <strong>Dr. ${doctorUser.name}</strong> (${doctor.specialization}) has been successfully scheduled.</p>
        
        <div style="background: #f8fafc; border-left: 4px solid #059669; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 4px 0;">📅 <strong>Date:</strong> ${appointment.date}</p>
          <p style="margin: 4px 0;">⏰ <strong>Time:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
          <p style="margin: 4px 0;">👨‍⚕️ <strong>Doctor:</strong> Dr. ${doctorUser.name}</p>
          <p style="margin: 4px 0;">🩺 <strong>Specialization:</strong> ${doctor.specialization}</p>
        </div>

        <p><strong>Reported Symptoms:</strong> ${appointment.patientSymptoms}</p>
        
        <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
          An automated pre-visit summary has been securely delivered to your doctor. Please arrive 10 minutes prior to your scheduled time.
        </p>
      </div>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">NexusCare Medical Systems • Automated Healthcare Gateway</p>
    </div>
  `;

  const doctorHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); padding: 20px; border-radius: 8px; color: #ffffff; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">New Appointment Scheduled</h1>
        <p style="margin: 6px 0 0 0; opacity: 0.9;">Patient: <strong>${patient.name}</strong></p>
      </div>
      <div style="padding: 20px 0;">
        <p>Dear <strong>Dr. ${doctorUser.name}</strong>,</p>
        <p>A new consultation has been booked on your calendar:</p>
        
        <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 4px 0;">📅 <strong>Date:</strong> ${appointment.date}</p>
          <p style="margin: 4px 0;">⏰ <strong>Slot:</strong> ${appointment.startTime} - ${appointment.endTime}</p>
          <p style="margin: 4px 0;">👤 <strong>Patient:</strong> ${patient.name} (${patient.email})</p>
          <p style="margin: 4px 0;">🔖 <strong>Code:</strong> ${appointment.appointmentCode}</p>
        </div>

        <p><strong>Chief Patient Symptoms:</strong> ${appointment.patientSymptoms}</p>
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">NexusCare Doctor Portal</p>
    </div>
  `;

  // Send to patient
  await sendEmail({
    to: patient.email,
    recipientName: patient.name,
    recipientRole: 'PATIENT',
    type: NOTIFICATION_TYPES.BOOKING_CONFIRMATION,
    subject: `Booking Confirmed: Dr. ${doctorUser.name} on ${appointment.date} (${appointment.startTime})`,
    html: patientHtml,
    text: `Your appointment with Dr. ${doctorUser.name} is confirmed for ${appointment.date} at ${appointment.startTime}. Code: ${appointment.appointmentCode}`,
    metadata: { appointmentId: appointment.id },
  });

  // Send to doctor
  await sendEmail({
    to: doctorUser.email,
    recipientName: doctorUser.name,
    recipientRole: 'DOCTOR',
    type: NOTIFICATION_TYPES.BOOKING_CONFIRMATION,
    subject: `New Appointment: ${patient.name} on ${appointment.date} (${appointment.startTime})`,
    html: doctorHtml,
    text: `New booking from ${patient.name} on ${appointment.date} at ${appointment.startTime}.`,
    metadata: { appointmentId: appointment.id },
  });
};

/**
 * Doctor Leave Cancellation Notification
 */
const sendDoctorLeaveCancellationEmail = async (appointment, patient, doctorUser, leaveReason) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #fee2e2;">
      <div style="background: #ef4444; padding: 20px; border-radius: 8px; color: #ffffff; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">Appointment Rescheduling Notice</h1>
        <p style="margin: 6px 0 0 0; opacity: 0.9;">Dr. ${doctorUser.name} is unavailable on ${appointment.date}</p>
      </div>
      <div style="padding: 20px 0;">
        <p>Dear <strong>${patient.name}</strong>,</p>
        <p>We regret to inform you that your appointment (Code: <strong>${appointment.appointmentCode}</strong>) scheduled for <strong>${appointment.date} at ${appointment.startTime}</strong> with <strong>Dr. ${doctorUser.name}</strong> has been cancelled due to official doctor leave.</p>
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> ${leaveReason || 'Doctor unavailable / Emergency leave'}</p>
        </div>

        <p>Please log in to your patient portal to select an alternative slot or book with another specialist.</p>
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">NexusCare Patient Services</p>
    </div>
  `;

  return sendEmail({
    to: patient.email,
    recipientName: patient.name,
    recipientRole: 'PATIENT',
    type: NOTIFICATION_TYPES.LEAVE_CANCELLATION,
    subject: `Important: Appointment Cancelled due to Doctor Leave (${appointment.date})`,
    html,
    text: `Your appointment with Dr. ${doctorUser.name} on ${appointment.date} at ${appointment.startTime} is cancelled due to doctor leave: ${leaveReason || 'Unavailable'}. Please rebook on the portal.`,
    metadata: { appointmentId: appointment.id, leaveDate: appointment.date },
  });
};

/**
 * Medication Reminder Email
 */
const sendMedicationReminderEmail = async (patient, reminder) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e0f2fe;">
      <div style="background: #0284c7; padding: 20px; border-radius: 8px; color: #ffffff; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">💊 Medication Reminder</h1>
        <p style="margin: 6px 0 0 0; opacity: 0.9;">Scheduled dose time: ${reminder.scheduledTime}</p>
      </div>
      <div style="padding: 20px 0;">
        <p>Hello <strong>${patient.name}</strong>,</p>
        <p>This is your automated prescription reminder to take your medicine:</p>
        
        <div style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 16px; margin: 16px 0; border-radius: 4px;">
          <p style="margin: 4px 0; font-size: 18px; color: #0369a1;"><strong>${reminder.medicationName}</strong></p>
          <p style="margin: 4px 0;">💊 <strong>Dosage:</strong> ${reminder.dosage}</p>
          <p style="margin: 4px 0;">⏰ <strong>Frequency:</strong> ${reminder.frequency}</p>
        </div>

        <p style="color: #64748b; font-size: 14px;">Remember to drink plenty of water and follow all prescription dietary recommendations.</p>
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">NexusCare Patient Health Tracker</p>
    </div>
  `;

  return sendEmail({
    to: patient.email,
    recipientName: patient.name,
    recipientRole: 'PATIENT',
    type: NOTIFICATION_TYPES.MEDICATION_REMINDER,
    subject: `Medication Reminder: ${reminder.medicationName} (${reminder.dosage})`,
    html,
    text: `Time to take your medication: ${reminder.medicationName} (${reminder.dosage}) scheduled for ${reminder.scheduledTime}.`,
    metadata: { reminderId: reminder.id },
  });
};

module.exports = {
  sendEmail,
  sendBookingConfirmationEmails,
  sendDoctorLeaveCancellationEmail,
  sendMedicationReminderEmail,
};
