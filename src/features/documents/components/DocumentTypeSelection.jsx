import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, ShoppingCart, FileEdit, Truck, FileCheck,
  ClipboardList, Briefcase, FileMinus, FilePlus,
  ArrowDownCircle, ArrowUpCircle, BadgePercent, Mail,
  ArrowLeft, ArrowRight
} from 'lucide-react';
import '@/features/documents/styles/DocumentTypeSelection.css';

const categories = [
  {
    title: 'SALES & INCOME',
    color: 'emerald',
    badgeColor: '#10b981',
    items: [
      { id: 'sale-invoice', label: 'Sale Invoice', icon: FileText, color: '#10b981', desc: 'Direct sales to customers with GST' },
      { id: 'proforma-invoice', label: 'Proforma Invoice', icon: FileEdit, color: '#059669', desc: 'Pre-sales quotations & estimates' },
      { id: 'sale-order', label: 'Sale Order', icon: FileCheck, color: '#047857', desc: 'Confirmed orders from clients' },
      { id: 'delivery-challan', label: 'Delivery Challan', icon: Truck, color: '#0284c7', desc: 'Goods movement & transport records' },
      { id: 'offer', label: 'Offer / Quotation', icon: BadgePercent, color: '#f59e0b', desc: 'Pre-order quotations & proposals' },
      { id: 'credit-note', label: 'Credit Note', icon: FileMinus, color: '#ef4444', desc: 'Sales returns & rate adjustments' },
    ]
  },
  {
    title: 'PURCHASE & EXPENSE',
    color: 'indigo',
    badgeColor: '#4f46e5',
    items: [
      { id: 'purchase-invoice', label: 'Purchase Invoice', icon: ShoppingCart, color: '#4f46e5', desc: 'Inward goods bought from vendors' },
      { id: 'purchase-order', label: 'Purchase Order', icon: ClipboardList, color: '#6366f1', desc: 'Commercial orders sent to suppliers' },
      { id: 'debit-note', label: 'Debit Note', icon: FilePlus, color: '#3b82f6', desc: 'Purchase returns & supplier claims' },
    ]
  },
  {
    title: 'OPERATIONS',
    color: 'purple',
    badgeColor: '#7c3aed',
    items: [
      { id: 'job-work', label: 'Job Work', icon: Briefcase, color: '#7c3aed', desc: 'Outsourced production and processing' },
      { id: 'letter', label: 'Letter', icon: Mail, color: '#64748b', desc: 'Formal business letters & notices' },
    ]
  },
  {
    title: 'PAYMENTS',
    color: 'rose',
    badgeColor: '#e11d48',
    items: [
      { id: 'inward-payment', label: 'Inward Payment', icon: ArrowDownCircle, color: '#10b981', desc: 'Cash, Bank & UPI receipts' },
      { id: 'outward-payment', label: 'Outward Payment', icon: ArrowUpCircle, color: '#ef4444', desc: 'Payments made to vendors & utilities' },
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
    } else if (type.id === 'letter') {
      navigate('/documents/letters/new');
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
      <div className="doc-selection-inner">
        
        {/* Header */}
        <div className="doc-selection-header">
          <div className="header-content">
            <h1 className="header-title">Create New Document</h1>
            <p className="header-subtitle">Select the document type to create your document</p>
          </div>
          <button className="back-list-btn" onClick={() => navigate('/documents')}>
            <ArrowLeft size={16} />
            <span>View Recent Documents</span>
          </button>
        </div>

        {/* Categories Stack */}
        <div className="categories-stack">
          {categories.map((cat, idx) => (
            <div key={idx} className={`category-section ${cat.color}`}>
              <div className="category-info">
                <span className="category-dot" style={{ backgroundColor: cat.badgeColor }}></span>
                <h2 className="category-title">{cat.title}</h2>
                <div className="category-line"></div>
              </div>

              <div className="doc-selection-grid">
                {cat.items.map((type) => (
                  <div
                    key={type.id}
                    className="doc-selection-card"
                    onClick={() => handleSelect(type)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelect(type)}
                  >
                    <div className="card-accent" style={{ backgroundColor: type.color }}></div>
                    
                    <div 
                      className="icon-box" 
                      style={{ 
                        background: `${type.color}14`, 
                        color: type.color,
                        borderColor: `${type.color}25`
                      }}
                    >
                      <type.icon size={26} strokeWidth={2.2} />
                    </div>

                    <div className="card-text">
                      <span className="card-label">{type.label}</span>
                      <span className="card-desc">{type.desc}</span>
                    </div>

                    <div className="card-arrow">
                      <ArrowRight size={16} />
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
