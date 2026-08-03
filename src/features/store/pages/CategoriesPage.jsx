import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, ChevronRight, ShoppingBag,
  Cpu, Shirt, Wrench, Home, Heart, Activity,
  Truck, Printer, Sun, Code, Box, Layers,
  Package, ArrowRight, Star, Zap, TrendingUp,
  Grid, Tag
} from 'lucide-react';
import { CATEGORIES_TAXONOMY } from '@/data/categoriesData';
import StoreNavbar from '@/features/store/components/StoreNavbar';
import StoreBottomNav from '@/features/store/components/StoreBottomNav';
import '@/features/store/styles/CategoriesPage.css';

const ICON_MAP = {
  Cpu: Cpu, ShoppingBag: ShoppingBag, Shirt: Shirt, Wrench: Wrench,
  Home: Home, Heart: Heart, Activity: Activity, Truck: Truck,
  Printer: Printer, Sun: Sun, Code: Code, Box: Box,
};

const CatIcon = ({ name, size = 22 }) => {
  const Icon = ICON_MAP[name] || Box;
  return <Icon size={size} />;
};

export default function CategoriesPage() {
  const navigate = useNavigate();
  const [activeCatId, setActiveCatId] = useState(CATEGORIES_TAXONOMY[0]?.id || '');
  const [search, setSearch] = useState('');

  const activeCat = useMemo(
    () => CATEGORIES_TAXONOMY.find(c => c.id === activeCatId) || CATEGORIES_TAXONOMY[0],
    [activeCatId]
  );

  const filteredSidebar = useMemo(() => {
    if (!search.trim()) return CATEGORIES_TAXONOMY;
    const q = search.toLowerCase();
    return CATEGORIES_TAXONOMY.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.subCategories.some(s => s.toLowerCase().includes(q))
    );
  }, [search]);

  const filteredSubs = useMemo(() => {
    if (!search.trim()) return activeCat?.subCategories || [];
    const q = search.toLowerCase();
    return (activeCat?.subCategories || []).filter(s => s.toLowerCase().includes(q));
  }, [activeCat, search]);

  const totalSubs = CATEGORIES_TAXONOMY.reduce((n, c) => n + c.subCategories.length, 0);

  return (
    <div className="cat-page">
      <StoreNavbar />

      {/* ── Hero Header ─────────────────────────────────── */}
      <div className="cat-hero">
        <div className="cat-hero-bg" aria-hidden="true" />
        <div className="cat-hero-inner">
          <button className="cat-back-btn" onClick={() => navigate('/store')}>
            <ArrowLeft size={17} />
            <span>Back to Store</span>
          </button>

          <div className="cat-hero-text">
            <div className="cat-hero-eyebrow">
              <Grid size={14} />
              <span>B2B Marketplace</span>
            </div>
            <h1 className="cat-hero-title">All Categories</h1>
            <p className="cat-hero-sub">
              Browse <strong>{CATEGORIES_TAXONOMY.length}</strong> main categories
              &amp; <strong>{totalSubs}</strong> sub-categories
            </p>
          </div>

          {/* Search */}
          <div className="cat-search-wrap">
            <Search size={16} className="cat-search-icon" />
            <input
              id="cat-search"
              className="cat-search-input"
              type="text"
              placeholder="Search categories or sub-categories…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
            />
            {search && (
              <button className="cat-search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats Row ───────────────────────────────────── */}
      <div className="cat-stats-row">
        <div className="cat-stat-pill">
          <Layers size={14} />
          <span>{CATEGORIES_TAXONOMY.length} Main Categories</span>
        </div>
        <div className="cat-stat-pill">
          <Tag size={14} />
          <span>{totalSubs} Sub-Categories</span>
        </div>
        <div className="cat-stat-pill cat-stat-accent">
          <Zap size={14} />
          <span>B2B Wholesale Pricing</span>
        </div>
        <div className="cat-stat-pill cat-stat-green">
          <TrendingUp size={14} />
          <span>Trending Deals</span>
        </div>
      </div>

      {/* ── Main Two-Panel Layout ───────────────────────── */}
      <div className="cat-body">

        {/* LEFT SIDEBAR */}
        <aside className="cat-sidebar">
          <div className="cat-sidebar-label">
            <Layers size={12} />
            <span>Categories</span>
          </div>
          <nav className="cat-sidebar-nav">
            {filteredSidebar.map(cat => (
              <button
                key={cat.id}
                id={`cat-nav-${cat.id}`}
                className={`cat-nav-item ${activeCatId === cat.id ? 'cat-nav-item--active' : ''}`}
                onClick={() => setActiveCatId(cat.id)}
                style={activeCatId === cat.id ? { '--accent-grad': cat.gradient } : {}}
              >
                <span className="cat-nav-icon" style={{ background: activeCatId === cat.id ? cat.gradient : '' }}>
                  <CatIcon name={cat.iconName} size={16} />
                </span>
                <span className="cat-nav-name">{cat.name}</span>
                {cat.badge && (
                  <span className="cat-nav-badge">{cat.badge}</span>
                )}
                <ChevronRight size={14} className="cat-nav-chevron" />
              </button>
            ))}
          </nav>
        </aside>

        {/* RIGHT PANEL */}
        <main className="cat-panel">
          {/* Category Banner */}
          {activeCat && (
            <div className="cat-banner" style={{ background: activeCat.gradient }}>
              <div className="cat-banner-left">
                <div className="cat-banner-icon">
                  <CatIcon name={activeCat.iconName} size={32} />
                </div>
                <div>
                  <div className="cat-banner-badge">{activeCat.badge}</div>
                  <h2 className="cat-banner-title">{activeCat.name}</h2>
                  <p className="cat-banner-desc">{activeCat.description}</p>
                </div>
              </div>
              <button
                className="cat-banner-btn"
                onClick={() => navigate('/store')}
                id={`cat-see-products-${activeCat.id}`}
              >
                <ShoppingBag size={15} />
                <span>See All Products</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}

          {/* Sub-category label */}
          <div className="cat-sub-label">
            <Package size={14} />
            <span>
              {search.trim()
                ? `${filteredSubs.length} matching sub-categories`
                : `${filteredSubs.length} sub-categories in ${activeCat?.name}`}
            </span>
          </div>

          {/* Sub-category grid */}
          <div className="cat-sub-grid">
            {filteredSubs.length === 0 ? (
              <div className="cat-empty">
                <Search size={40} />
                <p>No sub-categories found for "<strong>{search}</strong>"</p>
              </div>
            ) : filteredSubs.map((sub, i) => (
              <div
                key={i}
                id={`cat-sub-${activeCat?.id}-${i}`}
                className="cat-sub-card"
                onClick={() => navigate('/store')}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate('/store')}
              >
                <div className="cat-sub-card-icon" style={{ background: activeCat?.gradient }}>
                  <CatIcon name={activeCat?.iconName} size={20} />
                </div>
                <div className="cat-sub-card-body">
                  <span className="cat-sub-card-name">{sub}</span>
                  <span className="cat-sub-card-cta">
                    Browse Products <ArrowRight size={11} />
                  </span>
                </div>
                <div className="cat-sub-card-arrow">
                  <ChevronRight size={16} />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* ── All Categories Quick Grid (Mobile / Overview) ─ */}
      <div className="cat-overview">
        <h2 className="cat-overview-title">
          <Star size={18} /> All Categories at a Glance
        </h2>
        <div className="cat-overview-grid">
          {CATEGORIES_TAXONOMY.map(cat => (
            <button
              key={cat.id}
              id={`cat-overview-${cat.id}`}
              className={`cat-overview-card ${activeCatId === cat.id ? 'cat-overview-card--active' : ''}`}
              onClick={() => { setActiveCatId(cat.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              style={{ '--grad': cat.gradient }}
            >
              <div className="cat-overview-icon" style={{ background: cat.gradient }}>
                <CatIcon name={cat.iconName} size={24} />
              </div>
              <span className="cat-overview-name">{cat.name}</span>
              <span className="cat-overview-count">{cat.subCategories.length} types</span>
            </button>
          ))}
        </div>
      </div>

      <StoreBottomNav />
    </div>
  );
}
