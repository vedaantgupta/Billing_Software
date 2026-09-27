import React, { useState, useEffect, useCallback } from 'react';
import { getItems, addItem, deleteItem } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Printer, Copy, RefreshCw, Send, X, Edit, Trash2, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '@/features/documents/styles/DocumentList.css';
import PrintViewModal from '@/components/ui/PrintViewModal';
import CommunicationModal from '@/features/communication/components/CommunicationModal';
import { getAllContactBalances } from '@/utils/ledger';
import { 
  normalizeDocType, 
  getNextDocumentNumber, 
  DOCUMENT_CONFIGS, 
  getAvailableConversions, 
  createConvertedDocumentDraft 
} from '@/utils/documentUtils';

const docTypes = ['Sale Invoice', 'Purchase Invoice', 'Quotation', 'Proforma Invoice', 'Delivery Challan', 'Purchase Order', 'Sale Order', 'Credit Note', 'Debit Note', 'Job Work', 'Letter'];

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
  const [convertDoc, setConvertDoc] = useState(null);

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
        if (!allDocs.find(d => d.id === inv.id || d._dbId === inv.id)) {
          allDocs.push({ ...inv, docType: 'Sale Invoice' });
        }
      });

      setDocuments(allDocs.sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0)));
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
    const type = normalizeDocType(d.docType);
    if (activeTab === 'Sale Invoice') {
      return type === 'Sale Invoice' || type === 'Invoice';
    }
    if (activeTab === 'Letter') {
      return type === 'Letter' || type === 'Document';
    }
    return type === activeTab;
  });

  const handleDuplicate = async (doc) => {
    if (!user?.id) return;
    const docType = normalizeDocType(doc.docType);
    const nextNum = getNextDocumentNumber(docType, documents);
    const cfg = DOCUMENT_CONFIGS[docType] || { prefix: 'DOC-' };
    const newInvoiceNumber = cfg.prefix ? `${cfg.prefix}${nextNum}${cfg.postfix || ''}` : `${nextNum}`;

    const newDoc = {
      ...doc,
      id: undefined,
      _dbId: undefined,
      _id: undefined,
      invoiceNumber: newInvoiceNumber,
      date: new Date().toISOString().split('T')[0]
    };

    if (cfg.parentField && newDoc[cfg.parentField]) {
      newDoc[cfg.parentField] = {
        ...newDoc[cfg.parentField],
        [cfg.numberField]: nextNum,
        date: new Date().toISOString().split('T')[0]
      };
    }

    await addItem('documents', newDoc, user.id);
    await loadDocuments();
    alert(`Document duplicated successfully as #${newInvoiceNumber}!`);
  };

  const handleExecuteConversion = (sourceDoc, targetType) => {
    setConvertDoc(null);
    if (targetType === 'Inward Payment') {
      navigate('/payments/inward/new', {
        state: {
          customerId: sourceDoc.customerId,
          customerName: sourceDoc.customerName || sourceDoc.customerInfo?.ms,
          amount: sourceDoc.grandTotal || sourceDoc.total || '',
          invoiceNo: sourceDoc.invoiceNumber,
          remarks: `Payment for Sale Invoice #${sourceDoc.invoiceNumber}`
        }
      });
      return;
    }

    if (targetType === 'Outward Payment') {
      navigate('/payments/outward/new', {
        state: {
          contactId: sourceDoc.vendorId,
          companyName: sourceDoc.vendorName || sourceDoc.vendorInfo?.ms,
          amount: sourceDoc.grandTotal || sourceDoc.total || '',
          invoiceNo: sourceDoc.invoiceNumber,
          remarks: `Payment settlement for Bill #${sourceDoc.invoiceNumber}`
        }
      });
      return;
    }

    const nextNumber = getNextDocumentNumber(targetType, documents);
    const draft = createConvertedDocumentDraft(sourceDoc, targetType, nextNumber);
    if (!draft) {
      alert(`Conversion to ${targetType} is not supported directly.`);
      return;
    }

    sessionStorage.setItem('prefill_converted_document', JSON.stringify(draft));
    const targetConfig = DOCUMENT_CONFIGS[targetType];
    if (targetConfig?.newRoute) {
      navigate(targetConfig.newRoute, { state: { convertedDraft: draft } });
    }
  };

  const handleDelete = async (docId) => {
    if (!user?.id) return;
    if (window.confirm('Are you sure you want to delete this document permanently?')) {
      await deleteItem('documents', docId, user.id);
      await loadDocuments();
    }
  };

  const handleEdit = (doc) => {
    const docId = doc._dbId || doc.id || doc._id;
    const type = normalizeDocType(doc.docType);

    if (type === 'Purchase Invoice') {
      navigate(`/documents/purchase/edit/${docId}`);
    } else if (type === 'Quotation' || type === 'Offer') {
      navigate(`/documents/quotation/edit/${docId}`);
    } else if (type === 'Delivery Challan') {
      navigate(`/documents/delivery-challan/edit/${docId}`);
    } else if (type === 'Sale Order') {
      navigate(`/documents/sale-order/edit/${docId}`);
    } else if (type === 'Purchase Order') {
      navigate(`/documents/purchase-order/edit/${docId}`);
    } else if (type === 'Proforma Invoice') {
      navigate(`/documents/proforma/edit/${docId}`);
    } else if (type === 'Credit Note') {
      navigate(`/documents/credit-note/edit/${docId}`);
    } else if (type === 'Debit Note') {
      navigate(`/documents/debit-note/edit/${docId}`);
    } else if (type === 'Job Work') {
      navigate(`/documents/job-work/edit/${docId}`);
    } else if (type === 'Letter' || type === 'Document') {
      navigate(`/documents/letters/edit/${docId}`);
    } else {
      navigate(`/documents/sale/edit/${docId}`);
    }
  };

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
    'Job Work': '/documents/job-work/new',
    'Letter': '/documents/letters/new'
  };

  if (loading && user) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Documents...</div>;
  }

  return (
    <div className="document-list-page">
      <div className="print-hide page-header">
        <div>
          <h1 className="page-title">Document Management</h1>
          <p className="page-subtitle">Manage, convert, print, share, and track all your business documents with ease.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn" style={{ backgroundColor: '#2563eb', color: 'white' }} onClick={() => navigate(tabToRoute[activeTab] || '/documents/select')}>
            <Plus size={18} /> Create {activeTab}
          </button>
          <button className="btn" style={{ backgroundColor: '#7c3aed', color: 'white' }} onClick={() => navigate('/documents/select')}>
            More Options
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 print-hide tabs-scroll" style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
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

      <div className="glass print-hide table-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Date</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>Number</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{activeTab === 'Letter' ? 'Recipient' : 'Party'}</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{activeTab === 'Letter' ? 'Subject' : 'Amount'}</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{activeTab === 'Letter' ? 'Status' : 'Outstanding'}</th>
              <th style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.map(doc => {
              const availableConversions = getAvailableConversions(doc.docType);
              const isLetter = doc.docType === 'Letter' || doc.docType === 'Document';
              const partyName = doc.recipient || doc.customerName || doc.vendorName || doc.customerInfo?.ms || doc.vendorInfo?.ms || doc.name || '-';

              return (
                <tr key={doc._dbId || doc.id || Math.random().toString()} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>{doc.date || doc.createdAt?.split('T')[0] || '-'}</td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{doc.invoiceNumber || '-'}</td>
                  <td style={{ padding: '1rem' }}>{partyName}</td>
                  <td style={{ padding: '1rem', fontWeight: isLetter ? 500 : 600, color: isLetter ? 'var(--text-color)' : 'var(--primary-color)' }}>
                    {isLetter ? (doc.subject ? (doc.subject.length > 30 ? doc.subject.slice(0, 30) + '...' : doc.subject) : (doc.title || 'Official Letter')) : `₹ ${Number(doc.total || doc.grandTotal || doc.amount || 0).toFixed(2)}`}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {isLetter ? (
                      <span style={{ 
                        background: '#ecfdf5', 
                        color: '#059669', 
                        padding: '4px 10px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        border: '1px solid #a7f3d0'
                      }}>
                        {doc.status || 'Issued'}
                      </span>
                    ) : (() => {
                      const contactId = doc.customerId || doc.vendorId || doc.contactId;
                      const balInfo = contactBalances[contactId];
                      const balance = balInfo ? balInfo.balance : 0;
                      const position = balInfo ? balInfo.position : 'Dr';

                      if (balance > 0) {
                        return (
                          <span className="outstanding-badge dr">
                            ₹{balance.toFixed(2)} {position}
                          </span>
                        );
                      }
                      return (
                        <span className="outstanding-badge paid">
                          ₹0.00
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                    <button className="btn btn-secondary action-btn" style={{ padding: '0.5rem' }} title="Print / Download" onClick={() => setPrintDoc(doc)}>
                      <Printer size={16} />
                    </button>
                    <button className="btn btn-secondary action-btn" style={{ padding: '0.5rem' }} title="Send via WhatsApp/Email" onClick={() => setSendDoc(doc)}>
                      <Send size={16} />
                    </button>
                    <button className="btn btn-secondary action-btn" style={{ padding: '0.5rem' }} title="Edit Document" onClick={() => handleEdit(doc)}>
                      <Edit size={16} />
                    </button>
                    <button className="btn btn-secondary action-btn" style={{ padding: '0.5rem' }} title="Duplicate (Auto-Numbered)" onClick={() => handleDuplicate(doc)}>
                      <Copy size={16} />
                    </button>
                    {availableConversions.length > 0 && (
                      <button 
                        className="btn btn-secondary action-btn" 
                        style={{ padding: '0.5rem', color: '#6366f1', background: '#eef2ff', borderColor: '#c7d2fe' }} 
                        title={`Convert ${doc.docType}`} 
                        onClick={() => setConvertDoc(doc)}
                      >
                        <RefreshCw size={16} />
                      </button>
                    )}
                    <button className="btn btn-danger action-btn" style={{ padding: '0.5rem', background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }} title="Delete" onClick={() => handleDelete(doc.id || doc._dbId)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredDocs.length === 0 && (
              <tr className="empty-state-row">
                <td colSpan="6">
                  <div className="empty-state-wrapper">
                    <div className="empty-state-icon">
                      <FileText size={32} strokeWidth={1.5} />
                    </div>
                    <h3 className="empty-state-title">No {activeTab}s Found</h3>
                    <p className="empty-state-desc">Create your first {activeTab} to manage your transactions and print invoices.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Print Modal Implementation */}
      {printDoc && (
        <PrintViewModal doc={printDoc} onClose={() => setPrintDoc(null)} />
      )}

      {/* Send Modal Implementation */}
      {sendDoc && (
        <CommunicationModal 
          isOpen={Boolean(sendDoc)} 
          onClose={() => setSendDoc(null)} 
          documentData={sendDoc}
          defaultChannel="whatsapp"
        />
      )}

      {/* Convert Document Flow Modal (Bug Sheet Item 10) */}
      {convertDoc && (
        <div className="pvm-overlay" style={{ zIndex: 10000 }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '520px',
            width: '90%',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>Convert Document</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  {convertDoc.docType} #{convertDoc.invoiceNumber}
                </p>
              </div>
              <button 
                onClick={() => setConvertDoc(null)} 
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} color="#64748b" />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '1rem' }}>
              Select the workflow destination for this document:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {getAvailableConversions(convertDoc.docType).map((opt) => (
                <div 
                  key={opt.targetType}
                  onClick={() => handleExecuteConversion(convertDoc, opt.targetType)}
                  style={{
                    padding: '1rem',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                    background: '#f8fafc'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.background = '#eef2ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} color="#6366f1" />
                      Convert to {opt.label}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                      {opt.desc}
                    </div>
                  </div>
                  <ArrowRight size={18} color="#6366f1" />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setConvertDoc(null)}
                style={{ padding: '0.5rem 1.25rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DocumentList;
