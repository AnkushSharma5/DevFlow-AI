const locks = new Map();

/**
 * Serialize mutations for one project inside this Node.js process. This keeps
 * task creation, reordering, and project deletion from racing on one instance.
 * It is not a distributed lock and does not coordinate separate server nodes.
 */
const runProjectExclusive = async (userId, projectId, operation) => {
  const key = `${String(userId)}:${String(projectId)}`;
  const previous = locks.get(key) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  locks.set(key, current);

  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (locks.get(key) === current) locks.delete(key);
  }
};

module.exports = { runProjectExclusive };
