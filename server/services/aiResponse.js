class AIResponseError extends Error {
  constructor() {
    super('AI returned an invalid response.');
    this.name = 'AIResponseError';
    this.code = 'AI_RESPONSE_INVALID';
  }
}

const RESPONSE_FIELDS = {
  breakdown: { subtasks: 'array' },
  explain: { explanation: 'string', keyLogic: 'string', potentialIssues: 'string' },
  debug: { possibleCause: 'string', whyItHappened: 'string', suggestedFix: 'string', correctedCode: 'string' },
  docs: { description: 'string', usage: 'string', parameters: 'string', setup: 'string', apiNotes: 'string', example: 'string' },
};

const findJSONObject = (text) => {
  const start = text.indexOf('{');
  if (start === -1) throw new AIResponseError();

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  throw new AIResponseError();
};

const parseAIResponse = (raw, feature) => {
  if (typeof raw !== 'string' || raw.trim().length === 0 || raw.length > 50000) {
    throw new AIResponseError();
  }

  const schema = RESPONSE_FIELDS[feature];
  if (!schema) throw new AIResponseError();

  let parsed;
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    parsed = JSON.parse(text);
  } catch {
    try {
      parsed = JSON.parse(findJSONObject(text));
    } catch {
      throw new AIResponseError();
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new AIResponseError();
  const result = {};
  for (const [field, type] of Object.entries(schema)) {
    const value = parsed[field];
    if (type === 'array') {
      if (!Array.isArray(value) || value.length < 4 || value.length > 10) throw new AIResponseError();
      const subtasks = value.map((item) => (typeof item === 'string' ? item.trim() : ''));
      if (subtasks.some((item) => item.length === 0 || item.length > 300)) throw new AIResponseError();
      result[field] = subtasks;
      continue;
    }

    if (typeof value !== 'string' || value.trim().length === 0 || value.length > 10000) {
      throw new AIResponseError();
    }
    result[field] = value.trim();
  }
  return result;
};

module.exports = { AIResponseError, parseAIResponse };
