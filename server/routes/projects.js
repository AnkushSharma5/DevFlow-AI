const express = require('express');
const { body } = require('express-validator');
const {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');

const router = express.Router();

// All project routes require authentication
router.use(protect);

const projectRules = [
  body('name').trim().notEmpty().withMessage('Project name is required').isLength({ max: 150 }),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description too long'),
  body('status').optional().isIn(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).withMessage('Invalid status'),
];

router.get('/', getProjects);
router.post('/', projectRules, validate, createProject);
router.get('/:id', getProject);
router.put('/:id', projectRules, validate, updateProject);
router.delete('/:id', deleteProject);

module.exports = router;
