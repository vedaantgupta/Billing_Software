import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Package, BarChart3, Settings as SettingsIcon, Bell, Search, LogOut, CreditCard, ChevronDown, ChevronRight, UserCog, Wallet, Banknote, Landmark, History, Moon, Sun } from 'lucide-react';
import './Layout.css';
import AIAssistant from './AIAssistant';
import { getDB, getItems } from '../utils/db';
import { useTheme } from '../contexts/ThemeContext';

import { useAuth } from '../hooks/useAuth';

const Layout = ({ children, noWrapper = false, extended = false }) => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isExpensesOpen, setIsExpensesOpen] = useState(false);
  const navigate = useNavigate();
  const companyInfo = getDB().company || { name: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Admin User' };
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim().length < 1) {
        setSearchResults([]);
        setShowSearchDropdown(false);
        return;
      }

      setIsSearching(true);
      setShowSearchDropdown(true);

      try {
        const [docs, prods, cons] = await Promise.all([
          getItems('documents', user.id),
          getItems('products', user.id),
          getItems('contacts', user.id)
        ]);

        const query = searchQuery.toLowerCase();
        const results = [];

        // Search Docs
        docs.filter(d => d.customerName?.toLowerCase().includes(query) || d.invoiceNumber?.toLowerCase().includes(query))
          .slice(0, 3).forEach(d => results.push({ type: 'Document', title: `${d.docType} #${d.invoiceNumber}`, subtitle: d.customerName, path: `/documents/${d.docType?.toLowerCase().replace(' ', '-')}/edit/${d.id}`, icon: <FileText size={16} /> }));

        // Search Products
        prods.filter(p => p.name?.toLowerCase().includes(query) || p.code?.toLowerCase().includes(query))
          .slice(0, 3).forEach(p => results.push({ type: 'Product', title: p.name, subtitle: `Code: ${p.code}`, path: `/products/${p.id}`, icon: <Package size={16} /> }));

        // Search Contacts
        cons.filter(c => c.name?.toLowerCase().includes(query) || c.phone?.toLowerCase().includes(query))
          .slice(0, 3).forEach(c => results.push({ type: 'Contact', title: c.name, subtitle: c.phone, path: `/contacts/${c.id}`, icon: <Users size={16} /> }));

        setSearchResults(results);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim()) {
        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
        setShowSearchDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowSearchDropdown(false);
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
          <NavLink to="/loans" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <Banknote size={20} /> Loan Manager
          </NavLink>
          <NavLink to="/banks" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            <Landmark size={20} /> Bank Accounts
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
          <NavLink
            to="/history"
            className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
          >
            <History size={20} /> History
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
          <div className="search-bar" ref={searchRef} style={{ flex: 1, position: 'relative' }}>
            <Search size={18} className="search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Search documents, products, contacts, loans, banks, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              onFocus={() => searchQuery.length >= 1 && setShowSearchDropdown(true)}
            />
            <div className="search-shortcut">
              <kbd>Ctrl</kbd>
              <span>+</span>
              <kbd>K</kbd>
            </div>

            {showSearchDropdown && (
              <div className="search-dropdown glass">
                {isSearching ? (
                  <div className="search-status">Searching...</div>
                ) : searchResults.length > 0 ? (
                  <div className="search-results-list">
                    {searchResults.map((result, idx) => (
                      <div
                        key={idx}
                        className="search-result-item"
                        onClick={() => {
                          navigate(result.path);
                          setSearchQuery('');
                          setShowSearchDropdown(false);
                        }}
                      >
                        <div className="result-icon">{result.icon}</div>
                        <div className="result-info">
                          <p className="result-title">{result.title}</p>
                          <p className="result-subtitle">{result.subtitle}</p>
                        </div>
                        <span className="result-type">{result.type}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="search-status">No matches found</div>
                )}
              </div>
            )}
          </div>
          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={toggleTheme}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                padding: '8px',
                borderRadius: '50%',
                transition: 'background 0.2s'
              }}
              className="theme-toggle"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <Bell size={20} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }} />

            <div className="user-profile" style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowDropdown(!showDropdown)}>
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(companyInfo.name)}&background=0D8ABC&color=fff`} alt="User" style={{ width: '32px', borderRadius: '50%' }} />
              <span style={{ fontWeight: 600 }}>{companyInfo.name}</span>

              {showDropdown && (
                <div className="user-dropdown-menu">
                  <div className="user-dropdown-header">
                    <p className="user-name">{user?.firstName ? `${user.firstName} ${user.lastName}` : (companyInfo.name || 'Admin User')}</p>
                    <p className="user-email">{user?.email || 'Super Admin'}</p>
                  </div>
                  <div className="user-dropdown-body">
                    <button className="dropdown-item" onClick={() => navigate('/settings')}>
                      <SettingsIcon size={16} /> Edit Profile & Settings
                    </button>
                    <button onClick={handleLogout} className="dropdown-item logout">
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
      <AIAssistant />
    </div>
  );
};

export default Layout;
