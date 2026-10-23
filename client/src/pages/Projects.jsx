import { useState, useEffect } from 'react';
import { getTasks } from '../services/api';
import { useProjects } from '../context/ProjectContext';
import Navbar from '../components/Navbar';
import ProjectCard from '../components/ProjectCard';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * Projects page — lists all user projects in a grid with create/edit/delete.
 */
const Projects = () => {
  const { projects, isLoading, error, fetchProjects, addProject, editProject, removeProject } = useProjects();
  const [taskStats, setTaskStats] = useState({}); // { projectId: { total, done } }
  const [taskStatsError, setTaskStatsError] = useState('');
  const [taskStatsReloadKey, setTaskStatsReloadKey] = useState(0);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', status: 'ACTIVE' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Load projects if needed
  useEffect(() => {
    if (projects.length === 0) fetchProjects();
  }, []);

  // Fetch task stats for all projects so progress bars work
  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      if (!projects.length) {
        setTaskStats({});
        setTaskStatsError('');
        return;
      }
      setTaskStatsError('');
      setTaskStats(Object.fromEntries(projects.map((project) => [project._id, { loading: true }])));
      try {
        const results = await Promise.all(projects.map(async (project) => ({
          id: project._id,
          tasks: (await getTasks(project._id)).data.tasks,
        })));
        if (cancelled) return;
        const stats = {};
        results.forEach(({ id, tasks }) => {
          stats[id] = { total: tasks.length, done: tasks.filter((task) => task.status === 'DONE').length };
        });
        setTaskStats(stats);
      } catch {
        if (cancelled) return;
        setTaskStatsError('Task totals could not be loaded. Project progress is unavailable until retry.');
        setTaskStats(Object.fromEntries(projects.map((project) => [project._id, { unavailable: true }])));
      }
    };
    fetchStats();
    return () => { cancelled = true; };
  }, [projects, taskStatsReloadKey]);

  const openCreate = () => {
    setEditingProject(null);
    setForm({ name: '', description: '', status: 'ACTIVE' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (project) => {
    setEditingProject(project);
    setForm({ name: project.name, description: project.description || '', status: project.status });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Project name is required.'); return; }
    setFormLoading(true);
    setFormError('');
    try {
      if (editingProject) {
        await editProject(editingProject._id, form);
      } else {
        await addProject(form);
      }
      closeModal();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save project.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project and all its tasks? This cannot be undone.')) return;
    try {
      await removeProject(id);
    } catch {
      alert('Failed to delete project.');
    }
  };

  if (isLoading) return <LoadingSpinner text="Loading projects..." />;

  return (
    <>
      <Navbar title="Projects" />
      <main className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Projects</h1>
            <p className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-primary" onClick={openCreate} id="create-project-btn">
            ➕ New Project
          </button>
        </div>

        {error && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '20px' }}>
            {error}
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: '12px' }}
              onClick={fetchProjects}
            >
              Retry
            </button>
          </div>
        )}
        {taskStatsError && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '20px' }}>
            {taskStatsError}
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: '12px' }}
              onClick={() => setTaskStatsReloadKey((key) => key + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {error ? null : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <div className="empty-state-title">No projects yet</div>
            <p className="empty-state-desc">Create your first project to start organizing your work.</p>
            <button className="btn btn-primary" onClick={openCreate} id="create-first-project-btn">
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid-3">
            {projects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                taskStats={taskStats[project._id]}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title">
            <div className="modal-header">
              <h2 className="modal-title" id="project-modal-title">
                {editingProject ? '✏️ Edit Project' : '➕ New Project'}
              </h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              {formError && (
                <div className="alert alert-error" style={{ marginBottom: '16px' }}>{formError}</div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="project-name">Name *</label>
                <input
                  id="project-name"
                  name="name"
                  className="form-input"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="My awesome project"
                  maxLength={150}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="project-description">Description</label>
                <textarea
                  id="project-description"
                  name="description"
                  className="form-textarea"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="What are you building?"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="project-status">Status</label>
                <select id="project-status" name="status" className="form-select" value={form.status} onChange={handleChange}>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={formLoading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={formLoading} id="project-submit-btn">
                  {formLoading ? (
                    <><span className="spinner spinner-sm" />Saving...</>
                  ) : editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Projects;
