import React from 'react';
import { Link } from 'react-router-dom';
import './AuthLayout.css';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-blob blob-1"></div>
        <div className="auth-blob blob-2"></div>
        <div className="auth-blob blob-3"></div>
      </div>
      
      <div className="auth-content">
        <div className="auth-card glass">
          <div className="auth-header text-center">
            <div className="auth-logo">
              <div className="logo-icon">BG</div>
              <span className="logo-text">BillGenius</span>
            </div>
            {title && <h1>{title}</h1>}
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </div>
          
          <div className="auth-body">
            {children}
          </div>
          
          <div className="auth-footer">
            <p>&copy; 2024 BillGenius. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
