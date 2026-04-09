import React, { useState, useEffect, useCallback } from 'react';
import { getItems, addItem, deleteItem } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { Plus, Printer, Copy, RefreshCw, Send, X, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import PrintTemplate from '../components/PrintTemplate';
import PrintViewModal from '../components/PrintViewModal';
import { getDB } from '../utils/db';
import { getAllContactBalances } from '../utils/ledger';

const docTypes = ['Sale Invoice', 'Purchase Invoice', 'Quotation', 'Proforma Invoice', 'Delivery Challan', 'Purchase Order', 'Sale Order', 'Credit Note', 'Debit Note', 'Job Work'];

const DocumentList = () => {
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('Sale Invoice');
  const [contactBalances, setContactBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Modal States
  const [printDoc, setPrintDoc] = useState(null);
  const [sendDoc, setSendDoc] = useState(null);

  const loadDocuments = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [docs, invoices, balances] = await Promise.all([
        getItems('documents', user.id),
        getItems('invoices', user.id),
        getAllContactBalances(user.id)
      ]);

      const allDocs = [...docs];
      invoices.forEach(inv => {
        if (!allDocs.find(d => d.id === inv.id)) {
          allDocs.push({ ...inv, docType: 'Invoice' });
        }
      });

      setDocuments(allDocs.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setContactBalances(balances);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filteredDocs = documents.filter(d => {
    const type = d.docType || 'Invoice';
    if (activeTab === 'Sale Invoice') {
      return type === 'Sale Invoice' || type === 'Invoice';
    }
    return type === activeTab;
  });

  const handleDuplicate = async (doc) => {
    if (!user?.id) return;
    let series = 'INV';
    let numStr = Date.now().toString().slice(-6);
    if (doc.invoiceNumber && doc.invoiceNumber.includes('-')) {
      series = doc.invoiceNumber.split('-')[0];
    }
    const newDoc = { ...doc, id: undefined, invoiceNumber: `${series}-${numStr}`, date: new Date().toISOString().split('T')[0] };
    await addItem('documents', newDoc, user.id);
    await loadDocuments();
    alert('Document duplicated successfully!');
  };

  const handleConvertToInvoice = async (doc) => {
    if (!user?.id || doc.docType === 'Sale Invoice' || doc.docType === 'Invoice') return;
    const newDoc = { ...doc, id: undefined, docType: 'Sale Invoice', invoiceNumber: `SAL-${Date.now().toString().slice(-6)}`, date: new Date().toISOString().split('T')[0] };
    await addItem('documents', newDoc, user.id);
    await loadDocuments();
    setActiveTab('Sale Invoice');
    alert('Successfully converted to Sale Invoice!');
  };

  const handleDelete = async (docId) => {
    if (!user?.id) return;
    if (window.confirm('Are you sure you want to delete this document permanently?')) {
      await deleteItem('documents', docId, user.id);
      await loadDocuments();
    }
  };

  const handleEdit = (doc) => {
    if (doc.docType === 'Purchase Invoice') {
      navigate(`/documents/purchase/edit/${doc.id}`);
    } else if (doc.docType === 'Quotation' || doc.docType === 'Offer') {
      navigate(`/documents/quotation/edit/${doc.id}`);
    } else if (doc.docType === 'Delivery Challan') {
      navigate(`/documents/delivery-challan/edit/${doc.id}`);
    } else if (doc.docType === 'Sale Order') {
      navigate(`/documents/sale-order/edit/${doc.id}`);
    } else if (doc.docType === 'Proforma Invoice') {
      navigate(`/documents/proforma/edit/${doc.id}`);
    } else if (doc.docType === 'Sale Invoice' || doc.docType === 'Invoice') {
      navigate(`/documents/sale/edit/${doc.id}`);
    } else {
      navigate(`/documents/sale/edit/${doc.id}`);
    }
  };

  const handleWhatsApp = (doc) => {
    const phone = doc.customerPhone || "";
    // Clean phone number (keep only digits)
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hello ${doc.customerName || 'Customer'},\n\nSharing your ${doc.docType || 'Invoice'} #${doc.invoiceNumber} for ₹${Number(doc.total).toFixed(2)}.\n\nThank you!`);

    // If phone exists, open directly to that number, else just open WA with text
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(url, '_blank');
  };

  const handleEmail = (doc) => {
    const email = doc.customerEmail || "";
    const subject = encodeURIComponent(`${doc.docType || 'Invoice'} #${doc.invoiceNumber} from ${user?.firstName || 'Our Company'}`);
    const body = encodeURIComponent(`Hello ${doc.customerName || 'Customer'},\n\nPlease find the details for your ${doc.docType} below.\n\nTotal Amount: ₹${Number(doc.total).toFixed(2)}\n\nThank you!`);

    // Open Gmail Compose specifically
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
  };

  const generateUPI = (amount, name) => `upi://pay?pa=merchant@upi&pn=${encodeURIComponent(name || 'GoGSTBill')}&am=${amount}&cu=INR`;

  const tabToRoute = {
    'Sale Invoice': '/documents/sale/new',
    'Purchase Invoice': '/documents/purchase/new',
    'Quotation': '/documents/quotation/new',
    'Proforma Invoice': '/documents/proforma/new',
    'Delivery Challan': '/documents/delivery-challan/new',
    'Purchase Order': '/documents/purchase-order/new',
    'Sale Order': '/documents/sale-order/new',
    'Credit Note': '/documents/credit-note/new',
    'Debit Note': '/documents/debit-note/new',
    'Job Work': '/documents/job-work/new'
  };

  if (loading && user) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Documents...</div>;
  }

  return (
    <div>
      <div className="print-hide page-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h1 className="page-title">Document Management</h1>
        <div className="flex gap-2">
          <button className="btn" style={{ backgroundColor: '#2563eb', color: 'white' }} onClick={() => navigate(tabToRoute[activeTab] || '/documents/select')}>
            <Plus size={18} /> Create {activeTab}
          </button>
          <button className="btn" style={{ backgroundColor: '#7c3aed', color: 'white' }} onClick={() => navigate('/documents/select')}>
            More Options
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 print-hide" style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {docTypes.map(type => (
          <button
            key={type}
            className={`btn ${activeTab === type ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(type)}
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}
          >
            {type}s
          </button>
        ))}
      </div>

      <div className="glass print-hide" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Date</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Number</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Party</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Amount</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Outstanding</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.map(doc => (
              <tr key={doc.id || Math.random().toString()} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}>{doc.date}</td>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{doc.invoiceNumber}</td>
                <td style={{ padding: '1rem' }}>{doc.customerName || doc.name}</td>
                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--primary-color)' }}>{doc.currency === 'INR' ? '₹' : doc.currency} {Number(doc.total).toFixed(2)}</td>
                <td style={{ padding: '1rem' }}>
                  {(() => {
                    const contactId = doc.customerId || doc.vendorId || doc.contactId;
                    const balInfo = contactBalances[contactId];
                    const balance = balInfo ? balInfo.balance : 0;
                    const position = balInfo ? balInfo.position : 'Dr';

                    if (balance > 0) {
                      return (
                        <span style={{ background: '#ffedd5', color: '#9a3412', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          ₹{balance.toFixed(2)} {position}
                        </span>
                      );
                    }
                    return (
                      <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        ₹0.00
                      </span>
                    );
                  })()}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center', display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                  <button className="btn btn-secondary" style={{ padding: '0.5rem' }} title="Print / Print with QR" onClick={() => setPrintDoc(doc)}>
                    <Printer size={16} />
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.5rem' }} title="Send via WhatsApp/Email" onClick={() => setSendDoc(doc)}>
                    <Send size={16} />
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.5rem' }} title="Edit Document" onClick={() => handleEdit(doc)}>
                    <Edit size={16} />
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.5rem' }} title="Duplicate" onClick={() => handleDuplicate(doc)}>
                    <Copy size={16} />
                  </button>
                  {doc.docType !== 'Sale Invoice' && doc.docType !== 'Invoice' && (
                    <button className="btn btn-secondary" style={{ padding: '0.5rem', color: 'var(--primary-color)' }} title="Convert to Sale Invoice" onClick={() => handleConvertToInvoice(doc)}>
                      <RefreshCw size={16} />
                    </button>
                  )}
                  <button className="btn btn-danger" style={{ padding: '0.5rem', background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }} title="Delete" onClick={() => handleDelete(doc.id)}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredDocs.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No {activeTab}s found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style>
        {`
          /* Inline print override removed since PrintViewModal handles its own print CSS isolation */
        `}
      </style>

      {/* Print Modal Implementation */}
      {printDoc && (
        <PrintViewModal doc={printDoc} onClose={() => setPrintDoc(null)} />
      )}

      {/* Send Modal Implementation */}
      {sendDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} className="print-hide">
          <div className="glass" style={{ background: 'white', width: '500px', padding: '2rem' }}>
            <h2 className="mb-4">Instant Sharing</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Send {sendDoc.docType} <strong>{sendDoc.invoiceNumber}</strong> directly to {sendDoc.customerName}.</p>

            <div className="flex gap-4 mt-6 mb-6">
              <button
                className="btn w-full flex items-center justify-center gap-2"
                style={{ background: '#25D366', color: 'white', fontWeight: 600, padding: '1rem' }}
                onClick={() => handleWhatsApp(sendDoc)}
              >
                WhatsApp
              </button>
              <button
                className="btn btn-secondary w-full"
                style={{ padding: '1rem' }}
                onClick={() => handleEmail(sendDoc)}
              >
                Gmail
              </button>
            </div>
            <div className="flex justify-end">
              <button className="btn btn-secondary" onClick={() => setSendDoc(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DocumentList;
