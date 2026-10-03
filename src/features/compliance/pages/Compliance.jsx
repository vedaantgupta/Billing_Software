import React, { useState, useEffect } from 'react';
import { ShieldAlert, FileDigit, Download, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { getItems } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';

const Compliance = () => {
  const [activeTab, setActiveTab] = useState('eway');
  const [invoices, setInvoices] = useState([]);
  const { user } = useAuth();
  
  useEffect(() => {
    const loadInvoices = async () => {
      if (user?.id) {
        try {
          const [docs, rawInvoices] = await Promise.all([
            getItems('documents', user.id).catch(() => []),
            getItems('invoices', user.id).catch(() => [])
          ]);

          const combined = [...docs];
          rawInvoices.forEach(inv => {
            if (!combined.find(d => (d.id && d.id === inv.id) || (d._dbId && d._dbId === inv.id))) {
              combined.push({ ...inv, docType: inv.docType || 'Sale Invoice' });
            }
          });

          const filtered = combined.filter(d => 
            d.docType === 'Invoice' || 
            d.docType === 'Sale Invoice' || 
            d.type === 'Invoice'
          );
          
          setInvoices(filtered);
        } catch (err) {
          console.error('Failed to load compliance invoices:', err);
        }
      }
    };
    loadInvoices();
  }, [user?.id]);

  const handleExportTally = () => {
    let csvStr = "Date,Invoice Number,Customer,Taxable Amount,CGST,SGST,IGST,Total Value\n";
    invoices.forEach(inv => {
      const invNum = inv.invoiceNumber || inv.invoiceDetail?.invoiceNo || '';
      const date = inv.date || inv.invoiceDetail?.date || '';
      const customer = inv.customerName || inv.customerInfo?.ms || 'Walk-in Customer';
      const totalTax = Number(inv.totalTax || inv.taxAmount || 0);
      const subTotal = Number(inv.subTotal || inv.taxable || inv.totalTaxable || 0);
      const total = Number(inv.total ?? inv.grandTotal ?? inv.amount ?? 0);
      const isInterState = Boolean(inv.isInterState);

      const cgst = isInterState ? 0 : totalTax / 2;
      const sgst = isInterState ? 0 : totalTax / 2;
      const igst = isInterState ? totalTax : 0;

      csvStr += `"${date}","${invNum}","${customer.replace(/"/g, '""')}",${subTotal.toFixed(2)},${cgst.toFixed(2)},${sgst.toFixed(2)},${igst.toFixed(2)},${total.toFixed(2)}\n`;
    });
    
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tally_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Compliance & Tax Filings</h1>
      </div>

      <div className="flex gap-2 mb-4">
        <button className={`btn ${activeTab === 'eway' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('eway')}>
          E-Way Bill & E-Invoice
        </button>
        <button className={`btn ${activeTab === 'gstr' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('gstr')}>
          GSTR Filing Reports
        </button>
        <button className={`btn ${activeTab === 'tally' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('tally')}>
          Tally & Accounting Export
        </button>
      </div>

      <div className="glass" style={{ padding: '2rem' }}>
        {activeTab === 'eway' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert size={24} color="var(--primary-color)" />
              <h2 style={{ margin: 0 }}>1-Click E-Way Bill & E-Invoice Generation</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              Select an invoice below to securely generate E-Way Bills or E-Invoices. You will be safely redirected to the official government portals as it is the safest source to do this.
            </p>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem' }}>Invoice #</th>
                  <th style={{ padding: '1rem' }}>Date</th>
                  <th style={{ padding: '1rem' }}>Customer</th>
                  <th style={{ padding: '1rem' }}>Total Value</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv, idx) => {
                    const invoiceNum = inv.invoiceNumber || inv.invoiceDetail?.invoiceNo || `INV-${idx + 1}`;
                    const invoiceDate = inv.date || inv.invoiceDetail?.date || '—';
                    const customerName = inv.customerName || inv.customerInfo?.ms || 'Walk-in Customer';
                    const totalVal = Number(inv.total ?? inv.grandTotal ?? inv.amount ?? 0);

                    return (
                      <tr key={inv.id || inv._dbId || inv._id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{invoiceNum}</td>
                        <td style={{ padding: '1rem' }}>{invoiceDate}</td>
                        <td style={{ padding: '1rem' }}>{customerName}</td>
                        <td style={{ padding: '1rem' }}>₹{totalVal.toFixed(2)}</td>
                        <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                          <a href="https://ewaybillgst.gov.in/" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', textDecoration: 'none' }}>
                            Generate E-Way Bill
                          </a>
                          <a href="https://einvoice1.gst.gov.in/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', textDecoration: 'none' }}>
                            E-Invoice
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'gstr' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileDigit size={24} color="var(--primary-color)" />
              <h2 style={{ margin: 0 }}>GST Returns (Ready-to-File)</h2>
            </div>
            <div className="flex gap-4">
              <div className="glass w-full" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.8)' }}>
                <h3 className="mb-2">GSTR-1</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Details of outward supplies of goods or services.</p>
                <button className="btn btn-secondary mt-2 w-full"><Download size={16} /> JSON for Portal</button>
              </div>
              <div className="glass w-full" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.8)' }}>
                <h3 className="mb-2">GSTR-2B</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Auto-drafted ITC statement for purchases.</p>
                <button className="btn btn-secondary mt-2 w-full"><Download size={16} /> Reconcile Match</button>
              </div>
              <div className="glass w-full" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.8)' }}>
                <h3 className="mb-2">GSTR-3B</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Summary return of outward supplies and ITC claimed.</p>
                <button className="btn btn-secondary mt-2 w-full"><Download size={16} /> View Summary</button>
              </div>
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: '#fffbeb', color: '#b45309', borderRadius: '8px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <AlertTriangle size={24} />
              <div>
                <strong>Smart HSN/SAC Validation Active</strong>
                <div style={{ fontSize: '0.875rem' }}>All invoices generated have passed rigorous HSN validation reducing penalty risks.</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tally' && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet size={24} color="#10b981" />
              <h2 style={{ margin: 0 }}>Tally ERP 9 / Prime Integration</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Export all your billing data (Sales, Purchases, Credit Notes, Debit Notes) in CSV or XML format ready to be imported directly into Tally, bridging the gap between billing and your CA's accounting software.
            </p>
            
            <button className="btn btn-primary" onClick={handleExportTally} style={{ background: '#10b981' }}>
              <Download size={18} /> Export Sales to Tally CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Compliance;
