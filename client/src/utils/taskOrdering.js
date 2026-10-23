const COLUMN_ORDER = ['TODO', 'IN_PROGRESS', 'DONE'];

const taskId = (task) => String(task._id);

const compareTasks = (left, right) => {
  const orderDifference = (left.order || 0) - (right.order || 0);
  if (orderDifference !== 0) return orderDifference;
  return new Date(left.createdAt || 0) - new Date(right.createdAt || 0);
};

export const placeTaskInColumn = (tasks, id, status, order) => {
  const moving = tasks.find((task) => taskId(task) === String(id));
  if (!moving || !COLUMN_ORDER.includes(status)) return tasks;

  const columns = Object.fromEntries(COLUMN_ORDER.map((column) => [
    column,
    tasks.filter((task) => task.status === column && taskId(task) !== String(id)).sort(compareTasks),
  ]));
  const destination = columns[status];
  const index = order === undefined ? destination.length : Math.max(0, Math.min(order, destination.length));
  destination.splice(index, 0, { ...moving, status });

  const updated = new Map();
  for (const column of COLUMN_ORDER) {
    columns[column].forEach((task, position) => {
      updated.set(taskId(task), { ...task, status: column, order: position });
    });
  }
  const ordered = COLUMN_ORDER.flatMap((column) => columns[column].map((task) => updated.get(taskId(task))));
  const knownIds = new Set(ordered.map(taskId));
  return [...ordered, ...tasks.filter((task) => !knownIds.has(taskId(task)))];
};

export const reorderTaskList = (tasks, result) => {
  const { draggableId, source, destination } = result;
  if (!destination) return tasks;
  return placeTaskInColumn(tasks, draggableId, destination.droppableId, destination.index);
};

export const moveTaskToStatus = (tasks, id, status) => placeTaskInColumn(tasks, id, status);
