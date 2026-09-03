import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProject } from '../services/api';
import { getTasks, createTask, updateTask, deleteTask, updateTaskStatus } from '../services/api';
import { useProjects } from '../context/ProjectContext';
import Navbar from '../components/Navbar';
import KanbanBoard from '../components/KanbanBoard';
import TaskModal from '../components/TaskModal';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * ProjectDetails page — shows a single project with its full Kanban board.
 */
const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { editProject, removeProject } = useProjects();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Task modal state
  const [taskModal, setTaskModal] = useState({ isOpen: false, task: null });

  // Project edit modal state
  const [editModal, setEditModal] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '', status: '' });
  const [projectFormLoading, setProjectFormLoading] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [projectRes, tasksRes] = await Promise.all([
        getProject(id),
        getTasks(id),
      ]);
      setProject(projectRes.data.project);
      setTasks(tasksRes.data.tasks);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Project not found.');
      } else {
        setError('Failed to load project data.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // -------------------------------------------------------------------------
  // Task operations
  // -------------------------------------------------------------------------

  const handleTaskSubmit = async (taskData) => {
    if (taskModal.task) {
      // Editing existing task
      const res = await updateTask(taskModal.task._id, taskData);
      setTasks((prev) => prev.map((t) => (t._id === taskModal.task._id ? res.data.task : t)));
    } else {
      // Creating new task
      const res = await createTask({ ...taskData, projectId: id });
      setTasks((prev) => [...prev, res.data.task]);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    await deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
  };

  // Called when a task is dropped in a new column via DnD
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    // Dropped outside any column or in same position
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    const newStatus = destination.droppableId; // droppableId === status string

    // Optimistic update — update UI immediately
    setTasks((prev) =>
      prev.map((t) => (t._id === draggableId ? { ...t, status: newStatus } : t))
    );

    // Persist to backend
    try {
      await updateTaskStatus(draggableId, { status: newStatus, order: destination.index });
    } catch {
      // Rollback on failure
      setTasks((prev) =>
        prev.map((t) => (t._id === draggableId ? { ...t, status: source.droppableId } : t))
      );
    }
  };

  // Fallback: status dropdown change (same logic as drag-end)
  const handleStatusChange = async (taskId, newStatus) => {
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));
    try {
      await updateTaskStatus(taskId, { status: newStatus });
    } catch {
      // Reload on failure
      loadData();
    }
  };

  // -------------------------------------------------------------------------
  // Project operations
  // -------------------------------------------------------------------------

  const openEditModal = () => {
    setProjectForm({ name: project.name, description: project.description || '', status: project.status });
    setEditModal(true);
  };

  const handleProjectEdit = async (e) => {
    e.preventDefault();
    setProjectFormLoading(true);
    try {
      const updated = await editProject(id, projectForm);
      setProject(updated);
      setEditModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update project.');
    } finally {
      setProjectFormLoading(false);
    }
  };

  const handleProjectDelete = async () => {
    if (!window.confirm('Delete this project and ALL its tasks? This cannot be undone.')) return;
    try {
      await removeProject(id);
      navigate('/projects');
    } catch {
      alert('Failed to delete project.');
    }
  };

  if (isLoading) return <LoadingSpinner text="Loading project..." />;

  if (error) {
    return (
      <>
        <Navbar title="Project" />
        <main className="page-container">
          <div className="alert alert-error">{error}</div>
          <Link to="/projects" className="btn btn-secondary" style={{ marginTop: '16px', display: 'inline-flex' }}>
            ← Back to Projects
          </Link>
        </main>
      </>
    );
  }

  const statusClass = `badge badge-${project.status?.toLowerCase()}`;

  return (
    <>
      <Navbar title={project.name} />
      <main className="page-container">
        {/* Project header */}
        <div className="page-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <Link
                to="/projects"
                style={{ color: 'var(--color-text-muted)', fontSize: '0.88rem' }}
              >
                ← Projects
              </Link>
              <span className={statusClass}>{project.status?.replace('_', ' ')}</span>
            </div>
            <h1 className="page-title">{project.name}</h1>
            {project.description && (
              <p className="page-subtitle" style={{ marginTop: '6px', maxWidth: '600px' }}>
                {project.description}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={() => setTaskModal({ isOpen: true, task: null })}
              id="add-task-btn"
            >
              ➕ Add Task
            </button>
            <button className="btn btn-secondary" onClick={openEditModal} id="edit-project-btn">
              ✏️ Edit
            </button>
            <button className="btn btn-danger" onClick={handleProjectDelete} id="delete-project-btn">
              🗑️ Delete
            </button>
          </div>
        </div>

        {/* Task count summary */}
        <div style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '28px',
          flexWrap: 'wrap',
        }}>
          {[
            { label: 'Total', count: tasks.length, color: 'var(--color-text-muted)' },
            { label: 'To Do', count: tasks.filter(t => t.status === 'TODO').length, color: '#818cf8' },
            { label: 'In Progress', count: tasks.filter(t => t.status === 'IN_PROGRESS').length, color: '#fbbf24' },
            { label: 'Done', count: tasks.filter(t => t.status === 'DONE').length, color: '#4ade80' },
          ].map(({ label, count, color }) => (
            <div
              key={label}
              style={{
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color }}>{count}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Kanban board */}
        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No tasks yet</div>
            <p className="empty-state-desc">Add your first task to get started with this project.</p>
            <button
              className="btn btn-primary"
              onClick={() => setTaskModal({ isOpen: true, task: null })}
              id="add-first-task-btn"
            >
              ➕ Add First Task
            </button>
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onDragEnd={handleDragEnd}
            onEditTask={(task) => setTaskModal({ isOpen: true, task })}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>

      {/* Task Modal */}
      <TaskModal
        isOpen={taskModal.isOpen}
        onClose={() => setTaskModal({ isOpen: false, task: null })}
        onSubmit={handleTaskSubmit}
        task={taskModal.task}
        projectId={id}
      />

      {/* Project Edit Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditModal(false)}>
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">✏️ Edit Project</h2>
              <button className="modal-close" onClick={() => setEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleProjectEdit}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-proj-name">Name *</label>
                <input
                  id="edit-proj-name"
                  className="form-input"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-proj-desc">Description</label>
                <textarea
                  id="edit-proj-desc"
                  className="form-textarea"
                  value={projectForm.description}
                  onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-proj-status">Status</label>
                <select
                  id="edit-proj-status"
                  className="form-select"
                  value={projectForm.status}
                  onChange={(e) => setProjectForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={projectFormLoading} id="project-edit-submit-btn">
                  {projectFormLoading ? <><span className="spinner spinner-sm" />Saving...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ProjectDetails;
