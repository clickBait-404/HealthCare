# Healthcare System Design Document

*Architectural Deep-Dive: Concurrency Control, Conflict Resolution, LLM Triage, and Resilient Notification Pipelines*

---

## 1. Concurrency Architecture & Double-Booking Prevention

In a high-throughput medical appointment platform, concurrent users may attempt to book the same doctor time slot simultaneously. Healthcare uses a **two-phase slot reservation protocol** combining a short-lived database hold with transactional confirmation.

```text
+--------------------------------------------------------------------------------+
| User A: [Selects Slot] -> [POST /hold] -> [5-Min TTL Hold in DB]              |
| User B: [Attempts Slot] -> [Hold Check Fails] -> [400 "Held by Other Patient"]|
|                                                                                |
| User A: [Submits Symptoms] -> [DB Transaction BEGIN]                           |
|          -> Re-verify Hold & Final Slot State                                  |
|          -> INSERT Appointment (Unique Constraint: doctorId_date_startTime)    |
|          -> DELETE SlotHold                                                    |
|          -> DB Transaction COMMIT                                              |
+--------------------------------------------------------------------------------+
```

### Key Technical Mechanisms

1. **Atomic 5-Minute Slot Hold (Phase 1)**
   - `POST /api/appointments/hold` generates a cryptographically unique `holdToken` with a 5-minute TTL (`expiresAt = NOW() + 5m`).
   - PostgreSQL/Prisma enforces the composite unique constraint `@@unique([doctorId, date, startTime])` on the `SlotHold` table.
   - A concurrent request for the same slot is rejected before checkout proceeds.

2. **Transactional Confirmation (Phase 2)**
   - During final checkout, `confirmAppointment` executes booking operations inside a Prisma database transaction.
   - The transaction re-validates the hold, confirms the slot is still available, inserts the confirmed `Appointment`, and releases the `SlotHold`.
   - The database-level unique constraint provides the final consistency guarantee against duplicate bookings under concurrent requests.

---

## 2. Doctor Leave Management & Cascade Conflict Handling

When a doctor marks an unexpected leave day, the clinic schedule reconciles affected appointments without requiring manual rescheduling of every appointment.

```text
[Admin/Doctor Marks Leave Day]
          |
          v
[prisma.$transaction]
  |- 1. UPSERT LeaveDay @@unique([doctorId, date])
  |- 2. SELECT affected CONFIRMED Appointments
  |- 3. BATCH UPDATE Appointments -> CANCELLED
  |      cancelledBy = SYSTEM_LEAVE
  |- 4. PURGE active SlotHolds for doctor/date
  `- 5. DISPATCH async cancellation notifications
```

- **Conflict Auditing:** The system returns the affected appointment list/count.
- **Graceful Client Experience:** The slot engine treats a leave date as unavailable and surfaces the leave reason.

---

## 3. Slot Hold TTL Lifecycle & Expired Lock Reclamation

### Client-Side Countdown

When a slot is held, the frontend displays a live five-minute countdown. When the timer reaches zero, the client invalidates the hold and prompts the patient to select another slot.

### Server-Side Sweeper

A scheduled background worker runs every 60 seconds and removes expired holds:

```sql
DELETE FROM "SlotHold"
WHERE "expiresAt" < NOW();
```

This releases abandoned reservations shortly after their TTL expires.

---

## 4. Resilient Notification Pipeline & Retry Worker

Clinical communications such as appointment confirmations, leave cancellations, and medication reminders are handled asynchronously.

```text
[Application Event]
        |
        v
[Send via Nodemailer/Ethereal]
        |
        +----------------------------+
        |                            |
        v                            v
   [Success]                  [SMTP/Network Error]
        |                            |
        v                            v
NotificationLog              NotificationLog
status = SENT                status = RETRYING
                                   |
                                   v
                         [Retry Worker / Cron]
                                   |
                         Exponential Backoff
                              Max 3 Retries
```

- **Audit Trail:** Notification attempts record recipient, payload, status, error information, and timestamps in `NotificationLog`.
- **Medication Reminders:** Background jobs check active prescriptions and dispatch reminders according to prescription frequency.
- **Development Verification:** Ethereal test mailboxes provide preview URLs for local testing.

---

## 5. Fault-Tolerant AI Medical Summary Engine

### Pre-Visit Triage

The AI analyzes patient symptom input and returns:
- Urgency: High / Medium / Low
- Concise chief complaint
- Three targeted diagnostic questions for the doctor

### Post-Visit Patient Education

The AI converts doctor notes, diagnosis, and prescriptions into:
- Patient-friendly summaries
- Structured medication schedules
- Follow-up steps
- Lifestyle guidance

### Deterministic Fallback

If Gemini/OpenAI credentials are missing or an external AI request fails, the application uses deterministic rule-based fallback logic. This keeps the core workflow functional during API outages, network failures, and local development without requiring an LLM provider.

---

## 6. Production Deployment Architecture

The deployed frontend is hosted on Vercel and the backend is intended to run as a Node.js/Express service on Render. Production persistence uses PostgreSQL (Neon), while SQLite is intended for local development.

```text
                         ┌─────────────────────────────┐
                         │ Vercel                      │
                         │ React + Vite Frontend       │
                         │ health-care-cyan-delta...   │
                         └──────────────┬──────────────┘
                                        |
                                        | HTTPS REST API
                                        v
                         ┌─────────────────────────────┐
                         │ Render                      │
                         │ Node.js + Express Backend   │
                         └──────────────┬──────────────┘
                                        |
                         ┌──────────────┴──────────────┐
                         v                             v
              ┌────────────────────┐        ┌────────────────────┐
              │ Neon PostgreSQL     │        │ External Services  │
              │ Prisma ORM          │        │ Gemini/OpenAI      │
              │ Persistent Data     │        │ SMTP / Google      │
              └────────────────────┘        └────────────────────┘
```

### Deployment Configuration

- **Frontend:** Vercel
- **Frontend URL:** `https://health-care-cyan-delta.vercel.app/`
- **Frontend API variable:** `VITE_API_URL`
- **Backend:** Render Node.js/Express service
- **Database:** Neon PostgreSQL
- **Local database:** SQLite for development

> Production secrets such as `DATABASE_URL`, `JWT_SECRET`, API keys, SMTP credentials, and OAuth secrets must be configured through deployment environment variables and must never be committed to GitHub.

---

## 7. API and Security Boundaries

The frontend communicates with the backend through REST endpoints under `/api`.

Representative API groups include:

```text
/api/auth
/api/doctors
/api/appointments
/api/consultations
/api/admin
/api/notifications
```

Authentication uses JWT-based authorization, with role-specific access for patients, doctors, and administrators.

---

## 8. Design Summary

Healthcare uses several complementary reliability mechanisms:

| Concern | Design |
|---|---|
| Concurrent booking | Slot hold + database unique constraint |
| Final booking consistency | Prisma database transaction |
| Abandoned reservations | Five-minute TTL + sweeper |
| Doctor leave conflicts | Transactional cascade cancellation |
| Notification failure | Audit log + retry worker |
| AI provider failure | Deterministic fallback |
| Production persistence | Neon PostgreSQL |
| Frontend/backend separation | Vercel + Render |
| Authentication | JWT + role-based authorization |

The architecture is designed so that external services such as LLM providers, SMTP, and Google Calendar can fail without making the core appointment workflow completely unavailable.
