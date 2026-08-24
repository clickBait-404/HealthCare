const API_BASE = '/api';

// Helper for fetch with Authorization header
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('nexus_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => request('/auth/me'),
  getDemoAccounts: () => request('/auth/demo-accounts'),

  // Doctors
  getDoctors: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/doctors${query ? `?${query}` : ''}`);
  },
  getDoctorById: (id) => request(`/doctors/${id}`),
  getDoctorSlots: (id, date) => request(`/doctors/${id}/slots?date=${date}`),
  updateDoctorProfile: (id, data) => request(`/doctors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Appointments & Slot Holds
  holdSlot: (payload) => request('/appointments/hold', { method: 'POST', body: JSON.stringify(payload) }),
  releaseHold: (payload) => request('/appointments/release-hold', { method: 'POST', body: JSON.stringify(payload) }),
  bookAppointment: (payload) => request('/appointments/book', { method: 'POST', body: JSON.stringify(payload) }),
  getMyAppointments: () => request('/appointments/my'),
  getAppointmentById: (id) => request(`/appointments/${id}`),
  cancelAppointment: (id, reason) => request(`/appointments/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),

  // Consultation Room
  completeConsultation: (id, data) => request(`/consultations/${id}/complete`, { method: 'POST', body: JSON.stringify(data) }),

  // Admin
  createDoctor: (data) => request('/admin/doctors', { method: 'POST', body: JSON.stringify(data) }),
  setDoctorLeave: (doctorId, data) => request(`/admin/doctors/${doctorId}/leave`, { method: 'POST', body: JSON.stringify(data) }),
  removeDoctorLeave: (doctorId, date) => request(`/admin/doctors/${doctorId}/leave/${date}`, { method: 'DELETE' }),
  getAdminAnalytics: () => request('/admin/analytics'),

  // Notifications
  getNotificationLogs: () => request('/notifications/logs'),
  triggerEmailRetries: () => request('/notifications/retry-emails', { method: 'POST' }),
  triggerMedicationReminders: () => request('/notifications/trigger-med-reminders', { method: 'POST' }),
  getMedicationReminders: () => request('/notifications/medication-reminders'),
};
