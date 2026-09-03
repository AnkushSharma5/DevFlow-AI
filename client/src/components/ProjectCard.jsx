import { useNavigate } from 'react-router-dom';

/**
 * ProjectCard — clickable card for a project in the projects grid.
 * Shows: name, description, status badge, task completion progress bar.
 */
const ProjectCard = ({ project, taskStats, onEdit, onDelete }) => {
  const navigate = useNavigate();

  // taskStats: { total, done } — passed from parent (Projects page)
  const total = taskStats?.total ?? 0;
  const done = taskStats?.done ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const statusClass = `badge badge-${project.status?.toLowerCase()}`;

  const handleCardClick = () => navigate(`/projects/${project._id}`);

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit(project);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(project._id);
  };

  const formattedDate = new Date(project.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className="project-card"
      onClick={handleCardClick}
      id={`project-card-${project._id}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
    >
      <div className="project-card-header">
        <span className={statusClass}>{project.status?.replace('_', ' ')}</span>
        <div style={{ display: 'flex', gap: '6px', position: 'relative', zIndex: 2 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleEdit}
            title="Edit project"
            id={`project-edit-${project._id}`}
          >
            ✏️
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDelete}
            title="Delete project"
            id={`project-delete-${project._id}`}
            style={{ color: 'var(--color-danger)' }}
          >
            🗑️
          </button>
        </div>
      </div>

      <h3 className="project-card-name">{project.name}</h3>
      <p className="project-card-desc">
        {project.description || 'No description provided.'}
      </p>

      {/* Task completion progress bar */}
      <div className="progress-bar-wrapper">
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="progress-label">
          {total > 0 ? `${done} / ${total} tasks completed (${pct}%)` : 'No tasks yet'}
        </div>
      </div>

      <div className="project-card-footer">
        <span className="project-card-meta">Created {formattedDate}</span>
        <span className="project-card-meta">{total} task{total !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
};

export default ProjectCard;
