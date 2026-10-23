const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validation');

const router = express.Router();

// All task routes require authentication
router.use(protect);

const taskCreateRules = [
  body('projectId').isMongoId().withMessage('A valid projectId is required'),
  body('title').isString().withMessage('Task title is required').bail().trim().notEmpty().withMessage('Task title is required').isLength({ max: 200 }).withMessage('Task title is too long'),
  body('description').optional().isString().withMessage('Description must be a string').bail().isLength({ max: 2000 }).withMessage('Description too long'),
  body('status').optional().isString().withMessage('Invalid status').bail().isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Invalid status'),
  body('priority').optional().isString().withMessage('Invalid priority').bail().isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Invalid priority'),
  body('dueDate').optional({ nullable: true }).isISO8601().withMessage('Invalid date format'),
];

const taskUpdateRules = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  body('title').optional().isString().withMessage('Task title must be a string').bail().trim().notEmpty().withMessage('Task title cannot be empty').isLength({ max: 200 }).withMessage('Task title is too long'),
  body('description').optional().isString().withMessage('Description must be a string').bail().isLength({ max: 2000 }).withMessage('Description too long'),
  body('status').optional().isString().withMessage('Invalid status').bail().isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Invalid status'),
  body('priority').optional().isString().withMessage('Invalid priority').bail().isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Invalid priority'),
  body('dueDate').optional({ nullable: true }).isISO8601().withMessage('Invalid date format'),
];

const statusRules = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  body('status').isString().withMessage('Invalid status').bail().isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Invalid status'),
  body('order').optional().isInt({ min: 0, max: 1000000 }).withMessage('Order must be a non-negative integer').toInt(),
];

router.get('/', query('projectId').isMongoId().withMessage('A valid projectId is required'), validate, getTasks);
router.post('/', taskCreateRules, validate, createTask);
router.get('/:id', param('id').isMongoId().withMessage('Invalid ID format'), validate, getTask);
router.put('/:id', taskUpdateRules, validate, updateTask);
router.delete('/:id', param('id').isMongoId().withMessage('Invalid ID format'), validate, deleteTask);
router.patch('/:id/status', statusRules, validate, updateTaskStatus);

module.exports = router;
