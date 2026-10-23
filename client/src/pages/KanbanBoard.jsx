import React, { useState, useEffect } from 'react';
import { useProjects } from '../context/ProjectContext';
import { getTasks, updateTask, deleteTask, updateTaskStatus, createTask } from '../services/api';
import Navbar from '../components/Navbar';
import KanbanBoard from '../components/KanbanBoard';
import TaskModal from '../components/TaskModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { moveTaskToStatus, placeTaskInColumn, reorderTaskList } from '../utils/taskOrdering';

const KanbanBoardPage = () => {
  const { projects, fetchProjects, isLoading: projectsLoading, error: projectsError } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState('');
  const [tasksReloadKey, setTasksReloadKey] = useState(0);
  const [taskModal, setTaskModal] = useState({ isOpen: false, task: null });

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0]._id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setTasks([]);
      setTasksError('');
      setTasksLoading(false);
      return;
    }
    let cancelled = false;
    const loadProjectTasks = async () => {
      setTasksLoading(true);
      setTasksError('');
      try {
        const res = await getTasks(selectedProjectId);
        if (cancelled) return;
        setTasks(res.data.tasks);
      } catch (err) {
        if (cancelled) return;
        setTasks([]);
        setTasksError(err.response?.data?.message || 'Could not load tasks for this project.');
      } finally {
        if (!cancelled) setTasksLoading(false);
      }
    };
    loadProjectTasks();
    return () => { cancelled = true; };
  }, [selectedProjectId, tasksReloadKey]);

  const handleTaskSubmit = async (taskData) => {
    if (taskModal.task) {
      const res = await updateTask(taskModal.task._id, taskData);
      if (res.data.task.status !== taskModal.task.status) {
        setTasks((prev) => placeTaskInColumn(prev, res.data.task._id, res.data.task.status, res.data.task.order));
      } else {
        setTasks((prev) => prev.map((t) => (t._id === taskModal.task._id ? res.data.task : t)));
      }
    } else {
      const res = await createTask({ ...taskData, projectId: selectedProjectId });
      setTasks((prev) => [...prev, res.data.task]);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    await deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
  };

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    const previousTasks = tasks;
    setTasks(reorderTaskList(previousTasks, result));

    try {
      await updateTaskStatus(draggableId, { status: destination.droppableId, order: destination.index });
    } catch {
      setTasks(previousTasks);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    const previousTasks = tasks;
    setTasks(moveTaskToStatus(previousTasks, taskId, newStatus));
    try {
      await updateTaskStatus(taskId, { status: newStatus });
    } catch {
      setTasks(previousTasks);
    }
  };

  if (projectsLoading) return <LoadingSpinner text="Loading board..." />;

  return (
    <>
      <Navbar title="Kanban Board" />
      <main className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Task Workflow Board</h1>
            <p className="page-subtitle">Visualize progress, drag tasks, or update status across columns</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {projects.length > 0 && (
              <select
                className="form-select"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                style={{ width: '220px' }}
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <button
              className="btn btn-primary"
              onClick={() => setTaskModal({ isOpen: true, task: null })}
              disabled={!selectedProjectId}
            >
              ➕ Add Task
            </button>
          </div>
        </div>

        {projectsError && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '20px' }}>
            {projectsError}
            <button className="btn btn-secondary btn-sm" style={{ marginLeft: '12px' }} onClick={fetchProjects}>Retry</button>
          </div>
        )}
        {tasksError && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: '20px' }}>
            {tasksError}
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: '12px' }}
              onClick={() => setTasksReloadKey((key) => key + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {projectsError && projects.length === 0 ? null : projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No projects yet</div>
            <p className="empty-state-desc">Create a project first to start using the Kanban board.</p>
          </div>
        ) : tasksLoading ? (
          <LoadingSpinner text="Loading tasks..." />
        ) : tasksError ? null : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🎯</div>
            <div className="empty-state-title">No tasks in this project</div>
            <p className="empty-state-desc">Create your first task to see it on the Kanban board.</p>
            <button
              className="btn btn-primary"
              onClick={() => setTaskModal({ isOpen: true, task: null })}
            >
              ➕ Create Task
            </button>
          </div>
        ) : (
          <KanbanBoard
            tasks={tasks}
            onDragEnd={handleDragEnd}
            onEditTask={(task) => setTaskModal({ isOpen: true, task })}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
          />
        )}
      </main>

      <TaskModal
        isOpen={taskModal.isOpen}
        onClose={() => setTaskModal({ isOpen: false, task: null })}
        onSubmit={handleTaskSubmit}
        task={taskModal.task}
        projectId={selectedProjectId}
      />
    </>
  );
};

export default KanbanBoardPage;
