const Task = require('../models/Task');
const Project = require('../models/Project');

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

    const tasks = await Task.find({ projectId }).sort({ status: 1, order: 1, createdAt: 1 });
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

    const project = await verifyProjectOwnership(projectId, req.user._id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Determine order: place new task at the end of its status column
    const lastTask = await Task.findOne({ projectId, status: status || 'TODO' }).sort({ order: -1 });
    const order = lastTask ? lastTask.order + 1 : 0;

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      projectId,
      userId: req.user._id,
      order,
    });

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
 * Updates any task fields, including status (used for kanban drag-and-drop).
 * Body: { title?, description?, status?, priority?, dueDate?, order? }
 */
const updateTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate, order } = req.body;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { title, description, status, priority, dueDate, order },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

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
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
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

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status, ...(order !== undefined && { order }) },
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    next(error);
  }
};

module.exports = { getTasks, createTask, getTask, updateTask, deleteTask, updateTaskStatus };
