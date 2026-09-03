import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';

/**
 * KanbanBoard — the three-column drag-and-drop board.
 *
 * Props:
 *   tasks        — array of task objects
 *   onDragEnd    — (result) => void  — called when a drag completes
 *   onEditTask   — (task) => void
 *   onDeleteTask — (taskId) => void
 *   onStatusChange — (taskId, newStatus) => void
 */

const COLUMNS = [
  { id: 'TODO',        label: 'To Do',       dotClass: 'dot-todo',       headerColor: '#818cf8' },
  { id: 'IN_PROGRESS', label: 'In Progress',  dotClass: 'dot-inprogress', headerColor: '#fbbf24' },
  { id: 'DONE',        label: 'Done',         dotClass: 'dot-done',       headerColor: '#4ade80' },
];

const KanbanBoard = ({ tasks, onDragEnd, onEditTask, onDeleteTask, onStatusChange }) => {
  // Group tasks by status
  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter((t) => t.status === col.id);
    return acc;
  }, {});

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="kanban-board">
        {COLUMNS.map((col) => (
          <div key={col.id} className="kanban-column">
            {/* Column header */}
            <div className="kanban-column-header">
              <div className="kanban-column-title">
                <span className={`kanban-dot ${col.dotClass}`} />
                <span style={{ color: col.headerColor }}>{col.label}</span>
              </div>
              <span className="kanban-count">{grouped[col.id].length}</span>
            </div>

            {/* Droppable zone */}
            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  className={`kanban-column-body kanban-drop-zone ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  {grouped[col.id].length === 0 && !snapshot.isDraggingOver && (
                    <div style={{
                      textAlign: 'center',
                      padding: '24px 12px',
                      color: 'var(--color-text-muted)',
                      fontSize: '0.82rem',
                      borderRadius: '8px',
                      border: '1px dashed var(--color-border)',
                    }}>
                      Drop tasks here
                    </div>
                  )}

                  {grouped[col.id].map((task, index) => (
                    <Draggable key={task._id} draggableId={task._id} index={index}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                        >
                          <TaskCard
                            task={task}
                            isDragging={dragSnapshot.isDragging}
                            onEdit={onEditTask}
                            onDelete={onDeleteTask}
                            onStatusChange={onStatusChange}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
