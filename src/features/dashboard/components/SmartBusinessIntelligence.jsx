import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, TrendingUp, AlertTriangle, ShieldCheck, 
  MessageCircle, ArrowRight, Zap, CheckCircle2, DollarSign,
  ChevronLeft, ChevronRight, HelpCircle
} from 'lucide-react';

const SmartBusinessIntelligence = ({
  stats = {},
  agingSales = { total: 0, days30plus: 0 },
  inventoryStats = { lowStock: 0, zeroStock: 0 },
  topState = '',
  stateWiseSales = [],
  privacyMode = false
}) => {
  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);

  // Masking
  const mask = (val, prefix = '₹ ') => {
    if (privacyMode) return `${prefix}••••••`;
    return `${prefix}${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  // Compile Dynamic Business Insights
  const insights = [];

  // Insight 1: Overdue Receivables Action
  if (agingSales?.days30plus > 0) {
    insights.push({
      id: 'overdue',
      type: 'warning',
      badge: 'Cash Recovery Priority',
      badgeColor: '#dc2626',
      badgeBg: '#fee2e2',
      icon: AlertTriangle,
      iconColor: '#dc2626',
      title: `${mask(agingSales.days30plus)} Pending in 30+ Day Overdue Aging`,
      description: 'Customer receivables outstanding over 30 days slow down working capital. A gentle WhatsApp statement or payment reminder accelerates recovery.',
      actionLabel: 'View Pending Debtors',
      actionPath: '/documents',
      whatsappPrompt: true
    });
  }

  // Insight 2: High Performing State / Region
  const bestState = stateWiseSales.length > 0 
    ? [...stateWiseSales].sort((a, b) => b.total - a.total)[0] 
    : null;

  if (bestState && bestState.total > 0) {
    const pct = stats.sales > 0 ? ((bestState.total / stats.sales) * 100).toFixed(0) : 0;
    insights.push({
      id: 'geography',
      type: 'success',
      badge: 'Territory Champion',
      badgeColor: '#059669',
      badgeBg: '#d1fae5',
      icon: TrendingUp,
      iconColor: '#059669',
      title: `${bestState.state} Drives ${pct}% of Total Revenue`,
      description: `Sales from ${bestState.state} have reached ${mask(bestState.total)}. Double down on repeat orders or target similar client profiles in nearby regions.`,
      actionLabel: 'Inspect Regional Map',
      actionPath: '/documents'
    });
  }

  // Insight 3: Inventory Health / Reorder Check
  const urgentRestock = (inventoryStats?.lowStock || 0) + (inventoryStats?.zeroStock || 0);
  if (urgentRestock > 0) {
    insights.push({
      id: 'inventory-urgent',
      type: 'warning',
      badge: 'Replenishment Notice',
      badgeColor: '#b45309',
      badgeBg: '#fef3c7',
      icon: AlertTriangle,
      iconColor: '#d97706',
      title: `${urgentRestock} SKUs Approaching Depletion Buffer`,
      description: 'Reorder alerts triggered for fast-moving items. Generate purchase orders promptly to prevent stockouts and fulfill upcoming sales orders.',
      actionLabel: 'Restock Products',
      actionPath: '/products'
    });
  } else {
    insights.push({
      id: 'inventory-healthy',
      type: 'info',
      badge: 'Inventory Optimum',
      badgeColor: '#0284c7',
      badgeBg: '#e0f2fe',
      icon: ShieldCheck,
      iconColor: '#0284c7',
      title: 'Catalog Health Fully Guarded Against Shortages',
      description: 'All listed SKUs are stocked safely above reorder points. Zero emergency stockouts projected over the current cycle.',
      actionLabel: 'Inspect Stock Valuation',
      actionPath: '/products'
    });
  }

  // Insight 4: Operating Profit Margin
  if (stats.sales > 0) {
    const margin = ((stats.netProfit / stats.sales) * 100).toFixed(1);
    insights.push({
      id: 'margins',
      type: Number(margin) >= 0 ? 'success' : 'warning',
      badge: 'Financial Intelligence',
      badgeColor: '#7c3aed',
      badgeBg: '#ede9fe',
      icon: Zap,
      iconColor: '#7c3aed',
      title: `Net Operating Margin at ${margin}%`,
      description: Number(margin) >= 0 
        ? `Solid operating efficiency. After accounting for all expenses (${mask(stats.expenses)}) and purchases, your bottom line is positive at ${mask(stats.netProfit)}.`
        : `Operating expenses and purchases exceed turnover for the period. Review discretionary overheads to bring margins back into the green.`,
      actionLabel: 'Analyze Expenses',
      actionPath: '/expenses/daily'
    });
  }

  if (insights.length === 0) return null;

  const currentInsight = insights[activeSlide % insights.length];
  const Icon = currentInsight.icon;

  const handleNext = () => {
    setActiveSlide((prev) => (prev + 1) % insights.length);
  };

  const handlePrev = () => {
    setActiveSlide((prev) => (prev - 1 + insights.length) % insights.length);
  };

  return (
    <div className="glass db-smart-card">
      <div className="db-smart-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="db-smart-badge-icon">
            <Sparkles size={16} color="#ffffff" />
          </span>
          <div>
            <h4 className="db-smart-title">Smart Business Copilot Insights</h4>
            <span className="db-smart-subtitle">Real-time algorithmic observations & actionable opportunities</span>
          </div>
        </div>

        <div className="db-smart-controls">
          <span className="db-smart-counter">
            {activeSlide + 1} of {insights.length}
          </span>
          <button 
            className="db-smart-arrow" 
            onClick={handlePrev}
            aria-label="Previous Insight"
            title="Previous Insight"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            className="db-smart-arrow" 
            onClick={handleNext}
            aria-label="Next Insight"
            title="Next Insight"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="db-smart-body">
        <div className="db-smart-body-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.4rem' }}>
            <span 
              className="db-smart-pill"
              style={{ color: currentInsight.badgeColor, backgroundColor: currentInsight.badgeBg }}
            >
              {currentInsight.badge}
            </span>
          </div>

          <h5 className="db-smart-insight-title">
            <Icon size={18} color={currentInsight.iconColor} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{currentInsight.title}</span>
          </h5>

          <p className="db-smart-insight-desc">
            {currentInsight.description}
          </p>
        </div>

        <div className="db-smart-body-right">
          <button
            className="btn btn-primary db-smart-action-btn"
            onClick={() => navigate(currentInsight.actionPath)}
          >
            {currentInsight.actionLabel} <ArrowRight size={14} />
          </button>

          {currentInsight.whatsappPrompt && (
            <button
              className="btn btn-secondary db-smart-wa-btn"
              onClick={() => {
                const text = encodeURIComponent(`Namaste, this is a gentle reminder regarding pending invoices. Please review your account statement. Thank you!`);
                window.open(`https://wa.me/?text=${text}`, '_blank');
              }}
              title="Open WhatsApp Web to send payment reminder"
            >
              <MessageCircle size={15} color="#16a34a" /> WhatsApp Reminder
            </button>
          )}
        </div>
      </div>

      {/* Progress Dots */}
      <div className="db-smart-dots">
        {insights.map((_, i) => (
          <button
            key={i}
            className={`db-smart-dot ${i === activeSlide ? 'active' : ''}`}
            onClick={() => setActiveSlide(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default SmartBusinessIntelligence;
