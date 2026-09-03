import { useNavigate } from 'react-router-dom';

/**
 * DashboardCard — stat card for the dashboard.
 * Props: icon, label, value, accent (CSS color string)
 */
const DashboardCard = ({ icon, label, value, accent, onClick }) => {
  return (
    <div
      className="stat-card"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        '--card-accent': accent || 'var(--color-accent)',
      }}
      id={`stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value ?? '—'}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
};

export default DashboardCard;
