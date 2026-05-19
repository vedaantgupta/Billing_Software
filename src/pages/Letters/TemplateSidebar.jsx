import React, { useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { letterTemplates, letterCategories } from '../../data/letterTemplates';
import './TemplateSidebar.css';

const TemplateSidebar = ({ onSelectTemplate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredTemplates = letterTemplates.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="template-sidebar-container">
      <div className="sidebar-search-area">
        <h3 className="sidebar-sub-title">Letter Templates</h3>
        <div className="modern-search-box">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Search templates..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="category-scroll">
        <button 
          className={`cat-tab ${activeCategory === 'All' ? 'active' : ''}`} 
          onClick={() => setActiveCategory('All')}
        >
          All
        </button>
        {letterCategories.map(cat => (
          <button 
            key={cat}
            className={`cat-tab ${activeCategory === cat ? 'active' : ''}`} 
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="template-list-scroll">
        {filteredTemplates.map(tpl => (
          <div 
            key={tpl.id} 
            className="template-card-item"
            onClick={() => onSelectTemplate(tpl)}
          >
            <div className="template-card-icon">
              <FileText size={18} />
            </div>
            <div className="template-card-info">
              <h4 className="template-card-title">{tpl.title}</h4>
              <span className="template-card-cat">{tpl.category}</span>
            </div>
          </div>
        ))}
        {filteredTemplates.length === 0 && (
          <div className="no-templates-state">
            No templates found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateSidebar;
