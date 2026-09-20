import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Plus, Briefcase, CheckSquare, Play, Square,
  BarChart3, Calendar, ShieldAlert, Sparkles, X, ArrowRight
} from 'lucide-react';
import { useProject } from '@/features/projects/context/ProjectContext';
import { useNavigate } from 'react-router-dom';

const CommandPalette = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setIsTaskModalOpen,
    projects,
    tasks,
    setSelectedTaskForDrawer,
    activeTimer,
    startTimer,
    stopTimer
  } = useProject();

  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Toggle on Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setQuery('');
    }
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  // Built-in Commands
  const staticCommands = [
    {
      id: 'cmd-new-task',
      title: 'Create New Task',
      subtitle: 'Add a new task with assignees & dates',
      icon: <Plus size={16} color="#4f46e5" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        setIsTaskModalOpen(true);
      }
    },
    {
      id: 'cmd-my-work',
      title: 'Go to My Work',
      subtitle: 'View your assigned and overdue tasks',
      icon: <CheckSquare size={16} color="#10b981" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate('/projects?view=mywork');
      }
    },
    {
      id: 'cmd-portfolio',
      title: 'Open Portfolio Overview',
      subtitle: 'Cross-project analytics & health rollup',
      icon: <BarChart3 size={16} color="#8b5cf6" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        navigate('/projects?view=portfolio');
      }
    },
    {
      id: 'cmd-timer',
      title: activeTimer?.isRunning ? 'Stop Active Timer' : 'Start Timer for First Task',
      subtitle: activeTimer?.isRunning ? `Recording: ${activeTimer.taskName}` : 'Begin time logging',
      icon: activeTimer?.isRunning ? <Square size={16} color="#ef4444" /> : <Play size={16} color="#10b981" />,
      action: () => {
        setIsCommandPaletteOpen(false);
        if (activeTimer?.isRunning) {
          stopTimer();
        } else if (tasks[0]) {
          startTimer(tasks[0]);
        }
      }
    }
  ];

  // Search Results
  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(query.toLowerCase()) ||
    p.projectId?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 4).map(p => ({
    id: `proj-${p.id || p._dbId}`,
    title: `Open Project: ${p.name}`,
    subtitle: `${p.projectId || 'PRJ'} • ${p.status}`,
    icon: <Briefcase size={16} color="#4f46e5" />,
    action: () => {
      setIsCommandPaletteOpen(false);
      navigate(`/projects/${p._dbId || p.id}`);
    }
  }));

  const filteredTasks = tasks.filter(t =>
    t.name?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5).map(t => ({
    id: `task-${t.id || t._dbId}`,
    title: `Task: ${t.name}`,
    subtitle: `${t.status} • Priority: ${t.priority}`,
    icon: <CheckSquare size={16} color="#64748b" />,
    action: () => {
      setIsCommandPaletteOpen(false);
      setSelectedTaskForDrawer(t);
    }
  }));

  const allItems = query.trim()
    ? [...filteredProjects, ...filteredTasks, ...staticCommands.filter(c => c.title.toLowerCase().includes(query.toLowerCase()))]
    : [...staticCommands, ...filteredProjects];

  const handleSelect = (item) => {
    if (item && item.action) item.action();
  };

  const handleKeyDownList = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) handleSelect(allItems[selectedIndex]);
    }
  };

  return (
    <div className="pm-palette-backdrop" onClick={() => setIsCommandPaletteOpen(false)}>
      <div className="pm-palette-modal" onClick={e => e.stopPropagation()}>
        <div className="pm-palette-input-row">
          <Search size={18} color="#94a3b8" />
          <input
            ref={inputRef}
            className="pm-palette-input"
            placeholder="Type a command or search tasks and projects..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownList}
          />
          <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.2rem 0.45rem', borderRadius: '6px', background: '#f1f5f9', color: '#64748b' }}>
            ESC
          </span>
        </div>

        <div className="pm-palette-results">
          {allItems.map((item, idx) => (
            <div
              key={item.id || idx}
              className={`pm-palette-item ${idx === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.4rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{item.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.subtitle}</div>
                </div>
              </div>
              <ArrowRight size={14} color="#94a3b8" />
            </div>
          ))}

          {allItems.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem' }}>
              No commands or items found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
