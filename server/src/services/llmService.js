const axios = require('axios');

/**
 * Robust LLM Service for Healthcare Pre-visit Triage & Post-visit Patient Summaries
 * Supports Google Gemini API & OpenAI API with an intelligent deterministic fallback
 * so clinical workflows never break even during API downtime or offline environments.
 */

// Rule-based fallback generator for Pre-visit Triage
const generateFallbackPreVisitSummary = (symptoms, severity = 'Moderate', durationDays = 3) => {
  const lower = symptoms.toLowerCase();
  
  // Urgency classification heuristics
  let urgencyLevel = 'Medium';
  if (
    lower.includes('chest pain') ||
    lower.includes('shortness of breath') ||
    lower.includes('difficulty breathing') ||
    lower.includes('severe bleeding') ||
    lower.includes('unconscious') ||
    lower.includes('seizure') ||
    lower.includes('stroke') ||
    severity === 'Severe'
  ) {
    urgencyLevel = 'High';
  } else if (
    lower.includes('mild') ||
    lower.includes('checkup') ||
    lower.includes('routine') ||
    (durationDays && durationDays > 14) ||
    severity === 'Mild'
  ) {
    urgencyLevel = 'Low';
  }

  // Chief complaint extraction
  let chiefComplaint = symptoms.split('.')[0];
  if (chiefComplaint.length > 80) {
    chiefComplaint = chiefComplaint.substring(0, 80) + '...';
  }

  // Suggested questions based on symptom triggers
  const suggestedQuestions = [];
  if (lower.includes('fever') || lower.includes('temperature') || lower.includes('chills')) {
    suggestedQuestions.push('What has been the maximum recorded body temperature and did chills accompany it?');
  }
  if (lower.includes('pain') || lower.includes('ache') || lower.includes('sore')) {
    suggestedQuestions.push('Does the pain radiate to other areas or worsen with movement or exertion?');
  }
  if (lower.includes('cough') || lower.includes('throat') || lower.includes('congestion')) {
    suggestedQuestions.push('Is the cough productive (phlegm) or dry, and how long has it persisted?');
  }
  if (lower.includes('stomach') || lower.includes('nausea') || lower.includes('vomit') || lower.includes('diarrhea')) {
    suggestedQuestions.push('Are you experiencing any food intolerances, dehydration, or related abdominal cramping?');
  }

  // Fallbacks if fewer than 3 questions found
  if (suggestedQuestions.length < 1) {
    suggestedQuestions.push('When did you first notice the onset of these symptoms and are they progressively worsening?');
  }
  if (suggestedQuestions.length < 2) {
    suggestedQuestions.push('Have you taken any over-the-counter medications or home remedies, and did they relieve symptoms?');
  }
  if (suggestedQuestions.length < 3) {
    suggestedQuestions.push('Are there any personal or family medical histories relevant to these current complaints?');
  }

  return {
    urgencyLevel,
    chiefComplaint: chiefComplaint || symptoms,
    suggestedQuestions: suggestedQuestions.slice(0, 3),
    generatedBy: 'RuleBasedClinicalEngine (Fallback)',
  };
};

// Rule-based fallback generator for Post-visit Summary
const generateFallbackPostVisitSummary = (clinicalNotes, diagnosis = '', prescriptions = []) => {
  const medSchedule = prescriptions.map((p) => {
    let timing = 'Daily';
    if (p.frequency === 'TWICE_DAILY') timing = 'Twice a day (Morning & Evening)';
    else if (p.frequency === 'THRICE_DAILY') timing = '3 times a day (Morning, Afternoon, Night)';
    else if (p.frequency === 'AS_NEEDED') timing = 'As needed for acute discomfort';

    return {
      medication: p.medicationName,
      dosage: p.dosage,
      frequency: timing,
      duration: `${p.durationDays || 5} days`,
      instructions: p.instructions || 'Take with water after meals',
    };
  });

  const followUpSteps = [
    'Complete the full course of prescribed medications as directed.',
    'Monitor vital signs (temperature/blood pressure) and rest adequately.',
    'Schedule a follow-up consultation in 7 days or sooner if symptoms persist or deteriorate.',
    'Seek immediate emergency care if you experience acute distress or severe chest pain.',
  ];

  const patientFriendlySummary = `During your consultation, the doctor diagnosed: ${diagnosis || 'Condition under observation'}. Notes: ${clinicalNotes}. Please stay well-hydrated, ensure adequate rest, and strictly adhere to your treatment plan.`;

  return {
    patientFriendlySummary,
    medicationSchedule: medSchedule,
    followUpSteps,
    lifestyleAdvice: 'Stay hydrated with warm fluids, avoid heavy physical strain, and get 8 hours of restful sleep.',
    generatedBy: 'ClinicalGuidanceEngine (Fallback)',
  };
};

/**
 * Generate AI Pre-Visit Summary
 * Prompt: "Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: <symptoms>"
 */
const generatePreVisitSummary = async (symptoms, severity = 'Moderate', durationDays = 3) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const prompt = `You are a clinical AI triage assistant.
Task: Analyse these patient symptoms and return a JSON object with:
1. "urgencyLevel": either "Low", "Medium", or "High"
2. "chiefComplaint": concise one-sentence description of the primary medical issue
3. "suggestedQuestions": array of exactly 3 relevant diagnostic questions for the doctor to ask the patient during consultation

Symptoms: ${symptoms}
Reported Severity: ${severity}
Duration: ${durationDays} days

Return ONLY valid raw JSON with keys: urgencyLevel, chiefComplaint, suggestedQuestions.`;

  // 1. Try Gemini API
  if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        },
        { timeout: 8000 }
      );

      const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        return {
          urgencyLevel: parsed.urgencyLevel || 'Medium',
          chiefComplaint: parsed.chiefComplaint || symptoms.substring(0, 100),
          suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
            ? parsed.suggestedQuestions.slice(0, 3)
            : ['What was the initial trigger?', 'Are symptoms worsening?', 'Any past history?'],
          generatedBy: 'Gemini-1.5-Flash',
        };
      }
    } catch (err) {
      console.warn('[LLM Service] Gemini API call failed, attempting fallback...', err.message);
    }
  }

  // 2. Try OpenAI API
  if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        },
        {
          headers: { Authorization: `Bearer ${openaiKey}` },
          timeout: 8000,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          ...parsed,
          generatedBy: 'OpenAI GPT-4o-mini',
        };
      }
    } catch (err) {
      console.warn('[LLM Service] OpenAI API call failed, attempting fallback...', err.message);
    }
  }

  // 3. Graceful Deterministic Fallback (zero downtime)
  return generateFallbackPreVisitSummary(symptoms, severity, durationDays);
};

/**
 * Generate AI Post-Visit Patient Summary
 * Prompt: "Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes>"
 */
const generatePostVisitSummary = async (clinicalNotes, diagnosis = '', prescriptions = []) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const prompt = `You are a patient education AI assistant.
Task: Convert these clinical doctor notes into a clear, comforting, patient-friendly summary with an easy-to-understand medication schedule and numbered follow-up steps.

Clinical Notes: ${clinicalNotes}
Diagnosis: ${diagnosis}
Prescribed Medications: ${JSON.stringify(prescriptions)}

Return ONLY valid raw JSON with keys:
1. "patientFriendlySummary": A plain-language, empathetic summary of the diagnosis and doctor's advice.
2. "medicationSchedule": array of objects with keys: medication, dosage, frequency, duration, instructions.
3. "followUpSteps": array of clear actionable bullet points for the patient.
4. "lifestyleAdvice": advice on rest, diet, and hydration.`;

  // 1. Try Gemini API
  if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        },
        { timeout: 8000 }
      );

      const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        return {
          ...parsed,
          generatedBy: 'Gemini-1.5-Flash',
        };
      }
    } catch (err) {
      console.warn('[LLM Service] Gemini Post-visit API call failed, attempting fallback...', err.message);
    }
  }

  // 2. Try OpenAI API
  if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        },
        {
          headers: { Authorization: `Bearer ${openaiKey}` },
          timeout: 8000,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          ...parsed,
          generatedBy: 'OpenAI GPT-4o-mini',
        };
      }
    } catch (err) {
      console.warn('[LLM Service] OpenAI Post-visit API call failed, attempting fallback...', err.message);
    }
  }

  // 3. Graceful Deterministic Fallback
  return generateFallbackPostVisitSummary(clinicalNotes, diagnosis, prescriptions);
};

module.exports = {
  generatePreVisitSummary,
  generatePostVisitSummary,
};
