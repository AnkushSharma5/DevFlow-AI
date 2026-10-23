import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import LoadingSpinner from './LoadingSpinner';

/**
 * ProtectedRoute:
 * Checks if user is authenticated.
 * If authentication is still loading, renders a spinner.
 * If unauthenticated, redirects to /login.
 * If authenticated, renders the application layout with Sidebar and Outlet.
 */
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, authError, retryAuth, logout } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <LoadingSpinner text="Checking authentication..." />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="auth-page">
        <div className="auth-card" role="alert">
          <h1 className="auth-heading">Session check unavailable</h1>
          <p className="auth-subheading">{authError}</p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={retryAuth}>Retry</button>
            <button className="btn btn-secondary" onClick={logout}>Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default ProtectedRoute;
