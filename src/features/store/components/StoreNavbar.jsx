import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Grid, 
  User, 
  ShoppingCart, 
  Users, 
  Search,
  ShoppingBag,
  ShieldCheck,
  ChevronRight,
  Zap
} from 'lucide-react';
import '@/features/store/styles/StoreNavbar.css';

export default function StoreNavbar({ 
  searchQuery = '', 
  onSearchChange = null,
  cartCount = 0,
  suppliersCount = 0
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const isStoreHome = location.pathname === '/store';
  const isCategories = location.pathname === '/categories';
  const isAccount = location.pathname.startsWith('/store/account') || location.pathname === '/account';

  return (
    <div className="store-navbar-container glass">
      {/* Upper Navigation Bar */}
      <div className="store-navbar-main">
        {/* Brand & Market Title */}
        <div className="store-brand" onClick={() => navigate('/store')}>
          <div className="store-brand-icon">
            <ShoppingBag size={20} />
          </div>
          <div className="store-brand-text">
            <span className="store-brand-title">Flipkart <span style={{ color: '#ffe500' }}>B2B</span></span>
            <span className="store-brand-subtitle">
              <ShieldCheck size={11} color="#10b981" /> Verified Wholesale Store
            </span>
          </div>
        </div>

        {/* Amazon & Flipkart Style Top Tabs (Desktop/Tablet) */}
        <nav className="store-nav-tabs">
          <NavLink 
            to="/store" 
            className={({ isActive }) => `store-nav-tab ${isActive && isStoreHome ? 'active' : ''}`}
          >
            <Home size={18} />
            <span>Home</span>
          </NavLink>

          <NavLink 
            to="/categories" 
            className={({ isActive }) => `store-nav-tab ${isActive && isCategories ? 'active' : ''}`}
          >
            <Grid size={18} />
            <span>Categories</span>
          </NavLink>

          <NavLink 
            to="/store/account" 
            className={({ isActive }) => `store-nav-tab ${isActive || isAccount ? 'active' : ''}`}
          >
            <User size={18} />
            <span>Account</span>
          </NavLink>
        </nav>

        {/* Quick Cart & Suppliers Pill */}
        <div className="store-nav-actions">
          <button 
            className="store-quick-pill"
            onClick={() => navigate('/store/account?tab=suppliers')}
            title="My Suppliers"
          >
            <Users size={16} />
            <span className="quick-pill-text">Suppliers</span>
            {suppliersCount > 0 && <span className="quick-pill-badge">{suppliersCount}</span>}
          </button>

          <button 
            className="store-quick-pill cart-pill"
            onClick={() => navigate('/store/account?tab=cart')}
            title="Cart"
          >
            <ShoppingCart size={16} />
            <span className="quick-pill-text">Cart</span>
            {cartCount > 0 && <span className="quick-pill-badge badge-primary">{cartCount}</span>}
          </button>
        </div>
      </div>

      {/* Sub-header Bar (Flipkart Style category strip & search) */}
      <div className="store-sub-nav">
        <div className="store-sub-nav-categories">
          <span className="sub-nav-label"><Zap size={13} color="#ffe500" /> B2B Categories:</span>
          <button className="sub-cat-btn" onClick={() => navigate('/categories')}>Electronics</button>
          <button className="sub-cat-btn" onClick={() => navigate('/categories')}>Apparel & Textiles</button>
          <button className="sub-cat-btn" onClick={() => navigate('/categories')}>Industrial Tools</button>
          <button className="sub-cat-btn" onClick={() => navigate('/categories')}>Office Supplies</button>
          <button className="sub-cat-btn view-all" onClick={() => navigate('/categories')}>
            All Categories <ChevronRight size={13} />
          </button>
        </div>

        {onSearchChange && (
          <div className="store-nav-search">
            <Search size={16} className="search-icon" />
            <input 
              type="text"
              placeholder="Search products, wholesale suppliers, categories..."
              value={searchQuery}
              onChange={onSearchChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
