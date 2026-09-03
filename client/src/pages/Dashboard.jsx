import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { getTasks } from '../services/api';
import Navbar from '../components/Navbar';
import DashboardCard from '../components/DashboardCard';
import LoadingSpinner from '../components/LoadingSpinner';

const Dashboard = () => {
  const { user } = useAuth();
  const { projects, fetchProjects, isLoading: projectsLoading } = useProjects();
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch projects on mount if not already loaded
  useEffect(() => {
    if (projects.length === 0) fetchProjects();
  }, []);

  // Fetch ALL tasks for the user by aggregating tasks from all projects
  // (We do this by fetching tasks for each project in parallel)
  useEffect(() => {
    const fetchAllTasks = async () => {
      if (projects.length === 0) {
        setTasksLoading(false);
        return;
      }
      setTasksLoading(true);
      try {
        const results = await Promise.all(
          projects.map((p) => getTasks(p._id).catch(() => ({ data: { tasks: [] } })))
        );
        const allTasks = results.flatMap((r) => r.data.tasks);
        setTasks(allTasks);
      } catch {
        setTasks([]);
      } finally {
        setTasksLoading(false);
      }
    };
    fetchAllTasks();
  }, [projects]);

  // Derived statistics
  const totalProjects = projects.length;
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'DONE').length;
  const pendingTasks = totalTasks - doneTasks;
  const highPriority = tasks.filter((t) => t.priority === 'HIGH' && t.status !== 'DONE').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;

  // Per-project task stats (for the project progress table)
  const projectStats = projects.map((p) => {
    const ptasks = tasks.filter((t) => t.projectId === p._id);
    const pdone = ptasks.filter((t) => t.status === 'DONE').length;
    return { ...p, total: ptasks.length, done: pdone };
  }).sort((a, b) => b.total - a.total).slice(0, 5);

  if (projectsLoading || tasksLoading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <>
      <Navbar title="Dashboard" />
      <main className="page-container">
        {/* Greeting */}
        <div className="page-header">
          <div>
            <h1 className="page-title">{greeting()}, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="page-subtitle">Here's what's happening with your projects today.</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/projects')}
            id="dashboard-goto-projects-btn"
          >
            ➕ New Project
          </button>
        </div>

        {/* Stats grid */}
        <div className="stats-grid">
          <DashboardCard icon="📁" label="Total Projects" value={totalProjects} onClick={() => navigate('/projects')} />
          <DashboardCard icon="✅" label="Completed Tasks" value={doneTasks} />
          <DashboardCard icon="⏳" label="Pending Tasks" value={pendingTasks} />
          <DashboardCard icon="🔥" label="High Priority" value={highPriority} />
          <DashboardCard icon="⚙️" label="In Progress" value={inProgress} />
          <DashboardCard icon="📊" label="Total Tasks" value={totalTasks} />
        </div>

        {/* Project overview table */}
        {projectStats.length > 0 ? (
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="card-header">
              <h2 style={{ fontSize: '1.1rem' }}>Project Progress</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/projects')}
                id="dashboard-view-all-btn"
              >
                View all →
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Project', 'Status', 'Tasks', 'Progress'].map((h) => (
                      <th key={h} style={{
                        padding: '10px 16px',
                        textAlign: 'left',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectStats.map((p) => {
                    const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                    return (
                      <tr
                        key={p._id}
                        style={{
                          borderBottom: '1px solid var(--color-border)',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onClick={() => navigate(`/projects/${p._id}`)}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '14px 16px', fontWeight: 500, fontSize: '0.9rem' }}>
                          {p.name}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span className={`badge badge-${p.status?.toLowerCase()}`}>
                            {p.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
                          {p.done} / {p.total}
                        </td>
                        <td style={{ padding: '14px 16px', minWidth: '160px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="progress-bar-track" style={{ flex: 1 }}>
                              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', width: '34px', flexShrink: 0 }}>
                              {pct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon">🚀</div>
              <div className="empty-state-title">No projects yet</div>
              <p className="empty-state-desc">Create your first project to start tracking tasks and using AI assistance.</p>
              <button className="btn btn-primary" onClick={() => navigate('/projects')} id="dashboard-create-first-btn">
                Create First Project
              </button>
            </div>
          </div>
        )}

        {/* Priority breakdown */}
        {totalTasks > 0 && (
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>Tasks by Priority</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {[
                { label: 'High', key: 'HIGH', color: 'var(--color-danger)', bg: 'var(--color-danger-bg)', icon: '🔥' },
                { label: 'Medium', key: 'MEDIUM', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', icon: '⚡' },
                { label: 'Low', key: 'LOW', color: 'var(--color-success)', bg: 'var(--color-success-bg)', icon: '📋' },
              ].map(({ label, key, color, bg, icon }) => {
                const count = tasks.filter((t) => t.priority === key).length;
                return (
                  <div key={key} style={{
                    background: bg,
                    border: `1px solid ${color}40`,
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{icon}</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{count}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      {label} Priority
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default Dashboard;
