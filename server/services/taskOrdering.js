const idOf = (task) => String(task._id);

const compareTasks = (left, right) => {
  const orderDifference = (left.order || 0) - (right.order || 0);
  if (orderDifference !== 0) return orderDifference;

  const dateDifference = new Date(left.createdAt || 0) - new Date(right.createdAt || 0);
  if (dateDifference !== 0) return dateDifference;
  return idOf(left).localeCompare(idOf(right));
};

/**
 * Calculate dense task positions for a drag/drop or status change.
 * `targetOrder` is omitted when a status dropdown should append to the column.
 */
const planTaskReorder = (tasks, taskId, targetStatus, targetOrder) => {
  const movingTask = tasks.find((task) => idOf(task) === String(taskId));
  if (!movingTask) return null;

  const sourceStatus = movingTask.status;
  if (sourceStatus === targetStatus && targetOrder === undefined) return [];

  const sourceItems = tasks
    .filter((task) => task.status === sourceStatus && idOf(task) !== String(taskId))
    .sort(compareTasks);

  if (sourceStatus === targetStatus) {
    const insertAt = Math.min(targetOrder, sourceItems.length);
    sourceItems.splice(insertAt, 0, movingTask);
    return sourceItems
      .map((task, order) => ({ task, status: sourceStatus, order }))
      .filter(({ task, status, order }) => task.status !== status || task.order !== order);
  }

  const destinationItems = tasks
    .filter((task) => task.status === targetStatus && idOf(task) !== String(taskId))
    .sort(compareTasks);
  const insertAt = targetOrder === undefined
    ? destinationItems.length
    : Math.min(targetOrder, destinationItems.length);
  destinationItems.splice(insertAt, 0, movingTask);

  const sourceChanges = sourceItems
    .map((task, order) => ({ task, status: sourceStatus, order }))
    .filter(({ task, status, order }) => task.status !== status || task.order !== order);
  const destinationChanges = destinationItems
    .map((task, order) => ({ task, status: targetStatus, order }))
    .filter(({ task, status, order }) => task.status !== status || task.order !== order);

  return [...sourceChanges, ...destinationChanges];
};

module.exports = { planTaskReorder };
