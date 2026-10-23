import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveTaskToStatus, reorderTaskList } from '../src/utils/taskOrdering.js';
import { shouldDiscardStoredToken } from '../src/utils/authErrors.js';
import { formatTaskDueDate, isTaskOverdue } from '../src/utils/taskDates.js';

const tasks = [
  { _id: 'a', title: 'A', status: 'TODO', order: 0 },
  { _id: 'b', title: 'B', status: 'TODO', order: 1 },
  { _id: 'c', title: 'C', status: 'TODO', order: 2 },
  { _id: 'd', title: 'D', status: 'DONE', order: 0 },
];

test('drag reorder updates the displayed item and normalizes sibling positions', () => {
  const reordered = reorderTaskList(tasks, {
    draggableId: 'c',
    source: { droppableId: 'TODO', index: 2 },
    destination: { droppableId: 'TODO', index: 1 },
  });
  assert.deepEqual(reordered.filter((task) => task.status === 'TODO').map((task) => [task.title, task.order]), [
    ['A', 0], ['C', 1], ['B', 2],
  ]);
});

test('cross-column drops and status dropdown changes use the destination order', () => {
  const dropped = reorderTaskList(tasks, {
    draggableId: 'b',
    source: { droppableId: 'TODO', index: 1 },
    destination: { droppableId: 'DONE', index: 0 },
  });
  assert.deepEqual(dropped.filter((task) => task.status === 'TODO').map((task) => task.title), ['A', 'C']);
  assert.deepEqual(dropped.filter((task) => task.status === 'DONE').map((task) => [task.title, task.order]), [
    ['B', 0], ['D', 1],
  ]);

  const selected = moveTaskToStatus(tasks, 'a', 'DONE');
  assert.deepEqual(selected.filter((task) => task.status === 'DONE').map((task) => [task.title, task.order]), [
    ['D', 0], ['A', 1],
  ]);
});

test('a drop outside the board preserves the existing task list', () => {
  assert.equal(reorderTaskList(tasks, { draggableId: 'a', source: {}, destination: null }), tasks);
});

test('temporary session verification failures preserve the stored token', () => {
  assert.equal(shouldDiscardStoredToken({ response: { status: 401 } }), true);
  assert.equal(shouldDiscardStoredToken({ response: { status: 404 } }), true);
  assert.equal(shouldDiscardStoredToken({ response: { status: 503 } }), false);
  assert.equal(shouldDiscardStoredToken({ code: 'ERR_NETWORK' }), false);
});

test('date-only due dates are not overdue until the next local calendar day', () => {
  const afternoonOnDueDate = new Date(2026, 9, 24, 17, 30);
  const dueDate = '2026-10-24T00:00:00.000Z';

  assert.equal(isTaskOverdue(dueDate, 'TODO', afternoonOnDueDate), false);
  assert.equal(isTaskOverdue(dueDate, 'IN_PROGRESS', afternoonOnDueDate), false);
  assert.equal(isTaskOverdue('2026-10-23T00:00:00.000Z', 'TODO', afternoonOnDueDate), true);
  assert.equal(isTaskOverdue(dueDate, 'DONE', new Date(2026, 9, 26)), false);
  assert.equal(formatTaskDueDate(dueDate), 'Oct 24');
  assert.equal(isTaskOverdue('2026-02-31T00:00:00.000Z', 'TODO', afternoonOnDueDate), false);
  assert.equal(formatTaskDueDate('not-a-date'), null);
});
