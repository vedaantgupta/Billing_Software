import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, ShoppingCart, FileEdit, Truck, FileCheck,
  ClipboardList, Briefcase, FileMinus, FilePlus,
  ArrowDownCircle, ArrowUpCircle, BadgePercent
} from 'lucide-react';
import './DocumentTypeSelection.css';

const categories = [
  {
    title: 'SALES & INCOME',
    color: 'emerald',
    items: [
      { id: 'sale-invoice', label: 'Sale Invoice', icon: FileText, color: '#10b981', desc: 'Direct sales to customers' },
      { id: 'proforma-invoice', label: 'Proforma Invoice', icon: FileEdit, color: '#059669', desc: 'Pre-sales quotations' },
      { id: 'sale-order', label: 'Sale Order', icon: FileCheck, color: '#10b981', desc: 'Confirmed orders from clients' },
      { id: 'delivery-challan', label: 'Delivery Challan', icon: Truck, color: '#10b981', desc: 'Goods movement records' },
      { id: 'offer', label: 'Offer', icon: BadgePercent, color: '#f59e0b', desc: 'Pre-order quotations' },
      { id: 'credit-note', label: 'Credit Note', icon: FileMinus, color: '#ef4444', desc: 'Sales returns & adjustments' },
    ]
  },
  {
    title: 'PURCHASE & EXPENSE',
    color: 'indigo',
    items: [
      { id: 'purchase-invoice', label: 'Purchase Invoice', icon: ShoppingCart, color: '#6366f1', desc: 'Items bought from vendors' },
      { id: 'purchase-order', label: 'Purchase Order', icon: ClipboardList, color: '#4f46e5', desc: 'Orders sent to suppliers' },
      { id: 'debit-note', label: 'Debit Note', icon: FilePlus, color: '#3b82f6', desc: 'Purchase returns & adjustments' },
    ]
  },
  {
    title: 'OPERATIONS',
    color: 'slate',
    items: [
      { id: 'job-work', label: 'Job Work', icon: Briefcase, color: '#64748b', desc: 'Production and processing' },
    ]
  },
  {
    title: 'PAYMENTS',
    color: 'rose',
    items: [
      { id: 'inward-payment', label: 'Inward Payment', icon: ArrowDownCircle, color: '#10b981', desc: 'Cash/Online receipts' },
      { id: 'outward-payment', label: 'Outward Payment', icon: ArrowUpCircle, color: '#ef4444', desc: 'Payments made to others' },
    ]
  }
];

const DocumentTypeSelection = () => {
  const navigate = useNavigate();

  const handleSelect = (type) => {
    if (type.id === 'purchase-invoice') {
      navigate('/documents/purchase/new');
    } else if (type.id === 'sale-invoice') {
      navigate('/documents/sale/new');
    } else if (type.id === 'offer') {
      navigate('/documents/quotation/new');
    } else if (type.id === 'purchase-order') {
      navigate('/documents/purchase-order/new');
    } else if (type.id === 'sale-order') {
      navigate('/documents/sale-order/new');
    } else if (type.id === 'delivery-challan') {
      navigate('/documents/delivery-challan/new');
    } else if (type.id === 'proforma-invoice') {
      navigate('/documents/proforma/new');
    } else if (type.id === 'job-work') {
      navigate('/documents/job-work/new');
    } else if (type.id === 'credit-note') {
      navigate('/documents/credit-note/new');
    } else if (type.id === 'debit-note') {
      navigate('/documents/debit-note/new');
    } else if (type.id === 'inward-payment') {
      navigate('/payments/inward/new');
    } else if (type.id === 'outward-payment') {
      navigate('/payments/outward/new');
    } else {
      navigate(`/documents/sale/new?type=${encodeURIComponent(type.label)}`);
    }
  };

  return (
    <div className="doc-selection-page-wrapper">
      <div className="doc-selection-inner glass">
        <div className="doc-selection-header">
          <div className="header-content">
            <h1 className="header-title">Create New Document</h1>
            <p className="header-subtitle">Select the document type to create your document</p>
          </div>
          <button className="back-list-btn" onClick={() => navigate('/documents')}>
            View Recent Documents
          </button>
        </div>

        <div className="categories-stack">
          {categories.map((cat, idx) => (
            <div key={idx} className={`category-section ${cat.color}`}>
              <div className="category-info">
                <h2 className="category-title">{cat.title}</h2>
                <div className="category-line"></div>
              </div>

              <div className="doc-selection-grid">
                {cat.items.map((type) => (
                  <div
                    key={type.id}
                    className="doc-selection-card"
                    onClick={() => handleSelect(type)}
                  >
                    <div className="card-accent" style={{ backgroundColor: type.color }}></div>
                    <div className="icon-box" style={{ background: `${type.color}15`, color: type.color }}>
                      <type.icon size={28} strokeWidth={2.2} />
                    </div>
                    <div className="card-text">
                      <span className="card-label">{type.label}</span>
                      <span className="card-desc">{type.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DocumentTypeSelection;
