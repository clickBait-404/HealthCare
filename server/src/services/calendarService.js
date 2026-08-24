const { google } = require('googleapis');

/**
 * Calendar Service: Provides direct Google Calendar 1-Click URLs, standard iCal format,
 * and OAuth 2.0 Google Calendar API integration.
 */

// Generate 1-Click Google Calendar Web Link (Universally works on all web/mobile devices)
const generateGoogleCalendarUrl = (appointment, doctorName, specialization, patientName) => {
  const title = encodeURIComponent(`Medical Consultation: Dr. ${doctorName} & ${patientName}`);
  const details = encodeURIComponent(
    `NexusCare Appointment Code: ${appointment.appointmentCode}\n` +
    `Doctor: Dr. ${doctorName} (${specialization})\n` +
    `Patient: ${patientName}\n` +
    `Symptoms: ${appointment.patientSymptoms}\n` +
    `Location: NexusCare Health Portal / Clinic Room`
  );
  const location = encodeURIComponent('NexusCare Medical Center, Suite 402 / Virtual Telehealth');

  // Convert date 'YYYY-MM-DD' and time 'HH:mm' to UTC/ISO format for calendar
  const dateFormatted = appointment.date.replace(/-/g, '');
  const startClean = (appointment.startTime || '09:00').replace(':', '') + '00';
  const endClean = (appointment.endTime || '09:30').replace(':', '') + '00';
  const dates = `${dateFormatted}T${startClean}/${dateFormatted}T${endClean}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
};

// Generate standard .ics download file
const generateIcsContent = (appointment, doctorName, specialization, patientName) => {
  const startClean = (appointment.startTime || '09:00').replace(':', '') + '00';
  const endClean = (appointment.endTime || '09:30').replace(':', '') + '00';
  const dateFormatted = appointment.date.replace(/-/g, '');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NexusCare Health Systems//Appointment Manager//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${appointment.appointmentCode}@nexuscare.clinic`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${dateFormatted}T${startClean}`,
    `DTEND:${dateFormatted}T${endClean}`,
    `SUMMARY:Medical Consultation: Dr. ${doctorName} with ${patientName}`,
    `DESCRIPTION:NexusCare Appointment (${appointment.appointmentCode})\\nSpecialization: ${specialization}\\nSymptoms: ${appointment.patientSymptoms}`,
    'LOCATION:NexusCare Clinic',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
};

// OAuth2 Google Calendar Client
const getOAuth2Client = () => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null;

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/oauth/callback'
  );
};

// Sync Event with Google Calendar API
const createGoogleCalendarEvent = async (appointment, doctorUser, doctorProfile, patientUser, authTokens = null) => {
  const directLink = generateGoogleCalendarUrl(appointment, doctorUser.name, doctorProfile.specialization, patientUser.name);

  // If OAuth2 tokens provided, create real API event
  if (authTokens) {
    try {
      const oauth2Client = getOAuth2Client();
      if (oauth2Client) {
        oauth2Client.setCredentials(authTokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const event = {
          summary: `Consultation: Dr. ${doctorUser.name} & ${patientUser.name}`,
          description: `Appointment Code: ${appointment.appointmentCode}\nSymptoms: ${appointment.patientSymptoms}`,
          start: {
            dateTime: `${appointment.date}T${appointment.startTime}:00`,
            timeZone: 'UTC',
          },
          end: {
            dateTime: `${appointment.date}T${appointment.endTime}:00`,
            timeZone: 'UTC',
          },
          attendees: [{ email: patientUser.email }, { email: doctorUser.email }],
        };

        const res = await calendar.events.insert({
          calendarId: 'primary',
          resource: event,
        });

        return {
          eventId: res.data.id,
          htmlLink: res.data.htmlLink || directLink,
        };
      }
    } catch (err) {
      console.warn('[CalendarService] OAuth calendar event creation failed, falling back to direct link:', err.message);
    }
  }

  // Graceful direct link return
  return {
    eventId: `evt-${appointment.appointmentCode}`,
    htmlLink: directLink,
  };
};

module.exports = {
  generateGoogleCalendarUrl,
  generateIcsContent,
  createGoogleCalendarEvent,
  getOAuth2Client,
};
