import React from 'react';
import { AlertTriangle, ArrowRight, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const InventoryAlertWidget = ({ products = [] }) => {
  const navigate = useNavigate();

  // Low stock condition: stock <= minStock / reorderLevel or stock <= 5
  const lowStockItems = products.filter(p => {
    const qty = Number(p.quantity || p.stock || p.openingStock || 0);
    const minQty = Number(p.minStock || p.reorderLevel || 5);
    return qty <= minQty;
  });

  if (lowStockItems.length === 0) return null;

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
          alignSelf: 'flex-start'
        }}
      >
        Manage Inventory <ArrowRight size={14} />
      </button>
    </div>
  );
};

export default InventoryAlertWidget;
