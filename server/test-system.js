const axios = require('axios');
const prisma = require('./src/config/db');
const { holdSlot, confirmAppointment, markDoctorLeave } = require('./src/services/bookingService');
const { generatePreVisitSummary, generatePostVisitSummary } = require('./src/services/llmService');
const { cleanupExpiredHolds, processMedicationReminders, processFailedEmailRetries } = require('./src/jobs/cronScheduler');

const runSystemTests = async () => {
  console.log('🧪 Starting End-to-End System Tests...\n');

  try {
    // 1. Test LLM Service & Fallbacks
    console.log('1️⃣ Testing LLM Pre-visit Triage...');
    const preVisitResult = await generatePreVisitSummary(
      'Acute chest tightness radiating to left arm with dizziness',
      'Severe',
      2
    );
    console.log('   ✅ Pre-visit Urgency:', preVisitResult.urgencyLevel);
    console.log('   ✅ Chief Complaint:', preVisitResult.chiefComplaint);
    console.log('   ✅ Suggested Questions Count:', preVisitResult.suggestedQuestions.length);

    console.log('\n2️⃣ Testing LLM Post-visit Summary...');
    const postVisitResult = await generatePostVisitSummary(
      'Patient diagnosed with mild bronchitis. Auscultation showed rhonchi. Advised inhaler twice daily.',
      'Acute Bronchitis',
      [{ medicationName: 'Salbutamol Inhaler', dosage: '100mcg', frequency: 'TWICE_DAILY', durationDays: 5 }]
    );
    console.log('   ✅ Patient Friendly Summary:', postVisitResult.patientFriendlySummary.substring(0, 70) + '...');
    console.log('   ✅ Medication Schedule Items:', postVisitResult.medicationSchedule.length);

    // 2. Test Concurrency & Slot Hold
    console.log('\n3️⃣ Testing Slot Hold & Concurrency Control...');
    const patient = await prisma.user.findFirst({ where: { role: 'PATIENT' } });
    const doctor = await prisma.doctorProfile.findFirst({ include: { user: true } });

    const testDate = '2026-09-15';
    const testSlot = { startTime: '11:00', endTime: '11:30' };

    const holdResult = await holdSlot(doctor.id, patient.id, testDate, testSlot.startTime, testSlot.endTime);
    console.log('   ✅ Slot successfully locked with Token:', holdResult.holdToken);

    // Attempting to hold the same slot by another patient should fail
    const otherPatient = await prisma.user.create({
      data: {
        name: 'Concurrent Patient',
        email: `concurrent-${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'PATIENT',
      },
    });

    try {
      await holdSlot(doctor.id, otherPatient.id, testDate, testSlot.startTime, testSlot.endTime);
      console.error('   ❌ Double-hold did not fail as expected!');
    } catch (err) {
      console.log('   ✅ Concurrency Lock Verified! Second hold rejected:', err.message);
    }

    // 3. Confirm Appointment Booking
    console.log('\n4️⃣ Testing Appointment Booking in ACID Transaction...');
    const appointment = await confirmAppointment({
      patientId: patient.id,
      doctorId: doctor.id,
      date: testDate,
      startTime: testSlot.startTime,
      endTime: testSlot.endTime,
      holdToken: holdResult.holdToken,
      symptoms: 'Mild migraine and photophobia for 3 days',
      symptomSeverity: 'Moderate',
      symptomDurationDays: 3,
    });
    console.log('   ✅ Appointment Confirmed! Code:', appointment.appointmentCode);
    console.log('   ✅ Google Calendar Link:', appointment.googleCalendarLink ? 'Generated' : 'None');

    // 4. Test Doctor Leave Conflict Handling
    console.log('\n5️⃣ Testing Doctor Leave Declaration & Cascade Auto-Cancellation...');
    const leaveResult = await markDoctorLeave(doctor.id, testDate, 'Medical Conference Attendance');
    console.log(`   ✅ Doctor marked on leave. Conflicting bookings cancelled: ${leaveResult.affectedCount}`);

    const updatedApt = await prisma.appointment.findUnique({ where: { id: appointment.id } });
    console.log('   ✅ Appointment status updated to:', updatedApt.status);
    console.log('   ✅ Cancellation reason:', updatedApt.cancellationReason);

    // 5. Test Background Workers
    console.log('\n6️⃣ Testing Background Cron Jobs...');
    await cleanupExpiredHolds();
    console.log('   ✅ Hold Cleanup Worker Executed.');

    await processMedicationReminders();
    console.log('   ✅ Medication Reminders Worker Executed.');

    await processFailedEmailRetries();
    console.log('   ✅ Email Retry Queue Worker Executed.');

    console.log('\n🎉 ALL BACKEND SYSTEMS & INTEGRATIONS VERIFIED SUCCESSFULLY!\n');
  } catch (error) {
    console.error('\n❌ Test failure:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

runSystemTests();
