import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';

const navItems = [
  { to: '/dashboard',  icon: '⬡',  label: 'Dashboard' },
  { to: '/projects',   icon: '📁',  label: 'Projects' },
  { to: '/ai-tools',   icon: '✦',   label: 'AI Tools' },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { projects } = useProjects();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get initials for avatar
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <NavLink to="/dashboard" className="sidebar-logo" style={{ textDecoration: 'none' }}>
        <div className="sidebar-logo-icon">⚡</div>
        <span className="sidebar-logo-text">DevFlow AI</span>
      </NavLink>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Navigation</span>

        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon">{icon}</span>
            {label}
          </NavLink>
        ))}

        {/* Dynamic project list — top 5 projects */}
        {projects.length > 0 && (
          <>
            <span className="sidebar-section-label">Recent Projects</span>
            {projects.slice(0, 5).map((project) => (
              <NavLink
                key={project._id}
                to={`/projects/${project._id}`}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                style={{ paddingLeft: '28px' }}
              >
                <span
                  className="sidebar-link-icon"
                  style={{ fontSize: '0.6rem', color: 'var(--color-accent)' }}
                >
                  ●
                </span>
                <span style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: '0.85rem'
                }}>
                  {project.name}
                </span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer: user info + logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div style={{ overflow: 'hidden' }}>
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-email">{user?.email}</div>
          </div>
        </div>
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
          onClick={handleLogout}
          id="sidebar-logout-btn"
        >
          🚪 Log out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
