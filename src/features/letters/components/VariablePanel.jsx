import React from 'react';
import { availableVariables } from '@/features/letters/pages/letterVariables';
import '@/features/letters/styles/VariablePanel.css';

const VariablePanel = ({ onInsertVariable }) => {
  return (
    <div className="variable-panel">
      <h3>Variables</h3>
      <p className="variable-help">Click to insert a variable into the editor at cursor position.</p>
      <div className="variables-grid">
        {availableVariables.map(v => (
          <button 
            key={v.id} 
            className="variable-btn"
            onClick={() => onInsertVariable(`{{${v.id}}}`)}
            title={v.id}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default VariablePanel;
