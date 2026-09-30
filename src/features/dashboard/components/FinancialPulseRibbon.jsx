import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Activity, TrendingUp, TrendingDown, DollarSign, 
  Calendar, Layers, Users, Package, FileText, ChevronRight,
  Info, CheckCircle2, AlertTriangle, Landmark, Sparkles
} from 'lucide-react';

const FinancialPulseRibbon = ({
  stats = {},
  inwardBreakdown = { total: 0 },
  outwardBreakdown = { total: 0 },
  agingSales = { total: 0, days30plus: 0 },
  agingPurchases = { total: 0 },
  inventoryStats = { totalProducts: 0, inStock: 0 },
  staffCount = 0,
  activeProjectsCount = 0,
  privacyMode = false
}) => {
  const navigate = useNavigate();
  const [showHealthModal, setShowHealthModal] = useState(false);

  // Masking helper
  const mask = (val, prefix = '₹ ') => {
    if (privacyMode) return `${prefix}••••••`;
    if (typeof val === 'number') {
      return `${prefix}${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${prefix}${val}`;
  };

  // Calculate Net Operating Cash Flow
  const netCashFlow = (inwardBreakdown?.total || 0) - (outwardBreakdown?.total || 0);

  // Estimated Input Tax Credit (ITC) from purchases (assumed 18% or standard GST)
  const estimatedITC = (stats.purchases || 0) * 0.18;
  const netGstPayable = Math.max(0, (stats.gstSales || 0) - estimatedITC);

  // Working Capital Position
  const workingCapital = (stats.totalStockValuation || 0) + (agingSales?.total || 0) - (agingPurchases?.total || 0);

  // Dynamic Financial Health Score (0 - 100)
  let healthScore = 85;
  const factors = [];

  // 1. Profitability factor
  if (stats.sales > 0) {
    const profitMargin = (stats.netProfit / stats.sales) * 100;
    if (profitMargin >= 15) {
      healthScore += 5;
      factors.push({ name: 'Operating Margin', status: 'Healthy', score: '+5', note: `${profitMargin.toFixed(1)}% net margin` });
    } else if (profitMargin >= 0) {
      factors.push({ name: 'Operating Margin', status: 'Positive', score: '+0', note: `${profitMargin.toFixed(1)}% net margin` });
    } else {
      healthScore -= 8;
      factors.push({ name: 'Operating Margin', status: 'Negative', score: '-8', note: 'Operating at a loss' });
    }
  } else {
    factors.push({ name: 'Operating Margin', status: 'Baseline', score: '0', note: 'Awaiting sales data' });
  }

  // 2. Collection efficiency factor
  const overdueRatio = (agingSales?.total || 0) > 0 ? (agingSales?.days30plus || 0) / agingSales.total : 0;
  if (overdueRatio < 0.15) {
    healthScore += 4;
    factors.push({ name: 'Collection Efficiency', status: 'Excellent', score: '+4', note: 'Under 15% overdue' });
  } else if (overdueRatio < 0.35) {
    factors.push({ name: 'Collection Efficiency', status: 'Moderate', score: '0', note: 'Moderate overdue' });
  } else {
    healthScore -= 6;
    factors.push({ name: 'Collection Efficiency', status: 'At Risk', score: '-6', note: 'High 30+ days overdue' });
  }

  // 3. Stock sufficiency
  const stockRatio = (inventoryStats?.totalProducts || 0) > 0 
    ? (inventoryStats?.inStock || 0) / inventoryStats.totalProducts 
    : 1;
  if (stockRatio >= 0.85) {
    healthScore += 4;
    factors.push({ name: 'Inventory Stability', status: 'Optimal', score: '+4', note: '85%+ SKUs well-stocked' });
  } else {
    factors.push({ name: 'Inventory Stability', status: 'Reorder Needed', score: '-3', note: 'Reorder buffers reached' });
    healthScore -= 3;
  }

  // Clamp health score between 40 and 99
  healthScore = Math.max(45, Math.min(98, healthScore));

  const healthColor = healthScore >= 85 ? '#059669' : healthScore >= 70 ? '#0284c7' : healthScore >= 55 ? '#f59e0b' : '#dc2626';
  const healthLabel = healthScore >= 85 ? 'Excellent Health' : healthScore >= 70 ? 'Healthy & Growing' : healthScore >= 55 ? 'Moderate Stability' : 'Attention Required';

  return (
    <div className="db-pulse-container">
      {/* 4 HIGHLIGHT CARDS ROW */}
      <div className="db-pulse-grid">
        {/* CARD 1: FINANCIAL HEALTH & VITALITY SCORE */}
        <div 
          className="glass db-pulse-card cursor-pointer"
          onClick={() => setShowHealthModal(!showHealthModal)}
          title="Click to view Financial Health diagnostic details"
        >
          <div className="db-pulse-card-top">
            <div className="db-pulse-title-wrap">
              <span className="db-pulse-icon-box" style={{ background: `${healthColor}15`, color: healthColor }}>
                <ShieldCheck size={18} />
              </span>
              <div>
                <span className="db-pulse-card-title">Financial Vitality</span>
                <span className="db-pulse-badge" style={{ background: `${healthColor}15`, color: healthColor, borderColor: `${healthColor}35` }}>
                  {healthLabel}
                </span>
              </div>
            </div>
            
            {/* Radial Mini Gauge */}
            <div className="db-pulse-radial-wrap">
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="18" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke={healthColor}
                  strokeWidth="4"
                  strokeDasharray={`${(healthScore / 100) * 113.1} 113.1`}
                  strokeLinecap="round"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dasharray 0.8s ease' }}
                />
              </svg>
              <span className="db-pulse-radial-val" style={{ color: healthColor }}>{healthScore}</span>
            </div>
          </div>

          <div className="db-pulse-body">
            <div className="db-pulse-metric-val" style={{ color: healthColor }}>
              {healthScore} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>/ 100</span>
            </div>
            <div className="db-pulse-subtext">
              <span>Factors: Margins, Liquidity & Stock</span>
              <span className="db-pulse-link-text">Details <ChevronRight size={12} /></span>
            </div>
          </div>
        </div>

        {/* CARD 2: NET OPERATING CASH FLOW */}
        <div className="glass db-pulse-card" onClick={() => navigate('/ledger')} title="View Inward vs Outward Cash Flow">
          <div className="db-pulse-card-top">
            <div className="db-pulse-title-wrap">
              <span className="db-pulse-icon-box" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                <Activity size={18} />
              </span>
              <div>
                <span className="db-pulse-card-title">Net Cash Flow</span>
                <span className={`db-pulse-badge ${netCashFlow >= 0 ? 'positive' : 'negative'}`}>
                  {netCashFlow >= 0 ? '+ Inflow Surplus' : '- Outflow Deficit'}
                </span>
              </div>
            </div>
          </div>

          <div className="db-pulse-body">
            <div className="db-pulse-metric-val" style={{ color: netCashFlow >= 0 ? '#059669' : '#dc2626' }}>
              {mask(netCashFlow)}
            </div>
            <div className="db-pulse-subtext">
              <span>In: {mask(inwardBreakdown?.total || 0, '₹')}</span>
              <span>•</span>
              <span>Out: {mask(outwardBreakdown?.total || 0, '₹')}</span>
            </div>
          </div>
        </div>

        {/* CARD 3: GST COMPLIANCE & ITC RADAR */}
        <div className="glass db-pulse-card" onClick={() => navigate('/compliance')} title="View GST & Tax Compliance">
          <div className="db-pulse-card-top">
            <div className="db-pulse-title-wrap">
              <span className="db-pulse-icon-box" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#7c3aed' }}>
                <Landmark size={18} />
              </span>
              <div>
                <span className="db-pulse-card-title">GST Tax Radar</span>
                <span className="db-pulse-badge info">
                  GSTR-1 & 3B
                </span>
              </div>
            </div>
          </div>

          <div className="db-pulse-body">
            <div className="db-pulse-metric-val" style={{ color: '#7c3aed' }}>
              {mask(netGstPayable)}
            </div>
            <div className="db-pulse-subtext">
              <span>Output: {mask(stats.gstSales || 0, '₹')}</span>
              <span>•</span>
              <span style={{ color: '#059669' }}>ITC: {mask(estimatedITC, '₹')}</span>
            </div>
          </div>
        </div>

        {/* CARD 4: WORKING CAPITAL & NET ASSET POSITION */}
        <div className="glass db-pulse-card" onClick={() => navigate('/products')} title="View Working Capital (Inventory + Receivables - Payables)">
          <div className="db-pulse-card-top">
            <div className="db-pulse-title-wrap">
              <span className="db-pulse-icon-box" style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7' }}>
                <Layers size={18} />
              </span>
              <div>
                <span className="db-pulse-card-title">Working Capital</span>
                <span className="db-pulse-badge positive">
                  Asset Value
                </span>
              </div>
            </div>
          </div>

          <div className="db-pulse-body">
            <div className="db-pulse-metric-val" style={{ color: '#0284c7' }}>
              {mask(workingCapital)}
            </div>
            <div className="db-pulse-subtext">
              <span>Stock: {mask(stats.totalStockValuation || 0, '₹')}</span>
              <span>•</span>
              <span>Due: {mask(agingSales?.total || 0, '₹')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MINI OPERATIONAL LIVE STRIP */}
      <div className="db-live-strip">
        <div className="db-live-strip-title">
          <span className="db-live-dot" />
          <span>Live Operations Pulse:</span>
        </div>

        <div className="db-live-chips">
          <button className="db-live-chip" onClick={() => navigate('/documents')}>
            <FileText size={13} color="#6366f1" />
            <span>Active Invoices:</span>
            <strong>{stats.invoices || 0}</strong>
          </button>

          <button className="db-live-chip" onClick={() => navigate('/contacts')}>
            <Users size={13} color="#059669" />
            <span>Customers:</span>
            <strong>{stats.customers || 0}</strong>
          </button>

          <button className="db-live-chip" onClick={() => navigate('/products')}>
            <Package size={13} color="#f59e0b" />
            <span>Catalog SKUs:</span>
            <strong>{inventoryStats.totalProducts || 0}</strong>
          </button>

          {staffCount > 0 && (
            <button className="db-live-chip" onClick={() => navigate('/staff')}>
              <Users size={13} color="#8b5cf6" />
              <span>Staff on Roster:</span>
              <strong>{staffCount}</strong>
            </button>
          )}

          {activeProjectsCount > 0 && (
            <button className="db-live-chip" onClick={() => navigate('/projects')}>
              <Layers size={13} color="#06b6d4" />
              <span>Active Projects:</span>
              <strong>{activeProjectsCount}</strong>
            </button>
          )}
        </div>
      </div>

      {/* HEALTH BREAKDOWN ACCORDION/MODAL POPUP */}
      {showHealthModal && (
        <div className="glass db-health-details-card">
          <div className="db-health-details-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color={healthColor} />
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>
                Financial Health Breakdown ({healthScore}/100)
              </h4>
            </div>
            <button 
              className="db-health-close-btn"
              onClick={() => setShowHealthModal(false)}
            >
              ✕
            </button>
          </div>

          <div className="db-health-factors-list">
            {factors.map((f, i) => (
              <div key={i} className="db-health-factor-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={15} color="#059669" />
                  <span style={{ fontWeight: 700, fontSize: '0.825rem' }}>{f.name}:</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{f.note}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="db-pulse-badge positive" style={{ fontSize: '0.725rem' }}>{f.status}</span>
                  <strong style={{ fontSize: '0.825rem', color: healthColor }}>{f.score}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialPulseRibbon;
