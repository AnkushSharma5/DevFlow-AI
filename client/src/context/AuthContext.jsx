/**
 * AuthContext — global authentication state.
 *
 * Provides: { user, token, isLoading, login, logout }
 * Used in: App.jsx (ProtectedRoute), Sidebar, any component needing current user.
 *
 * State flow:
 *   On app load → check localStorage for token → call /api/auth/me to verify
 *   login() → store token in localStorage → set user in state
 *   logout() → clear localStorage → clear state → redirect to /login
 */
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { getMe } from '../services/api';

// ---------------------------------------------------------------------------
// State shape and initial state
// ---------------------------------------------------------------------------
const initialState = {
  user: null,
  token: localStorage.getItem('devflow_token') || null,
  isLoading: true, // true while we're verifying the stored token on startup
  isAuthenticated: false,
};

// ---------------------------------------------------------------------------
// Reducer — all state transitions are explicit and readable
// ---------------------------------------------------------------------------
const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'AUTH_FAILURE':
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // On mount, verify the stored token by calling /api/auth/me.
  // This handles the case where the token has expired between sessions.
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('devflow_token');
      if (!storedToken) {
        dispatch({ type: 'AUTH_FAILURE' });
        return;
      }
      try {
        const res = await getMe();
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user: res.data.user, token: storedToken },
        });
      } catch {
        // Token is invalid or expired — clean up
        localStorage.removeItem('devflow_token');
        dispatch({ type: 'AUTH_FAILURE' });
      }
    };

    verifyToken();
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /** Called by Login and Register pages after a successful API response. */
  const login = (token, user) => {
    localStorage.setItem('devflow_token', token);
    dispatch({ type: 'AUTH_SUCCESS', payload: { token, user } });
  };

  /** Clears all auth state and redirects to login. */
  const logout = () => {
    localStorage.removeItem('devflow_token');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/** Custom hook — components use this instead of useContext(AuthContext) directly. */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
