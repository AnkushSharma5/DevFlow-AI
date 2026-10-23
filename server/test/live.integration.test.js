const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const runLiveIntegration = process.env.RUN_LIVE_INTEGRATION === '1';

test('opt-in API, MongoDB, and live AI integration', {
  skip: runLiveIntegration ? false : 'Set RUN_LIVE_INTEGRATION=1 and TEST_MONGO_URI to run against a disposable database.',
}, async () => {
  const path = require('node:path');
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

  const testMongoUri = process.env.TEST_MONGO_URI;
  const databaseName = testMongoUri?.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/i)?.[1];
  assert.equal(decodeURIComponent(databaseName || ''), 'devflow_test', 'TEST_MONGO_URI must target the devflow_test database.');

  process.env.MONGO_URI = testMongoUri;
  process.env.JWT_SECRET = crypto.randomBytes(64).toString('hex');
  process.env.AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

  const providerKey = process.env.AI_PROVIDER === 'openai'
    ? process.env.OPENAI_API_KEY
    : process.env.GEMINI_API_KEY;
  assert.ok(providerKey && !/your_|replace.?me|example/i.test(providerKey), 'Configure the selected AI provider key in server/.env.');

  const mongoose = require('mongoose');
  const connectDB = require('../config/db');
  const User = require('../models/User');
  const Project = require('../models/Project');
  const Task = require('../models/Task');
  const app = require('../server');
  const email = `live_${crypto.randomUUID()}@example.test`;
  let server;

  try {
    await connectDB();
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });

    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}/api`;
    const request = async (route, { method = 'GET', token, body } = {}) => {
      const response = await fetch(`${baseUrl}${route}`, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, data: await response.json() };
    };

    const health = await request('/health');
    assert.equal(health.status, 200);
    assert.equal(health.data.database, 'connected');

    const registration = await request('/auth/register', {
      method: 'POST',
      body: { name: 'Live Integration', email, password: 'StrongTestPassword#123' },
    });
    assert.equal(registration.status, 201, registration.data.message);
    const { token, user } = registration.data;
    assert.ok(token);
    assert.equal(user.email, email);

    const login = await request('/auth/login', {
      method: 'POST',
      body: { email, password: 'StrongTestPassword#123' },
    });
    assert.equal(login.status, 200, login.data.message);
    assert.ok(login.data.token);

    const me = await request('/auth/me', { token });
    assert.equal(me.status, 200);
    assert.equal(me.data.user._id, user._id);

    const projectResponse = await request('/projects', {
      method: 'POST',
      token,
      body: { name: 'Live integration project', status: 'ACTIVE' },
    });
    assert.equal(projectResponse.status, 201, projectResponse.data.message);
    const projectId = projectResponse.data.project._id;

    const taskResponse = await request('/tasks', {
      method: 'POST',
      token,
      body: { projectId, title: 'Exercise the live API', priority: 'HIGH' },
    });
    assert.equal(taskResponse.status, 201, taskResponse.data.message);
    const taskId = taskResponse.data.task._id;

    const statusResponse = await request(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      token,
      body: { status: 'IN_PROGRESS', order: 0 },
    });
    assert.equal(statusResponse.status, 200, statusResponse.data.message);
    assert.equal(statusResponse.data.task.status, 'IN_PROGRESS');

    const taskList = await request(`/tasks?projectId=${projectId}`, { token });
    assert.equal(taskList.status, 200);
    assert.equal(taskList.data.tasks.length, 1);

    const aiCases = [
      ['/ai/breakdown', { description: 'Add audit logging to project settings.' }, (data) => Array.isArray(data.subtasks) && data.subtasks.length >= 4],
      ['/ai/explain', { language: 'JavaScript', code: 'function add(a, b) { return a + b; }' }, (data) => typeof data.explanation === 'string' && typeof data.keyLogic === 'string'],
      ['/ai/debug', { language: 'JavaScript', code: 'function getName(user) { return user.name; }', errorMessage: 'TypeError: Cannot read properties of null (reading name)' }, (data) => typeof data.possibleCause === 'string' && typeof data.suggestedFix === 'string'],
      ['/ai/docs', { type: 'code', input: 'function add(a, b) { return a + b; }' }, (data) => typeof data.description === 'string' && typeof data.usage === 'string'],
    ];

    for (const [route, body, responseIsValid] of aiCases) {
      const result = await request(route, { method: 'POST', token, body });
      assert.equal(result.status, 200, `${route}: ${result.data.message || 'unexpected status'}`);
      assert.ok(responseIsValid(result.data), `${route} returned an incomplete response.`);
    }

    const deletion = await request(`/projects/${projectId}`, { method: 'DELETE', token });
    assert.equal(deletion.status, 200, deletion.data.message);
  } finally {
    const user = await User.findOne({ email }).select('_id').catch(() => null);
    if (user) {
      await Task.deleteMany({ userId: user._id }).catch(() => {});
      await Project.deleteMany({ userId: user._id }).catch(() => {});
      await User.deleteOne({ _id: user._id }).catch(() => {});
    }
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
  }
});
