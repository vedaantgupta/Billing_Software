import React from 'react';
import { letterSnippets } from '@/features/letters/pages/letterSnippets';
import '@/features/letters/styles/SnippetPanel.css';

const SnippetPanel = ({ onInsertSnippet }) => {
  return (
    <div className="snippet-panel">
      <h3>Quick Snippets</h3>
      <p className="snippet-help">Click to insert predefined content blocks.</p>
      <div className="snippets-list">
        {letterSnippets.map(s => (
          <button 
            key={s.id} 
            className="snippet-item"
            onClick={() => onInsertSnippet(s.content)}
          >
            <span>{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SnippetPanel;
