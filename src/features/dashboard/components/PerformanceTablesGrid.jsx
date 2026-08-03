import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertTriangle, Users, Building2, ChevronRight } from 'lucide-react';

const PerformanceCard = ({ 
  title, 
  icon: Icon, 
  iconColor, 
  items = [], 
  viewAllPath, 
  nameKey = 'name', 
  valKey = 'val', 
  valPrefix = '', 
  isCurrency = false 
}) => {
  const navigate = useNavigate();

  const maxVal = items.length > 0
    ? Math.max(...items.map(it => Number(it[valKey] !== undefined ? it[valKey] : (it.sales || it.amount || it.qty || 0))))
    : 1;

  return (
    <div className="glass db-perf-card">
      <div className="db-perf-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {Icon && (
            <div style={{ padding: '4px', borderRadius: '6px', backgroundColor: `${iconColor}15`, display: 'flex', alignItems: 'center' }}>
              <Icon size={15} style={{ color: iconColor }} />
            </div>
          )}
          <h4 className="db-perf-title">{title}</h4>
        </div>
        {viewAllPath && (
          <button 
            className="db-perf-viewall"
            onClick={() => navigate(viewAllPath)}
          >
            View All <ChevronRight size={12} />
          </button>
        )}
      </div>

      <div className="db-perf-body">
        {items.length > 0 ? (
          <table className="db-perf-table">
            <thead>
              <tr>
                <th>Item / Name</th>
                <th style={{ textAlign: 'right' }}>Score / Qty</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 5).map((it, idx) => {
                const name = it[nameKey] || it.name || it.title || 'N/A';
                const rawVal = it[valKey] !== undefined ? it[valKey] : (it.sales || it.amount || it.qty || 0);
                const displayVal = isCurrency 
                  ? `₹ ${Number(rawVal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${valPrefix}${Number(rawVal).toLocaleString()}`;

                const pctShare = maxVal > 0 ? Math.min(100, Math.max(8, (Number(rawVal) / maxVal) * 100)) : 0;
                const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : '';

                return (
                  <tr key={idx}>
                    <td style={{ verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={`db-perf-rank-badge ${rankClass}`}>
                          {idx + 1}
                        </span>
                        <span className="db-perf-name" title={name}>{name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                        <span className="db-perf-val" style={{ color: isCurrency ? iconColor : 'var(--text-primary)' }}>
                          {displayVal}
                        </span>
                        <div style={{ width: '56px', height: '3px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${pctShare}%`, height: '100%', backgroundColor: iconColor, borderRadius: '2px' }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="db-perf-empty">
            <span>No records found</span>
          </div>
        )}
      </div>
    </div>
  );
};

const PerformanceTablesGrid = ({
  bestSellingProducts = [],
  leastSellingProducts = [],
  lowStockItems = [],
  topCustomers = [],
  topVendors = []
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* PAIRED ROW 1: Best Selling Products & Least Selling Products */}
      <div className="db-perf-grid">
        <PerformanceCard
          title="Best Selling Products"
          icon={TrendingUp}
          iconColor="#10b981"
          items={bestSellingProducts}
          viewAllPath="/products"
          valKey="sales"
          isCurrency={true}
        />

        <PerformanceCard
          title="Least Selling Products"
          icon={TrendingDown}
          iconColor="#f59e0b"
          items={leastSellingProducts}
          viewAllPath="/products"
          valKey="qty"
          valPrefix="Qty: "
        />
      </div>

      {/* PAIRED ROW 2: Top Customers & Top Vendors */}
      <div className="db-perf-grid">
        <PerformanceCard
          title="Top Customers"
          icon={Users}
          iconColor="#6366f1"
          items={topCustomers}
          viewAllPath="/contacts"
          valKey="total"
          isCurrency={true}
        />

        <PerformanceCard
          title="Top Vendors"
          icon={Building2}
          iconColor="#8b5cf6"
          items={topVendors}
          viewAllPath="/contacts"
          valKey="total"
          isCurrency={true}
        />
      </div>
    </div>
  );
};

export default PerformanceTablesGrid;
