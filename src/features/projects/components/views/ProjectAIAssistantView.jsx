import React, { useState } from 'react';
import {
  Sparkles, ListPlus, Calendar, AlertOctagon, HelpCircle,
  Send, CheckCircle2, ArrowRight, Clock, Plus, Layers
} from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';
import { API_BASE_URL } from '@/config/api';

const ProjectAIAssistantView = () => {
  const {
    activeProject,
    tasks,
    milestones,
    projectHealth,
    addTask,
    refreshAllData
  } = useProject();

  const [activeMode, setActiveMode] = useState('summary'); // 'summary', 'breakdown', 'scheduling', 'risks', 'qa'
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState('');
  const [breakdownTasks, setBreakdownTasks] = useState([]);
  const [breakdownPrompt, setBreakdownPrompt] = useState('');
  const [qaPrompt, setQaPrompt] = useState('');
  const [qaHistory, setQaHistory] = useState([]);

  const callProjectCopilot = async (mode, prompt = '') => {
    setLoading(true);
    setResultText('');
    setBreakdownTasks([]);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/project-copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          prompt,
          projectContext: {
            project: activeProject,
            tasks: tasks.slice(0, 35),
            milestones,
            health: projectHealth
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setResultText(data.response);

        if (mode === 'breakdown') {
          try {
            // Attempt to parse structured JSON tasks from response
            const jsonStart = data.response.indexOf('[');
            const jsonEnd = data.response.lastIndexOf(']');
            if (jsonStart !== -1 && jsonEnd !== -1) {
              const parsed = JSON.parse(data.response.substring(jsonStart, jsonEnd + 1));
              if (Array.isArray(parsed)) setBreakdownTasks(parsed);
            }
          } catch (e) {
            console.warn('Could not parse JSON tasks array from breakdown:', e);
          }
        }
      }
    } catch (err) {
      console.error('Project copilot error:', err);
      setResultText('Error communicating with AI Copilot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBreakdownTasks = async () => {
    if (!breakdownTasks.length) return;
    for (const item of breakdownTasks) {
      await addTask({
        name: item.name || item.title,
        type: item.type || 'Task',
        priority: item.priority || 'Medium',
        estimatedHours: item.estimatedHours || 8,
        subtasks: item.subtasks || []
      });
    }
    setBreakdownTasks([]);
    setResultText(`Successfully added ${breakdownTasks.length} tasks to ${activeProject?.name}!`);
    refreshAllData();
  };

  const handleSendQa = async (e) => {
    e.preventDefault();
    if (!qaPrompt.trim() || loading) return;

    const userQ = qaPrompt.trim();
    setQaPrompt('');
    setQaHistory(prev => [...prev, { role: 'user', content: userQ }]);

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/ai/project-copilot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'qa',
          prompt: userQ,
          projectContext: {
            project: activeProject,
            tasks: tasks.slice(0, 35),
            milestones,
            health: projectHealth
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setQaHistory(prev => [...prev, { role: 'ai', content: data.response }]);
      }
    } catch (err) {
      setQaHistory(prev => [...prev, { role: 'ai', content: 'Unable to process question. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 1.75rem' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Sparkles size={22} color="#4f46e5" /> AI Project Copilot
        </h2>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
          Grounded project intelligence powered by live tasks, milestones, dependencies, and health metrics
        </p>
      </div>

      {/* Mode Switcher Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          className={`pm-btn ${activeMode === 'summary' ? 'pm-btn-primary' : 'pm-btn-secondary'}`}
          onClick={() => {
            setActiveMode('summary');
            callProjectCopilot('summary');
          }}
        >
          <Sparkles size={16} /> Project Summary
        </button>

        <button
          className={`pm-btn ${activeMode === 'breakdown' ? 'pm-btn-primary' : 'pm-btn-secondary'}`}
          onClick={() => {
            setActiveMode('breakdown');
            setResultText('');
          }}
        >
          <ListPlus size={16} /> Task Breakdown
        </button>

        <button
          className={`pm-btn ${activeMode === 'scheduling' ? 'pm-btn-primary' : 'pm-btn-secondary'}`}
          onClick={() => {
            setActiveMode('scheduling');
            callProjectCopilot('scheduling');
          }}
        >
          <Calendar size={16} /> Scheduling Assistant
        </button>

        <button
          className={`pm-btn ${activeMode === 'risks' ? 'pm-btn-primary' : 'pm-btn-secondary'}`}
          onClick={() => {
            setActiveMode('risks');
            callProjectCopilot('risks');
          }}
        >
          <AlertOctagon size={16} /> Risk Detection
        </button>

        <button
          className={`pm-btn ${activeMode === 'qa' ? 'pm-btn-primary' : 'pm-btn-secondary'}`}
          onClick={() => setActiveMode('qa')}
        >
          <HelpCircle size={16} /> Project Q&A
        </button>
      </div>

      {/* Sub-view: TASK BREAKDOWN INPUT */}
      {activeMode === 'breakdown' && (
        <div className="pm-card" style={{ background: '#f8fafc', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase' }}>
            AI Task Breakdown Generator
          </span>
          <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '0.25rem 0 0.75rem' }}>
            Type a high-level goal or feature (e.g. "Implement user authentication with Google and password reset")
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="pm-search-input"
              placeholder="Describe feature or milestone objective to decompose..."
              value={breakdownPrompt}
              onChange={e => setBreakdownPrompt(e.target.value)}
            />
            <button
              className="pm-btn pm-btn-primary"
              onClick={() => callProjectCopilot('breakdown', breakdownPrompt)}
              disabled={loading || !breakdownPrompt.trim()}
            >
              <Sparkles size={16} /> {loading ? 'Decomposing...' : 'Generate Tasks'}
            </button>
          </div>
        </div>
      )}

      {/* Breakdown Task Review Section */}
      {breakdownTasks.length > 0 && (
        <div className="pm-card" style={{ border: '1px solid #c7d2fe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Suggested Tasks ({breakdownTasks.length})</h3>
            <button className="pm-btn pm-btn-primary pm-btn-sm" onClick={handleAddBreakdownTasks}>
              <Plus size={14} /> Add All {breakdownTasks.length} Tasks to Project
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {breakdownTasks.map((t, idx) => (
              <div key={idx} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{t.name || t.title}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{t.estimatedHours || 8}h • Priority: {t.priority || 'Medium'}</span>
                </div>
                {t.subtasks && t.subtasks.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', paddingLeft: '0.5rem' }}>
                    Subtasks: {t.subtasks.map(s => s.title).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <div className="animate-spin" style={{ width: '28px', height: '28px', border: '3px solid #cbd5e1', borderTopColor: '#4f46e5', borderRadius: '50%', margin: '0 auto 1rem' }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>AI Copilot is analyzing live project context...</span>
        </div>
      )}

      {/* Result Display (Summary, Risks, Scheduling) */}
      {!loading && resultText && activeMode !== 'qa' && (
        <div className="pm-card" style={{ background: '#ffffff', padding: '1.75rem', lineHeight: 1.7, fontSize: '0.925rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
          {resultText}
        </div>
      )}

      {/* Sub-view: PROJECT Q&A */}
      {activeMode === 'qa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Preset Questions */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['What is blocking this project?', 'What tasks are due this week?', 'Are there any overdue tasks?', 'How much budget remains?'].map(q => (
              <button
                key={q}
                className="pm-btn pm-btn-ghost pm-btn-sm"
                style={{ background: '#f1f5f9', fontSize: '0.75rem' }}
                onClick={() => {
                  setQaPrompt(q);
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', minHeight: '260px', maxHeight: '420px', overflowY: 'auto', background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            {qaHistory.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.role === 'user' ? '#4f46e5' : '#ffffff',
                  color: msg.role === 'user' ? '#ffffff' : '#1e293b',
                  padding: '0.85rem 1.15rem',
                  borderRadius: msg.role === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {msg.content}
              </div>
            ))}

            {qaHistory.length === 0 && (
              <div style={{ textAlign: 'center', margin: 'auto', color: '#94a3b8', fontSize: '0.85rem' }}>
                Ask anything about deadlines, blockers, budgets, or assignees in {activeProject?.name}.
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendQa} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="pm-search-input"
              placeholder="Ask a question grounded in this project's real data..."
              value={qaPrompt}
              onChange={e => setQaPrompt(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="pm-btn pm-btn-primary" disabled={!qaPrompt.trim() || loading}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

    </div>
  );
};

export default ProjectAIAssistantView;
