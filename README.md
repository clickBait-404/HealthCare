# 🏥 NexusCare — Healthcare Appointment & Follow-up Manager

> An enterprise-grade, fullstack clinical scheduling and patient follow-up management platform built with **React (Vite)**, **Node.js (Express)**, **Prisma ORM (SQLite / PostgreSQL)**, and **AI Triage Integration**.

---

## 🌐 Live Application & Links

* 📦 **GitHub Repository**: https://github.com/clickBait-404/HealthCare
* 📝 **System Design Document**: [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md)

---

## 📑 Table of Contents

1. [Overview & Key Features](#-overview--key-features)
2. [Tech Stack](#-tech-stack)
3. [System Architecture](#-system-architecture)
4. [Quick Start & Setup Guide](#-quick-start--setup-guide)
5. [Demo User Accounts](#-demo-user-accounts)
6. [Environment Variables](#-environment-variables-envexample)
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

* **Role-Based Portals**: Distinct dashboards for **Patients**, **Doctors**, and **Clinic Administrators**.

* **Double-Booking Prevention**: A 5-minute atomic slot-hold locking engine powered by database-level unique constraints and ACID transactions.

* **Doctor Leave Conflict Resolution**: When a doctor is marked on leave, the system automatically detects conflicting confirmed visits, cancels them with a reason, and notifies affected patients via email.

* **AI Pre-Visit Symptom Triage**: Analyzes patient symptom inputs to determine urgency level (**High / Medium / Low**), summarizes the chief complaint, and formulates 3 diagnostic questions for the doctor.

* **AI Post-Visit Patient Guidance**: Converts doctor clinical notes and prescriptions into plain-language summaries with structured medication dosage timetables and follow-up roadmaps.

* **Prescription Medication Reminders**: Scheduled background workers dispatch timely dosage alerts according to medication frequency (`ONCE_DAILY`, `TWICE_DAILY`, `THRICE_DAILY`).

* **Resilient Email Pipeline**: Nodemailer with Ethereal development mailboxes, live preview URLs, and an exponential-backoff retry worker queue.

* **Google Calendar Integration**: 1-click Google Calendar generation, standard `.ics` iCalendar downloads, and OAuth 2.0 API synchronization.

* **Zero-Downtime Fallback**: Built-in deterministic clinical heuristic engines ensure functionality even during external AI API outages or offline development.

---

## 💻 Tech Stack

| Layer                       | Technologies                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------- |
| **Frontend**                | React 18, Vite, Tailwind CSS, Lucide Icons, Date-fns, Canvas Confetti                 |
| **Backend**                 | Node.js, Express.js, JSON Web Tokens (JWT), Bcrypt.js, Node-Cron, Nodemailer          |
| **Database**                | Prisma ORM with SQLite (Local zero-config) / PostgreSQL ready                         |
| **AI / LLM**                | Google Gemini API (1.5-Flash) & OpenAI API (GPT-4o-mini) + Rule-based fallback engine |
| **Calendar / Integrations** | Google Calendar API (OAuth 2.0), iCal RFC-5545 `.ics` generator                       |

---

## 🏛️ System Architecture

```text
                         ┌───────────────────────────────────────────────┐
                         │           React Vite SPA (Port 5175)          │
                         │  (Patient Portal / Doctor Portal / Admin)     │
                         └──────────────────────┬────────────────────────┘
                                                │
                                      REST API & Bearer JWT
                                                │
                                                ▼
                         ┌───────────────────────────────────────────────┐
                         │       Express.js API Server (Port 5050)       │
                         ├──────────────────────┬────────────────────────┤
                         │ • Auth & Role RBAC   │ • Concurrency Manager  │
                         │ • AI Triage Engine   │ • Leave Conflict Logic │
                         │ • Calendar Syncer    │ • Background Workers   │
                         └──────────┬───────────┴───────────┬────────────┘
                                    │                       │
                 ┌──────────────────┴────────┐     ┌────────┴───────────────┐
                 ▼                           ▼     ▼                        ▼
       ┌────────────────────┐     ┌───────────────────┐ ┌──────────────────┐
       │  Prisma ORM SQLite │     │ Google Gemini /   │ │   Nodemailer /   │
       │  (Atomic Locks)    │     │ OpenAI / Fallback │ │   Ethereal Queue  │
       └────────────────────┘     └───────────────────┘ └──────────────────┘
                                                               │
                                                     ┌─────────┴──────────┐
                                                     │ Google Calendar    │
                                                     │ (OAuth2 & Links)   │
                                                     └────────────────────┘
```

---

## 🚀 Quick Start & Setup Guide

### Prerequisites

* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher

### 1. Clone & Install Dependencies

```bash
# Clone repository
git clone https://github.com/clickBait-404/HealthCare.git
cd HealthCare

# Install dependencies for both server and client
npm run install:all
```

### 2. Environment Variables

Create:

```text
server/.env
```

You can use [`server/.env.example`](./server/.env.example) as the template.

For basic local development, the AI, email, and Google Calendar credentials are optional because the application includes fallback functionality.

### 3. Database Initialization & Seeding

Push the Prisma schema to the local SQLite database and seed initial test records:

```bash
npm run db:setup
```

### 4. Start Fullstack Application

Run the backend Express API and Vite React client concurrently:

```bash
npm run dev
```

The application will be available at:

* **Frontend**: http://localhost:5175
* **Backend API**: http://localhost:5050
* **API Health Endpoint**: http://localhost:5050/api/health

---

## 🔑 Demo User Accounts

You can log in with any of the following accounts.

**Password for all demo accounts: `Password123!`**

| Role             | Name              | Email                         | Focus Areas                                                                    |
| ---------------- | ----------------- | ----------------------------- | ------------------------------------------------------------------------------ |
| **Patient**      | Alex Morgan       | `alex.morgan@example.com`     | Slot locking, symptom triage intake, Google Calendar links, medication tracker |
| **Patient**      | David Miller      | `david.miller@example.com`    | Past completed visits, AI post-visit care plans, active prescriptions          |
| **Doctor**       | Dr. Sarah Jenkins | `dr.jenkins@nexuscare.clinic` | Cardiology, pre-visit triage urgency badges, clinical notes & Rx builder       |
| **Doctor**       | Dr. Marcus Chen   | `dr.chen@nexuscare.clinic`    | Neurology, daily appointment roster, consultation room                         |
| **Doctor**       | Dr. Elena Rostova | `dr.rostova@nexuscare.clinic` | General Medicine & Triage, acute care follow-ups                               |
| **Clinic Admin** | Dr. Arthur Vance  | `admin@nexuscare.clinic`      | Doctor roster setup, working hours, leave declaration & conflict audits        |

> 💡 **Tip:** Use the **"Switch Persona"** menu in the top-right header for quick account switching.

---

## ⚙️ Environment Variables

Create or update:

```text
server/.env
```

Example:

```env
# Server Port & Network
PORT=5050
NODE_ENV=development
CLIENT_URL=http://localhost:5175

# Database Connection
DATABASE_URL="file:./dev.db"

# JWT Authentication Secret Key
JWT_SECRET=your_secure_jwt_secret

# LLM Providers (Optional)
GEMINI_API_KEY=
OPENAI_API_KEY=

# Email Delivery Configuration
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="NexusCare Clinic <appointments@nexuscare.clinic>"

# Google Calendar Integration (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5050/api/calendar/oauth/callback
```

> **Security:** Never commit `server/.env` to GitHub. Only commit `server/.env.example`.

---

## 🗄️ Database Schema & Models

NexusCare uses Prisma ORM with relational models for users, doctors, appointments, slot holds, prescriptions, reminders, and notification auditing.

### Core Models

* **User** — Patient, Doctor, and Admin accounts.
* **DoctorProfile** — Doctor specialization, availability, working hours, fees, and ratings.
* **LeaveDay** — Doctor leave records.
* **SlotHold** — Temporary appointment-slot locks.
* **Appointment** — Patient-doctor booking records.
* **Prescription** — Medication and dosage information.
* **MedicationReminder** — Scheduled medication reminders.
* **NotificationLog** — Email notification and retry audit records.

---

## 🧠 LLM Prompts & Clinical AI Engine

NexusCare implements structured AI responses for two major workflows.

### 1. Pre-Visit Symptom Triage

The AI analyzes:

* Patient symptoms
* Reported severity
* Duration

and returns:

```json
{
  "urgencyLevel": "Low | Medium | High",
  "chiefComplaint": "Concise description",
  "suggestedQuestions": [
    "Question 1",
    "Question 2",
    "Question 3"
  ]
}
```

### 2. Post-Visit Patient Guidance

The AI converts doctor notes, diagnosis, and prescriptions into:

* Patient-friendly summaries
* Medication schedules
* Follow-up steps
* Lifestyle advice

### 3. Deterministic Fallback

If Gemini/OpenAI credentials are unavailable or an API request fails, NexusCare uses deterministic rule-based clinical fallback logic.

This allows the application to remain functional during:

* API outages
* Network failures
* Local development
* Missing AI credentials

---

## 🔒 Concurrency & Slot Hold Mechanism

NexusCare prevents two patients from booking the same appointment slot simultaneously.

### 1. Temporary 5-Minute Hold

```text
POST /api/appointments/hold
```

A slot is temporarily locked using the `SlotHold` table.

The database constraint:

```prisma
@@unique([doctorId, date, startTime])
```

ensures that only one patient can hold a particular doctor/date/time combination.

### 2. Visual Countdown

The frontend displays a 5-minute countdown.

If checkout is not completed, the hold expires.

### 3. Transactional Confirmation

Final booking uses:

```text
prisma.$transaction
```

The transaction:

1. Validates the hold token.
2. Creates the appointment.
3. Releases the slot hold.
4. Triggers confirmation notifications.

### 4. Automated Cleanup

A background worker periodically removes expired slot holds.

---

## 📅 Doctor Leave Management & Conflict Resolution

When a doctor is marked as unavailable:

1. A `LeaveDay` record is created or updated.
2. Existing confirmed appointments for that date are identified.
3. Conflicting appointments are cancelled.
4. Active slot holds are removed.
5. Affected patients receive cancellation notifications.

This prevents appointments from remaining scheduled when a doctor is unavailable.

---

## 🗓️ Google Calendar Integration & Setup

### 1. Google Calendar Links

Confirmed appointments can generate Google Calendar links.

Example:

```text
https://calendar.google.com/calendar/render?action=TEMPLATE
```

### 2. iCalendar `.ics` Downloads

Appointments can also be exported as standard `.ics` calendar files.

Endpoint:

```text
GET /api/appointments/:id/ics
```

These files can be imported into:

* Google Calendar
* Apple Calendar
* Microsoft Outlook
* Other iCalendar-compatible applications

### 3. Google Calendar API

To enable OAuth 2.0 synchronization:

1. Create a project in Google Cloud Console.
2. Enable the Google Calendar API.
3. Create OAuth 2.0 credentials.
4. Configure the redirect URI.
5. Add the credentials to `server/.env`.

---

## ⏰ Background Jobs & Notification Retry Queue

NexusCare uses scheduled background workers for:

### Slot Hold Cleanup

Runs every minute to remove expired appointment holds.

### Medication Reminders

Runs periodically to check active medication schedules and dispatch reminders.

### Email Retry Queue

Failed email notifications are stored in `NotificationLog` and retried using an exponential-backoff strategy.

This provides a more resilient notification pipeline.

---

## 📡 REST API Reference

### Authentication

Base path:

```text
/api/auth
```

| Method | Endpoint         | Description         | Auth |
| ------ | ---------------- | ------------------- | ---- |
| POST   | `/register`      | Register a new user | No   |
| POST   | `/login`         | Sign in             | No   |
| GET    | `/me`            | Get current user    | Yes  |
| GET    | `/demo-accounts` | Get demo accounts   | No   |

### Doctors

Base path:

```text
/api/doctors
```

| Method | Endpoint                     | Description                 | Auth         |
| ------ | ---------------------------- | --------------------------- | ------------ |
| GET    | `/`                          | Search/filter doctors       | No           |
| GET    | `/:id`                       | Get doctor details          | No           |
| GET    | `/:id/slots?date=YYYY-MM-DD` | Get available slots         | Optional     |
| PUT    | `/:id`                       | Update doctor configuration | Doctor/Admin |

### Appointments

Base path:

```text
/api/appointments
```

| Method | Endpoint        | Description               | Auth                 |
| ------ | --------------- | ------------------------- | -------------------- |
| POST   | `/hold`         | Hold a slot for 5 minutes | Patient              |
| POST   | `/release-hold` | Release slot hold         | Patient              |
| POST   | `/book`         | Confirm appointment       | Patient              |
| GET    | `/my`           | Get user appointments     | Yes                  |
| GET    | `/:id`          | Get appointment details   | Yes                  |
| POST   | `/:id/cancel`   | Cancel appointment        | Patient/Doctor/Admin |
| GET    | `/:id/ics`      | Download calendar file    | No                   |

### Consultations

```text
/api/consultations
```

| Method | Endpoint        | Description                                 | Auth         |
| ------ | --------------- | ------------------------------------------- | ------------ |
| POST   | `/:id/complete` | Complete consultation and save prescription | Doctor/Admin |

### Administration

```text
/api/admin
```

| Method | Endpoint                         | Description          | Auth  |
| ------ | -------------------------------- | -------------------- | ----- |
| POST   | `/doctors`                       | Register doctor      | Admin |
| POST   | `/doctors/:doctorId/leave`       | Declare doctor leave | Admin |
| DELETE | `/doctors/:doctorId/leave/:date` | Remove leave         | Admin |
| GET    | `/analytics`                     | Get clinic analytics | Admin |

### Notifications

```text
/api/notifications
```

| Method | Endpoint                 | Description                  | Auth    |
| ------ | ------------------------ | ---------------------------- | ------- |
| GET    | `/logs`                  | View notification logs       | Yes     |
| POST   | `/retry-emails`          | Retry failed emails          | Yes     |
| POST   | `/trigger-med-reminders` | Trigger medication reminders | Yes     |
| GET    | `/medication-reminders`  | Get patient reminders        | Patient |

---

## 🧪 Automated Verification & Testing

Run the integration test suite:

```bash
cd server
node test-system.js
```

The test suite validates:

1. AI pre-visit triage.
2. AI post-visit patient guidance.
3. Slot-hold concurrency handling.
4. Duplicate booking prevention.
5. ACID transaction-based booking.
6. Doctor leave conflict resolution.
7. Background workers.
8. Notification retry functionality.

---

## 🌐 Production Deployment Guide

### Backend — Render

1. Create a new **Web Service** on Render.
2. Connect the GitHub repository:

```text
clickBait-404/HealthCare
```

3. Configure the service:

```text
Runtime: Node
```

Build command:

```bash
npm run install:all && npm run build && npm run db:setup
```

Start command:

```bash
npm run server
```

4. Configure the required environment variables in Render.
5. Deploy the service.

### Frontend — Vercel

1. Import:

```text
clickBait-404/HealthCare
```

2. Set **Root Directory** to:

```text
client
```

3. Set **Framework Preset** to:

```text
Vite
```

4. Configure the frontend API URL to point to the deployed backend.
5. Deploy.

### Production Architecture

```text
                  ┌─────────────────────┐
                  │       Vercel        │
                  │   React + Vite      │
                  └──────────┬──────────┘
                             │
                             │ REST API
                             ▼
                  ┌─────────────────────┐
                  │       Render        │
                  │ Node + Express API  │
                  └──────────┬──────────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
              ┌──────────┐     ┌──────────────┐
              │ Prisma   │     │ AI / Email / │
              │ Database │     │ Integrations │
              └──────────┘     └──────────────┘
```

> **Production note:** For a persistent production deployment, PostgreSQL is recommended over local SQLite storage.

---

## 📄 License

MIT License • Built for the NexusCare Healthcare Suite.
