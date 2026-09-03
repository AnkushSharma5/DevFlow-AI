import { useState } from 'react';

/**
 * AIResponse — renders structured AI output as styled sections.
 *
 * Props:
 *   type       — 'breakdown' | 'explain' | 'debug' | 'docs'
 *   data       — the parsed JSON response from the AI endpoint
 *   onAddTasks — (selectedSubtasks) => void  (for breakdown only)
 *   projectId  — string (for breakdown only)
 */
const AIResponse = ({ type, data, onAddTasks }) => {
  const [selected, setSelected] = useState(new Set());
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  // -------------------------------------------------------------------------
  // Task Breakdown
  // -------------------------------------------------------------------------
  if (type === 'breakdown') {
    const toggleSubtask = (i) => {
      setSelected((prev) => {
        const next = new Set(prev);
        next.has(i) ? next.delete(i) : next.add(i);
        return next;
      });
    };

    const handleAddSelected = () => {
      const tasks = data.subtasks.filter((_, i) => selected.has(i));
      onAddTasks(tasks);
      setSelected(new Set());
    };

    return (
      <div className="ai-response">
        <div className="ai-response-section">
          <div className="ai-section-label">AI-Generated Subtasks</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
            Select subtasks to add them to the project as tasks.
          </p>
          <div className="subtask-list">
            {(data.subtasks || []).map((subtask, i) => (
              <div
                key={i}
                className={`subtask-item ${selected.has(i) ? 'selected' : ''}`}
                onClick={() => toggleSubtask(i)}
                role="checkbox"
                aria-checked={selected.has(i)}
                tabIndex={0}
                onKeyDown={(e) => e.key === ' ' && toggleSubtask(i)}
              >
                <div className="subtask-checkbox">
                  {selected.has(i) && '✓'}
                </div>
                <span>{subtask}</span>
              </div>
            ))}
          </div>
          {selected.size > 0 && (
            <button
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
              onClick={handleAddSelected}
              id="add-selected-tasks-btn"
            >
              ➕ Add {selected.size} Task{selected.size !== 1 ? 's' : ''} to Project
            </button>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Code Explainer
  // -------------------------------------------------------------------------
  if (type === 'explain') {
    return (
      <div className="ai-response">
        <Section label="📖 Explanation" content={data.explanation} />
        <Section label="⚙️ Key Logic" content={data.keyLogic} />
        <Section label="⚠️ Potential Issues" content={data.potentialIssues} />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // AI Debugger
  // -------------------------------------------------------------------------
  if (type === 'debug') {
    return (
      <div className="ai-response">
        <div className="ai-disclaimer">
          <span>⚠️</span>
          <span>
            AI debugging suggestions are generated based on patterns and may not always be correct.
            Always review suggested fixes before applying them to production code.
          </span>
        </div>
        <Section label="🔍 Possible Cause" content={data.possibleCause} />
        <Section label="💡 Why It Happened" content={data.whyItHappened} />
        <Section label="🛠️ Suggested Fix" content={data.suggestedFix} />
        <CodeSection label="✅ Corrected Code" content={data.correctedCode} />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Documentation Generator
  // -------------------------------------------------------------------------
  if (type === 'docs') {
    const fullText = Object.entries(data)
      .map(([k, v]) => `## ${k.toUpperCase()}\n${v}`)
      .join('\n\n');

    const handleCopy = () => {
      navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="ai-response">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            id="copy-docs-btn"
          >
            {copied ? '✓ Copied!' : '📋 Copy All'}
          </button>
        </div>
        <Section label="📝 Description" content={data.description} />
        <Section label="🚀 Usage" content={data.usage} />
        <Section label="🔧 Parameters" content={data.parameters} />
        <Section label="⚙️ Setup" content={data.setup} />
        <Section label="📡 API Notes" content={data.apiNotes} />
        <CodeSection label="💻 Example" content={data.example} />
      </div>
    );
  }

  return null;
};

// Plain text section
const Section = ({ label, content }) => (
  <div className="ai-response-section">
    <div className="ai-section-label">{label}</div>
    <div className="ai-section-content">{content}</div>
  </div>
);

// Code block section
const CodeSection = ({ label, content }) => (
  <div className="ai-response-section">
    <div className="ai-section-label">{label}</div>
    <pre><code>{content}</code></pre>
  </div>
);

export default AIResponse;
