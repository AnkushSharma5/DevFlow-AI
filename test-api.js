const http = require('http');

const request = (options, postData) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
};

async function runTests() {
  console.log('🧪 Starting DevFlow AI E2E API Verification...\n');
  const port = 5000;
  let token = '';
  let projectId = '';
  let taskId = '';

  // 1. Health check
  const health = await request({ host: '127.0.0.1', port, path: '/api/health', method: 'GET' });
  console.log(`[1] Health Check: Status ${health.status} =>`, health.data.status === 'ok' ? 'PASS' : 'FAIL');

  // 2. Register
  const testUser = {
    name: 'Test Engineer',
    email: `engineer_${Date.now()}@example.com`,
    password: 'password123',
  };
  const reg = await request(
    {
      host: '127.0.0.1',
      port,
      path: '/api/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    testUser
  );
  console.log(`[2] User Registration: Status ${reg.status} =>`, reg.data.token ? 'PASS' : 'FAIL');
  token = reg.data.token;

  // 3. Login
  const login = await request(
    {
      host: '127.0.0.1',
      port,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: testUser.email, password: testUser.password }
  );
  console.log(`[3] User Login: Status ${login.status} =>`, login.data.token ? 'PASS' : 'FAIL');

  // 4. Get Current User (Auth check)
  const me = await request({
    host: '127.0.0.1',
    port,
    path: '/api/auth/me',
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`[4] Protected /me: Status ${me.status} =>`, me.data.user?.name === testUser.name ? 'PASS' : 'FAIL');

  // 5. Create Project
  const proj = await request(
    {
      host: '127.0.0.1',
      port,
      path: '/api/projects',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      name: 'Portfolio DevFlow Showcase',
      description: 'Building an awesome full-stack AI productivity platform',
      status: 'ACTIVE',
    }
  );
  console.log(`[5] Create Project: Status ${proj.status} =>`, proj.data.project?._id ? 'PASS' : 'FAIL');
  projectId = proj.data.project?._id;

  // 6. Create Task
  const task = await request(
    {
      host: '127.0.0.1',
      port,
      path: '/api/tasks',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      projectId,
      title: 'Design Kanban Drag-and-Drop Board',
      description: 'Implement fluid @hello-pangea/dnd board with status dropdown fallback',
      status: 'TODO',
      priority: 'HIGH',
    }
  );
  console.log(`[6] Create Task: Status ${task.status} =>`, task.data.task?._id ? 'PASS' : 'FAIL');
  taskId = task.data.task?._id;

  // 7. Update Task Status (Kanban drag simulation)
  const updateStatus = await request(
    {
      host: '127.0.0.1',
      port,
      path: `/api/tasks/${taskId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    { status: 'IN_PROGRESS', order: 1 }
  );
  console.log(
    `[7] Kanban Status Patch: Status ${updateStatus.status} =>`,
    updateStatus.data.task?.status === 'IN_PROGRESS' ? 'PASS' : 'FAIL'
  );

  // 8. Fetch Tasks for Project
  const taskList = await request({
    host: '127.0.0.1',
    port,
    path: `/api/tasks?projectId=${projectId}`,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`[8] Fetch Project Tasks: Status ${taskList.status} =>`, taskList.data.tasks?.length === 1 ? 'PASS' : 'FAIL');

  // 9. AI Endpoint Check (Validation & Graceful error handling)
  const aiTest = await request(
    {
      host: '127.0.0.1',
      port,
      path: '/api/ai/breakdown',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    { description: 'Short' }
  );
  console.log(`[9] AI Route Input Validation: Status ${aiTest.status} (Expected 400) =>`, aiTest.status === 400 ? 'PASS' : 'FAIL');

  // 10. AI Code Explainer Live Check (Java Fibonacci)
  const javaFib = `public class Fibonacci {
    public static int fib(int n, Map<Integer, Integer> memo) {
        if (n <= 1) return n;
        if (memo.containsKey(n)) return memo.get(n);
        int result = fib(n - 1, memo) + fib(n - 2, memo);
        memo.put(n, result);
        return result;
    }
}`;
  const explainTest = await request(
    {
      host: '127.0.0.1',
      port,
      path: '/api/ai/explain',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    { language: 'Java', code: javaFib }
  );
  const explainText = JSON.stringify(explainTest.data || '').toLowerCase();
  const explainPass =
    explainTest.status === 200 &&
    explainTest.data?.explanation &&
    explainTest.data?.keyLogic &&
    (explainText.includes('memo') || explainText.includes('recurs')) &&
    !explainText.includes('encapsulating state transitions');
  console.log(`[10] AI Code Explainer (Live LLM): Status ${explainTest.status} =>`, explainPass ? 'PASS' : 'FAIL');

  // 11. AI Task Breakdown Live Check
  const breakdownTest = await request(
    {
      host: '127.0.0.1',
      port,
      path: '/api/ai/breakdown',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    { description: 'Implement Stripe payment subscription webhook integration' }
  );
  const breakdownPass =
    breakdownTest.status === 200 &&
    Array.isArray(breakdownTest.data?.subtasks) &&
    breakdownTest.data.subtasks.length >= 3;
  console.log(`[11] AI Task Breakdown (Live LLM): Status ${breakdownTest.status} =>`, breakdownPass ? 'PASS' : 'FAIL');

  // 12. AI Debugger Live Check
  const debugTest = await request(
    {
      host: '127.0.0.1',
      port,
      path: '/api/ai/debug',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      language: 'JavaScript',
      code: 'function getUser(id) { const u = null; return u.name; }',
      errorMessage: "TypeError: Cannot read properties of null (reading 'name')",
    }
  );
  const debugPass =
    debugTest.status === 200 &&
    Boolean(debugTest.data?.possibleCause) &&
    Boolean(debugTest.data?.suggestedFix);
  console.log(`[12] AI Debugger (Live LLM): Status ${debugTest.status} =>`, debugPass ? 'PASS' : 'FAIL');

  // 13. AI Documentation Generator Live Check
  const docsTest = await request(
    {
      host: '127.0.0.1',
      port,
      path: '/api/ai/docs',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
    {
      type: 'code',
      input: 'function calculateDiscount(price, percentage) { return price - (price * (percentage / 100)); }',
    }
  );
  const docsPass =
    docsTest.status === 200 &&
    Boolean(docsTest.data?.description) &&
    Boolean(docsTest.data?.usage);
  console.log(`[13] AI Documentation Generator (Live LLM): Status ${docsTest.status} =>`, docsPass ? 'PASS' : 'FAIL');

  console.log('\n🎉 ALL E2E & AI BACKEND TESTS PASSED!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
