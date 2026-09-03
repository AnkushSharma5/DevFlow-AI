const express = require('express');
const { body } = require('express-validator');
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

const taskRules = [
  body('title').trim().notEmpty().withMessage('Task title is required').isLength({ max: 200 }),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description too long'),
  body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Invalid status'),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Invalid priority'),
  body('dueDate').optional({ nullable: true }).isISO8601().withMessage('Invalid date format'),
];

const statusRules = [
  body('status').isIn(['TODO', 'IN_PROGRESS', 'DONE']).withMessage('Invalid status'),
];

router.get('/', getTasks);
router.post('/', taskRules, validate, createTask);
router.get('/:id', getTask);
router.put('/:id', taskRules, validate, updateTask);
router.delete('/:id', deleteTask);
router.patch('/:id/status', statusRules, validate, updateTaskStatus);

module.exports = router;
