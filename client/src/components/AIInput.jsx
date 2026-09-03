/**
 * AIInput — reusable input panel for AI tool forms.
 *
 * Props:
 *   fields    — array of { name, label, type, placeholder, options }
 *               type: 'text' | 'textarea' | 'select' | 'code'
 *   values    — object { fieldName: value }
 *   onChange  — (name, value) => void
 *   onSubmit  — () => void
 *   isLoading — boolean
 *   submitLabel — string (default: "Ask AI")
 */
const AIInput = ({ fields, values, onChange, onSubmit, isLoading, submitLabel = 'Ask AI ✦' }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit}>
      {fields.map((field) => (
        <div className="form-group" key={field.name}>
          <label className="form-label" htmlFor={`ai-input-${field.name}`}>
            {field.label}
          </label>

          {field.type === 'select' ? (
            <select
              id={`ai-input-${field.name}`}
              className="form-select"
              value={values[field.name] || ''}
              onChange={(e) => onChange(field.name, e.target.value)}
            >
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : field.type === 'code' || field.type === 'textarea' ? (
            <textarea
              id={`ai-input-${field.name}`}
              className="form-textarea"
              value={values[field.name] || ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              rows={field.rows || 6}
              style={field.type === 'code' ? { fontFamily: 'var(--font-mono)', fontSize: '0.85rem' } : {}}
            />
          ) : (
            <input
              id={`ai-input-${field.name}`}
              type="text"
              className="form-input"
              value={values[field.name] || ''}
              onChange={(e) => onChange(field.name, e.target.value)}
              placeholder={field.placeholder}
            />
          )}
        </div>
      ))}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={isLoading}
        id="ai-submit-btn"
        style={{ minWidth: '140px' }}
      >
        {isLoading ? (
          <>
            <span className="spinner spinner-sm" />
            Thinking...
          </>
        ) : submitLabel}
      </button>
    </form>
  );
};

export default AIInput;
