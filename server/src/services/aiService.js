const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Provider setup ──────────────────────────────────────────────
const AI_PROVIDER = (process.env.AI_PROVIDER || 'groq').toLowerCase(); // 'groq' | 'gemini'

let groq;
let gemini;

if (AI_PROVIDER === 'groq') {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  console.log('[AI] Using Groq (Llama 3.3 70B)');
} else if (AI_PROVIDER === 'gemini') {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  gemini = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' });
  console.log(`[AI] Using Gemini (${process.env.GEMINI_MODEL || 'gemini-2.0-flash'})`);
} else {
  throw new Error(`Unknown AI_PROVIDER: "${AI_PROVIDER}". Use "groq" or "gemini".`);
}

// ── Shared prompt builder ───────────────────────────────────────
function buildPrompt(data, fileName) {
  const sample = data.slice(0, 80);
  const columns = Object.keys(sample[0] || {});
  const totalRows = data.length;

  return `You are a senior business analyst. Analyze the following sales data and produce a **professional narrative summary report** in clean HTML (use <h2>, <p>, <ul>, <strong>, <table> tags as appropriate).

FILE: "${fileName}"
COLUMNS: ${columns.join(', ')}
TOTAL ROWS: ${totalRows}
DATA SAMPLE (JSON, first ${sample.length} rows):
${JSON.stringify(sample, null, 2)}

Your report MUST include:
1. **Executive Summary** — 2-3 sentence overview of the dataset and its key story.
2. **Key Metrics** — Revenue totals, averages, counts, top performers (if identifiable from columns).
3. **Trends & Insights** — Any noticeable patterns, outliers, or seasonality.
4. **Recommendations** — 2-3 actionable, data-driven suggestions.

Use clear business language. Format monetary values with commas and currency symbols. Do NOT wrap in \`\`\`html code fences — output raw HTML only.`;
}

// ── Provider-specific calls ─────────────────────────────────────
async function callGroq(prompt) {
  const completion = await groq.chat.completions.create({
    messages: [{ role: 'user', content: prompt }],
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.4,
    max_tokens: 4096,
  });
  return completion.choices[0]?.message?.content || '<p>Unable to generate report.</p>';
}

async function callGemini(prompt) {
  const result = await gemini.generateContent(prompt);
  const response = result.response;
  return response.text() || '<p>Unable to generate report.</p>';
}

// ── Public API ──────────────────────────────────────────────────
/**
 * Generate a professional narrative sales summary from parsed data.
 * Uses the provider specified by AI_PROVIDER env var (groq | gemini).
 * @param {Array<Object>} data  — Array of row objects from the spreadsheet
 * @param {string} fileName    — Original file name for context
 * @returns {Promise<string>}  — HTML-formatted narrative report
 */
async function generateSalesReport(data, fileName) {
  const prompt = buildPrompt(data, fileName);

  console.log(`[AI] Generating report via ${AI_PROVIDER}...`);

  if (AI_PROVIDER === 'gemini') {
    return callGemini(prompt);
  }
  return callGroq(prompt);
}

module.exports = { generateSalesReport };
