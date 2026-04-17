import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Package, BarChart3, Settings as SettingsIcon, Bell, Search, LogOut, CreditCard, ChevronDown, ChevronRight, UserCog, Wallet } from 'lucide-react';
import './Layout.css';
import { getDB } from '../utils/db';

import { useAuth } from '../hooks/useAuth';

const Layout = ({ children, noWrapper = false, extended = false }) => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isExpensesOpen, setIsExpensesOpen] = useState(false);
  const navigate = useNavigate();
  const companyInfo = getDB().company || { name: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Admin User' };
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // ⭐ THIS STOPS REFRESH

      if (searchQuery.trim()) {
        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      }
    }
  };

  return (
    <div className="layout-container">
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">GB</div>
          <h2>GoGSTBill<span style={{ color: 'var(--primary-color)' }}>.pro</span></h2>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          <NavLink to="/documents" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <FileText size={20} /> Documents
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <Package size={20} /> Inventory
          </NavLink>
          <NavLink to="/contacts" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <Users size={20} /> Contacts
          </NavLink>
          <NavLink to="/staff" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <UserCog size={20} /> Staff
          </NavLink>
          <NavLink to="/ledger" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <CreditCard size={20} /> Digital Ledger
          </NavLink>


          <div className="nav-group">
            <button className={`nav-item ${isPaymentOpen ? 'group-active' : ''}`} onClick={() => setIsPaymentOpen(!isPaymentOpen)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
              <CreditCard size={20} /> Payment
              <span style={{ marginLeft: 'auto' }}>{isPaymentOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
            </button>
            {isPaymentOpen && (
              <div className="nav-sub-menu">
                <NavLink to="/payments/inward" className={({ isActive }) => isActive ? "nav-sub-item active" : "nav-sub-item"}>
                  Inward Payment
                </NavLink>
                <NavLink to="/payments/outward" className={({ isActive }) => isActive ? "nav-sub-item active" : "nav-sub-item"}>
                  Outward Payment
                </NavLink>
                <NavLink to="/payments/profit-loss" className={({ isActive }) => isActive ? "nav-sub-item active" : "nav-sub-item"}>
                  Profit & Loss Overview
                </NavLink>
              </div>
            )}
          </div>

          <div className="nav-group">
            <button className={`nav-item ${isExpensesOpen ? 'group-active' : ''}`} onClick={() => setIsExpensesOpen(!isExpensesOpen)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Wallet size={20} /> Income & Expenses
              <span style={{ marginLeft: 'auto' }}>{isExpensesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
            </button>
            {isExpensesOpen && (
              <div className="nav-sub-menu">
                <NavLink to="/expenses/daily" className={({ isActive }) => isActive ? "nav-sub-item active" : "nav-sub-item"}>
                  Daily Expenses
                </NavLink>
                <NavLink to="/income/other" className={({ isActive }) => isActive ? "nav-sub-item active" : "nav-sub-item"}>
                  Other Income
                </NavLink>
              </div>
            )}
          </div>

          <NavLink to="/reports" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <BarChart3 size={20} /> Reports
          </NavLink>
          <NavLink to="/compliance" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <FileText size={20} /> Compliance
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <SettingsIcon size={20} /> Settings
          </NavLink>
        </nav>
      </div>

      <div className="main-content">
        <header className="topbar glass" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="search-bar" style={{ flex: 1, position: 'relative' }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search invoices, products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Bell size={20} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} />

            <div className="user-profile" style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowDropdown(!showDropdown)}>
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(companyInfo.name)}&background=0D8ABC&color=fff`} alt="User" style={{ width: '32px', borderRadius: '50%' }} />
              <span style={{ fontWeight: 600 }}>{companyInfo.name}</span>

              {showDropdown && (
                <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '10px', background: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', minWidth: '220px', zIndex: 1000, overflow: 'hidden' }}>
                  <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: '#f8fafc' }}>
                    <p style={{ margin: 0, fontWeight: 600 }}>{user?.firstName ? `${user.firstName} ${user.lastName}` : (companyInfo.name || 'Admin User')}</p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user?.email || 'Super Admin'}</p>
                  </div>
                  <div style={{ padding: '0.5rem' }}>
                    <button className="btn" style={{ width: '100%', textAlign: 'left', display: 'flex', gap: '8px', color: 'var(--text-main)', padding: '0.5rem', background: 'transparent', border: 'none' }} onClick={() => navigate('/settings')}>
                      <SettingsIcon size={16} /> Edit Profile & Settings
                    </button>
                    <button onClick={handleLogout} className="btn btn-danger" style={{ width: '100%', textAlign: 'left', display: 'flex', gap: '8px', marginTop: '0.25rem', padding: '0.5rem', background: '#fef2f2', color: '#dc2626', border: 'none' }}>
                      <LogOut size={16} /> Secure Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content-area">
          {noWrapper ? (
            children
          ) : (
            <div className={`page-container glass ${extended ? 'extended' : ''}`} style={{ padding: extended ? '1.5rem' : '2.5rem', minHeight: '100%', maxWidth: extended ? 'none' : '1400px' }}>
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Layout;
