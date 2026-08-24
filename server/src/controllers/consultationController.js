const prisma = require('../config/db');
const { APPOINTMENT_STATUS, ROLES, NOTIFICATION_STATUS } = require('../config/constants');
const { generatePostVisitSummary } = require('../services/llmService');
const { sendEmail } = require('../services/emailService');

// Complete consultation, save notes, diagnosis, prescriptions, and generate AI Post-visit Summary
const completeConsultation = async (req, res) => {
  try {
    const { id } = req.params; // appointmentId
    const { doctorNotes, diagnosis, prescriptions = [] } = req.body;

    if (!doctorNotes || !diagnosis) {
      return res.status(400).json({ error: 'Clinical notes and diagnosis are required' });
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Verify doctor authority
    if (req.user.role !== ROLES.ADMIN && appointment.doctor.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized. Only the assigned doctor can complete this consultation.' });
    }

    // Generate AI Post-Visit Patient Summary
    const postVisitAI = await generatePostVisitSummary(doctorNotes, diagnosis, prescriptions);

    // Save notes, diagnosis, postVisitSummary, and update status to COMPLETED
    const updatedAppointment = await prisma.$transaction(async (tx) => {
      const apt = await tx.appointment.update({
        where: { id },
        data: {
          doctorNotes,
          diagnosis,
          status: APPOINTMENT_STATUS.COMPLETED,
          postVisitSummary: JSON.stringify(postVisitAI),
        },
        include: {
          patient: true,
          doctor: { include: { user: true } },
        },
      });

      // Clear previous prescriptions if any
      await tx.prescription.deleteMany({
        where: { appointmentId: id },
      });

      // Create new prescriptions
      if (prescriptions.length > 0) {
        for (const item of prescriptions) {
          const rx = await tx.prescription.create({
            data: {
              appointmentId: id,
              medicationName: item.medicationName,
              dosage: item.dosage || '1 unit',
              frequency: item.frequency || 'ONCE_DAILY',
              durationDays: Number(item.durationDays) || 5,
              instructions: item.instructions || 'Take with water after meals',
            },
          });

          // Schedule initial medication reminder
          let scheduledTime = '09:00 AM';
          if (rx.frequency === 'TWICE_DAILY') scheduledTime = '09:00 AM & 08:00 PM';
          else if (rx.frequency === 'THRICE_DAILY') scheduledTime = '08:00 AM, 02:00 PM & 08:00 PM';

          await tx.medicationReminder.create({
            data: {
              prescriptionId: rx.id,
              appointmentId: id,
              patientId: appointment.patientId,
              medicationName: rx.medicationName,
              dosage: rx.dosage,
              frequency: rx.frequency,
              scheduledTime,
              status: NOTIFICATION_STATUS.SENT,
              sentAt: new Date(),
            },
          });
        }
      }

      return apt;
    });

    // Send summary email to patient
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 20px; border-radius: 8px; color: #ffffff; text-align: center;">
          <h1 style="margin: 0; font-size: 22px;">Your Post-Visit Care Summary</h1>
          <p style="margin: 6px 0 0 0; opacity: 0.9;">Dr. ${appointment.doctor.user.name} • ${appointment.date}</p>
        </div>
        <div style="padding: 20px 0;">
          <p>Dear <strong>${appointment.patient.name}</strong>,</p>
          <p>Thank you for visiting today. Here is your personalized, patient-friendly consultation summary and treatment plan:</p>

          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 14px; margin: 16px 0; border-radius: 4px;">
            <p style="margin: 0 0 6px 0;"><strong>Diagnosis:</strong> ${diagnosis}</p>
            <p style="margin: 0; color: #374151;">${postVisitAI.patientFriendlySummary}</p>
          </div>

          ${
            postVisitAI.medicationSchedule && postVisitAI.medicationSchedule.length > 0
              ? `<h3 style="color: #065f46; margin-top: 20px;">💊 Medication Plan</h3>
                 <ul>
                   ${postVisitAI.medicationSchedule
                     .map(
                       (m) =>
                         `<li><strong>${m.medication}</strong> (${m.dosage}) - ${m.frequency} for ${m.duration}. <em>${m.instructions}</em></li>`
                     )
                     .join('')}
                 </ul>`
              : ''
          }

          ${
            postVisitAI.followUpSteps && postVisitAI.followUpSteps.length > 0
              ? `<h3 style="color: #065f46; margin-top: 20px;">📋 Next Steps</h3>
                 <ol>
                   ${postVisitAI.followUpSteps.map((s) => `<li>${s}</li>`).join('')}
                 </ol>`
              : ''
          }

          <p style="color: #64748b; font-size: 14px; margin-top: 24px;">
            You can access your complete digital medical records and upcoming medication reminders anytime on your patient dashboard.
          </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">NexusCare Patient Health Portal</p>
      </div>
    `;

    sendEmail({
      to: appointment.patient.email,
      recipientName: appointment.patient.name,
      recipientRole: 'PATIENT',
      type: 'BOOKING_CONFIRMATION',
      subject: `Post-Visit Summary: Consultation with Dr. ${appointment.doctor.user.name} (${appointment.date})`,
      html: emailHtml,
      text: `Your post-visit summary is available: ${postVisitAI.patientFriendlySummary}`,
      metadata: { appointmentId: id },
    }).catch((e) => console.error('[ConsultationController] Failed to send post-visit email:', e.message));

    // Fetch full updated record with prescriptions
    const fullAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { include: { user: true } },
        prescriptions: true,
        medicationReminders: true,
      },
    });

    return res.json({
      message: 'Consultation completed and AI post-visit summary generated!',
      appointment: fullAppointment,
    });
  } catch (error) {
    console.error('[ConsultationController:completeConsultation]', error);
    return res.status(500).json({ error: error.message || 'Failed to complete consultation' });
  }
};

module.exports = {
  completeConsultation,
};
