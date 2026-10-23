const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');

process.env.JWT_SECRET = 'test-only-secret-for-isolated-http-tests';
process.env.MONGO_URI = 'mongodb://127.0.0.1/devflow-test-not-used';
process.env.NODE_ENV = 'test';

const app = require('../server');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const aiService = require('../services/aiService');
const { AIResponseError } = require('../services/aiResponse');
const originalBreakdownTask = aiService.breakdownTask;

const users = new Map();
const projects = new Map();
const tasks = new Map();
const originalMethods = new Map();
let server;
let baseUrl;
let nextTaskFindOneBarrier = null;
let nextTaskFindBarrier = null;

class Query {
  constructor(run) {
    this.run = run;
    this.sortFields = null;
  }

  select() { return this; }
  sort(fields) { this.sortFields = fields; return this; }

  then(resolve, reject) {
    return Promise.resolve().then(this.run).then((result) => {
      if (!Array.isArray(result) || !this.sortFields) return result;
      return result.sort((left, right) => {
        for (const [field, direction] of Object.entries(this.sortFields)) {
          const a = left[field] ?? '';
          const b = right[field] ?? '';
          const comparison = a instanceof Date || b instanceof Date
            ? new Date(a) - new Date(b)
            : (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)));
          if (comparison !== 0) return comparison * direction;
        }
        return 0;
      });
    }).then(resolve, reject);
  }
}

const same = (left, right) => String(left) === String(right);
const matches = (document, filter) => Object.entries(filter).every(([field, value]) => same(document[field], value));
const query = (run) => new Query(run);
const makeUser = (data) => ({
  ...data,
  _id: data._id || new mongoose.Types.ObjectId(),
  createdAt: data.createdAt || new Date(),
  comparePassword: async (password) => password === data.passwordHash,
  toJSON() {
    const { passwordHash, comparePassword, ...safe } = this;
    return safe;
  },
});
const makeDocument = (data) => ({
  ...data,
  _id: data._id || new mongoose.Types.ObjectId(),
  createdAt: data.createdAt || new Date(),
  updatedAt: data.updatedAt || new Date(),
});

const patchMethod = (model, name, replacement) => {
  if (!originalMethods.has(model)) originalMethods.set(model, new Map());
  const methods = originalMethods.get(model);
  if (!methods.has(name)) methods.set(name, model[name]);
  model[name] = replacement;
};

patchMethod(User, 'findOne', (filter) => query(() => [...users.values()].find((user) => matches(user, filter)) || null));
patchMethod(User, 'findById', (id) => query(() => [...users.values()].find((user) => same(user._id, id)) || null));
patchMethod(User, 'create', async (data) => {
  const user = makeUser(data);
  users.set(String(user._id), user);
  return user;
});

patchMethod(Project, 'find', (filter) => query(() => [...projects.values()].filter((project) => matches(project, filter))));
patchMethod(Project, 'findOne', (filter) => query(() => [...projects.values()].find((project) => matches(project, filter)) || null));
patchMethod(Project, 'create', async (data) => {
  const project = makeDocument(data);
  projects.set(String(project._id), project);
  return project;
});
patchMethod(Project, 'findOneAndUpdate', (filter, updates) => query(() => {
  const project = [...projects.values()].find((item) => matches(item, filter));
  if (!project) return null;
  Object.assign(project, updates, { updatedAt: new Date() });
  return project;
}));
patchMethod(Project, 'findOneAndDelete', (filter) => query(() => {
  const project = [...projects.values()].find((item) => matches(item, filter));
  if (project) projects.delete(String(project._id));
  return project || null;
}));

patchMethod(Task, 'find', (filter) => query(async () => {
  const found = [...tasks.values()].filter((task) => matches(task, filter)).map((task) => ({ ...task }));
  if (nextTaskFindBarrier) {
    const barrier = nextTaskFindBarrier;
    nextTaskFindBarrier = null;
    barrier.onEntered();
    await barrier.wait;
  }
  return found;
}));
patchMethod(Task, 'findOne', (filter) => query(async () => {
  if (nextTaskFindOneBarrier && Object.hasOwn(filter, 'projectId')) {
    const barrier = nextTaskFindOneBarrier;
    nextTaskFindOneBarrier = null;
    barrier.onEntered();
    await barrier.wait;
  }
  return [...tasks.values()].find((task) => matches(task, filter)) || null;
}));
patchMethod(Task, 'create', async (data) => {
  const task = makeDocument({ status: 'TODO', priority: 'MEDIUM', dueDate: null, order: 0, description: '', ...data });
  tasks.set(String(task._id), task);
  return task;
});
patchMethod(Task, 'findOneAndUpdate', (filter, updates) => query(() => {
  const task = [...tasks.values()].find((item) => matches(item, filter));
  if (!task) return null;
  Object.assign(task, updates, { updatedAt: new Date() });
  return task;
}));
patchMethod(Task, 'findOneAndDelete', (filter) => query(() => {
  const task = [...tasks.values()].find((item) => matches(item, filter));
  if (task) tasks.delete(String(task._id));
  return task || null;
}));
patchMethod(Task, 'deleteMany', async (filter) => {
  let deletedCount = 0;
  for (const [id, task] of tasks) {
    if (matches(task, filter)) {
      tasks.delete(id);
      deletedCount += 1;
    }
  }
  return { deletedCount };
});
patchMethod(Task, 'bulkWrite', async (operations) => {
  for (const operation of operations) {
    const { filter, update } = operation.updateOne;
    const task = [...tasks.values()].find((item) => matches(item, filter));
    if (task) Object.assign(task, update.$set, { updatedAt: new Date() });
  }
  return { modifiedCount: operations.length };
});

const jsonRequest = async (path, { method = 'GET', token, body } = {}) => {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, headers: response.headers, data: text ? JSON.parse(text) : null };
};

const register = async (suffix) => {
  const response = await jsonRequest('/api/auth/register', {
    method: 'POST',
    body: { name: `Test ${suffix}`, email: `${suffix}@example.com`, password: 'strong-password-1' },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  return { token: response.data.token, user: response.data.user };
};

const createProject = async (token, name = 'Test project') => {
  const response = await jsonRequest('/api/projects', {
    method: 'POST', token, body: { name, description: 'A test project' },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  return response.data.project;
};

const createTask = async (token, projectId, title, status = 'TODO') => {
  const response = await jsonRequest('/api/tasks', {
    method: 'POST', token, body: { projectId, title, status },
  });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  return response.data.task;
};

before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  for (const [model, methods] of originalMethods) {
    for (const [name, method] of methods) model[name] = method;
  }
  aiService.breakdownTask = originalBreakdownTask;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('registration validates password limits, returns no hash, and protected identity rejects invalid tokens', async () => {
  const weak = await jsonRequest('/api/auth/register', {
    method: 'POST', body: { name: 'Test', email: 'weak@example.com', password: 'short' },
  });
  assert.equal(weak.status, 400);

  const tooLong = await jsonRequest('/api/auth/register', {
    method: 'POST', body: { name: 'Test', email: 'long@example.com', password: 'x'.repeat(73) },
  });
  assert.equal(tooLong.status, 400);

  const account = await register('auth');
  assert.equal(account.user.email, 'auth@example.com');
  assert.equal(Object.hasOwn(account.user, 'passwordHash'), false);

  const me = await jsonRequest('/api/auth/me', { token: account.token });
  assert.equal(me.status, 200);
  assert.equal(me.data.user.name, 'Test auth');
  assert.equal(Object.hasOwn(me.data.user, 'passwordHash'), false);

  const login = await jsonRequest('/api/auth/login', {
    method: 'POST', body: { email: 'AUTH@example.com', password: 'strong-password-1' },
  });
  assert.equal(login.status, 200);
  assert.equal(Object.hasOwn(login.data.user, 'passwordHash'), false);
  const badPassword = await jsonRequest('/api/auth/login', {
    method: 'POST', body: { email: 'auth@example.com', password: 'not-the-password' },
  });
  assert.equal(badPassword.status, 401);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const failedLogin = await jsonRequest('/api/auth/login', {
      method: 'POST', body: { email: 'auth@example.com', password: 'not-the-password' },
    });
    assert.equal(failedLogin.status, 401);
  }
  const throttledLogin = await jsonRequest('/api/auth/login', {
    method: 'POST', body: { email: 'auth@example.com', password: 'not-the-password' },
  });
  assert.equal(throttledLogin.status, 429);

  const invalidToken = await jsonRequest('/api/auth/me', { token: 'invalid.token.value' });
  assert.equal(invalidToken.status, 401);
});

test('project and task operations enforce ownership, partial updates preserve fields, and deletion cascades', async () => {
  const owner = await register('owner');
  const otherUser = await register('other');
  const project = await createProject(owner.token);
  const task = await createTask(owner.token, project._id, 'Owned task');

  for (const [method, path, body] of [
    ['GET', `/api/projects/${project._id}`],
    ['PUT', `/api/projects/${project._id}`, { status: 'ON_HOLD' }],
    ['DELETE', `/api/projects/${project._id}`],
    ['GET', `/api/tasks/${task._id}`],
    ['PUT', `/api/tasks/${task._id}`, { title: 'Changed by other' }],
    ['DELETE', `/api/tasks/${task._id}`],
    ['PATCH', `/api/tasks/${task._id}/status`, { status: 'DONE' }],
  ]) {
    const response = await jsonRequest(path, { method, token: otherUser.token, body });
    assert.equal(response.status, 404, `${method} ${path}`);
  }

  const projectUpdate = await jsonRequest(`/api/projects/${project._id}`, {
    method: 'PUT', token: owner.token, body: { description: 'Updated alone' },
  });
  assert.equal(projectUpdate.status, 200);
  assert.equal(projectUpdate.data.project.name, 'Test project');
  assert.equal(projectUpdate.data.project.description, 'Updated alone');

  const taskUpdate = await jsonRequest(`/api/tasks/${task._id}`, {
    method: 'PUT', token: owner.token, body: { description: 'Updated alone' },
  });
  assert.equal(taskUpdate.status, 200);
  assert.equal(taskUpdate.data.task.title, 'Owned task');
  assert.equal(taskUpdate.data.task.description, 'Updated alone');

  assert.equal((await jsonRequest('/api/projects/not-an-id', { token: owner.token })).status, 400);
  assert.equal((await jsonRequest('/api/tasks/not-an-id', { token: owner.token })).status, 400);
  assert.equal((await jsonRequest('/api/tasks?projectId=not-an-id', { token: owner.token })).status, 400);

  const deleted = await jsonRequest(`/api/projects/${project._id}`, { method: 'DELETE', token: owner.token });
  assert.equal(deleted.status, 200);
  assert.equal(tasks.has(String(task._id)), false);
});

test('project deletion serializes with task creation and cannot leave an orphan task', async () => {
  const account = await register('cascade-race');
  const project = await createProject(account.token, 'Cascade race project');
  let announceCreateRead;
  const createReadStarted = new Promise((resolve) => { announceCreateRead = resolve; });
  let releaseCreateRead;
  const createReadGate = new Promise((resolve) => { releaseCreateRead = resolve; });
  nextTaskFindOneBarrier = {
    onEntered: announceCreateRead,
    wait: createReadGate,
  };

  const creating = jsonRequest('/api/tasks', {
    method: 'POST',
    token: account.token,
    body: { projectId: project._id, title: 'Created during deletion' },
  });
  await createReadStarted;

  const deleting = jsonRequest(`/api/projects/${project._id}`, {
    method: 'DELETE',
    token: account.token,
  });
  await new Promise((resolve) => setTimeout(resolve, 25));
  releaseCreateRead();

  const [createResponse, deleteResponse] = await Promise.all([creating, deleting]);
  assert.equal(createResponse.status, 201, JSON.stringify(createResponse.data));
  assert.equal(deleteResponse.status, 200, JSON.stringify(deleteResponse.data));
  assert.equal(projects.has(String(project._id)), false);
  assert.equal([...tasks.values()].some((task) => same(task.projectId, project._id)), false);
});

test('Kanban reorders same-column positions, moves across columns, and appends status dropdown changes', async () => {
  const account = await register('kanban');
  const project = await createProject(account.token, 'Kanban project');
  const first = await createTask(account.token, project._id, 'First');
  const second = await createTask(account.token, project._id, 'Second');
  const third = await createTask(account.token, project._id, 'Third');

  const reorder = await jsonRequest(`/api/tasks/${third._id}/status`, {
    method: 'PATCH', token: account.token, body: { status: 'TODO', order: 1 },
  });
  assert.equal(reorder.status, 200);
  assert.deepEqual(
    (await jsonRequest(`/api/tasks?projectId=${project._id}`, { token: account.token })).data.tasks.map((task) => task.title),
    ['First', 'Third', 'Second']
  );
  assert.deepEqual(
    (await jsonRequest(`/api/tasks?projectId=${project._id}`, { token: account.token })).data.tasks.map((task) => task.order),
    [0, 1, 2]
  );

  const move = await jsonRequest(`/api/tasks/${second._id}/status`, {
    method: 'PATCH', token: account.token, body: { status: 'DONE', order: 0 },
  });
  assert.equal(move.status, 200);
  let listed = (await jsonRequest(`/api/tasks?projectId=${project._id}`, { token: account.token })).data.tasks;
  assert.deepEqual(listed.filter((task) => task.status === 'TODO').map((task) => [task.title, task.order]), [['First', 0], ['Third', 1]]);
  assert.deepEqual(listed.filter((task) => task.status === 'DONE').map((task) => [task.title, task.order]), [['Second', 0]]);

  const append = await jsonRequest(`/api/tasks/${second._id}/status`, {
    method: 'PATCH', token: account.token, body: { status: 'TODO' },
  });
  assert.equal(append.status, 200);
  listed = (await jsonRequest(`/api/tasks?projectId=${project._id}`, { token: account.token })).data.tasks;
  assert.deepEqual(listed.filter((task) => task.status === 'TODO').map((task) => [task.title, task.order]), [['First', 0], ['Third', 1], ['Second', 2]]);

  const editStatus = await jsonRequest(`/api/tasks/${second._id}`, {
    method: 'PUT', token: account.token, body: { status: 'IN_PROGRESS' },
  });
  assert.equal(editStatus.status, 200);
  listed = (await jsonRequest(`/api/tasks?projectId=${project._id}`, { token: account.token })).data.tasks;
  assert.deepEqual(listed.filter((task) => task.status === 'TODO').map((task) => [task.title, task.order]), [['First', 0], ['Third', 1]]);
  assert.deepEqual(listed.filter((task) => task.status === 'IN_PROGRESS').map((task) => [task.title, task.order]), [['Second', 0]]);

  const invalidOrder = await jsonRequest(`/api/tasks/${second._id}/status`, {
    method: 'PATCH', token: account.token, body: { status: 'DONE', order: -1 },
  });
  assert.equal(invalidOrder.status, 400);
});

test('concurrent Kanban reorders apply sequentially without duplicate or stale positions', async () => {
  const account = await register('kanban-race');
  const project = await createProject(account.token, 'Concurrent Kanban project');
  const first = await createTask(account.token, project._id, 'First');
  const second = await createTask(account.token, project._id, 'Second');
  const third = await createTask(account.token, project._id, 'Third');

  let announceRead;
  const firstReadStarted = new Promise((resolve) => { announceRead = resolve; });
  let releaseRead;
  const readGate = new Promise((resolve) => { releaseRead = resolve; });
  nextTaskFindBarrier = { onEntered: announceRead, wait: readGate };

  const moveThirdFirst = jsonRequest(`/api/tasks/${third._id}/status`, {
    method: 'PATCH', token: account.token, body: { status: 'TODO', order: 0 },
  });
  await firstReadStarted;
  const moveFirstLast = jsonRequest(`/api/tasks/${first._id}/status`, {
    method: 'PATCH', token: account.token, body: { status: 'TODO', order: 2 },
  });
  await new Promise((resolve) => setTimeout(resolve, 25));
  releaseRead();

  const [firstResponse, secondResponse] = await Promise.all([moveThirdFirst, moveFirstLast]);
  assert.equal(firstResponse.status, 200);
  assert.equal(secondResponse.status, 200);
  const ordered = (await jsonRequest(`/api/tasks?projectId=${project._id}`, { token: account.token })).data.tasks;
  assert.deepEqual(ordered.map((task) => [task.title, task.order]), [
    ['Third', 0], ['Second', 1], ['First', 2],
  ]);
  assert.deepEqual(ordered.map((task) => task.order), [0, 1, 2]);
});

test('AI endpoints reject malformed and oversized inputs before dispatch, then apply a per-user limit', async () => {
  const account = await register('ai');
  let calls = 0;
  aiService.breakdownTask = async () => {
    calls += 1;
    return { subtasks: ['one', 'two', 'three', 'four'] };
  };

  const invalid = await jsonRequest('/api/ai/breakdown', {
    method: 'POST', token: account.token, body: { description: { value: 'not a string' } },
  });
  assert.equal(invalid.status, 400);
  assert.equal(calls, 0);

  const oversized = await jsonRequest('/api/ai/breakdown', {
    method: 'POST', token: account.token, body: { description: 'x'.repeat(5001) },
  });
  assert.equal(oversized.status, 400);
  assert.equal(calls, 0);

  for (let index = 0; index < 10; index += 1) {
    const response = await jsonRequest('/api/ai/breakdown', {
      method: 'POST', token: account.token, body: { description: 'Implement a useful feature in this project.' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.data.subtasks.length, 4);
  }
  const limited = await jsonRequest('/api/ai/breakdown', {
    method: 'POST', token: account.token, body: { description: 'Implement a useful feature in this project.' },
  });
  assert.equal(limited.status, 429);
  assert.equal(calls, 10);
});

test('AI provider and parser failures return safe public errors', async () => {
  const account = await register('ai-failure');
  const original = aiService.breakdownTask;
  aiService.breakdownTask = async () => {
    const error = new Error('sensitive-provider-detail');
    error.status = 500;
    throw error;
  };

  const unavailable = await jsonRequest('/api/ai/breakdown', {
    method: 'POST', token: account.token, body: { description: 'This is a valid feature request.' },
  });
  assert.equal(unavailable.status, 503);
  assert.equal(JSON.stringify(unavailable.data).includes('sensitive-provider-detail'), false);

  aiService.breakdownTask = async () => { throw new AIResponseError(); };
  const invalidProviderResponse = await jsonRequest('/api/ai/breakdown', {
    method: 'POST', token: account.token, body: { description: 'Another valid feature request.' },
  });
  assert.equal(invalidProviderResponse.status, 502);

  aiService.breakdownTask = original;
});

test('health reports database unavailable while the test uses no database connection', async () => {
  const health = await jsonRequest('/api/health');
  assert.equal(health.status, 503);
  assert.equal(health.data.status, 'unavailable');
  assert.equal(health.data.database, 'disconnected');
});
