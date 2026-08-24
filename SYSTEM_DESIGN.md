# NexusCare System Design Document
*Architectural Deep-Dive: Concurrency Control, Conflict Resolution, LLM Triage, and Resilient Notification Pipelines*

---

## 1. Concurrency Architecture & Double-Booking Prevention

In a high-throughput medical appointment platform, concurrent users frequently attempt to book identical doctor time slots simultaneously. NexusCare employs a defense-in-depth concurrency model utilizing a **Two-Phase Slot Reservation Protocol**:

```
+--------------------------------------------------------------------------------+
|  User A: [Selects Slot] -> [POST /hold] -> [5-Min TTL Hold in DB]             |
|  User B: [Attempts Slot] -> [Hold Check Fails] -> [400 "Held by Other Patient"]|
|                                                                                |
|  User A: [Submits Symptoms] -> [DB Transaction BEGIN]                          |
|         -> Re-verify Hold & Final Slot State                                   |
|         -> INSERT Appointment (Unique Constraint: doctorId_date_startTime)     |
|         -> DELETE SlotHold                                                     |
|         -> DB Transaction COMMIT                                               |
+--------------------------------------------------------------------------------+
```

### Key Technical Mechanisms:
1. **Atomic 5-Minute Slot Hold (Phase 1)**:
   - When a patient clicks an available slot, `POST /api/appointments/hold` generates a cryptographically unique `holdToken` with a 5-minute TTL (`expiresAt = NOW() + 5m`).
   - SQLite/Prisma enforces a composite unique constraint `@@unique([doctorId, date, startTime])` on the `SlotHold` table.
   - Any simultaneous request by another patient is immediately rejected with a `400 Slot is currently held` error before touching checkout logic.
2. **ACID Transactional Confirmation (Phase 2)**:
   - During final symptom checkout, `confirmAppointment` runs inside a serialized `prisma.$transaction`.
   - The transaction re-validates that no confirmed booking exists, confirms the caller's `holdToken` has not expired, inserts the confirmed `Appointment`, and atomically releases the `SlotHold`.
   - Database-level unique indexing guarantees mathematical prevention of double-booking under extreme concurrent race conditions.

---

## 2. Doctor Leave Management & Cascade Conflict Handling

When a doctor logs an unexpected leave day (e.g., conference or medical emergency), the clinic schedule must automatically reconcile without manual operator intervention:

```
[Admin/Doctor Marks Leave Day]
         │
         ▼
[prisma.$transaction]
  ├── 1. UPSERT LeaveDay record @@unique([doctorId, date])
  ├── 2. SELECT affected Appointments (status: 'CONFIRMED', date: leaveDate)
  ├── 3. BATCH UPDATE Appointments -> status: 'CANCELLED', cancelledBy: 'SYSTEM_LEAVE'
  ├── 4. PURGE all active SlotHolds for doctor on leaveDate
  └── 5. DISPATCH async cancellation emails with custom leave reason & portal rebooking links
```

- **Conflict Auditing**: The system returns the exact list and count of disrupted appointments.
- **Graceful Client Experience**: If a patient opens a doctor's schedule for a leave date, the slot engine instantly flags the entire day as unavailable with the specific leave rationale displayed.

---

## 3. Slot Hold TTL Lifecycle & Expired Lock Reclamation

- **Client-Side Visual Countdown**: When a slot is locked, a live visual countdown bar displays remaining seconds. When the timer hits 0:00, the UI automatically invalidates the session and prompts reselection.
- **Server-Side Scheduled Sweeper**: A background worker cron (`* * * * *`) runs every 60 seconds, executing:
  ```sql
  DELETE FROM "SlotHold" WHERE "expiresAt" < datetime('now');
  ```
  This ensures abandoned booking sessions (e.g., browser tab closures or dropped connections) release slots back to the public pool within 60 seconds of expiration.

---

## 4. Resilient Notification Pipelines & Retry Worker

Clinical communications (appointment confirmations, leave cancellations, and prescription dosage reminders) cannot afford silent failure. NexusCare treats email delivery as an asynchronous distributed event queue:

```
[Application Event] ──> [Send via Nodemailer/Ethereal]
                              │
               ┌──────────────┴──────────────┐
               ▼ (Success)                   ▼ (Network / SMTP Error)
      [NotificationLog]              [NotificationLog]
      status: 'SENT'                 status: 'RETRYING' | attempts: 1
                                             │
                                             ▼ (Every 2 Minutes Cron)
                                    [Retry Queue Worker]
                                    Exponential Backoff (max 3 retries)
```

- **Idempotent Audit Trail**: Every notification attempt (role, recipient, payload, status, error message) is permanently recorded in `NotificationLog`.
- **Scheduled Medication Reminders**: An automated background worker monitors active prescriptions and dispatches timely dose notifications according to prescription frequency (`ONCE_DAILY`, `TWICE_DAILY`, `THRICE_DAILY`).
- **Failover Preview**: In local development and automated testing environments, Nodemailer dynamically boots temporary Ethereal test inboxes and attaches one-click preview URLs in the audit log for zero-friction verification.

---

## 5. Fault-Tolerant AI Medical Summary Engine

- **Pre-Visit Triage**: Analyzes patient symptom narrative -> Classifies urgency (High / Medium / Low), extracts concise chief complaint, and crafts 3 targeted diagnostic questions for the doctor.
- **Post-Visit Patient Education**: Converts physician shorthand notes -> Empathetic plain language summary, structured medication schedule table, and actionable recovery roadmap.
- **Zero-Downtime Fallback**: If LLM API keys are missing or external AI APIs time out, the system automatically falls back to an internal deterministic clinical heuristic parser without throwing user-facing 500 errors.
