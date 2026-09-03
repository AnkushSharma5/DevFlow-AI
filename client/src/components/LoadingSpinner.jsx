const LoadingSpinner = ({ size = 'md', text = '' }) => {
  return (
    <div className="loading-container">
      <div className={`spinner ${size === 'sm' ? 'spinner-sm' : ''}`} role="status" aria-label="Loading" />
      {text && <p>{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
