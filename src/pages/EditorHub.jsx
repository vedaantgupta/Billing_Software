import React from 'react';
import { useNavigate } from 'react-router-dom';
import './EditorHub.css';

const editors = [
  {
    id: 'spreadsheet',
    title: 'Spreadsheet',
    description: 'Powerful Excel-like grid with formulas & charts',
    route: '/editor/spreadsheet',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    bg: '#ecfdf5',
    iconBg: '#d1fae5',
    accent: '#059669',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
        <rect x="4" y="4" width="32" height="32" rx="4" fill="#10b981" opacity="0.15"/>
        <rect x="4" y="4" width="15" height="15" rx="2" fill="#10b981" opacity="0.5"/>
        <rect x="21" y="4" width="15" height="15" rx="2" fill="#10b981"/>
        <rect x="4" y="21" width="15" height="15" rx="2" fill="#10b981"/>
        <rect x="21" y="21" width="15" height="15" rx="2" fill="#10b981" opacity="0.5"/>
      </svg>
    ),
  },
  {
    id: 'text',
    title: 'Text Editor',
    description: 'Professional word processor with rich formatting',
    route: '/word-processor',
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    bg: '#eff6ff',
    iconBg: '#dbeafe',
    accent: '#2563eb',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
        <rect x="6" y="4" width="28" height="34" rx="3" fill="#3b82f6" opacity="0.15"/>
        <rect x="6" y="4" width="28" height="34" rx="3" stroke="#3b82f6" strokeWidth="1.5"/>
        <rect x="11" y="11" width="18" height="2.5" rx="1.25" fill="#3b82f6"/>
        <rect x="11" y="17" width="14" height="2.5" rx="1.25" fill="#3b82f6" opacity="0.7"/>
        <rect x="11" y="23" width="16" height="2.5" rx="1.25" fill="#3b82f6" opacity="0.7"/>
        <rect x="11" y="29" width="10" height="2.5" rx="1.25" fill="#3b82f6" opacity="0.5"/>
      </svg>
    ),
  },
  {
    id: 'presentation',
    title: 'Presentation',
    description: 'Create stunning slides with themes & animations',
    route: '/presentations',
    gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)',
    bg: '#faf5ff',
    iconBg: '#ede9fe',
    accent: '#7c3aed',
    svg: (
      <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
        <rect x="2" y="6" width="36" height="24" rx="3" fill="#a855f7" opacity="0.15"/>
        <rect x="2" y="6" width="36" height="24" rx="3" stroke="#a855f7" strokeWidth="1.5"/>
        <rect x="6" y="10" width="28" height="16" rx="2" fill="#a855f7" opacity="0.2"/>
        <polygon points="15,13 15,22 26,17.5" fill="#a855f7"/>
        <rect x="17" y="30" width="6" height="4" rx="1" fill="#a855f7" opacity="0.5"/>
        <rect x="12" y="34" width="16" height="2" rx="1" fill="#a855f7" opacity="0.4"/>
      </svg>
    ),
  },
];

export default function EditorHub() {
  const navigate = useNavigate();

  return (
    <div className="editor-hub">
      {/* Header */}
      <div className="editor-hub-header">
        <div className="editor-hub-header-text">
          <h1>Editor Suite</h1>
          <p>Choose a tool to create and edit your documents</p>
        </div>
      </div>

      <div className="editor-hub-divider" />

      {/* Section */}
      <div className="editor-hub-section-label">TOOLS</div>

      <div className="editor-hub-grid">
        {editors.map(editor => (
          <button
            key={editor.id}
            className="editor-hub-card"
            onClick={() => navigate(editor.route)}
          >
            <div className="editor-hub-card-accent" style={{ background: editor.gradient }} />
            <div className="editor-hub-card-icon" style={{ background: editor.iconBg }}>
              {editor.svg}
            </div>
            <div className="editor-hub-card-info">
              <div className="editor-hub-card-title" style={{ color: editor.accent }}>{editor.title}</div>
              <div className="editor-hub-card-desc">{editor.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Feature highlights */}
      <div className="editor-hub-features">
        <div className="editor-hub-feature">
          <div className="feature-dot" style={{ background: '#10b981' }} />
          <span>Formulas & pivot tables in Spreadsheet</span>
        </div>
        <div className="editor-hub-feature">
          <div className="feature-dot" style={{ background: '#3b82f6' }} />
          <span>Export to PDF & Word formats</span>
        </div>
        <div className="editor-hub-feature">
          <div className="feature-dot" style={{ background: '#a855f7' }} />
          <span>Export Presentation as .pptx</span>
        </div>
      </div>
    </div>
  );
}
