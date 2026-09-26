import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Sparkles, Users, FileText, Package, BarChart3, Settings as SettingsIcon, 
  Bell, Search, LogOut, CreditCard, ChevronDown, ChevronRight, ChevronLeft, UserCog, Wallet, 
  Banknote, Landmark, History, Briefcase, Video, Globe, FileEdit, IdCard, ShoppingBag,
  MessageSquareShare, Menu, X, Plus, ArrowDownLeft, ArrowUpRight, CheckCircle2,
  FilePlus, ShoppingCart, UserPlus, PackagePlus, Receipt, TrendingUp, Check
} from 'lucide-react';
import '@/components/layout/Layout.css';
import AIAssistant from '@/features/dashboard/components/AIAssistant';
import GeminiStarLogo from '@/components/ai/GeminiStarLogo';
import { getDB, getItems } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';

const Layout = ({ children, noWrapper = false, extended = false }) => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isExpensesOpen, setIsExpensesOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('bb_sidebar_collapsed') === 'true';
  });

  // Mobile App Experience States
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [showMobileActionSheet, setShowMobileActionSheet] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const companyInfo = getDB().company || { name: user?.firstName ? `${user.firstName} ${user.lastName}` : (user?.username || 'BaniyaBook Merchant') };
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const createMenuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const notificationsMenuRef = useRef(null);

  // Load Real Notifications from Database & Business Context
  const loadRealNotifications = async () => {
    try {
      setIsLoadingNotifs(true);
      const readIds = JSON.parse(localStorage.getItem(`bb_read_notifs_${user?.id || 'default'}`) || '[]');
      const dismissedIds = JSON.parse(localStorage.getItem(`bb_dismissed_notifs_${user?.id || 'default'}`) || '[]');

      const [docs, prods, logs, projNotifs] = await Promise.all([
        user?.id ? getItems('documents', user.id).catch(() => []) : [],
        user?.id ? getItems('products', user.id).catch(() => []) : [],
        user?.id ? getItems('activityLogs', user.id).catch(() => []) : [],
        user?.id ? getItems('project_notifications', user.id).catch(() => []) : []
      ]);

      const items = [];

      // 1. Low Stock & Out of Stock Alerts (Real Products)
      if (prods && prods.length > 0) {
        prods.forEach(p => {
          const stock = Number(p.stock ?? 0);
          const min = Number(p.minStock || 5);
          if (stock <= min) {
            items.push({
              id: `stock-${p._dbId || p.id || p.code || p.name}`,
              type: 'stock',
              title: stock <= 0 ? `Out of Stock: ${p.name}` : `Low Stock: ${p.name}`,
              message: stock <= 0 ? `0 units remaining in inventory. Urgent restock recommended.` : `Only ${stock} units left (Min threshold: ${min}).`,
              path: `/products`,
              badge: stock <= 0 ? 'red' : 'amber',
              badgeText: stock <= 0 ? 'Out of Stock' : 'Low Stock',
              time: stock <= 0 ? 'Critical' : 'Stock Alert'
            });
          }
        });
      }

      // 2. Pending & Overdue Invoices (Real Documents)
      if (docs && docs.length > 0) {
        docs.forEach(d => {
          const balance = Number(d.balanceDue || 0);
          if (balance > 0 && (d.docType?.toLowerCase() === 'sale' || !d.docType)) {
            items.push({
              id: `due-${d._dbId || d.id || d.invoiceNumber}`,
              type: 'payment',
              title: `Payment Due: #${d.invoiceNumber || 'INV'}`,
              message: `₹${balance.toLocaleString('en-IN')} outstanding from ${d.customerName || 'Party'}.`,
              path: `/documents/sale/edit/${d.id || d._dbId}`,
              badge: 'blue',
              badgeText: 'Payment Due',
              time: d.date || 'Pending'
            });
          }
        });
      }

      // 3. Real Activity Logs (Recent Transactions)
      if (logs && logs.length > 0) {
        logs.slice(0, 3).forEach(log => {
          items.push({
            id: `log-${log.id || log.time}`,
            type: 'activity',
            title: log.action || 'Activity Logged',
            message: `Recorded by ${log.user || 'Admin'} at ${log.time}`,
            path: '/history',
            badge: 'green',
            badgeText: 'Audit Log',
            time: log.time || 'Recent'
          });
        });
      }

      // 4. Project Workspace Alerts
      if (projNotifs && projNotifs.length > 0) {
        projNotifs.forEach(pn => {
          items.push({
            id: `proj-${pn._dbId || pn.id}`,
            type: 'project',
            title: pn.title || 'Project Workspace',
            message: pn.message || pn.content || 'Task updated in project.',
            path: '/projects',
            badge: 'indigo',
            badgeText: 'Projects',
            time: pn.time || 'Project'
          });
        });
      }

      // 5. Intelligent Compliance Reminder (GST Tax Calendar)
      const now = new Date();
      const currentDay = now.getDate();
      let gstMessage = '';
      if (currentDay <= 11) {
        gstMessage = `GSTR-1 return filing due on 11th (${11 - currentDay} days remaining).`;
      } else if (currentDay <= 20) {
        gstMessage = `GSTR-3B tax payment due on 20th (${20 - currentDay} days remaining).`;
      } else {
        gstMessage = `Monthly tax books closing. Reconcile bank ledgers & sales.`;
      }

      items.push({
        id: `compliance-gst-${now.getMonth()}-${now.getFullYear()}`,
        type: 'compliance',
        title: 'GST Compliance Calendar',
        message: gstMessage,
        path: '/compliance',
        badge: 'purple',
        badgeText: 'Compliance',
        time: 'Monthly Tax'
      });

      // 6. Gemini Copilot Daily Brief
      items.push({
        id: `gemini-brief-${now.toISOString().slice(0, 10)}`,
        type: 'ai',
        title: 'Gemini AI Financial Brief',
        message: 'Daily cashflow, tax breakdown, and inventory health digest is ready.',
        path: '/ai',
        badge: 'gemini',
        badgeText: 'AI Copilot',
        time: 'Today'
      });

      // Filter out dismissed notifications
      const filtered = items.filter(it => !dismissedIds.includes(it.id));

      // Map read status from localStorage
      const mapped = filtered.map(item => ({
        ...item,
        isRead: readIds.includes(item.id)
      }));

      setNotifications(mapped);
      setUnreadCount(mapped.filter(m => !m.isRead).length);
    } catch (err) {
      console.error('Failed to load real notifications:', err);
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  useEffect(() => {
    loadRealNotifications();
  }, [user?.id, location.pathname]);

  const handleMarkAllNotificationsAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const existing = JSON.parse(localStorage.getItem(`bb_read_notifs_${user?.id || 'default'}`) || '[]');
    const combined = Array.from(new Set([...existing, ...allIds]));
    localStorage.setItem(`bb_read_notifs_${user?.id || 'default'}`, JSON.stringify(combined));
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notif) => {
    const readIds = JSON.parse(localStorage.getItem(`bb_read_notifs_${user?.id || 'default'}`) || '[]');
    if (!readIds.includes(notif.id)) {
      const updated = [...readIds, notif.id];
      localStorage.setItem(`bb_read_notifs_${user?.id || 'default'}`, JSON.stringify(updated));
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setShowNotificationsDropdown(false);
    if (notif.path) {
      navigate(notif.path);
    }
  };

  const handleDismissNotification = (e, notifId) => {
    e.stopPropagation();
    const dismissedIds = JSON.parse(localStorage.getItem(`bb_dismissed_notifs_${user?.id || 'default'}`) || '[]');
    if (!dismissedIds.includes(notifId)) {
      localStorage.setItem(`bb_dismissed_notifs_${user?.id || 'default'}`, JSON.stringify([...dismissedIds, notifId]));
    }
    setNotifications(prev => prev.filter(n => n.id !== notifId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Close mobile drawer and sheets on route changes
  useEffect(() => {
    setIsMobileDrawerOpen(false);
    setShowMobileActionSheet(false);
    setShowDropdown(false);
    setShowCreateDropdown(false);
    setShowNotificationsDropdown(false);
    setShowSearchDropdown(false);
    setIsMobileSearchOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('bb_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Search logic
  useEffect(() => {
    const performSearch = async () => {
      if (!user || searchQuery.trim().length < 1) {
        setSearchResults([]);
        setShowSearchDropdown(false);
        return;
      }

      setIsSearching(true);
      setShowSearchDropdown(true);

      try {
        const [docs, prods, cons, projs] = await Promise.all([
          getItems('documents', user.id),
          getItems('products', user.id),
          getItems('contacts', user.id),
          getItems('projects', user.id)
        ]);

        const query = searchQuery.toLowerCase();
        const results = [];

        // Search Docs
        docs?.filter(d => d.customerName?.toLowerCase().includes(query) || d.invoiceNumber?.toLowerCase().includes(query))
          .slice(0, 3).forEach(d => results.push({ type: 'Invoice', title: `${d.docType || 'Document'} #${d.invoiceNumber}`, subtitle: d.customerName, path: `/documents/${d.docType?.toLowerCase().replace(' ', '-')}/edit/${d.id}`, icon: <FileText size={16} /> }));

        // Search Products
        prods?.filter(p => p.name?.toLowerCase().includes(query) || p.code?.toLowerCase().includes(query))
          .slice(0, 3).forEach(p => results.push({ type: 'Product', title: p.name, subtitle: `Code: ${p.code || 'N/A'} - ₹${p.price || 0}`, path: `/products/${p.id}`, icon: <Package size={16} /> }));

        // Search Contacts
        cons?.filter(c => c.name?.toLowerCase().includes(query) || c.phone?.toLowerCase().includes(query))
          .slice(0, 3).forEach(c => results.push({ type: 'Party', title: c.name, subtitle: c.phone || 'No Phone', path: `/contacts/${c.id}`, icon: <Users size={16} /> }));

        // Search Projects
        projs?.filter(p => p.name?.toLowerCase().includes(query) || p.clientName?.toLowerCase().includes(query))
          .slice(0, 3).forEach(p => results.push({ type: 'Project', title: p.name, subtitle: p.clientName || 'General Project', path: `/projects/${p._dbId || p.id}`, icon: <Briefcase size={16} /> }));

        setSearchResults(results);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(performSearch, 250);
    return () => clearTimeout(debounce);
  }, [searchQuery, user?.id]);

  // Global Ctrl + K search shortcut
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

  // Handle outside clicks for menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(event.target)) {
        setShowCreateDropdown(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(event.target)) {
        setShowNotificationsDropdown(false);
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
    <div className={`layout-container ${isCollapsed ? 'sidebar-collapsed' : ''} ${isMobileDrawerOpen ? 'drawer-open' : ''}`}>
      
      {/* Mobile Drawer Backdrop Overlay */}
      {isMobileDrawerOpen && (
        <div 
          className="mobile-drawer-backdrop" 
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-label="Close menu backdrop"
        />
      )}

      {/* --- SIDEBAR NAVIGATION --- */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileDrawerOpen ? 'mobile-open' : ''}`}>
        
        {/* Desktop Collapse Toggle */}
        <button 
          className="sidebar-toggle-floating-btn hide-on-mobile" 
          onClick={toggleSidebar}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Sidebar Logo / Header */}
        <div className="sidebar-logo">
          <div className="logo-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="logo-icon-badge">
              <span className="logo-monogram">BB</span>
            </div>
            {(!isCollapsed || isMobileDrawerOpen) && (
              <div className="logo-text-wrapper">
                <h2 className="logo-title">
                  Baniya<span className="logo-highlight">Book</span>
                </h2>
                <span className="logo-tagline">SMART BUSINESS OS</span>
              </div>
            )}
          </div>

          {/* Close button for Mobile Drawer */}
          {isMobileDrawerOpen && (
            <button 
              className="drawer-close-btn"
              onClick={() => setIsMobileDrawerOpen(false)}
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {(!isCollapsed || isMobileDrawerOpen) && <div className="nav-section-title">Core Business</div>}
          
          <NavLink to="/" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Dashboard">
            <LayoutDashboard size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Dashboard</span>}
          </NavLink>

          <NavLink to="/documents" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Documents & Billing">
            <FileText size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Documents & Invoices</span>}
          </NavLink>

          <NavLink to="/ai" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="AI Copilot">
            <Sparkles size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>AI Copilot</span>}
          </NavLink>

          <NavLink to="/catalog-manager" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Digital Catalog & Online Store">
            <ShoppingBag size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Digital Catalog</span>}
          </NavLink>

          <NavLink to="/editor" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Document Editor">
            <FileEdit size={19} className="nav-icon" />
            {(!isCollapsed || isMobileDrawerOpen) && <span>Document Editor</span>}
          </NavLink>

          <NavLink to="/editor/business-card" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Business Card Builder">
            <IdCard size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Card Builder</span>}
          </NavLink>

          {(!isCollapsed || isMobileDrawerOpen) && <div className="nav-section-title">Operations</div>}
          
          <NavLink to="/products" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Inventory Management">
            <Package size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Inventory & Stock</span>}
          </NavLink>

          <NavLink to="/contacts" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Contacts & Customers">
            <Users size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Parties & Contacts</span>}
          </NavLink>

          <NavLink to="/communications" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Communications Hub">
            <MessageSquareShare size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Communications Hub</span>}
          </NavLink>

          <NavLink to="/staff" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Staff Management">
            <UserCog size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Staff & Payroll</span>}
          </NavLink>

          <NavLink to="/projects" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Projects">
            <Briefcase size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Projects</span>}
          </NavLink>

          {(!isCollapsed || isMobileDrawerOpen) && <div className="nav-section-title">Finance & Khata</div>}
          
          <NavLink to="/ledger" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Digital Ledger Khata">
            <CreditCard size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Digital Ledger (Khata)</span>}
          </NavLink>

          <NavLink to="/loans" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Loan Manager">
            <Banknote size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Loan Manager</span>}
          </NavLink>

          <NavLink to="/banks" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Bank Accounts">
            <Landmark size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Bank Accounts</span>}
          </NavLink>

          {/* Payment Dropdown Group */}
          <div className="nav-group">
            <button 
              className={`nav-item ${isPaymentOpen ? 'group-active' : ''}`} 
              onClick={() => setIsPaymentOpen(!isPaymentOpen)} 
              title="Payment Management"
            >
              <CreditCard size={19} className="nav-icon" /> 
              {(!isCollapsed || isMobileDrawerOpen) && (
                <>
                  <span>Payments</span>
                  <span className="nav-chevron">{isPaymentOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                </>
              )}
            </button>
            {isPaymentOpen && (!isCollapsed || isMobileDrawerOpen) && (
              <div className="nav-sub-menu">
                <NavLink to="/payments/inward" className={({ isActive }) => isActive ? "nav-sub-item active" : "nav-sub-item"}>
                  <ArrowDownLeft size={14} /> <span>Inward Payment</span>
                </NavLink>
                <NavLink to="/payments/outward" className={({ isActive }) => isActive ? "nav-sub-item active" : "nav-sub-item"}>
                  <ArrowUpRight size={14} /> <span>Outward Payment</span>
                </NavLink>
                <NavLink to="/payments/profit-loss" className={({ isActive }) => isActive ? "nav-sub-item active" : "nav-sub-item"}>
                  <BarChart3 size={14} /> <span>Profit & Loss</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* Expenses Dropdown Group */}
          <div className="nav-group">
            <button 
              className={`nav-item ${isExpensesOpen ? 'group-active' : ''}`} 
              onClick={() => setIsExpensesOpen(!isExpensesOpen)}
              title="Income & Expenses"
            >
              <Wallet size={19} className="nav-icon" /> 
              {(!isCollapsed || isMobileDrawerOpen) && (
                <>
                  <span>Income & Expenses</span>
                  <span className="nav-chevron">{isExpensesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                </>
              )}
            </button>
            {isExpensesOpen && (!isCollapsed || isMobileDrawerOpen) && (
              <div className="nav-sub-menu">
                <NavLink to="/expenses/daily" className={({ isActive }) => isActive ? "nav-sub-item active" : "nav-sub-item"}>
                  <span>Daily Expenses</span>
                </NavLink>
                <NavLink to="/income/other" className={({ isActive }) => isActive ? "nav-sub-item active" : "nav-sub-item"}>
                  <span>Other Income</span>
                </NavLink>
              </div>
            )}
          </div>

          {(!isCollapsed || isMobileDrawerOpen) && <div className="nav-section-title">Analytics & Tools</div>}

          <NavLink to="/analytics" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Analytics 360°">
            <TrendingUp size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Analytics 360°</span>}
          </NavLink>
          
          <NavLink to="/meet" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Meet & Connect">
            <Video size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Meet & Connect</span>}
          </NavLink>

          <NavLink to="/history" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Audit History">
            <History size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Audit History</span>}
          </NavLink>

          <NavLink to="/compliance" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Compliance & GST">
            <FileText size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Compliance</span>}
          </NavLink>

          <NavLink to="/settings" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"} title="Settings">
            <SettingsIcon size={19} className="nav-icon" /> 
            {(!isCollapsed || isMobileDrawerOpen) && <span>Settings</span>}
          </NavLink>
        </nav>

        {/* Sidebar Footer User Card */}
        {(!isCollapsed || isMobileDrawerOpen) && (
          <div className="sidebar-footer">
            <div className="sidebar-user-card">
              <div className="user-avatar-mini">
                {companyInfo.name ? companyInfo.name.substring(0, 2).toUpperCase() : 'BB'}
              </div>
              <div className="user-info-mini">
                <span className="user-name-text">{companyInfo.name || 'Merchant'}</span>
                <span className="user-plan-badge">BaniyaBook PRO</span>
              </div>
              <button 
                className="btn-quick-logout" 
                onClick={handleLogout} 
                title="Logout"
                aria-label="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <div className="main-content">
        
        {/* Topbar Header */}
        <header className="topbar glass">
          
          {/* Mobile Hamburger Menu Toggle */}
          <button 
            className="mobile-hamburger-btn" 
            onClick={() => setIsMobileDrawerOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>

          {/* Mobile Brand Monogram */}
          <div className="mobile-brand-wrapper" onClick={() => navigate('/')}>
            <div className="logo-icon-badge small">
              <span className="logo-monogram">BB</span>
            </div>
            <span className="mobile-brand-name">Baniya<span>Book</span></span>
          </div>

          {/* Desktop Search Bar */}
          <div className={`search-bar ${isMobileSearchOpen ? 'mobile-search-active' : ''}`} ref={searchRef}>
            <Search size={18} className="search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Search invoices, products, contacts, loans, ledger..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              onFocus={() => searchQuery.length >= 1 && setShowSearchDropdown(true)}
            />
            {searchQuery && (
              <button 
                className="search-clear-btn" 
                onClick={() => { setSearchQuery(''); setShowSearchDropdown(false); }}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
            <div className="search-shortcut hide-on-mobile">
              <kbd>Ctrl</kbd>
              <span>+</span>
              <kbd>K</kbd>
            </div>

            {/* Live Search Dropdown */}
            {showSearchDropdown && (
              <div className="search-dropdown glass">
                {isSearching ? (
                  <div className="search-status">Searching BaniyaBook database...</div>
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
                          setIsMobileSearchOpen(false);
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
                  <div className="search-status">No matching records found</div>
                )}
              </div>
            )}
          </div>

          {/* Topbar Actions */}
          <div className="topbar-actions">
            
            {/* Quick Create '+' Button & Dropdown */}
            <div className="create-menu-wrapper" ref={createMenuRef}>
              <button 
                className={`topbar-create-btn ${showCreateDropdown ? 'active' : ''}`}
                onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                title="Quick Create (+)"
                aria-label="Quick Create"
              >
                <Plus size={20} strokeWidth={2.4} className={`create-plus-icon ${showCreateDropdown ? 'is-rotated' : ''}`} />
              </button>

              {showCreateDropdown && (
                <div className="create-dropdown glass-card-elevated">
                  <div className="create-dropdown-header">
                    <span>Quick Create</span>
                    <span className="create-dropdown-pill">Fast Entry</span>
                  </div>
                  <div className="create-dropdown-grid">
                    <button className="create-item" onClick={() => { navigate('/documents/sale/new'); setShowCreateDropdown(false); }}>
                      <div className="create-icon-badge green"><FilePlus size={18} /></div>
                      <div className="create-item-info">
                        <strong>Sale Invoice</strong>
                        <p>GST Tax Invoice & e-Way</p>
                      </div>
                    </button>

                    <button className="create-item" onClick={() => { navigate('/documents/purchase/new'); setShowCreateDropdown(false); }}>
                      <div className="create-icon-badge purple"><ShoppingCart size={18} /></div>
                      <div className="create-item-info">
                        <strong>Purchase Bill</strong>
                        <p>Record Inward Purchase</p>
                      </div>
                    </button>

                    <button className="create-item" onClick={() => { navigate('/payments/inward'); setShowCreateDropdown(false); }}>
                      <div className="create-icon-badge blue"><ArrowDownLeft size={18} /></div>
                      <div className="create-item-info">
                        <strong>Inward Payment</strong>
                        <p>Customer Receipt</p>
                      </div>
                    </button>

                    <button className="create-item" onClick={() => { navigate('/expenses/daily'); setShowCreateDropdown(false); }}>
                      <div className="create-icon-badge red"><Wallet size={18} /></div>
                      <div className="create-item-info">
                        <strong>Daily Expense</strong>
                        <p>Cash & Bank Outflow</p>
                      </div>
                    </button>

                    <button className="create-item" onClick={() => { navigate('/contacts'); setShowCreateDropdown(false); }}>
                      <div className="create-icon-badge indigo"><UserPlus size={18} /></div>
                      <div className="create-item-info">
                        <strong>Add Party</strong>
                        <p>Customer or Vendor</p>
                      </div>
                    </button>

                    <button className="create-item" onClick={() => { navigate('/products'); setShowCreateDropdown(false); }}>
                      <div className="create-icon-badge amber"><PackagePlus size={18} /></div>
                      <div className="create-item-info">
                        <strong>Add Product</strong>
                        <p>Inventory SKU & Pricing</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* AI Assistant Button (AI Logo instead of text AI) */}
            <NavLink 
              to="/ai" 
              className={({ isActive }) => `topbar-ai-btn hide-on-mobile ${isActive ? 'active' : ''}`}
              title="Google Gemini AI Copilot • Connected"
              aria-label="Google Gemini AI Copilot"
            >
              <GeminiStarLogo size={22} className="topbar-gemini-logo" />
              <span className="topbar-ai-pulse-dot" />
            </NavLink>

            {/* Subtle Divider */}
            <div className="topbar-divider hide-on-mobile" />

            {/* Notifications Bell */}
            <div className="notification-btn-wrapper" ref={notificationsMenuRef}>
              <button 
                className={`topbar-icon-btn ${showNotificationsDropdown ? 'active' : ''}`} 
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                aria-label={`Notifications (${unreadCount} unread)`}
                title={`Notifications (${unreadCount} unread)`}
              >
                <Bell size={19} />
                {unreadCount > 0 ? (
                  <span className="topbar-notif-badge">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                ) : (
                  <span className="notification-dot-clean" />
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="notifications-dropdown glass-card-elevated">
                  <div className="notifications-header">
                    <div className="notifications-header-left">
                      <span className="notifications-title">Notifications</span>
                      {unreadCount > 0 ? (
                        <span className="notifications-badge">{unreadCount} New</span>
                      ) : (
                        <span className="notifications-badge read">All caught up</span>
                      )}
                    </div>
                    <div className="notifications-header-actions">
                      {unreadCount > 0 && (
                        <button 
                          className="notifications-clear-btn"
                          onClick={handleMarkAllNotificationsAsRead}
                          title="Mark all as read"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter Tabs */}
                  <div className="notifications-tabs-bar">
                    <button 
                      className={`notif-tab ${notificationFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setNotificationFilter('all')}
                    >
                      All ({notifications.length})
                    </button>
                    <button 
                      className={`notif-tab ${notificationFilter === 'unread' ? 'active' : ''}`}
                      onClick={() => setNotificationFilter('unread')}
                    >
                      Unread ({unreadCount})
                    </button>
                  </div>

                  {/* Real Notifications Feed */}
                  <div className="notifications-list">
                    {(() => {
                      const displayed = notifications.filter(n => notificationFilter === 'all' || !n.isRead);
                      if (displayed.length === 0) {
                        return (
                          <div className="notifications-empty">
                            <div className="notif-empty-icon">
                              <CheckCircle2 size={32} />
                            </div>
                            <p className="notif-empty-title">All caught up!</p>
                            <p className="notif-empty-desc">
                              {notificationFilter === 'unread' 
                                ? 'No unread notifications at the moment.' 
                                : 'No active alerts or notifications right now.'}
                            </p>
                          </div>
                        );
                      }
                      return displayed.map((notif) => (
                        <div 
                          key={notif.id}
                          className={`notification-item ${!notif.isRead ? 'unread' : 'read'}`}
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className={`notif-icon-badge ${notif.badge}`}>
                            {notif.type === 'stock' && <Package size={15} />}
                            {notif.type === 'payment' && <ArrowDownLeft size={15} />}
                            {notif.type === 'activity' && <FileText size={15} />}
                            {notif.type === 'compliance' && <Landmark size={15} />}
                            {notif.type === 'ai' && <GeminiStarLogo size={15} />}
                            {notif.type === 'project' && <Briefcase size={15} />}
                          </div>

                          <div className="notif-content">
                            <div className="notif-top-row">
                              <p className="notif-text"><strong>{notif.title}</strong></p>
                              {!notif.isRead && <span className="notif-status-dot" title="Unread" />}
                            </div>
                            <p className="notif-desc">{notif.message}</p>
                            <div className="notif-meta-row">
                              <span className="notif-badge-pill">{notif.badgeText}</span>
                              <span className="notif-time">{notif.time}</span>
                            </div>
                          </div>

                          <button 
                            className="notif-dismiss-btn"
                            onClick={(e) => handleDismissNotification(e, notif.id)}
                            title="Dismiss notification"
                            aria-label="Dismiss notification"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ));
                    })()}
                  </div>

                  <div className="notifications-footer">
                    <button 
                      className="notifications-view-all"
                      onClick={() => { navigate('/history'); setShowNotificationsDropdown(false); }}
                    >
                      View Complete Business Audit Log <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div className="user-profile-wrapper" ref={profileMenuRef}>
              <div 
                className={`user-profile-badge ${showDropdown ? 'active' : ''}`} 
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="user-avatar-circle">
                  {companyInfo.name ? companyInfo.name.substring(0, 2).toUpperCase() : 'BB'}
                </div>
                <div className="user-profile-text hide-on-mobile">
                  <span className="profile-name">{companyInfo.name || 'Merchant'}</span>
                  <div className="profile-role-row">
                    <span className="profile-status-dot"></span>
                    <span className="profile-role">Admin</span>
                  </div>
                </div>
                <ChevronDown size={14} className={`profile-chevron hide-on-mobile ${showDropdown ? 'is-rotated' : ''}`} />
              </div>

              {showDropdown && (
                <div className="profile-dropdown glass-card-elevated">
                  <div className="profile-dropdown-header">
                    <p className="profile-title">{user?.firstName ? `${user.firstName} ${user.lastName}` : (companyInfo.name || 'BaniyaBook Admin')}</p>
                    <p className="profile-email">{user?.email || 'admin@baniyabook.com'}</p>
                    <span className="profile-plan-pill">BaniyaBook Enterprise</span>
                  </div>
                  <div className="profile-dropdown-body">
                    <button className="dropdown-action-btn" onClick={() => { navigate('/settings'); setShowDropdown(false); }}>
                      <SettingsIcon size={16} /> Company & Tax Settings
                    </button>
                    <button className="dropdown-action-btn" onClick={() => { navigate('/ledger'); setShowDropdown(false); }}>
                      <CreditCard size={16} /> Business Ledger
                    </button>
                    <button className="dropdown-action-btn" onClick={() => { navigate('/catalog-manager'); setShowDropdown(false); }}>
                      <ShoppingBag size={16} /> Online Store Config
                    </button>
                    <div className="dropdown-divider"></div>
                    <button onClick={handleLogout} className="dropdown-action-btn danger">
                      <LogOut size={16} /> Secure Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className={`content-area ${noWrapper ? 'no-padding' : ''}`}>
          {noWrapper ? (
            children
          ) : (
            <div className={`page-container glass ${extended ? 'extended' : ''}`} style={{ padding: extended ? '1.5rem' : '2rem', minHeight: '100%', maxWidth: extended ? 'none' : '1400px' }}>
              {children}
            </div>
          )}
        </main>
      </div>

      {/* ========================================================
          MOBILE APP-LIKE BOTTOM DOCK NAVIGATION (<= 1024px)
          ======================================================== */}
      <div className="mobile-bottom-dock">
        <NavLink to="/" className={({ isActive }) => isActive ? "dock-item active" : "dock-item"}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/documents" className={({ isActive }) => isActive ? "dock-item active" : "dock-item"}>
          <FileText size={20} />
          <span>Invoices</span>
        </NavLink>

        {/* Central Floating Action Button (FAB) */}
        <button 
          className="dock-fab-btn" 
          onClick={() => setShowMobileActionSheet(true)}
          aria-label="Quick Action Menu"
        >
          <Plus size={24} />
        </button>

        <NavLink to="/ledger" className={({ isActive }) => isActive ? "dock-item active" : "dock-item"}>
          <CreditCard size={20} />
          <span>Khata</span>
        </NavLink>

        <button 
          className={`dock-item ${isMobileDrawerOpen ? 'active' : ''}`}
          onClick={() => setIsMobileDrawerOpen(true)}
          aria-label="Open Full Menu"
        >
          <Menu size={20} />
          <span>Menu</span>
        </button>
      </div>

      {/* ========================================================
          MOBILE QUICK ACTION BOTTOM SHEET
          ======================================================== */}
      {showMobileActionSheet && (
        <div className="mobile-sheet-overlay" onClick={() => setShowMobileActionSheet(false)}>
          <div className="mobile-sheet-card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grabber"></div>
            
            <div className="sheet-header">
              <div className="sheet-title">
                <h3>Quick Actions</h3>
                <p>Create document or record transaction</p>
              </div>
              <button 
                className="sheet-close-btn"
                onClick={() => setShowMobileActionSheet(false)}
                aria-label="Close action sheet"
              >
                <X size={20} />
              </button>
            </div>

            <div className="sheet-actions-grid">
              <button 
                className="sheet-action-item green" 
                onClick={() => { navigate('/documents/sale/new'); setShowMobileActionSheet(false); }}
              >
                <div className="sheet-action-icon"><Receipt size={22} /></div>
                <span>Sale Invoice</span>
              </button>

              <button 
                className="sheet-action-item purple" 
                onClick={() => { navigate('/documents/purchase/new'); setShowMobileActionSheet(false); }}
              >
                <div className="sheet-action-icon"><ShoppingCart size={22} /></div>
                <span>Purchase Bill</span>
              </button>

              <button 
                className="sheet-action-item blue" 
                onClick={() => { navigate('/payments/inward'); setShowMobileActionSheet(false); }}
              >
                <div className="sheet-action-icon"><ArrowDownLeft size={22} /></div>
                <span>Payment In</span>
              </button>

              <button 
                className="sheet-action-item red" 
                onClick={() => { navigate('/expenses/daily'); setShowMobileActionSheet(false); }}
              >
                <div className="sheet-action-icon"><Wallet size={22} /></div>
                <span>Daily Expense</span>
              </button>

              <button 
                className="sheet-action-item indigo" 
                onClick={() => { navigate('/contacts'); setShowMobileActionSheet(false); }}
              >
                <div className="sheet-action-icon"><UserPlus size={22} /></div>
                <span>New Party</span>
              </button>

              <button 
                className="sheet-action-item amber" 
                onClick={() => { navigate('/products'); setShowMobileActionSheet(false); }}
              >
                <div className="sheet-action-icon"><PackagePlus size={22} /></div>
                <span>Add Product</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Assistant bubble */}
      {location.pathname !== '/ai' && <AIAssistant />}
    </div>
  );
};

export default Layout;
