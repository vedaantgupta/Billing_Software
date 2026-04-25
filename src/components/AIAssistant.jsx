import React, { useState, useEffect, useRef } from 'react';
import './AIAssistant.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../hooks/useAuth';

const AIAssistant = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hello! I am your AI Business Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const quickActions = [
    "Check today's sales",
    "How to add a product?",
    "Generate monthly report",
    "Check low stock items"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (directInput = null) => {
    const textToSend = directInput || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: textToSend,
          history: messages,
          userId: user?.id
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setMessages(prev => [...prev, { role: 'ai', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error. Please try again later.' }]);
      }
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { role: 'ai', content: 'Connection error. Make sure the backend server is running.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="ai-assistant-container">
      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <h3>
              <div className="ai-status-dot"></div>
              AI Assistant
            </h3>
            <button 
              onClick={() => setIsOpen(false)} 
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}
            >
              &times;
            </button>
          </div>
          
          <div className="ai-chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                {msg.role === 'ai' ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            ))}
            
            {!isLoading && messages.length === 1 && (
              <div className="quick-actions">
                {quickActions.map((action, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSend(action)} 
                    className="action-chip"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
            
            {isLoading && (
              <div className="ai-typing">
                Assistant is thinking...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chat-input-area">
            <input
              type="text"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <button 
              className="ai-send-btn" 
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <button 
        className={`ai-toggle-btn ${isOpen ? 'active' : ''}`} 
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '✕' : 'AI'}
      </button>
    </div>
  );
};

export default AIAssistant;
