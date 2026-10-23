const getDateKey = (value) => {
  if (!value) return null;
  const key = value instanceof Date
    ? (Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10))
    : (typeof value === 'string' ? value.slice(0, 10) : null);
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const parsed = new Date(`${key}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== key ? null : key;
};

const getLocalDateKey = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, '0'),
  String(date.getDate()).padStart(2, '0'),
].join('-');

export const isTaskOverdue = (dueDate, status, now = new Date()) => {
  const dueDateKey = getDateKey(dueDate);
  return Boolean(dueDateKey && status !== 'DONE' && dueDateKey < getLocalDateKey(now));
};

export const formatTaskDueDate = (dueDate) => {
  const dateKey = getDateKey(dueDate);
  if (!dateKey) return null;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
};
