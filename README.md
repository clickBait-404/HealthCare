# 🏥 NexusCare — Healthcare Appointment & Follow-up Manager

> An enterprise-grade, fullstack clinical scheduling and patient follow-up management platform built with **React (Vite)**, **Node.js (Express)**, **Prisma ORM (SQLite / PostgreSQL)**, and **AI Triage Integration**.

---

## 🌐 Live Application & Links

- 🚀 **Live Hosted Application**: **[https://nexuscare.onrender.com](https://nexuscare.onrender.com)**
- 📦 **GitHub Repository**: **[https://github.com/gargi203/NexusCare](https://github.com/gargi203/NexusCare)**
- 📝 **System Design Document**: [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md)
- 💾 **Source Code Archive**: [`healthcare-appointment-manager.zip`](./healthcare-appointment-manager.zip)

---

## 📑 Table of Contents
1. [Overview & Key Features](#-overview--key-features)
2. [Tech Stack](#-tech-stack)
3. [System Architecture](#-system-architecture)
4. [Quick Start & Setup Guide](#-quick-start--setup-guide)
5. [Demo User Accounts](#-demo-user-accounts)
6. [Environment Variables (`.env.example`)](#-environment-variables-envexample)
7. [Database Schema & Models](#-database-schema--models)
8. [LLM Prompts & Clinical AI Engine](#-llm-prompts--clinical-ai-engine)
9. [Concurrency & Slot Hold Mechanism](#-concurrency--slot-hold-mechanism)
10. [Doctor Leave Management & Conflict Resolution](#-doctor-leave-management--conflict-resolution)
11. [Google Calendar Integration & Setup](#-google-calendar-integration--setup)
12. [Background Jobs & Notification Retry Queue](#-background-jobs--notification-retry-queue)
13. [Complete REST API Reference](#-complete-rest-api-reference)
14. [Automated Verification & Testing](#-automated-verification--testing)
15. [Production Deployment Guide](#-production-deployment-guide)

---

## 🌟 Overview & Key Features

NexusCare is designed to modernize clinical workflows by eliminating double-booking race conditions, bridging the communication gap between patients and practitioners, and automating follow-up care:

- **Role-Based Portals**: Distinct, tailor-made dashboards for **Patients**, **Doctors**, and **Clinic Administrators**.
- **Double-Booking Prevention**: A 5-minute atomic slot hold locking engine powered by database-level unique constraints and ACID transactions.
- **Doctor Leave Conflict Resolution**: When a doctor is marked on leave, the system automatically detects conflicting confirmed visits, cancels them with reason, and notifies affected patients via email.
- **AI Pre-Visit Symptom Triage**: Analyzes patient symptom inputs to determine urgency level (**High / Medium / Low**), summarize the chief complaint, and formulate 3 diagnostic questions for the doctor.
- **AI Post-Visit Patient Guidance**: Converts doctor clinical notes and prescriptions into plain-language summaries with structured medication dosage timetables and follow-up roadmaps.
- **Prescription Medication Reminders**: Scheduled background worker dispatches timely dosage alerts according to medication frequency (`ONCE_DAILY`, `TWICE_DAILY`, `THRICE_DAILY`).
- **Resilient Email Pipeline**: Nodemailer with Ethereal development mailboxes, live preview URLs, and an exponential backoff retry worker queue.
- **Google Calendar Integration**: 1-Click universal Google Calendar generation, standard `.ics` iCalendar downloads, and OAuth 2.0 API synchronization.
- **Zero-Downtime Fallback**: Built-in deterministic clinical heuristic engines ensure full functionality even during external AI API outages or offline development.

---

## 💻 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Date-fns, Canvas Confetti |
| **Backend** | Node.js, Express.js, JSON Web Tokens (JWT), Bcrypt.js, Node-Cron, Nodemailer |
| **Database** | Prisma ORM with SQLite (Local zero-config) / PostgreSQL ready |
| **AI / LLM** | Google Gemini API (1.5-Flash) & OpenAI API (GPT-4o-mini) + Rule-based fallback engine |
| **Calendar / Integrations** | Google Calendar API (OAuth 2.0), iCal RFC-5545 `.ics` generator |

---

## 🏛️ System Architecture

```
                               ┌───────────────────────────────────────────────┐
                               │           React Vite SPA (Port 5175)          │
                               │  (Patient Portal / Doctor Portal / Admin)     │
                               └──────────────────────┬────────────────────────┘
                                                      │ REST API & Bearer JWT
                                                      ▼
                               ┌───────────────────────────────────────────────┐
                               │         Express.js API Server (Port 5050)     │
                               ├──────────────────────┬────────────────────────┤
                               │ • Auth & Role RBAC   │ • Concurrency Manager  │
                               │ • AI Triage Engine   │ • Leave Conflict Logic │
                               │ • Calendar Syncer    │ • Background Workers   │
                               └──────────┬───────────┴───────────┬────────────┘
                                          │                       │
                 ┌────────────────────────┴────────┐    ┌─────────┴────────────────────────┐
                 ▼                                 ▼    ▼                                  ▼
      ┌────────────────────┐     ┌───────────────────┐ ┌──────────────────┐      ┌─────────────────┐
      │  Prisma ORM SQLite │     │  Google Gemini /  │ │   Nodemailer /   │      │ Google Calendar │
      │  (Atomic Locks)    │     │  OpenAI / Fallback│ │   Ethereal Queue │      │ (OAuth2 & Links)│
      └────────────────────┘     └───────────────────┘ └──────────────────┘      └─────────────────┘
```

---

## 🚀 Quick Start & Setup Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### 1. Clone & Install Dependencies
```bash
# Clone repository
git clone https://github.com/gargi203/NexusCare.git
cd NexusCare

# Install dependencies for both server and client
npm run install:all
```

### 2. Database Initialization & Seeding
Push the Prisma schema to the local SQLite database and seed initial test records:
```bash
npm run db:setup
```

### 3. Start Fullstack Application
Run the backend Express API (Port 5050) and Vite React client (Port 5175) concurrently:
```bash
npm run dev
```

- **Frontend Application**: [http://localhost:5175](http://localhost:5175)
- **Backend API**: [http://localhost:5050](http://localhost:5050)
- **API Health Endpoint**: [http://localhost:5050/api/health](http://localhost:5050/api/health)

---

## 🔑 Demo User Accounts

You can log in with any of the following accounts (Password: `Password123!`):

| Role | Name | Email | Focus Areas |
|---|---|---|---|
| **Patient** | Alex Morgan | `alex.morgan@example.com` | Slot locking, Symptom triage intake, Google Calendar links, Medication tracker |
| **Patient** | David Miller | `david.miller@example.com` | Past completed visits, AI post-visit care plans, Active prescriptions |
| **Doctor** | Dr. Sarah Jenkins | `dr.jenkins@nexuscare.clinic` | Cardiology, Pre-visit triage urgency badges, Clinical notes & Rx builder |
| **Doctor** | Dr. Marcus Chen | `dr.chen@nexuscare.clinic` | Neurology, Daily appointment roster, Consultation room |
| **Doctor** | Dr. Elena Rostova | `dr.rostova@nexuscare.clinic` | General Medicine & Triage, Acute care follow-ups |
| **Clinic Admin** | Dr. Arthur Vance | `admin@nexuscare.clinic` | Doctor roster setup, Working hours, Leave day declaration & conflict audits |

> 💡 **Tip**: Use the **"Switch Persona"** menu in the top-right header on the live app for instant 1-click account switching without typing passwords!

---

## ⚙️ Environment Variables (`.env.example`)

Create or update `.env` in `server/`:

```env
# Server Port & Network
PORT=5050
NODE_ENV=development
CLIENT_URL=http://localhost:5175

# Database Connection (SQLite local or PostgreSQL)
DATABASE_URL="file:./dev.db"

# JWT Authentication Secret Key
JWT_SECRET=super_secret_healthcare_jwt_key_2026_antigravity

# LLM Providers (Optional - Deterministic medical fallback activates if omitted)
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Email Delivery Configuration (Nodemailer / Ethereal / SMTP)
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="NexusCare Clinic <appointments@nexuscare.clinic>"

# Google Calendar Integration (Optional OAuth2)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5050/api/calendar/oauth/callback
```

---

## 🗄️ Database Schema & Models

Prisma ORM schema (`server/prisma/schema.prisma`):

```prisma
model User {
  id                  String               @id @default(uuid())
  email               String               @unique
  password            String
  name                String
  role                String               @default("PATIENT") // "PATIENT" | "DOCTOR" | "ADMIN"
  phone               String?
  avatar              String?
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
  
  doctorProfile       DoctorProfile?
  patientBookings     Appointment[]        @relation("PatientAppointments")
  slotHolds           SlotHold[]
  medicationReminders MedicationReminder[]
}

model DoctorProfile {
  id                  String         @id @default(uuid())
  userId              String         @unique
  user                User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  specialization      String
  bio                 String?
  experienceYears     Int            @default(5)
  consultationFee     Float          @default(50.0)
  workingHoursStart   String         @default("09:00") // "HH:mm"
  workingHoursEnd     String         @default("17:00") // "HH:mm"
  slotDurationMinutes Int            @default(30)
  weeklyOffDays       String         @default("0")     // Comma-separated (0=Sun, 6=Sat)
  rating              Float          @default(4.9)
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  appointments        Appointment[]  @relation("DoctorAppointments")
  leaveDays           LeaveDay[]
  slotHolds           SlotHold[]
}

model LeaveDay {
  id              String        @id @default(uuid())
  doctorId        String
  doctor          DoctorProfile @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  date            String        // YYYY-MM-DD
  reason          String?
  createdAt       DateTime      @default(now())

  @@unique([doctorId, date])
}

model SlotHold {
  id              String        @id @default(uuid())
  doctorId        String
  doctor          DoctorProfile @relation(fields: [doctorId], references: [id], onDelete: Cascade)
  patientId       String
  patient         User          @relation(fields: [patientId], references: [id], onDelete: Cascade)
  date            String        // YYYY-MM-DD
  startTime       String        // HH:mm
  endTime         String        // HH:mm
  holdToken       String        @unique
  expiresAt       DateTime
  createdAt       DateTime      @default(now())

  @@unique([doctorId, date, startTime])
}

model Appointment {
  id                      String             @id @default(uuid())
  appointmentCode         String             @unique
  patientId               String
  patient                 User               @relation("PatientAppointments", fields: [patientId], references: [id])
  doctorId                String
  doctor                  DoctorProfile      @relation("DoctorAppointments", fields: [doctorId], references: [id])
  date                    String             // YYYY-MM-DD
  startTime               String             // HH:mm
  endTime                 String             // HH:mm
  status                  String             @default("CONFIRMED") // "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
  cancellationReason      String?
  cancelledBy             String?            // "PATIENT" | "DOCTOR" | "SYSTEM_LEAVE"
  
  patientSymptoms         String
  symptomSeverity         String?            // "Mild" | "Moderate" | "Severe"
  symptomDurationDays     Int?
  
  preVisitSummary         String?            // JSON: { urgencyLevel, chiefComplaint, suggestedQuestions }
  doctorNotes             String?
  diagnosis               String?
  postVisitSummary        String?            // JSON: { patientFriendlySummary, medicationSchedule, followUpSteps }
  
  googleCalendarEventId   String?
  googleCalendarLink      String?
  
  createdAt               DateTime           @default(now())
  updatedAt               DateTime           @updatedAt

  prescriptions           Prescription[]
  medicationReminders     MedicationReminder[]

  @@unique([doctorId, date, startTime])
}

model Prescription {
  id                  String             @id @default(uuid())
  appointmentId       String
  appointment         Appointment        @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  medicationName      String
  dosage              String             // e.g. "500mg"
  frequency           String             // "ONCE_DAILY" | "TWICE_DAILY" | "THRICE_DAILY" | "AS_NEEDED"
  durationDays        Int                @default(5)
  instructions        String?
  createdAt           DateTime           @default(now())

  reminders           MedicationReminder[]
}

model MedicationReminder {
  id                  String             @id @default(uuid())
  prescriptionId      String
  prescription        Prescription       @relation(fields: [prescriptionId], references: [id], onDelete: Cascade)
  appointmentId       String
  appointment         Appointment        @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  patientId           String
  patient             User               @relation(fields: [patientId], references: [id], onDelete: Cascade)
  medicationName      String
  dosage              String
  frequency           String
  scheduledTime       String             // e.g. "09:00 AM & 08:00 PM"
  status              String             @default("SENT")
  sentAt              DateTime?
  createdAt           DateTime           @default(now())
}

model NotificationLog {
  id                  String             @id @default(uuid())
  recipientEmail      String
  recipientName       String?
  recipientRole       String             // "PATIENT" | "DOCTOR" | "ADMIN"
  type                String             // "BOOKING_CONFIRMATION" | "LEAVE_CANCELLATION" | "MEDICATION_REMINDER"
  subject             String
  content             String
  status              String             @default("SENT") // "SENT" | "FAILED" | "RETRYING"
  attempts            Int                @default(1)
  lastAttemptAt       DateTime           @default(now())
  errorMessage        String?
  metadata            String?            // JSON payload (including Ethereal preview URLs)
  createdAt           DateTime           @default(now())
}
```

---

## 🧠 LLM Prompts & Clinical AI Engine

NexusCare implements prompt contracts formatted for structured JSON returns:

### 1. Pre-Visit Symptom Triage Prompt
```text
Task: Analyse these patient symptoms and return a JSON object with:
1. "urgencyLevel": either "Low", "Medium", or "High"
2. "chiefComplaint": concise one-sentence description of the primary medical issue
3. "suggestedQuestions": array of exactly 3 relevant diagnostic questions for the doctor to ask during consultation

Symptoms: <symptoms>
Reported Severity: <severity>
Duration: <durationDays> days
```

### 2. Post-Visit Patient Guidance Prompt
```text
Task: Convert these clinical doctor notes into a clear, comforting, patient-friendly summary with an easy-to-understand medication schedule and numbered follow-up steps.

Clinical Notes: <doctorNotes>
Diagnosis: <diagnosis>
Prescribed Medications: <prescriptionsJson>

Return ONLY JSON with keys: patientFriendlySummary, medicationSchedule, followUpSteps, lifestyleAdvice.
```

### 3. Graceful Deterministic Fallback Logic
If `GEMINI_API_KEY` or `OPENAI_API_KEY` are not set or fail due to network timeouts:
- The system automatically triggers the rule-based clinical parser (`generateFallbackPreVisitSummary` and `generateFallbackPostVisitSummary`).
- Classifies urgency via keyword heuristic analysis (e.g. chest pain, respiratory distress $\rightarrow$ `High`, mild checkup $\rightarrow$ `Low`).
- Extracts chief complaints and matches specialized clinical questions.
- Formats medication schedules and recovery advice cleanly.

---

## 🔒 Concurrency & Slot Hold Mechanism

To solve concurrent booking race conditions (two patients clicking the same slot at the same second):

1. **Temporary 5-Minute Atomic Hold**:
   - `POST /api/appointments/hold` attempts to create an atomic lock in the `SlotHold` table.
   - The composite constraint `@@unique([doctorId, date, startTime])` guarantees that only ONE patient holds the slot.
   - Any simultaneous request by another patient returns `400: Slot is currently held by another patient`.
2. **Visual Countdown Bar**:
   - The client renders a live countdown timer (`SlotHoldTimer.jsx`). If 5 minutes elapse without checkout, the slot is automatically released.
3. **Transactional ACID Confirmation**:
   - Final booking runs inside `prisma.$transaction`.
   - Re-checks the `holdToken`, inserts the `Appointment` record, releases the hold, and triggers confirmation emails asynchronously.
4. **Automated Sweeper Cron**:
   - Background worker sweeps expired holds every 60 seconds (`DELETE FROM SlotHold WHERE expiresAt < NOW()`).

---

## 📅 Doctor Leave Management & Conflict Resolution

When an administrator or doctor marks a date as leave:
1. An upsert is executed on `LeaveDay` (`@@unique([doctorId, date])`).
2. The engine queries all active bookings for that doctor on that date (`status: 'CONFIRMED'`).
3. Conflicting visits are atomically transitioned to `status: 'CANCELLED'` with `cancelledBy: 'SYSTEM_LEAVE'`.
4. Any active slot holds on that date are purged.
5. Automated cancellation emails containing the doctor's leave rationale and portal rebooking links are dispatched to all affected patients.

---

## 🗓️ Google Calendar Integration & Setup

### 1. Instant 1-Click Calendar Links (Universal Web)
Every confirmed appointment generates a direct Google Calendar template link:
```
https://calendar.google.com/calendar/render?action=TEMPLATE&text=Consultation%20with%20Dr.%20Sarah%20Jenkins&dates=20260915T100000/20260915T103000&details=...&location=NexusCare%20Clinic
```

### 2. Standard iCalendar (`.ics`) Downloads
Patients and doctors can download standard `.ics` calendar files anytime via `GET /api/appointments/:id/ics` to import into Apple Calendar, Outlook, or mobile devices.

### 3. Google Calendar API (OAuth 2.0)
To enable direct background calendar event creation via Googleapis:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **Google Calendar API**.
3. Create **OAuth 2.0 Client ID** credentials and set the Authorized Redirect URI to `http://localhost:5050/api/calendar/oauth/callback`.
4. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into `server/.env`.

---

## ⏰ Background Jobs & Notification Retry Queue

NexusCare runs 3 automated cron workers (`server/src/jobs/cronScheduler.js`):

1. **Slot Hold Cleanup** (`* * * * *` - Every 1 minute):
   Releases abandoned slot reservations whose 5-minute TTL has expired.
2. **Medication Dosage Reminders** (`*/30 * * * *` - Every 30 minutes):
   Checks active prescriptions and dispatches reminder notifications according to schedule (`09:00 AM`, `02:00 PM`, `08:00 PM`).
3. **Email Retry Queue Worker** (`*/2 * * * *` - Every 2 minutes):
   Queries `NotificationLog` for failed dispatches and retries delivery with exponential backoff (up to 3 attempts).

> 📬 **Email Inspection Modal**: Click the Bell icon in the header navigation to view live notification audit logs, trigger manual retries, or preview Ethereal HTML emails!

---

## 📡 Complete REST API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/register` | Register new user (Patient/Doctor/Admin) | No |
| `POST` | `/login` | Sign in with email and password | No |
| `GET` | `/me` | Get current user profile & role | Yes |
| `GET` | `/demo-accounts` | List available demo test accounts | No |

### Doctors (`/api/doctors`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/` | Search & filter doctors by specialization | No |
| `GET` | `/:id` | Get single doctor details & leave days | No |
| `GET` | `/:id/slots?date=YYYY-MM-DD` | Calculate available, held & booked slots | Optional |
| `PUT` | `/:id` | Update doctor working hours, fee, slot duration | Doctor / Admin |

### Appointments & Concurrency (`/api/appointments`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/hold` | Reserve slot with 5-minute atomic lock | Patient |
| `POST` | `/release-hold` | Release active slot reservation | Patient |
| `POST` | `/book` | Confirm booking with symptoms & AI triage | Patient |
| `GET` | `/my` | Get user's appointment records | Yes |
| `GET` | `/:id` | Get single appointment details | Yes |
| `POST` | `/:id/cancel` | Cancel appointment with reason | Patient/Doctor/Admin |
| `GET` | `/:id/ics` | Download `.ics` iCalendar file | No |

### Consultation Room (`/api/consultations`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/:id/complete` | Complete visit, save Rx & trigger AI post-visit summary | Doctor / Admin |

### Administration (`/api/admin`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/doctors` | Register new doctor profile | Admin |
| `POST` | `/doctors/:doctorId/leave` | Declare doctor leave day & cancel conflicts | Admin |
| `DELETE` | `/doctors/:doctorId/leave/:date` | Remove declared leave day | Admin |
| `GET` | `/analytics` | Get clinic counts and KPI metrics | Admin |

### Notifications & Audits (`/api/notifications`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/logs` | View all notification audit records | Yes |
| `POST` | `/retry-emails` | Trigger background email retry worker | Yes |
| `POST` | `/trigger-med-reminders` | Manually trigger medication reminders | Yes |
| `GET` | `/medication-reminders` | Get patient's active medication reminders | Patient |

---

## 🧪 Automated Verification & Testing

Run the automated end-to-end integration test suite:

```bash
cd server
node test-system.js
```

### What the test suite validates:
1. **LLM Pre-Visit Triage**: Urgency classification, chief complaint extraction, and 3 diagnostic questions.
2. **LLM Post-Visit Summary**: Patient-friendly explanation, structured medication schedule, and follow-up steps.
3. **Concurrency Locking**: Slot hold creation, duplicate hold rejection, and race condition prevention.
4. **ACID Transaction Booking**: Creation of appointment with unique code and calendar links.
5. **Doctor Leave Cascade**: Leave declaration, conflict detection, auto-cancellation, and patient notification email dispatch.
6. **Background Workers**: Hold cleanup, medication reminders, and email retry queues.

---

## 🌐 Production Deployment Guide

### Deploying on Render (Unified Fullstack Web Service)
1. In Render, select **New +** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository: `gargi203/NexusCare`.
3. Set:
   - **Runtime**: `Node`
   - **Build Command**: `npm run install:all && npm run build && npm run db:setup`
   - **Start Command**: `npm run server`
   - **Instance Type**: `Free`
4. Click **Deploy Web Service**.

### Deploying Frontend on Vercel
1. Go to [vercel.com/new](https://vercel.com/new) and import `gargi203/NexusCare`.
2. Set **Root Directory** to `client`.
3. Set **Framework Preset** to `Vite`.
4. Click **Deploy**.

---

## 📄 License
MIT License • Built for the NexusCare Healthcare Suite.
