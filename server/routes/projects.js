const express = require('express');
const { body, param } = require('express-validator');
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

const projectCreateRules = [
  body('name').isString().withMessage('Project name is required').bail().trim().notEmpty().withMessage('Project name is required').isLength({ max: 150 }).withMessage('Project name is too long'),
  body('description').optional().isString().withMessage('Description must be a string').bail().isLength({ max: 1000 }).withMessage('Description too long'),
  body('status').optional().isString().withMessage('Invalid status').bail().isIn(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).withMessage('Invalid status'),
];

const projectUpdateRules = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  body('name').optional().isString().withMessage('Project name must be a string').bail().trim().notEmpty().withMessage('Project name cannot be empty').isLength({ max: 150 }).withMessage('Project name is too long'),
  body('description').optional().isString().withMessage('Description must be a string').bail().isLength({ max: 1000 }).withMessage('Description too long'),
  body('status').optional().isString().withMessage('Invalid status').bail().isIn(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).withMessage('Invalid status'),
];

router.get('/', getProjects);
router.post('/', projectCreateRules, validate, createProject);
router.get('/:id', param('id').isMongoId().withMessage('Invalid ID format'), validate, getProject);
router.put('/:id', projectUpdateRules, validate, updateProject);
router.delete('/:id', param('id').isMongoId().withMessage('Invalid ID format'), validate, deleteProject);

module.exports = router;
