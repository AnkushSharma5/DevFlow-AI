/**
 * api.js — Axios instance and all backend API calls.
 *
 * This is the ONLY place the frontend should call the backend.
 * Components import named functions from here (e.g., loginUser, createProject).
 * They never construct URLs or set headers themselves.
 */
import axios from 'axios';

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
// Base URL is empty in dev — Vite's proxy forwards /api → localhost:5000
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 second timeout (AI requests can be slow)
});

// Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('devflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401 (expired or invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if we're already on an auth page
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        localStorage.removeItem('devflow_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');

// ---------------------------------------------------------------------------
// Project endpoints
// ---------------------------------------------------------------------------
export const getProjects = () => api.get('/projects');
export const createProject = (data) => api.post('/projects', data);
export const getProject = (id) => api.get(`/projects/${id}`);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);

// ---------------------------------------------------------------------------
// Task endpoints
// ---------------------------------------------------------------------------
export const getTasks = (projectId) => api.get('/tasks', { params: { projectId } });
export const createTask = (data) => api.post('/tasks', data);
export const getTask = (id) => api.get(`/tasks/${id}`);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);
export const updateTaskStatus = (id, data) => api.patch(`/tasks/${id}/status`, data);

// ---------------------------------------------------------------------------
// AI endpoints
// ---------------------------------------------------------------------------
export const aiBreakdown = (description) => api.post('/ai/breakdown', { description });
export const aiExplain = (language, code) => api.post('/ai/explain', { language, code });
export const aiDebug = (language, code, errorMessage) => api.post('/ai/debug', { language, code, errorMessage });
export const aiDocs = (input, type) => api.post('/ai/docs', { input, type });

export default api;
