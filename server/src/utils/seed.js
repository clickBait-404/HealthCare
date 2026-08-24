const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedDatabase() {
  console.log('🌱 Starting database seeding for Healthcare Appointment Manager...');

  // Clean existing tables
  await prisma.notificationLog.deleteMany().catch(() => {});
  await prisma.medicationReminder.deleteMany().catch(() => {});
  await prisma.prescription.deleteMany().catch(() => {});
  await prisma.slotHold.deleteMany().catch(() => {});
  await prisma.appointment.deleteMany().catch(() => {});
  await prisma.leaveDay.deleteMany().catch(() => {});
  await prisma.doctorProfile.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});

  const defaultPassword = await bcrypt.hash('Password123!', 10);

  // 1. Create Admin
  const admin = await prisma.user.create({
    data: {
      name: 'Dr. Arthur Vance (Clinic Director)',
      email: 'admin@nexuscare.clinic',
      password: defaultPassword,
      role: 'ADMIN',
      phone: '+1 (555) 019-2834',
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    },
  });

  // 2. Create Doctors
  const doctor1User = await prisma.user.create({
    data: {
      name: 'Sarah Jenkins, MD',
      email: 'dr.jenkins@nexuscare.clinic',
      password: defaultPassword,
      role: 'DOCTOR',
      phone: '+1 (555) 392-1049',
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
      doctorProfile: {
        create: {
          specialization: 'Cardiology',
          bio: 'Board-certified cardiologist specializing in preventive cardiology, hypertension management, and cardiovascular rhythm diagnostics.',
          experienceYears: 12,
          consultationFee: 120.0,
          workingHoursStart: '09:00',
          workingHoursEnd: '17:00',
          slotDurationMinutes: 30,
          weeklyOffDays: '0', // Sunday off
          rating: 4.95,
        },
      },
    },
    include: { doctorProfile: true },
  });

  const doctor2User = await prisma.user.create({
    data: {
      name: 'Marcus Chen, MD',
      email: 'dr.chen@nexuscare.clinic',
      password: defaultPassword,
      role: 'DOCTOR',
      phone: '+1 (555) 782-9012',
      avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
      doctorProfile: {
        create: {
          specialization: 'Neurology',
          bio: 'Specialist in migraine management, neuromuscular disorders, cognitive assessments, and comprehensive sleep health.',
          experienceYears: 9,
          consultationFee: 140.0,
          workingHoursStart: '09:00',
          workingHoursEnd: '16:00',
          slotDurationMinutes: 45,
          weeklyOffDays: '0,6', // Sat & Sun off
          rating: 4.88,
        },
      },
    },
    include: { doctorProfile: true },
  });

  const doctor3User = await prisma.user.create({
    data: {
      name: 'Elena Rostova, MD',
      email: 'dr.rostova@nexuscare.clinic',
      password: defaultPassword,
      role: 'DOCTOR',
      phone: '+1 (555) 881-4567',
      avatar: 'https://images.unsplash.com/photo-1594824813511-209087c53e8d?w=150&auto=format&fit=crop&q=80',
      doctorProfile: {
        create: {
          specialization: 'General Medicine & Triage',
          bio: 'Family physician with deep expertise in acute illness triage, respiratory infections, metabolic care, and routine health checks.',
          experienceYears: 8,
          consultationFee: 75.0,
          workingHoursStart: '08:30',
          workingHoursEnd: '17:30',
          slotDurationMinutes: 30,
          weeklyOffDays: '0',
          rating: 4.92,
        },
      },
    },
    include: { doctorProfile: true },
  });

  // 3. Create Patients
  const patient1 = await prisma.user.create({
    data: {
      name: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      password: defaultPassword,
      role: 'PATIENT',
      phone: '+1 (555) 443-8901',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  });

  const patient2 = await prisma.user.create({
    data: {
      name: 'David Miller',
      email: 'david.miller@example.com',
      password: defaultPassword,
      role: 'PATIENT',
      phone: '+1 (555) 667-2341',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
  });

  // 4. Create Sample Leave Days
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 4);
  const leaveDateStr = tomorrow.toISOString().split('T')[0];

  await prisma.leaveDay.create({
    data: {
      doctorId: doctor2User.doctorProfile.id,
      date: leaveDateStr,
      reason: 'Attending World Neurology Summit 2026',
    },
  });

  // 5. Create Sample Appointments
  const todayStr = new Date().toISOString().split('T')[0];
  const nextDay = new Date();
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];

  const apt1 = await prisma.appointment.create({
    data: {
      appointmentCode: 'NX-260824-CARD',
      patientId: patient1.id,
      doctorId: doctor1User.doctorProfile.id,
      date: nextDayStr,
      startTime: '10:00',
      endTime: '10:30',
      status: 'CONFIRMED',
      patientSymptoms: 'Persistent chest tightness upon climbing stairs, mild dizziness, and slight shortness of breath for past 4 days.',
      symptomSeverity: 'Moderate',
      symptomDurationDays: 4,
      preVisitSummary: JSON.stringify({
        urgencyLevel: 'Medium',
        chiefComplaint: 'Exertional chest tightness with mild dizziness and dyspnea over 4 days.',
        suggestedQuestions: [
          'Does the chest tightness radiate towards your left arm, shoulder, or jaw during exertion?',
          'Have you recorded your resting pulse rate or blood pressure when feeling dizzy?',
          'Is there any family history of early-onset coronary artery disease or arrhythmias?',
        ],
        generatedBy: 'NexusCare-AI Triage Core',
      }),
      googleCalendarLink: 'https://calendar.google.com',
    },
  });

  const apt2 = await prisma.appointment.create({
    data: {
      appointmentCode: 'NX-260824-GENM',
      patientId: patient2.id,
      doctorId: doctor3User.doctorProfile.id,
      date: todayStr,
      startTime: '09:00',
      endTime: '09:30',
      status: 'COMPLETED',
      patientSymptoms: 'High fever (102F), severe sore throat, dry cough, and fatigue.',
      symptomSeverity: 'Moderate',
      symptomDurationDays: 3,
      preVisitSummary: JSON.stringify({
        urgencyLevel: 'Medium',
        chiefComplaint: 'Acute febrile upper respiratory tract infection with sore throat.',
        suggestedQuestions: [
          'What is the highest temperature recorded with antipyretics?',
          'Are there any difficulties swallowing fluids or opening the jaw?',
          'Have you experienced any rash, body aches, or shortness of breath?',
        ],
        generatedBy: 'NexusCare-AI Triage Core',
      }),
      diagnosis: 'Acute Streptococcal Pharyngitis & Mild Dehydration',
      doctorNotes: 'Throat examination showed bilateral tonsillar erythema with mild exudates. Lungs clear to auscultation. Temperature 101.4F. Prescribed Amoxicillin 500mg, Paracetamol for fever spikes, and Lozenges. Advised warm salt water gargling and 2.5L fluids daily.',
      postVisitSummary: JSON.stringify({
        patientFriendlySummary: 'You have an acute bacterial throat infection (strep throat). With proper antibiotics and hydration, your symptoms should significantly subside within 48 to 72 hours.',
        medicationSchedule: [
          {
            medication: 'Amoxicillin',
            dosage: '500mg',
            frequency: 'Twice a day (Every 12 hours after food)',
            duration: '7 days',
            instructions: 'Complete full 7-day course even if feeling completely recovered.',
          },
          {
            medication: 'Paracetamol',
            dosage: '650mg',
            frequency: 'As needed (Every 6 hours if fever > 100°F)',
            duration: '3 days',
            instructions: 'Do not exceed 4 tablets in 24 hours.',
          },
        ],
        followUpSteps: [
          'Gargle with warm salt water 3-4 times daily.',
          'Drink at least 8-10 glasses of warm water, broths, or herbal teas.',
          'Rest your voice and avoid cold, spicy, or irritant foods.',
          'Schedule a follow-up visit if fever does not subside after 48 hours of antibiotics.',
        ],
        lifestyleAdvice: 'Isolate eating utensils, wash hands frequently, and prioritize 8 hours of sleep.',
        generatedBy: 'NexusCare-AI Clinical Summary',
      }),
    },
  });

  const rx1 = await prisma.prescription.create({
    data: {
      appointmentId: apt2.id,
      medicationName: 'Amoxicillin',
      dosage: '500mg',
      frequency: 'TWICE_DAILY',
      durationDays: 7,
      instructions: 'Take one tablet every 12 hours after meals with water.',
    },
  });

  const rx2 = await prisma.prescription.create({
    data: {
      appointmentId: apt2.id,
      medicationName: 'Paracetamol',
      dosage: '650mg',
      frequency: 'AS_NEEDED',
      durationDays: 3,
      instructions: 'Take 1 tablet every 6 hours only when fever exceeds 100°F.',
    },
  });

  await prisma.medicationReminder.create({
    data: {
      prescriptionId: rx1.id,
      appointmentId: apt2.id,
      patientId: patient2.id,
      medicationName: 'Amoxicillin',
      dosage: '500mg',
      frequency: 'TWICE_DAILY',
      scheduledTime: '09:00 AM & 08:00 PM',
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  await prisma.notificationLog.create({
    data: {
      recipientEmail: patient1.email,
      recipientName: patient1.name,
      recipientRole: 'PATIENT',
      type: 'BOOKING_CONFIRMATION',
      subject: `Booking Confirmed: Dr. ${doctor1User.name} on ${nextDayStr}`,
      content: 'Your appointment is confirmed. Pre-visit summary generated.',
      status: 'SENT',
    },
  });

  console.log('✅ Seeding complete!');
}

module.exports = { seedDatabase };

if (require.main === module) {
  seedDatabase()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
}
