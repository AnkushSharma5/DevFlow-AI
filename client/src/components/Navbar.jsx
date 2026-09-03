/**
 * Navbar — top bar shown on all authenticated pages.
 * Shows the current page title and (optionally) action buttons.
 */
const Navbar = ({ title = 'DevFlow AI', children }) => {
  return (
    <header className="navbar">
      <span className="navbar-title">{title}</span>
      <div className="navbar-actions">
        {children}
      </div>
    </header>
  );
};

export default Navbar;
