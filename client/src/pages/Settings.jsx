import React from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const Settings = () => {
  const { user } = useAuth();

  return (
    <>
      <Navbar title="Settings" />
      <main className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Settings & Profile</h1>
            <p className="page-subtitle">Manage your account information and workspace preferences</p>
          </div>
        </div>

        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          {/* User Profile Card */}
          <div className="card">
            <div className="card-header">
              <h3>Developer Profile</h3>
              <span className="badge badge-active">Active</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-accent), #3b82f6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: '700',
                  color: '#fff',
                }}
              >
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{user?.name || 'Developer'}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{user?.email}</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Account Created</label>
              <input
                className="form-input"
                disabled
                value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recent'}
              />
            </div>
          </div>

          {/* AI Settings & Integration Card */}
          <div className="card">
            <div className="card-header">
              <h3>AI Engine Integration</h3>
              <span className="badge badge-inprogress">Gemini 1.5 Flash</span>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              DevFlow AI uses backend-mediated AI queries. The API keys remain securely on the server and are never exposed to the client.
            </p>

            <div className="form-group">
              <label className="form-label">Configured Provider</label>
              <input className="form-input" disabled value="Google Gemini (Swappable to OpenAI)" />
            </div>

            <div className="form-group">
              <label className="form-label">Available Tools</label>
              <ul style={{ paddingLeft: '20px', color: 'var(--color-text-muted)', fontSize: '0.88rem', lineHeight: '1.8' }}>
                <li>Task Breakdown (Feature to Checklist)</li>
                <li>Code Explainer (Architecture & Logic Analysis)</li>
                <li>AI Debugger (Root Cause & Corrective Code)</li>
                <li>Documentation Generator (Comprehensive Specs)</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default Settings;
