/**
 * ProjectContext — global project list state.
 *
 * Provides: { projects, isLoading, error, fetchProjects, addProject, editProject, removeProject }
 *
 * We keep projects in global context because multiple pages need them:
 *   - Dashboard (for stats)
 *   - Projects page (list)
 *   - Sidebar (project count)
 *   - ProjectDetails (single project)
 *
 * The context fetches once on mount (after auth) and stays in sync
 * via local state updates after each mutation.
 */
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { getProjects, createProject, updateProject, deleteProject } from '../services/api';

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
const initialState = {
  projects: [],
  isLoading: false,
  error: null,
};

const projectReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, projects: action.payload };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'ADD_PROJECT':
      return { ...state, projects: [action.payload, ...state.projects] };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p._id === action.payload._id ? action.payload : p
        ),
      };
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter((p) => p._id !== action.payload),
      };
    default:
      return state;
  }
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  /** Fetch all projects for the current user. */
  const fetchProjects = useCallback(async () => {
    dispatch({ type: 'FETCH_START' });
    try {
      const res = await getProjects();
      dispatch({ type: 'FETCH_SUCCESS', payload: res.data.projects });
    } catch (err) {
      dispatch({
        type: 'FETCH_ERROR',
        payload: err.response?.data?.message || 'Failed to load projects',
      });
    }
  }, []);

  /** Create a project and prepend it to the local list. */
  const addProject = async (data) => {
    const res = await createProject(data);
    dispatch({ type: 'ADD_PROJECT', payload: res.data.project });
    return res.data.project;
  };

  /** Update a project and sync the local list. */
  const editProject = async (id, data) => {
    const res = await updateProject(id, data);
    dispatch({ type: 'UPDATE_PROJECT', payload: res.data.project });
    return res.data.project;
  };

  /** Delete a project and remove it from the local list. */
  const removeProject = async (id) => {
    await deleteProject(id);
    dispatch({ type: 'DELETE_PROJECT', payload: id });
  };

  return (
    <ProjectContext.Provider value={{ ...state, fetchProjects, addProject, editProject, removeProject }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjects must be used within ProjectProvider');
  return ctx;
};
