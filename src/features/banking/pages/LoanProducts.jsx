import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Plus, Edit2, Trash2, CheckCircle, ShieldAlert,
  ArrowLeft, Percent, Clock, IndianRupee, FileText, Check, X,
  Layers, Sliders, ShieldCheck
} from 'lucide-react';
import { getItems, addItem, updateItem, deleteItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import '@/features/banking/styles/LoanProducts.css';

export const DEFAULT_LOAN_PRODUCTS = [
  {
    name: 'Personal Prime Loan',
    code: 'PROD-PL-01',
    category: 'personal',
    description: 'Unsecured financing for salaried individuals for personal & medical emergencies.',
    minAmount: 50000,
    maxAmount: 1500000,
    minTenure: 6,
    maxTenure: 60,
    tenureUnit: 'months',
    interestMethod: 'reducing',
    interestRate: 11.5,
    repaymentFrequency: 'monthly',
    processingFeePercent: 1.5,
    documentationFee: 1500,
    latePenaltyPercent: 2.0,
    gracePeriodDays: 5,
    requiredDocuments: ['PAN Card', 'Aadhaar Card', '3 Months Salary Slip', '6 Months Bank Statement'],
    status: 'active'
  },
  {
    name: 'Business Growth Facility',
    code: 'PROD-BL-02',
    category: 'business',
    description: 'Working capital and asset purchase loan for small and medium enterprises.',
    minAmount: 200000,
    maxAmount: 10000000,
    minTenure: 12,
    maxTenure: 84,
    tenureUnit: 'months',
    interestMethod: 'reducing',
    interestRate: 13.0,
    repaymentFrequency: 'monthly',
    processingFeePercent: 2.0,
    documentationFee: 3500,
    latePenaltyPercent: 2.5,
    gracePeriodDays: 7,
    requiredDocuments: ['GST Certificate', 'Business PAN', '2 Years ITR', '1 Year Bank Statement', 'Business Address Proof'],
    status: 'active'
  },
  {
    name: 'Micro-Enterprise Express',
    code: 'PROD-ME-03',
    category: 'micro',
    description: 'Quick micro loans for traders, artisans, and self-employed entrepreneurs.',
    minAmount: 20000,
    maxAmount: 200000,
    minTenure: 3,
    maxTenure: 24,
    tenureUnit: 'months',
    interestMethod: 'flat',
    interestRate: 14.0,
    repaymentFrequency: 'monthly',
    processingFeePercent: 1.0,
    documentationFee: 500,
    latePenaltyPercent: 1.5,
    gracePeriodDays: 3,
    requiredDocuments: ['Aadhaar Card', 'PAN Card', 'Bank Passbook', 'Trade License / Shop Photo'],
    status: 'active'
  },
  {
    name: 'Vehicle & Equipment Asset Loan',
    code: 'PROD-VEH-04',
    category: 'vehicle',
    description: 'Secured asset loan for commercial vehicles, machinery, and fleet purchase.',
    minAmount: 150000,
    maxAmount: 5000000,
    minTenure: 12,
    maxTenure: 60,
    tenureUnit: 'months',
    interestMethod: 'reducing',
    interestRate: 9.5,
    repaymentFrequency: 'monthly',
    processingFeePercent: 1.0,
    documentationFee: 2000,
    latePenaltyPercent: 2.0,
    gracePeriodDays: 5,
    requiredDocuments: ['Identity Proof', 'Proforma Invoice / Quotation', 'Bank Statements', 'Collateral / Hypothecation Deed'],
    status: 'active'
  }
];

const LoanProducts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [form, setForm] = useState({
    name: '',
    code: '',
    category: 'personal',
    description: '',
    minAmount: 50000,
    maxAmount: 1000000,
    minTenure: 6,
    maxTenure: 36,
    tenureUnit: 'months',
    interestMethod: 'reducing',
    interestRate: 12.0,
    repaymentFrequency: 'monthly',
    processingFeePercent: 1.5,
    documentationFee: 1000,
    latePenaltyPercent: 2.0,
    gracePeriodDays: 5,
    requiredDocsInput: 'PAN Card, Aadhaar Card, Bank Statement',
    status: 'active'
  });

  const loadProducts = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      let fetched = await getItems('loan_products', user.id);
      if (!fetched || fetched.length === 0) {
        // Seed default products
        const seeded = [];
        for (const p of DEFAULT_LOAN_PRODUCTS) {
          const res = await addItem('loan_products', p, user.id);
          seeded.push(res || p);
        }
        setProducts(seeded);
      } else {
        setProducts(fetched);
      }
    } catch (err) {
      console.error('Failed to load loan products:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setForm({
        ...product,
        requiredDocsInput: Array.isArray(product.requiredDocuments) ? product.requiredDocuments.join(', ') : (product.requiredDocsInput || '')
      });
    } else {
      setEditingProduct(null);
      setForm({
        name: '',
        code: `PROD-${Date.now().toString().slice(-4)}`,
        category: 'personal',
        description: '',
        minAmount: 50000,
        maxAmount: 1000000,
        minTenure: 6,
        maxTenure: 36,
        tenureUnit: 'months',
        interestMethod: 'reducing',
        interestRate: 12.0,
        repaymentFrequency: 'monthly',
        processingFeePercent: 1.5,
        documentationFee: 1000,
        latePenaltyPercent: 2.0,
        gracePeriodDays: 5,
        requiredDocsInput: 'PAN Card, Aadhaar Card, Bank Statement',
        status: 'active'
      });
    }
    setShowModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    const docs = form.requiredDocsInput.split(',').map(s => s.trim()).filter(Boolean);
    const productPayload = {
      ...form,
      minAmount: parseFloat(form.minAmount) || 0,
      maxAmount: parseFloat(form.maxAmount) || 0,
      minTenure: parseInt(form.minTenure) || 1,
      maxTenure: parseInt(form.maxTenure) || 1,
      interestRate: parseFloat(form.interestRate) || 0,
      processingFeePercent: parseFloat(form.processingFeePercent) || 0,
      documentationFee: parseFloat(form.documentationFee) || 0,
      latePenaltyPercent: parseFloat(form.latePenaltyPercent) || 0,
      gracePeriodDays: parseInt(form.gracePeriodDays) || 0,
      requiredDocuments: docs
    };

    try {
      if (editingProduct) {
        const id = editingProduct.id || editingProduct._dbId;
        await updateItem('loan_products', id, productPayload, user.id);
      } else {
        await addItem('loan_products', productPayload, user.id);
      }
      setShowModal(false);
      loadProducts();
    } catch (err) {
      console.error('Failed to save loan product:', err);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this loan product configuration?')) return;
    try {
      await deleteItem('loan_products', id, user.id);
      loadProducts();
    } catch (err) {
      console.error('Failed to delete product:', err);
    }
  };

  return (
    <div className="lp-container">
      {/* Header */}
      <div className="lp-header">
        <div className="lp-header-left">
          <button className="btn btn-ghost" onClick={() => navigate('/loans')} style={{ padding: '0.4rem', marginRight: '0.5rem' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="lp-title">
              <div className="lp-title-icon"><Layers size={22} /></div>
              Loan Product Catalog
            </h1>
            <div className="lp-subtitle">
              Configure loan schemes, interest rules, fee models, and eligibility guidelines
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            <Plus size={18} /> New Loan Product
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
          Loading configured loan products...
        </div>
      ) : (
        <div className="lp-grid">
          {products.map(p => {
            const id = p.id || p._dbId;
            return (
              <div className="lp-card" key={id}>
                <div>
                  <div className="lp-card-header">
                    <div>
                      <div className="lp-product-code">{p.code}</div>
                      <div className="lp-product-name">{p.name}</div>
                    </div>
                    <span className={`lp-badge ${p.status || 'active'}`}>{p.status || 'active'}</span>
                  </div>

                  <div className="lp-product-desc">{p.description}</div>

                  <div className="lp-specs-grid">
                    <div className="lp-spec-item">
                      <span className="lp-spec-label">Amount Range</span>
                      <span className="lp-spec-value">₹{(p.minAmount || 0).toLocaleString()} – ₹{(p.maxAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="lp-spec-item">
                      <span className="lp-spec-label">Tenure</span>
                      <span className="lp-spec-value">{p.minTenure} – {p.maxTenure} {p.tenureUnit || 'Months'}</span>
                    </div>
                    <div className="lp-spec-item">
                      <span className="lp-spec-label">Interest</span>
                      <span className="lp-spec-value" style={{ color: '#4f46e5' }}>{p.interestRate}% ({p.interestMethod})</span>
                    </div>
                    <div className="lp-spec-item">
                      <span className="lp-spec-label">Proc Fee / Docs</span>
                      <span className="lp-spec-value">{p.processingFeePercent}% + ₹{p.documentationFee}</span>
                    </div>
                  </div>

                  <div className="lp-docs-list">
                    <div className="lp-docs-title">Required Documents</div>
                    {(p.requiredDocuments || []).map((doc, i) => (
                      <span key={i} className="lp-doc-tag">{doc}</span>
                    ))}
                  </div>
                </div>

                <div className="lp-card-actions">
                  <button className="btn btn-secondary btn-sm" onClick={() => handleOpenModal(p)}>
                    <Edit2 size={14} /> Edit
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteProduct(id)} style={{ color: '#ef4444' }}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="lp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="lp-modal" onClick={e => e.stopPropagation()}>
            <div className="lp-modal-header">
              <h2 className="lp-modal-title">
                {editingProduct ? 'Edit Loan Product' : 'Create New Loan Product'}
              </h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className="lp-modal-body">
                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Product Name *</label>
                    <input 
                      required 
                      value={form.name} 
                      onChange={e => setForm({ ...form, name: e.target.value })} 
                      placeholder="e.g. Commercial Machinery Loan"
                    />
                  </div>
                  <div className="lp-field">
                    <label>Product Code *</label>
                    <input 
                      required 
                      value={form.code} 
                      onChange={e => setForm({ ...form, code: e.target.value })} 
                      placeholder="e.g. PROD-CML-05"
                    />
                  </div>
                </div>

                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Category</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      <option value="personal">Personal Loan</option>
                      <option value="business">Business Loan</option>
                      <option value="micro">Micro-Enterprise</option>
                      <option value="vehicle">Vehicle / Equipment</option>
                      <option value="working_capital">Working Capital</option>
                      <option value="custom">Custom Facility</option>
                    </select>
                  </div>
                  <div className="lp-field">
                    <label>Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option value="active">Active (Available in Origination)</option>
                      <option value="draft">Draft / Under Review</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="lp-field">
                  <label>Description</label>
                  <textarea 
                    rows={2} 
                    value={form.description} 
                    onChange={e => setForm({ ...form, description: e.target.value })} 
                    placeholder="Brief description of the target borrower and loan purpose..."
                  />
                </div>

                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Min Principal (₹)</label>
                    <input 
                      type="number" 
                      value={form.minAmount} 
                      onChange={e => setForm({ ...form, minAmount: e.target.value })} 
                    />
                  </div>
                  <div className="lp-field">
                    <label>Max Principal (₹)</label>
                    <input 
                      type="number" 
                      value={form.maxAmount} 
                      onChange={e => setForm({ ...form, maxAmount: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Interest Rate (% P.A.)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={form.interestRate} 
                      onChange={e => setForm({ ...form, interestRate: e.target.value })} 
                    />
                  </div>
                  <div className="lp-field">
                    <label>Interest Method</label>
                    <select value={form.interestMethod} onChange={e => setForm({ ...form, interestMethod: e.target.value })}>
                      <option value="reducing">Reducing Balance (Standard EMI)</option>
                      <option value="flat">Flat Interest Rate</option>
                      <option value="simple">Simple Interest</option>
                      <option value="bullet">Bullet Repayment (Principal at Maturity)</option>
                      <option value="none">Zero Interest (0%)</option>
                    </select>
                  </div>
                </div>

                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Tenure Range ({form.tenureUnit})</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="number" 
                        placeholder="Min"
                        value={form.minTenure} 
                        onChange={e => setForm({ ...form, minTenure: e.target.value })} 
                        style={{ width: '50%' }}
                      />
                      <input 
                        type="number" 
                        placeholder="Max"
                        value={form.maxTenure} 
                        onChange={e => setForm({ ...form, maxTenure: e.target.value })} 
                        style={{ width: '50%' }}
                      />
                    </div>
                  </div>
                  <div className="lp-field">
                    <label>Repayment Frequency</label>
                    <select value={form.repaymentFrequency} onChange={e => setForm({ ...form, repaymentFrequency: e.target.value })}>
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="bi-weekly">Bi-Weekly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Processing Fee (% of Principal)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={form.processingFeePercent} 
                      onChange={e => setForm({ ...form, processingFeePercent: e.target.value })} 
                    />
                  </div>
                  <div className="lp-field">
                    <label>Documentation Fee (Fixed ₹)</label>
                    <input 
                      type="number" 
                      value={form.documentationFee} 
                      onChange={e => setForm({ ...form, documentationFee: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="lp-form-row">
                  <div className="lp-field">
                    <label>Late Penalty (% / month)</label>
                    <input 
                      type="number" 
                      step="0.1" 
                      value={form.latePenaltyPercent} 
                      onChange={e => setForm({ ...form, latePenaltyPercent: e.target.value })} 
                    />
                  </div>
                  <div className="lp-field">
                    <label>Grace Period (Days before penalty)</label>
                    <input 
                      type="number" 
                      value={form.gracePeriodDays} 
                      onChange={e => setForm({ ...form, gracePeriodDays: e.target.value })} 
                    />
                  </div>
                </div>

                <div className="lp-field">
                  <label>Required KYC & Proof Documents (comma separated)</label>
                  <input 
                    value={form.requiredDocsInput} 
                    onChange={e => setForm({ ...form, requiredDocsInput: e.target.value })} 
                    placeholder="e.g. PAN Card, Aadhaar Card, 3 Months Salary Slip, GST Return"
                  />
                </div>
              </div>

              <div className="lp-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Loan Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanProducts;
