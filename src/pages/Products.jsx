import React, { useState, useEffect, useCallback } from 'react';
import { getItems, addItem, updateItem, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle, Package, Briefcase, Trash2, Camera, Barcode as BarcodeIcon, ExternalLink } from 'lucide-react';
import Barcode from 'react-barcode';

const UNITS = ['Pieces (PCS)', 'Numbers (NOS)', 'Kilograms (KGS)', 'Grams (GMS)', 'Meters (MTR)', 'Centimeters (CMS)', 'Liters (LTR)', 'Milliliters (MLT)', 'Boxes (BOX)', 'Packets (PAC)', 'Dozens (DZN)', 'Rolls (ROL)', 'Tons (TON)'];
const TAX_RATES = ['0', '5', '12', '18', '28'];
const INVENTORY_TYPES = ['Normal', 'Batch-wise', 'Serial Number-wise'];
const PRODUCT_GROUPS = ['Electronics', 'FMCG', 'Apparel', 'Services', 'Furniture', 'Hardware', 'Software', 'Others'];

const Products = () => {
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    itemType: 'product',
    name: '',
    description: '',
    hsn: '',
    unit: 'Pieces (PCS)',
    purchasePrice: '',
    sellingPrice: '',
    taxRate: '18',
    cessPercent: '0',
    cessAmount: '0',
    mrp: '',
    saleDiscount: '0',
    inventoryType: 'Normal',
    openingStock: '0',
    lowStockAlert: '5',
    productGroup: 'Others',
    batch: '',
    expiry: '',
    barcodeStr: '',
    image: null
  });

  const { user } = useAuth();
  const navigate = useNavigate();

  const loadProducts = useCallback(async () => {
    if (user?.id) {
      const data = await getItems('products', user.id);
      setProducts(data);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProducts();
  }, [user, loadProducts]);

  const handleEdit = (product) => {
    setFormData({
      itemType: product.itemType || 'product',
      name: product.name || '',
      description: product.description || '',
      hsn: product.hsn || '',
      unit: product.unit || 'Pieces (PCS)',
      purchasePrice: product.purchasePrice || '',
      sellingPrice: product.sellingPrice || '',
      taxRate: String(product.taxRate || '18'),
      cessPercent: String(product.cessPercent || '0'),
      cessAmount: String(product.cessAmount || '0'),
      mrp: product.mrp || '',
      saleDiscount: String(product.saleDiscount || '0'),
      inventoryType: product.inventoryType || 'Normal',
      openingStock: String(product.stock || '0'),
      lowStockAlert: String(product.lowStockAlert || '5'),
      productGroup: product.productGroup || 'Others',
      batch: product.batch || '',
      expiry: product.expiry || '',
      barcodeStr: product.barcodeStr || '',
      image: product.image || null
    });
    setEditingId(product.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        const success = await deleteItem('products', id, user.id);
        if (success) {
          await loadProducts();
        }
      } catch (err) {
        console.error('Failed to delete item:', err);
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      const barcodeVal = formData.barcodeStr || (formData.itemType === 'product' ? Date.now().toString().slice(-10) : '');
      const itemData = {
        ...formData,
        purchasePrice: Number(formData.purchasePrice) || 0,
        sellingPrice: Number(formData.sellingPrice) || 0,
        taxRate: Number(formData.taxRate) || 0,
        stock: Number(formData.openingStock) || 0,
        lowStockAlert: Number(formData.lowStockAlert) || 5,
        mrp: Number(formData.mrp) || 0,
        saleDiscount: Number(formData.saleDiscount) || 0,
        cessPercent: Number(formData.cessPercent) || 0,
        cessAmount: Number(formData.cessAmount) || 0,
        barcodeStr: barcodeVal
      };

      let result;
      if (editingId) {
        result = await updateItem('products', editingId, itemData, user.id);
      } else {
        result = await addItem('products', itemData, user.id);
      }

      if (result) {
        setIsModalOpen(false);
        await loadProducts();
        setEditingId(null);
        setFormData({
          itemType: 'product',
          name: '',
          description: '',
          hsn: '',
          unit: 'Pieces (PCS)',
          purchasePrice: '',
          sellingPrice: '',
          taxRate: '18',
          cessPercent: '0',
          cessAmount: '0',
          mrp: '',
          saleDiscount: '0',
          inventoryType: 'Normal',
          openingStock: '0',
          lowStockAlert: '5',
          productGroup: 'Others',
          batch: '',
          expiry: '',
          barcodeStr: '',
          image: null
        });
      }
    } catch (err) {
      console.error('Failed to save item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const lowStockCount = products.filter(p => p.itemType === 'product' && p.stock <= (Number(p.lowStockAlert) || 5)).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products & Inventory</h1>
          {lowStockCount > 0 && (
            <p style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontWeight: 600 }}>
              <AlertTriangle size={16} /> {lowStockCount} items are running low on stock!
            </p>
          )}
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingId(null); setIsModalOpen(true); }}>
          <Plus size={18} /> Add Product
        </button>
      </div>

      <div className="glass" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', background: '#f8fafc' }}>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Item Details</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>HSN/SAC</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Financials</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Stock Status</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Identifiers</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p._dbId} style={{ borderBottom: '1px solid var(--border-color)', background: p.itemType === 'product' && p.stock <= (Number(p.lowStockAlert) || 5) ? 'rgba(254, 226, 226, 0.3)' : 'transparent' }}>
                <td style={{ padding: '1rem' }}>
                  <div className="flex items-center gap-3">
                    {p.image ? (
                      <img src={p.image} alt={p.name} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', background: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        {p.itemType === 'product' ? <Package size={20} /> : <Briefcase size={20} />}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.productGroup || 'General'} • {p.itemType === 'product' ? 'Product' : 'Service'}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem', fontWeight: 500 }}>{p.hsn || '-'}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>Sale: ₹{Number(p.sellingPrice).toFixed(2)}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>Tax: {p.taxRate}%</div>
                    {p.mrp > 0 && <div style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.75rem' }}>MRP: ₹{p.mrp}</div>}
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  {p.itemType === 'product' ? (
                    <div className="flex flex-col gap-1">
                      <span style={{ 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem',
                        width: 'fit-content',
                        background: p.stock > (p.lowStockAlert || 5) ? '#dcfce7' : '#fee2e2',
                        color: p.stock > (p.lowStockAlert || 5) ? '#166534' : '#991b1b',
                        fontWeight: 700
                      }}>
                        {p.stock} {p.unit?.split(' ')[0]}
                      </span>
                      {p.stock <= (p.lowStockAlert || 5) && <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 600 }}>Low Stock Alert!</span>}
                    </div>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Not Applicable</span>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>
                   <div style={{ fontSize: '0.75rem' }}>
                     {p.batch && <div><strong>Batch:</strong> {p.batch}</div>}
                     {p.barcodeStr && (
                       <div style={{ marginTop: '4px', cursor: 'help' }} title={p.barcodeStr}>
                          <BarcodeIcon size={14} className="inline mr-1" /> Barcode Set
                       </div>
                     )}
                   </div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div className="flex justify-center gap-2">
                    <button 
                      className="text-primary hover-primary" 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--primary-color)' }}
                      onClick={() => handleEdit(p)}
                      title="Edit Item"
                    >
                       <Package size={18} />
                    </button>
                    <button 
                      className="text-secondary hover-primary" 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444' }}
                      onClick={() => handleDelete(p.id)}
                      title="Delete Item"
                    >
                       <Trash2 size={18} />
                    </button>
                    <button 
                      className="text-secondary hover-primary" 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#10b981' }}
                      onClick={() => navigate(`/products/${p.id || p._dbId}`)}
                      title="View Profile"
                    >
                       <ExternalLink size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="glass" style={{ padding: '2.5rem', width: '900px', maxWidth: '100%', background: 'white', maxHeight: '95vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 style={{ margin: 0 }}>{editingId ? (formData.itemType === 'product' ? 'Edit Product' : 'Edit Service') : (formData.itemType === 'product' ? 'Add New Product' : 'Add New Service')}</h2>
              <div className="flex bg-slate-100 p-1 rounded-lg" style={{ background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
                <button 
                  type="button" 
                  className={`btn btn-sm ${formData.itemType === 'product' ? 'btn-primary' : ''}`} 
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 16px', fontSize: '0.875rem', background: formData.itemType === 'product' ? 'var(--primary-color)' : 'transparent', color: formData.itemType === 'product' ? 'white' : 'var(--text-secondary)', border: 'none' }}
                  onClick={() => setFormData({...formData, itemType: 'product'})}
                >
                  <Package size={16} /> Product
                </button>
                <button 
                  type="button" 
                  className={`btn btn-sm ${formData.itemType === 'service' ? 'btn-primary' : ''}`} 
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 16px', fontSize: '0.875rem', background: formData.itemType === 'service' ? 'var(--primary-color)' : 'transparent', color: formData.itemType === 'service' ? 'white' : 'var(--text-secondary)', border: 'none' }}
                  onClick={() => setFormData({...formData, itemType: 'service'})}
                >
                  <Briefcase size={16} /> Service
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="inventory-form">
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 250px', gap: '2rem' }}>
                {/* Left Side: Fields */}
                <div className="flex flex-col gap-6">
                   <section>
                      <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Basic Information</h4>
                      <div className="flex flex-col gap-4">
                        <div className="form-group mb-0">
                          <label className="form-label">{formData.itemType === 'product' ? 'Product' : 'Service'} Name *</label>
                          <input required className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder={`Enter ${formData.itemType} name`} />
                        </div>
                        <div className="form-group mb-0">
                          <label className="form-label">{formData.itemType === 'product' ? 'Product' : 'Service'} Description / Notes</label>
                          <textarea className="form-input" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder={`Additional Details about this ${formData.itemType}`}></textarea>
                        </div>
                        <div className="flex gap-4">
                           <div className="form-group w-full mb-0">
                             <label className="form-label">{formData.itemType === 'product' ? 'HSN Code' : 'SAC Code'}</label>
                             <input className="form-input" value={formData.hsn} onChange={e => setFormData({...formData, hsn: e.target.value})} />
                           </div>
                           <div className="form-group w-full mb-0">
                             <label className="form-label">Product Group</label>
                             <select className="form-input" value={formData.productGroup} onChange={e => setFormData({...formData, productGroup: e.target.value})}>
                                {PRODUCT_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                             </select>
                           </div>
                        </div>
                      </div>
                   </section>

                   <section>
                      <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Pricing & Tax</h4>
                      <div className="flex flex-col gap-4">
                         <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group mb-0">
                              <label className="form-label">Selling Price *</label>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ padding: '0.625rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '8px 0 0 8px' }}>₹</span>
                                <input type="number" step="0.01" required className="form-input" style={{ borderRadius: '0 8px 8px 0' }} value={formData.sellingPrice} onChange={e => setFormData({...formData, sellingPrice: e.target.value})} />
                              </div>
                            </div>
                            <div className="form-group mb-0">
                              <label className="form-label">Purchase Price</label>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ padding: '0.625rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '8px 0 0 8px' }}>₹</span>
                                <input type="number" step="0.01" className="form-input" style={{ borderRadius: '0 8px 8px 0' }} value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} />
                              </div>
                            </div>
                         </div>
                         <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group mb-0">
                              <label className="form-label">MRP (Max Retail Price)</label>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{ padding: '0.625rem', background: '#f8fafc', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '8px 0 0 8px' }}>₹</span>
                                <input type="number" step="0.01" className="form-input" style={{ borderRadius: '0 8px 8px 0' }} value={formData.mrp} onChange={e => setFormData({...formData, mrp: e.target.value})} />
                              </div>
                            </div>
                            <div className="form-group mb-0">
                              <label className="form-label">Sale Discount (%)</label>
                              <input type="number" className="form-input" value={formData.saleDiscount} onChange={e => setFormData({...formData, saleDiscount: e.target.value})} />
                            </div>
                         </div>
                         <div className="grid grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="form-group mb-0">
                              <label className="form-label">Tax Rate (%)</label>
                              <select className="form-input" value={formData.taxRate} onChange={e => setFormData({...formData, taxRate: e.target.value})}>
                                {TAX_RATES.map(r => <option key={r} value={r}>{r}% GST</option>)}
                              </select>
                            </div>
                            <div className="form-group mb-0">
                              <label className="form-label">CESS (%)</label>
                              <input type="number" className="form-input" value={formData.cessPercent} onChange={e => setFormData({...formData, cessPercent: e.target.value})} />
                            </div>
                            <div className="form-group mb-0">
                              <label className="form-label">Total Tax Amount</label>
                              <input className="form-input" style={{ background: '#f8fafc' }} value={`₹${((Number(formData.sellingPrice) * Number(formData.taxRate)) / 100).toFixed(2)}`} disabled />
                            </div>
                         </div>
                      </div>
                   </section>

                   {formData.itemType === 'product' && (
                     <section>
                        <h4 style={{ marginBottom: '1rem', fontSize: '0.875rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>Inventory & Stock</h4>
                        <div className="flex flex-col gap-4">
                           <div className="grid grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                              <div className="form-group mb-0">
                                <label className="form-label">Inventory Tracking</label>
                                <select className="form-input" value={formData.inventoryType} onChange={e => setFormData({...formData, inventoryType: e.target.value})}>
                                  {INVENTORY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                              <div className="form-group mb-0">
                                <label className="form-label">UOM (Unit)</label>
                                <select className="form-input" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </div>
                              <div className="form-group mb-0">
                                <label className="form-label">Barcode / SKU</label>
                                <input className="form-input" value={formData.barcodeStr} onChange={e => setFormData({...formData, barcodeStr: e.target.value})} placeholder="Scan or Type" />
                              </div>
                           </div>
                           <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div className="form-group mb-0">
                                <label className="form-label">Opening Stock (Available)</label>
                                <input type="number" required className="form-input" value={formData.openingStock} onChange={e => setFormData({...formData, openingStock: e.target.value})} />
                              </div>
                              <div className="form-group mb-0">
                                <label className="form-label">Low Stock Alert Level</label>
                                <input type="number" className="form-input" value={formData.lowStockAlert} onChange={e => setFormData({...formData, lowStockAlert: e.target.value})} />
                              </div>
                           </div>
                           {formData.inventoryType === 'Batch-wise' && (
                              <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group mb-0">
                                  <label className="form-label">Batch Number</label>
                                  <input className="form-input" value={formData.batch} onChange={e => setFormData({...formData, batch: e.target.value})} />
                                </div>
                                <div className="form-group mb-0">
                                  <label className="form-label">Expiry Date</label>
                                  <input type="month" className="form-input" value={formData.expiry} onChange={e => setFormData({...formData, expiry: e.target.value})} />
                                </div>
                              </div>
                           )}
                        </div>
                     </section>
                   )}
                </div>

                {/* Right Side: Media */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                   <div style={{ 
                      width: '100%', 
                      aspectRatio: '1', 
                      background: '#f8fafc', 
                      border: '2px dashed var(--border-color)', 
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative'
                   }}>
                      {formData.image ? (
                        <>
                          <img src={formData.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button 
                            type="button" 
                            style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', zIndex: 10 }}
                            onClick={() => setFormData({...formData, image: null})}
                          >
                             &times;
                          </button>
                        </>
                      ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
                          <Camera size={40} style={{ marginBottom: '0.5rem' }} />
                          <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Click or Drag Image</div>
                        </div>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                      />
                   </div>
                   
                   {formData.itemType === 'product' && (
                      <div className="glass p-4" style={{ background: '#f8fafc', borderRadius: '12px' }}>
                         <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '1rem' }}>Quick Summary</div>
                         <div className="flex flex-col gap-3">
                            <div className="flex justify-between">
                               <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Stock Value:</span>
                               <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>₹{(Number(formData.openingStock) * Number(formData.sellingPrice)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                               <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Est. Margin:</span>
                               <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#10b981' }}>{formData.purchasePrice > 0 ? `${(((formData.sellingPrice - formData.purchasePrice)/formData.purchasePrice)*100).toFixed(1)}%` : 'N/A' }</span>
                            </div>
                         </div>
                      </div>
                   )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-10" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); setEditingId(null); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 32px' }} disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : (editingId ? 'Update Item' : 'Save Item to Inventory')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
