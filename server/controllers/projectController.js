const Project = require('../models/Project');
const Task = require('../models/Task');

/**
 * GET /api/projects
 * Returns all projects belonging to the logged-in user, newest first.
 */
const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ projects });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/projects
 * Creates a new project for the logged-in user.
 * Body: { name, description?, status? }
 */
const createProject = async (req, res, next) => {
  try {
    const { name, description, status } = req.body;
    const project = await Project.create({
      name,
      description,
      status,
      userId: req.user._id,
    });
    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/projects/:id
 * Returns a single project (must belong to the logged-in user).
 */
const getProject = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json({ project });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/projects/:id
 * Updates a project's name, description, or status.
 * Body: { name?, description?, status? }
 */
const updateProject = async (req, res, next) => {
  try {
    const { name, description, status } = req.body;
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { name, description, status },
      { new: true, runValidators: true }
    );
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json({ project });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/projects/:id
 * Deletes a project AND all its tasks (cascade delete).
 */
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Cascade: remove all tasks belonging to this project
    await Task.deleteMany({ projectId: req.params.id });

    res.json({ message: 'Project and all its tasks deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProjects, createProject, getProject, updateProject, deleteProject };
