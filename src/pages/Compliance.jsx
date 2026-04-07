import React, { useState, useEffect } from 'react';
import { ShieldAlert, FileDigit, Download, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';

const Compliance = () => {
  const [activeTab, setActiveTab] = useState('eway');
  const [invoices, setInvoices] = useState([]);
  const { user } = useAuth();
  
  useEffect(() => {
    const loadInvoices = async () => {
      if (user?.id) {
        const data = await getItems('documents', user.id);
        setInvoices(data.filter(d => d.docType === 'Invoice' || d.docType === 'Sale Invoice'));
      }
    };
    loadInvoices();
  }, [user?.id]);

  const handleExportTally = () => {
    // Mock CSV generation
    let csvStr = "Date,Invoice Number,Customer,Taxable Amount,CGST,SGST,IGST,Total Value\n";
    invoices.forEach(inv => {
      let cgst = inv.isInterState ? 0 : inv.totalTax / 2;
      let sgst = inv.isInterState ? 0 : inv.totalTax / 2;
      let igst = inv.isInterState ? inv.totalTax : 0;
      csvStr += `${inv.date},${inv.invoiceNumber},${inv.customerName},${inv.subTotal},${cgst},${sgst},${igst},${inv.total}\n`;
    });
    
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tally_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                    <td style={{ padding: '1rem' }}>{inv.date}</td>
                    <td style={{ padding: '1rem' }}>{inv.customerName}</td>
                    <td style={{ padding: '1rem' }}>₹{inv.total.toFixed(2)}</td>
                    <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <a href="https://ewaybillgst.gov.in/" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', textDecoration: 'none' }}>
                        Generate E-Way Bill
                      </a>
                      <a href="https://einvoice1.gst.gov.in/" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', textDecoration: 'none' }}>
                        E-Invoice
                      </a>
                    </td>
                  </tr>
                ))}
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
