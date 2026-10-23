const Task = require('../models/Task');
const Project = require('../models/Project');
const { planTaskReorder } = require('../services/taskOrdering');
const { runProjectExclusive } = require('../services/projectLock');

const persistTaskReorder = async (task, userId, targetStatus, targetOrder) => {
  const siblings = await Task.find({ projectId: task.projectId, userId })
    .sort({ status: 1, order: 1, createdAt: 1, _id: 1 });
  const changes = planTaskReorder(siblings, task._id, targetStatus, targetOrder);
  if (changes === null) return null;

  if (changes.length > 0) {
    await Task.bulkWrite(changes.map(({ task: item, status, order }) => ({
      updateOne: {
        filter: { _id: item._id, userId },
        update: { $set: { status, order } },
      },
    })));
  }

  return Task.findOne({ _id: task._id, userId });
};

/**
 * Helper: verify the project exists and belongs to the requesting user.
 * Returns the project or throws (to be caught by the controller's try/catch).
 */
const verifyProjectOwnership = async (projectId, userId) => {
  const project = await Project.findOne({ _id: projectId, userId });
  return project; // null if not found or not owned
};

/**
 * GET /api/tasks?projectId=<id>
 * Returns all tasks for a project, ordered by column then position.
 */
const getTasks = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ message: 'projectId query parameter is required' });
    }

    // Ensure the user owns this project before returning its tasks
    const project = await verifyProjectOwnership(projectId, req.user._id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const tasks = await Task.find({ projectId, userId: req.user._id }).sort({ status: 1, order: 1, createdAt: 1, _id: 1 });
    res.json({ tasks });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tasks
 * Creates a new task in the specified project.
 * Body: { projectId, title, description?, status?, priority?, dueDate? }
 */
const createTask = async (req, res, next) => {
  try {
    const { projectId, title, description, status, priority, dueDate } = req.body;
    const task = await runProjectExclusive(req.user._id, projectId, async () => {
      const project = await verifyProjectOwnership(projectId, req.user._id);
      if (!project) return null;

      // Determine order while holding the same lock as other task mutations.
      const lastTask = await Task.findOne({ projectId, userId: req.user._id, status: status || 'TODO' }).sort({ order: -1 });
      const order = lastTask ? lastTask.order + 1 : 0;

      return Task.create({
        title,
        description,
        status,
        priority,
        dueDate,
        projectId,
        userId: req.user._id,
        order,
      });
    });
    if (!task) return res.status(404).json({ message: 'Project not found' });

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks/:id
 * Returns a single task.
 */
const getTask = async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ task });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/tasks/:id
 * Updates supplied task metadata and optionally moves it to another status column.
 * Body: { title?, description?, status?, priority?, dueDate? }
 */
const updateTask = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, userId: req.user._id };
    const beforeLock = await Task.findOne(filter);
    if (!beforeLock) return res.status(404).json({ message: 'Task not found' });

    const task = await runProjectExclusive(req.user._id, beforeLock.projectId, async () => {
      const existing = await Task.findOne(filter);
      if (!existing) return null;

      const updates = Object.fromEntries(
        ['title', 'description', 'priority', 'dueDate']
          .filter((field) => Object.hasOwn(req.body, field))
          .map((field) => [field, req.body[field]])
      );
      let updated = Object.keys(updates).length
        ? await Task.findOneAndUpdate(filter, updates, { new: true, runValidators: true })
        : existing;
      if (!updated) return null;

      if (req.body.status && req.body.status !== existing.status) {
        updated = await persistTaskReorder(updated, req.user._id, req.body.status);
      }
      return updated;
    });

    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ task });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/tasks/:id
 * Deletes a single task.
 */
const deleteTask = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id, userId: req.user._id };
    const beforeLock = await Task.findOne(filter);
    if (!beforeLock) return res.status(404).json({ message: 'Task not found' });
    const task = await runProjectExclusive(req.user._id, beforeLock.projectId, async () => (
      Task.findOneAndDelete(filter)
    ));
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json({ message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/tasks/:id/status
 * Lightweight endpoint specifically for drag-and-drop status updates.
 * Body: { status, order? }
 */
const updateTaskStatus = async (req, res, next) => {
  try {
    const { status, order } = req.body;
    const filter = { _id: req.params.id, userId: req.user._id };
    const beforeLock = await Task.findOne(filter);
    if (!beforeLock) return res.status(404).json({ message: 'Task not found' });
    const task = await runProjectExclusive(req.user._id, beforeLock.projectId, async () => {
      const existing = await Task.findOne(filter);
      if (!existing) return null;
      return persistTaskReorder(existing, req.user._id, status, order);
    });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ task });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTasks, createTask, getTask, updateTask, deleteTask, updateTaskStatus };
