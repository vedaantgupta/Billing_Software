import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, 
  Calendar, DollarSign, Wallet, ShieldCheck, HelpCircle, ChevronRight
} from 'lucide-react';

const CashFlowForecastWidget = ({
  agingSales = { current: 0, days1_15: 0, days16_30: 0, days30plus: 0, total: 0 },
  agingPurchases = { current: 0, days1_15: 0, days16_30: 0, days30plus: 0, total: 0 },
  stats = { expenses: 0, sales: 0 },
  inwardBreakdown = { total: 0 },
  outwardBreakdown = { total: 0 },
  privacyMode = false
}) => {
  const navigate = useNavigate();

  // Masking
  const mask = (val, prefix = '₹ ') => {
    if (privacyMode) return `${prefix}••••••`;
    return `${prefix}${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Forecast Buckets
  const estimatedExpensesWeek = (stats.expenses || 0) / 4;

  const buckets = [
    {
      period: 'Next 7 Days',
      label: 'Immediate Horizon',
      inflow: (agingSales.current * 0.45) + (agingSales.days1_15 * 0.25),
      outflow: (agingPurchases.current * 0.4) + estimatedExpensesWeek,
      color: '#6366f1'
    },
    {
      period: '8 - 15 Days',
      label: 'Mid Term Horizon',
      inflow: (agingSales.current * 0.35) + (agingSales.days16_30 * 0.3),
      outflow: (agingPurchases.current * 0.35) + estimatedExpensesWeek,
      color: '#10b981'
    },
    {
      period: '16 - 30 Days',
      label: 'Month End Cycle',
      inflow: (agingSales.current * 0.2) + (agingSales.days30plus * 0.25),
      outflow: (agingPurchases.current * 0.25) + (estimatedExpensesWeek * 2),
      color: '#8b5cf6'
    }
  ];

  const totalProjectedInflows = buckets.reduce((acc, b) => acc + b.inflow, 0);
  const totalProjectedOutflows = buckets.reduce((acc, b) => acc + b.outflow, 0);
  const projectedNetLiquidity = totalProjectedInflows - totalProjectedOutflows;

  return (
    <div className="glass db-forecast-card">
      <div className="db-forecast-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="db-forecast-icon-box">
            <Wallet size={16} color="var(--primary-color)" />
          </div>
          <div>
            <h4 className="db-forecast-title">30-Day Working Capital & Cash Inflow/Outflow Forecast</h4>
            <span className="db-forecast-subtitle">Anticipated collections against planned vendor liabilities</span>
          </div>
        </div>

        <button 
          className="btn btn-secondary db-forecast-btn"
          onClick={() => navigate('/ledger')}
        >
          Open Khata Ledger <ChevronRight size={14} />
        </button>
      </div>

      {/* Summary KPI Highlights */}
      <div className="db-forecast-kpis">
        <div className="db-forecast-kpi-item inflow">
          <div className="db-kpi-top">
            <ArrowDownLeft size={14} color="#059669" />
            <span>Projected Inflows (30D)</span>
          </div>
          <div className="db-kpi-val" style={{ color: '#059669' }}>
            {mask(totalProjectedInflows)}
          </div>
          <span className="db-kpi-sub">Customer receivables scheduled</span>
        </div>

        <div className="db-forecast-kpi-item outflow">
          <div className="db-kpi-top">
            <ArrowUpRight size={14} color="#dc2626" />
            <span>Projected Outflows (30D)</span>
          </div>
          <div className="db-kpi-val" style={{ color: '#dc2626' }}>
            {mask(totalProjectedOutflows)}
          </div>
          <span className="db-kpi-sub">Vendor bills + overheads</span>
        </div>

        <div className="db-forecast-kpi-item net">
          <div className="db-kpi-top">
            <ShieldCheck size={14} color={projectedNetLiquidity >= 0 ? '#0284c7' : '#f59e0b'} />
            <span>Net Projected Liquidity</span>
          </div>
          <div className="db-kpi-val" style={{ color: projectedNetLiquidity >= 0 ? '#0284c7' : '#f59e0b' }}>
            {mask(projectedNetLiquidity)}
          </div>
          <span className="db-kpi-sub">
            {projectedNetLiquidity >= 0 ? 'Comfortable liquidity cushion' : 'Tight cash flow watch recommended'}
          </span>
        </div>
      </div>

      {/* 3 Horizon Buckets */}
      <div className="db-forecast-buckets-grid">
        {buckets.map((b, i) => {
          const net = b.inflow - b.outflow;
          const maxVal = Math.max(b.inflow, b.outflow, 1);
          const inPct = Math.min(100, Math.round((b.inflow / maxVal) * 100));
          const outPct = Math.min(100, Math.round((b.outflow / maxVal) * 100));

          return (
            <div key={i} className="db-forecast-bucket-card">
              <div className="db-bucket-header">
                <div>
                  <h5 className="db-bucket-period">{b.period}</h5>
                  <span className="db-bucket-label">{b.label}</span>
                </div>
                <span className={`db-bucket-badge ${net >= 0 ? 'surplus' : 'deficit'}`}>
                  {net >= 0 ? '+ Surplus' : '- Deficit'}
                </span>
              </div>

              <div className="db-bucket-bars">
                {/* Inflow row */}
                <div className="db-bar-row">
                  <div className="db-bar-meta">
                    <span style={{ color: '#059669', fontWeight: 700 }}>Inflow:</span>
                    <strong style={{ color: '#059669' }}>{mask(b.inflow)}</strong>
                  </div>
                  <div className="db-bar-track">
                    <div className="db-bar-fill inflow" style={{ width: `${inPct}%` }} />
                  </div>
                </div>

                {/* Outflow row */}
                <div className="db-bar-row">
                  <div className="db-bar-meta">
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>Outflow:</span>
                    <strong style={{ color: '#dc2626' }}>{mask(b.outflow)}</strong>
                  </div>
                  <div className="db-bar-track">
                    <div className="db-bar-fill outflow" style={{ width: `${outPct}%` }} />
                  </div>
                </div>
              </div>

              <div className="db-bucket-footer">
                <span>Net Position:</span>
                <strong style={{ color: net >= 0 ? '#059669' : '#dc2626' }}>
                  {mask(net)}
                </strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CashFlowForecastWidget;
