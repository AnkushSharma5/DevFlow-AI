import { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { createTask } from '../services/api';
import Navbar from '../components/Navbar';
import AIInput from '../components/AIInput';
import AIResponse from '../components/AIResponse';
import { aiBreakdown, aiExplain, aiDebug, aiDocs } from '../services/api';

/**
 * AITools page — tabbed interface for all 4 AI features.
 *
 * Tabs: Task Breakdown | Code Explainer | AI Debugger | Doc Generator
 */

const LANGUAGE_OPTIONS = [
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'TypeScript', label: 'TypeScript' },
  { value: 'Python', label: 'Python' },
  { value: 'Java', label: 'Java' },
  { value: 'C++', label: 'C++' },
  { value: 'C#', label: 'C#' },
  { value: 'Go', label: 'Go' },
  { value: 'Rust', label: 'Rust' },
  { value: 'Ruby', label: 'Ruby' },
  { value: 'PHP', label: 'PHP' },
  { value: 'Swift', label: 'Swift' },
  { value: 'Kotlin', label: 'Kotlin' },
  { value: 'SQL', label: 'SQL' },
  { value: 'Bash', label: 'Bash/Shell' },
];

const TABS = [
  { id: 'breakdown', label: '🗂️ Task Breakdown',    icon: '🗂️' },
  { id: 'explain',   label: '📖 Code Explainer',    icon: '📖' },
  { id: 'debug',     label: '🐛 AI Debugger',       icon: '🐛' },
  { id: 'docs',      label: '📝 Doc Generator',     icon: '📝' },
];

const AITools = () => {
  const { projects } = useProjects();
  const [activeTab, setActiveTab] = useState('breakdown');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState(null);

  // Form values per tab
  const [breakdownForm, setBreakdownForm] = useState({ description: '', projectId: '' });
  const [explainForm, setExplainForm]     = useState({ language: 'JavaScript', code: '' });
  const [debugForm, setDebugForm]         = useState({ language: 'JavaScript', code: '', errorMessage: '' });
  const [docsForm, setDocsForm]           = useState({ input: '', type: 'code' });

  const setterMap = {
    breakdown: setBreakdownForm,
    explain:   setExplainForm,
    debug:     setDebugForm,
    docs:      setDocsForm,
  };

  const formMap = {
    breakdown: breakdownForm,
    explain:   explainForm,
    debug:     debugForm,
    docs:      docsForm,
  };

  const handleChange = (name, value) => {
    setterMap[activeTab]((prev) => ({ ...prev, [name]: value }));
  };

  // Clear response when switching tabs
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setResponse(null);
    setError('');
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');
    setResponse(null);
    try {
      let res;
      if (activeTab === 'breakdown') {
        res = await aiBreakdown(breakdownForm.description);
      } else if (activeTab === 'explain') {
        res = await aiExplain(explainForm.language, explainForm.code);
      } else if (activeTab === 'debug') {
        res = await aiDebug(debugForm.language, debugForm.code, debugForm.errorMessage);
      } else if (activeTab === 'docs') {
        res = await aiDocs(docsForm.input, docsForm.type);
      }
      setResponse(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'AI request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add selected subtasks as tasks to the selected project
  const handleAddTasks = async (subtasks) => {
    if (!breakdownForm.projectId) {
      alert('Please select a project to add tasks to.');
      return;
    }
    try {
      await Promise.all(
        subtasks.map((title) =>
          createTask({ title, status: 'TODO', priority: 'MEDIUM', projectId: breakdownForm.projectId })
        )
      );
      alert(`✅ Added ${subtasks.length} task${subtasks.length !== 1 ? 's' : ''} to the project!`);
    } catch {
      alert('Failed to add some tasks. Please try again.');
    }
  };

  // Field configs per tab
  const projectOptions = projects.map((p) => ({ value: p._id, label: p.name }));

  const fieldsMap = {
    breakdown: [
      {
        name: 'description',
        label: 'Task or Feature Description',
        type: 'textarea',
        placeholder: 'Describe the feature or task you want to break down...\n\nExample: "Build a user authentication system with JWT tokens, bcrypt password hashing, and protected API routes"',
        rows: 5,
      },
      ...(projects.length > 0 ? [{
        name: 'projectId',
        label: 'Add Tasks to Project (optional)',
        type: 'select',
        options: [{ value: '', label: 'Select a project...' }, ...projectOptions],
      }] : []),
    ],
    explain: [
      {
        name: 'language',
        label: 'Programming Language',
        type: 'select',
        options: LANGUAGE_OPTIONS,
      },
      {
        name: 'code',
        label: 'Code Snippet',
        type: 'code',
        placeholder: 'Paste the code you want explained...',
        rows: 10,
      },
    ],
    debug: [
      {
        name: 'language',
        label: 'Programming Language',
        type: 'select',
        options: LANGUAGE_OPTIONS,
      },
      {
        name: 'code',
        label: 'Code with the Bug',
        type: 'code',
        placeholder: 'Paste the code that is producing the error...',
        rows: 8,
      },
      {
        name: 'errorMessage',
        label: 'Error Message / Stack Trace',
        type: 'textarea',
        placeholder: 'Paste the full error message or stack trace here...',
        rows: 4,
      },
    ],
    docs: [
      {
        name: 'type',
        label: 'Documentation Type',
        type: 'select',
        options: [
          { value: 'code', label: 'Code Documentation' },
          { value: 'project', label: 'Project Documentation' },
        ],
      },
      {
        name: 'input',
        label: docsForm.type === 'project' ? 'Project Description' : 'Code to Document',
        type: docsForm.type === 'code' ? 'code' : 'textarea',
        placeholder: docsForm.type === 'project'
          ? 'Describe your project — what it does, the tech stack, main features...'
          : 'Paste the code you want to generate documentation for...',
        rows: 10,
      },
    ],
  };

  const tabDescriptions = {
    breakdown: 'Describe a feature or task and AI will break it down into ordered, actionable subtasks you can add directly to a project.',
    explain:   'Paste any code snippet and get a structured explanation: what it does, how the key logic works, and potential issues.',
    debug:     'Paste your buggy code and error message — AI will diagnose the cause, explain why it happened, and suggest a fix.',
    docs:      'Generate professional structured documentation for any code snippet or project description.',
  };

  return (
    <>
      <Navbar title="AI Tools" />
      <main className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">AI Developer Tools ✦</h1>
            <p className="page-subtitle">Powered by Google Gemini AI — your coding co-pilot</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="ai-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`ai-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabSwitch(tab.id)}
              id={`ai-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="ai-panel">
          <div className="ai-panel-desc">{tabDescriptions[activeTab]}</div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>{error}</div>
          )}

          <AIInput
            fields={fieldsMap[activeTab]}
            values={formMap[activeTab]}
            onChange={handleChange}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            submitLabel={`Ask AI ✦`}
          />

          {response && (
            <>
              <hr className="divider" />
              <AIResponse
                type={activeTab}
                data={response}
                onAddTasks={handleAddTasks}
              />
            </>
          )}
        </div>
      </main>
    </>
  );
};

export default AITools;
