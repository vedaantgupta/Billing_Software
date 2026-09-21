import React, { useState } from 'react';
import { HelpCircle, Check, X, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import '@/styles/AntigravityAI.css';

const AntigravityAskingModal = ({ question, onSubmit, onCancel }) => {
  const [selectedChip, setSelectedChip] = useState(null);
  const [customInput, setCustomInput] = useState('');

  if (!question || question.status === 'dismissed' || question.status === 'answered') {
    return null;
  }

  const handleSelectChip = (sug) => {
    if (selectedChip === sug) {
      setSelectedChip(null);
      setCustomInput('');
    } else {
      setSelectedChip(sug);
      setCustomInput(sug);
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const finalAnswer = customInput.trim() || selectedChip;
    if (!finalAnswer) return;
    onSubmit(finalAnswer);
  };

  return (
    <div className="antigravity-ask-card">
      <div className="ask-header">
        <span className="ask-badge">
          <Sparkles size={13} /> Clarification Needed
        </span>
        <button
          type="button"
          className="ask-cancel-btn"
          style={{ padding: '3px 8px', fontSize: '0.72rem' }}
          onClick={onCancel}
          title="Dismiss this request"
        >
          <X size={12} /> I don't want to create this
        </button>
      </div>

      <div className="ask-question-text">
        {question.question}
      </div>

      {/* Suggested Quick Options */}
      {Array.isArray(question.suggestions) && question.suggestions.length > 0 && (
        <div className="ask-suggestions-group">
          <span className="ask-suggestions-label">Quick Suggestions:</span>
          <div className="ask-chips-container">
            {question.suggestions.map((sug, i) => (
              <button
                key={i}
                type="button"
                className={`ask-chip-option ${selectedChip === sug ? 'selected' : ''}`}
                onClick={() => handleSelectChip(sug)}
              >
                {selectedChip === sug && <Check size={13} />}
                <span>{sug}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Answer Field */}
      <form onSubmit={handleSubmit} className="ask-input-box">
        <input
          type="text"
          className="ask-custom-input"
          placeholder="Type customer name, items, or details here..."
          value={customInput}
          onChange={(e) => {
            setCustomInput(e.target.value);
            if (selectedChip && e.target.value !== selectedChip) {
              setSelectedChip(null);
            }
          }}
        />

        <div className="ask-footer-actions">
          <button
            type="submit"
            className="ask-submit-btn"
            disabled={!customInput.trim() && !selectedChip}
          >
            <span>Submit & Proceed</span>
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            className="ask-cancel-btn"
            onClick={onCancel}
          >
            <X size={13} /> I don't want to create this
          </button>
        </div>
      </form>
    </div>
  );
};

export default AntigravityAskingModal;
