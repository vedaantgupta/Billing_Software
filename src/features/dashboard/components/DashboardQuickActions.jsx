import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowDownLeft, ArrowUpRight, UserPlus, PackagePlus, ShoppingCart } from 'lucide-react';

const DashboardQuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'New Sale Invoice',
      icon: <FileText size={16} />,
      path: '/documents/sale/new',
      color: '#6366f1'
    },
    {
      label: 'New Purchase Bill',
      icon: <ShoppingCart size={16} />,
      path: '/documents/purchase/new',
      color: '#8b5cf6'
    },
    {
      label: 'Record Payment',
      icon: <ArrowDownLeft size={16} />,
      path: '/payments/inward/new',
      color: '#10b981'
    },
    {
      label: 'Add Expense',
      icon: <ArrowUpRight size={16} />,
      path: '/expenses/daily/new',
      color: '#f43f5e'
    },
    {
      label: 'Add Customer',
      icon: <UserPlus size={16} />,
      path: '/contacts',
      color: '#06b6d4'
    },
    {
      label: 'Add Product',
      icon: <PackagePlus size={16} />,
      path: '/products',
      color: '#f59e0b'
    }
  ];

  return (
    <div className="db-quick-actions" role="navigation" aria-label="Quick Actions Bar">
      {actions.map((act, index) => (
        <button
          key={index}
          className="db-quick-btn"
          onClick={() => navigate(act.path)}
        >
          <span 
            className="db-quick-btn-icon" 
            style={{ backgroundColor: `${act.color}18`, color: act.color }}
          >
            {act.icon}
          </span>
          <span>{act.label}</span>
        </button>
      ))}
    </div>
  );
};

export default DashboardQuickActions;
