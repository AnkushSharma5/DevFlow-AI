const { test } = require('node:test');
const assert = require('node:assert/strict');
const User = require('../models/User');
const { parseTrustProxyHops, validateRuntimeConfig } = require('../config/runtime');
const { AIResponseError, parseAIResponse } = require('../services/aiResponse');
const { createGeminiAdapter } = require('../services/geminiAdapter');
const { runProjectExclusive } = require('../services/projectLock');
const { planTaskReorder } = require('../services/taskOrdering');

test('runtime configuration rejects missing, placeholder, repetitive JWT secrets and invalid proxy settings', () => {
  const valid = {
    JWT_SECRET: 'a-random-test-secret-with-more-than-32-bytes',
    MONGO_URI: 'mongodb://localhost/devflow',
    AI_PROVIDER: 'gemini',
    JWT_EXPIRES_IN: '7d',
  };
  assert.doesNotThrow(() => validateRuntimeConfig(valid));
  assert.throws(() => validateRuntimeConfig({ ...valid, JWT_SECRET: '' }), /JWT_SECRET/);
  assert.throws(() => validateRuntimeConfig({ ...valid, JWT_SECRET: 'your-example-secret-that-is-long-enough' }), /JWT_SECRET/);
  assert.throws(() => validateRuntimeConfig({ ...valid, JWT_SECRET: 'replace-with-at-least-32-random-bytes' }), /JWT_SECRET/);
  assert.throws(() => validateRuntimeConfig({ ...valid, JWT_SECRET: 'replace-with-a-random-secret-before-starting' }), /JWT_SECRET/);
  assert.throws(() => validateRuntimeConfig({ ...valid, JWT_SECRET: 'short' }), /JWT_SECRET/);
  assert.throws(() => validateRuntimeConfig({ ...valid, JWT_SECRET: 'a'.repeat(64) }), /JWT_SECRET/);
  assert.throws(() => validateRuntimeConfig({ ...valid, MONGO_URI: '' }), /MONGO_URI/);
  assert.throws(() => validateRuntimeConfig({ ...valid, AI_PROVIDER: 'unknown' }), /AI_PROVIDER/);
  assert.throws(() => validateRuntimeConfig({ ...valid, JWT_EXPIRES_IN: 'not-a-duration' }), /JWT_EXPIRES_IN/);
  assert.equal(parseTrustProxyHops(undefined), 0);
  assert.equal(parseTrustProxyHops('1'), 1);
  assert.throws(() => validateRuntimeConfig({ ...valid, TRUST_PROXY_HOPS: '-1' }), /TRUST_PROXY_HOPS/);
  assert.throws(() => validateRuntimeConfig({ ...valid, TRUST_PROXY_HOPS: '1.5' }), /TRUST_PROXY_HOPS/);
});

test('user JSON serialization omits the password hash', () => {
  const user = new User({ name: 'Ada', email: 'ada@example.com', passwordHash: 'hashed-value' });
  const serialized = JSON.stringify(user);
  assert.equal(serialized.includes('passwordHash'), false);
  assert.equal(serialized.includes('hashed-value'), false);
});

test('project mutations are serialized per project but independent projects can proceed concurrently', async () => {
  const events = [];
  let releaseFirst;
  const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
  let announceFirst;
  const firstStarted = new Promise((resolve) => { announceFirst = resolve; });

  const first = runProjectExclusive('user', 'project-a', async () => {
    events.push('first-start');
    announceFirst();
    await firstGate;
    events.push('first-end');
  });
  await firstStarted;

  const second = runProjectExclusive('user', 'project-a', async () => {
    events.push('second-start');
  });
  const independent = runProjectExclusive('user', 'project-b', async () => {
    events.push('independent');
  });

  await independent;
  assert.deepEqual(events, ['first-start', 'independent']);
  releaseFirst();
  await Promise.all([first, second]);
  assert.deepEqual(events, ['first-start', 'independent', 'first-end', 'second-start']);
});

test('Gemini adapter uses the maintained SDK request shape with bounded retries and timeout', async () => {
  let constructorOptions;
  let requestOptions;
  class FakeGoogleGenAI {
    constructor(options) {
      constructorOptions = options;
      this.models = {
        generateContent: async (options) => {
          requestOptions = options;
          return { text: 'provider output' };
        },
      };
    }
  }

  const adapter = createGeminiAdapter(FakeGoogleGenAI);
  const response = await adapter.generateContent({
    apiKey: 'test-gemini-key',
    model: 'gemini-3.5-flash-lite',
    prompt: 'Explain this function.',
  });

  assert.equal(response, 'provider output');
  assert.deepEqual(constructorOptions, {
    apiKey: 'test-gemini-key',
    httpOptions: { timeout: 30000, retryOptions: { attempts: 1 } },
  });
  assert.deepEqual(requestOptions, {
    model: 'gemini-3.5-flash-lite',
    contents: 'Explain this function.',
  });
});

test('AI parser handles fences and braces in strings, and enforces each response schema', () => {
  const explain = {
    explanation: 'Explains the code.',
    keyLogic: 'A string can contain { braces } safely.',
    potentialIssues: 'None identified.',
    extra: 'discarded',
  };
  assert.deepEqual(
    parseAIResponse(`Here is the result:\n\`\`\`json\n${JSON.stringify(explain)}\n\`\`\``, 'explain'),
    {
      explanation: 'Explains the code.',
      keyLogic: 'A string can contain { braces } safely.',
      potentialIssues: 'None identified.',
    }
  );

  assert.deepEqual(parseAIResponse(JSON.stringify({ subtasks: ['one', 'two', 'three', 'four'] }), 'breakdown'), {
    subtasks: ['one', 'two', 'three', 'four'],
  });
  assert.deepEqual(parseAIResponse(JSON.stringify({
    possibleCause: 'Cause', whyItHappened: 'Reason', suggestedFix: 'Fix', correctedCode: 'code',
  }), 'debug'), {
    possibleCause: 'Cause', whyItHappened: 'Reason', suggestedFix: 'Fix', correctedCode: 'code',
  });
  assert.deepEqual(parseAIResponse(JSON.stringify({
    description: 'Description', usage: 'Usage', parameters: 'N/A', setup: 'N/A', apiNotes: 'Notes', example: 'Example',
  }), 'docs'), {
    description: 'Description', usage: 'Usage', parameters: 'N/A', setup: 'N/A', apiNotes: 'Notes', example: 'Example',
  });

  assert.throws(() => parseAIResponse('{ broken', 'explain'), AIResponseError);
  assert.throws(() => parseAIResponse(JSON.stringify({ explanation: 'Only one field' }), 'explain'), AIResponseError);
  assert.throws(() => parseAIResponse(JSON.stringify({ subtasks: ['one', 'two', 'three'] }), 'breakdown'), AIResponseError);
  assert.throws(() => parseAIResponse(JSON.stringify({ subtasks: ['one', 2, 'three', 'four'] }), 'breakdown'), AIResponseError);
  assert.throws(() => parseAIResponse('not json', 'unknown'), AIResponseError);
});

test('task reorder plans compact source and destination positions without collisions', () => {
  const tasks = [
    { _id: 'a', status: 'TODO', order: 0 },
    { _id: 'b', status: 'TODO', order: 1 },
    { _id: 'c', status: 'TODO', order: 2 },
    { _id: 'd', status: 'DONE', order: 0 },
  ];
  const sameColumn = planTaskReorder(tasks, 'c', 'TODO', 1);
  assert.deepEqual(sameColumn.map(({ task, status, order }) => [task._id, status, order]), [['c', 'TODO', 1], ['b', 'TODO', 2]]);

  const crossColumn = planTaskReorder(tasks, 'b', 'DONE', 0);
  assert.deepEqual(crossColumn.map(({ task, status, order }) => [task._id, status, order]), [
    ['c', 'TODO', 1],
    ['b', 'DONE', 0],
    ['d', 'DONE', 1],
  ]);
  assert.equal(planTaskReorder(tasks, 'missing', 'DONE', 0), null);
});
