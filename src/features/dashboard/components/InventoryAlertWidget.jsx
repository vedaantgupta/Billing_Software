import React from 'react';
import { AlertTriangle, ArrowRight, Package, ShieldCheck, CheckCircle2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const InventoryAlertWidget = ({ products = [] }) => {
  const navigate = useNavigate();

  // Low stock condition: stock <= minStock / reorderLevel or stock <= 5
  const lowStockItems = products.filter(p => {
    const qty = Number(p.quantity || p.stock || p.openingStock || 0);
    const minQty = Number(p.minStock || p.reorderLevel || 5);
    return qty <= minQty;
  });

  if (lowStockItems.length === 0) {
    return (
      <div className="glass db-alert-card db-alert-card-healthy">
        <div>
          <div className="db-alert-header">
            <div className="db-alert-icon-ring healthy">
              <ShieldCheck size={18} color="#059669" />
            </div>
            <h4 className="db-alert-title healthy">
              Inventory Health: Optimal & Protected
            </h4>
          </div>
          <p className="db-alert-text healthy">
            All {products.length > 0 ? products.length : 'active'} catalog items are stocked safely above reorder levels. Zero stockout bottlenecks detected today.
          </p>

          <div className="db-alert-items">
            <span className="db-alert-chip healthy">
              <CheckCircle2 size={13} color="#059669" />
              100% In-Stock Ratio
            </span>
            <span className="db-alert-chip healthy">
              <TrendingUp size={13} color="#059669" />
              Stock Turnover: Active
            </span>
            <span className="db-alert-chip healthy">
              <Package size={13} color="#059669" />
              {products.length} Tracked SKUs
            </span>
          </div>
        </div>

        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/products')}
          style={{
            borderColor: '#a7f3d0',
            color: '#047857',
            backgroundColor: '#ffffff',
            whiteSpace: 'nowrap',
            fontSize: '0.8rem',
            padding: '0.45rem 0.85rem',
            fontWeight: 700,
            borderRadius: '8px',
            alignSelf: 'flex-start',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          View Full Catalog <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="db-alert-card">
      <div>
        <div className="db-alert-header">
          <div className="db-alert-icon-ring">
            <AlertTriangle size={18} color="#dc2626" />
          </div>
          <h4 className="db-alert-title">
            Low Stock Inventory Alert ({lowStockItems.length} {lowStockItems.length === 1 ? 'item' : 'items'})
          </h4>
        </div>
        <p className="db-alert-text">
          Products requiring restocking:
        </p>

        <div className="db-alert-items">
          {lowStockItems.slice(0, 5).map((item, idx) => {
            const stockVal = Number(item.quantity || item.stock || item.openingStock || 0);
            return (
              <span key={item.id || idx} className="db-alert-chip">
                <Package size={12} color="#dc2626" />
                {item.name || item.title || 'Product'}: <strong>{stockVal} left</strong>
              </span>
            );
          })}
          {lowStockItems.length > 5 && (
            <span className="db-alert-chip" style={{ background: '#fee2e2', color: '#991b1b' }}>
              +{lowStockItems.length - 5} more
            </span>
          )}
        </div>
      </div>

      <button 
        className="btn btn-secondary"
        onClick={() => navigate('/products')}
        style={{
          borderColor: '#fca5a5',
          color: '#991b1b',
          backgroundColor: '#ffffff',
          whiteSpace: 'nowrap',
          fontSize: '0.8rem',
          padding: '0.45rem 0.85rem',
          fontWeight: 700,
          borderRadius: '8px',
          alignSelf: 'flex-start',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        Manage Inventory <ArrowRight size={14} />
      </button>
    </div>
  );
};

export default InventoryAlertWidget;
