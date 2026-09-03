/**
 * aiService.js — Central AI abstraction layer.
 *
 * ALL calls to the LLM go through this file.
 * Routes and controllers never call the LLM directly — they call functions here.
 *
 * To switch from Gemini to OpenAI:
 *   Set AI_PROVIDER=openai in your .env file.
 *   No other code changes needed.
 *
 * Adding a new AI feature:
 *   1. Write a prompt-building function (buildXxxPrompt)
 *   2. Write an exported async function that calls callAI() with that prompt
 *   3. Wire it up in aiController.js
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// ---------------------------------------------------------------------------
// Provider initialization (lazy — only the active provider is initialized)
// ---------------------------------------------------------------------------

let geminiModel = null;
let openaiClient = null;

const getGeminiModel = () => {
  if (!geminiModel) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    geminiModel = genAI.getGenerativeModel({ model: modelName });
  }
  return geminiModel;
};

const getOpenAIClient = () => {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
};

// ---------------------------------------------------------------------------
// Core dispatcher — sends prompt to whichever provider is configured
// ---------------------------------------------------------------------------

const isKeyConfigured = () => {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  if (provider === 'openai') {
    return !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your_');
  }
  return !!process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_');
};

/**
 * Safely extracts and parses JSON from the LLM's raw response.
 * Handles markdown code fences and any surrounding text.
 *
 * @param {string} raw - Raw string response from LLM
 * @returns {object} Parsed JSON object
 */
const parseAIResponse = (raw) => {
  if (!raw || typeof raw !== 'string') {
    throw new Error('AI returned an empty or non-string response');
  }
  // Try extracting JSON enclosed in curly braces first
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  const cleaned = raw.replace(/```(?:json)?\n?/gi, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
};

/**
 * @param {string} prompt - The full prompt string to send to the LLM
 * @returns {Promise<string>} - The model's text response
 */
const callAI = async (prompt) => {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

  if (!isKeyConfigured()) {
    const keyName = provider === 'openai' ? 'OPENAI_API_KEY' : 'GEMINI_API_KEY';
    console.error(`❌ AI configuration error: ${keyName} is missing or placeholder in environment variables.`);
    throw new Error(`${keyName} is not configured in environment variables`);
  }

  // Log the final prompt string right before the API call to verify proper code/input interpolation
  console.log(`\n==================== [AI DISPATCH: ${provider.toUpperCase()}] ====================`);
  console.log(prompt.trim());
  console.log('=================================================================\n');

  try {
    if (provider === 'openai') {
      const client = getOpenAIClient();
      const model = process.env.OPENAI_MODEL || 'gpt-4o';
      const response = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });
      return response.choices[0].message.content;
    }

    // Default: Gemini
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (apiError) {
    console.error(`❌ AI API call failed (${provider}):`, apiError.message || apiError);
    // Rethrow to ensure failures are propagated and visible instead of masked with mock data
    throw apiError;
  }
};

// ---------------------------------------------------------------------------
// Feature 1: Task Breakdown
// ---------------------------------------------------------------------------

/**
 * Given a feature or task description, returns an ordered list of subtasks
 * that a developer should complete.
 *
 * @param {string} description - What the developer wants to build or accomplish
 * @returns {Promise<{ subtasks: string[] }>}
 */
const breakdownTask = async (description) => {
  const prompt = `
You are a senior software engineer helping a developer break down a task into actionable subtasks.

TASK DESCRIPTION:
${description}

Return ONLY a JSON object in this exact format (no markdown, no extra text):
{
  "subtasks": [
    "First subtask description",
    "Second subtask description",
    "Third subtask description"
  ]
}

Requirements:
- Include 4–10 specific, actionable subtasks
- Order them logically (setup before implementation, implementation before testing)
- Each subtask should be completable in a few hours
- Be specific and technical
`;

  const raw = await callAI(prompt);
  return parseAIResponse(raw);
};

// ---------------------------------------------------------------------------
// Feature 2: Code Explainer
// ---------------------------------------------------------------------------

/**
 * Explains a code snippet in three structured sections.
 *
 * @param {string} language - e.g. "JavaScript", "Python", "Java"
 * @param {string} code - The code to explain
 * @returns {Promise<{ explanation: string, keyLogic: string, potentialIssues: string }>}
 */
const explainCode = async (language, code) => {
  const prompt = `
You are an experienced software engineer explaining code to a junior developer.

LANGUAGE: ${language}
CODE:
\`\`\`${language}
${code}
\`\`\`

Return ONLY a JSON object in this exact format (no markdown code fences, no extra text):
{
  "explanation": "A clear, concise overall explanation of what this code does (2-4 sentences)",
  "keyLogic": "Step-by-step explanation of the most important logic and how it works",
  "potentialIssues": "Any bugs, edge cases, performance problems, or security concerns to watch out for. Write 'None identified.' if the code looks clean."
}

Be clear, educational, and specific. Avoid jargon without explanation.
`;

  const raw = await callAI(prompt);
  return parseAIResponse(raw);
};

// ---------------------------------------------------------------------------
// Feature 3: AI Debugger
// ---------------------------------------------------------------------------

/**
 * Analyzes code + an error message and returns debugging guidance.
 *
 * @param {string} language - e.g. "JavaScript"
 * @param {string} code - The code that produced the error
 * @param {string} errorMessage - The error message / stack trace
 * @returns {Promise<{ possibleCause: string, whyItHappened: string, suggestedFix: string, correctedCode: string }>}
 */
const debugCode = async (language, code, errorMessage) => {
  const prompt = `
You are an expert debugger helping a developer fix a bug.

LANGUAGE: ${language}

CODE:
\`\`\`${language}
${code}
\`\`\`

ERROR MESSAGE:
${errorMessage}

Return ONLY a JSON object in this exact format (no markdown code fences, no extra text):
{
  "possibleCause": "The most likely root cause of this error (1-2 sentences)",
  "whyItHappened": "Explain WHY this error occurs — the mechanism behind it",
  "suggestedFix": "Concrete steps the developer should take to fix the issue",
  "correctedCode": "The corrected version of the code (just the code, no explanation)"
}

Be precise and actionable. If you cannot determine the cause from context, say so clearly.
`;

  const raw = await callAI(prompt);
  return parseAIResponse(raw);
};

// ---------------------------------------------------------------------------
// Feature 4: Documentation Generator
// ---------------------------------------------------------------------------

/**
 * Generates structured documentation for a piece of code or a project.
 *
 * @param {string} input - Code snippet or project description to document
 * @param {string} type - "code" | "project"
 * @returns {Promise<{ description: string, usage: string, parameters: string, setup: string, apiNotes: string, example: string }>}
 */
const generateDocs = async (input, type = 'code') => {
  const prompt = `
You are a technical writer generating professional documentation.

TYPE: ${type === 'project' ? 'Project Documentation' : 'Code Documentation'}

INPUT:
${input}

Return ONLY a JSON object in this exact format (no markdown code fences, no extra text):
{
  "description": "What this ${type} does and its purpose",
  "usage": "How to use it — the basic usage pattern",
  "parameters": "Parameters, arguments, or configuration options (write 'N/A' if not applicable)",
  "setup": "Installation or setup steps required (write 'N/A' if not applicable)",
  "apiNotes": "Any important notes about the API, return values, or behavior",
  "example": "A complete usage example"
}

Be professional, clear, and thorough. Format any code inside the JSON string values using plain text (not markdown).
`;

  const raw = await callAI(prompt);
  return parseAIResponse(raw);
};

module.exports = { breakdownTask, explainCode, debugCode, generateDocs };
