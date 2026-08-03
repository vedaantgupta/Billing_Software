import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Grid, 
  User, 
  ShoppingCart
} from 'lucide-react';
import '@/features/store/styles/StoreBottomNav.css';

export default function StoreBottomNav({ cartCount = 0 }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/store';
  const isCategories = location.pathname === '/categories';
  const isAccount = location.pathname.startsWith('/store/account') || location.pathname === '/account';
  const isCart = location.pathname === '/store/account' && location.search.includes('tab=cart');

  return (
    <div className="flipkart-bottom-nav">
      <div className="bottom-nav-inner">
        <NavLink 
          to="/store" 
          className={({ isActive }) => `bottom-nav-item ${isHome ? 'active' : ''}`}
        >
          <div className="nav-icon-box">
            <Home size={22} />
          </div>
          <span className="nav-label">Home</span>
        </NavLink>

        <NavLink 
          to="/categories" 
          className={({ isActive }) => `bottom-nav-item ${isCategories ? 'active' : ''}`}
        >
          <div className="nav-icon-box">
            <Grid size={22} />
          </div>
          <span className="nav-label">Categories</span>
        </NavLink>

        <NavLink 
          to="/store/account" 
          className={({ isActive }) => `bottom-nav-item ${isAccount && !isCart ? 'active' : ''}`}
        >
          <div className="nav-icon-box">
            <User size={22} />
          </div>
          <span className="nav-label">Account</span>
        </NavLink>

        <button 
          className={`bottom-nav-item ${isCart ? 'active' : ''}`}
          onClick={() => navigate('/store/account?tab=cart')}
        >
          <div className="nav-icon-box">
            <ShoppingCart size={22} />
            {cartCount > 0 && <span className="bottom-cart-badge">{cartCount}</span>}
          </div>
          <span className="nav-label">Cart</span>
        </button>
      </div>
    </div>
  );
}
