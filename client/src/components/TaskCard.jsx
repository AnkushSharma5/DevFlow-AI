/**
 * TaskCard — draggable card displayed inside a Kanban column.
 * Used by KanbanBoard inside @hello-pangea/dnd <Draggable>.
 *
 * Props:
 *   task          — the task object
 *   isDragging    — boolean from dnd (apply drag styles)
 *   onEdit        — (task) => void
 *   onDelete      — (taskId) => void
 *   onStatusChange — (taskId, newStatus) => void (fallback dropdown)
 */
const TaskCard = ({ task, isDragging, onEdit, onDelete, onStatusChange }) => {
  // Determine if due date is overdue
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const priorityClass = `badge badge-${task.priority?.toLowerCase()}`;

  return (
    <div
      className={`task-card ${isDragging ? 'task-card-dragging' : ''}`}
      id={`task-card-${task._id}`}
    >
      <div className="task-card-title">{task.title}</div>

      {task.description && (
        <div className="task-card-desc">{task.description}</div>
      )}

      <div className="task-card-footer">
        <span className={priorityClass}>{task.priority}</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {dueDateStr && (
            <span className={`task-due-date ${isOverdue ? 'task-due-overdue' : ''}`}>
              {isOverdue ? '⚠️' : '📅'} {dueDateStr}
            </span>
          )}

          <div className="task-card-actions">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onEdit(task)}
              title="Edit task"
              id={`task-edit-${task._id}`}
            >
              ✏️
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onDelete(task._id)}
              title="Delete task"
              id={`task-delete-${task._id}`}
              style={{ color: 'var(--color-danger)' }}
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* Fallback status dropdown for keyboard/accessibility users */}
      <div style={{ marginTop: '10px' }}>
        <select
          className="form-select"
          style={{ fontSize: '0.78rem', padding: '4px 8px' }}
          value={task.status}
          onChange={(e) => onStatusChange(task._id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
          id={`task-status-select-${task._id}`}
          title="Change status"
        >
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="DONE">Done</option>
        </select>
      </div>
    </div>
  );
};

export default TaskCard;
