import React, { useState, useEffect } from 'react';
import { getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { TrendingUp, CreditCard, Wallet, Calendar } from 'lucide-react';

const Reports = () => {
  const [invoices, setInvoices] = useState([]);
  const { user } = useAuth();
  
  useEffect(() => {
    const loadInvoices = async () => {
      if (user?.id) {
        const data = await getItems('invoices', user.id);
        setInvoices(data);
      }
    };
    loadInvoices();
  }, [user?.id]);

  const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalTax = invoices.reduce((sum, inv) => sum + inv.totalTax, 0);
  const totalTaxable = invoices.reduce((sum, inv) => sum + inv.subTotal, 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Summary Reports</h1>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="glass w-full flex items-center gap-4" style={{ padding: '2rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px' }}>
            <TrendingUp size={32} color="var(--primary-color)" />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Gross Sales</h3>
            <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-primary)' }}>₹{totalSales.toFixed(2)}</h2>
          </div>
        </div>

        <div className="glass w-full flex items-center gap-4" style={{ padding: '2rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px' }}>
            <Wallet size={32} color="#f59e0b" />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Taxable Sales</h3>
            <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-primary)' }}>₹{totalTaxable.toFixed(2)}</h2>
          </div>
        </div>

        <div className="glass w-full flex items-center gap-4" style={{ padding: '2rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px' }}>
            <CreditCard size={32} color="#10b981" />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Total GST Collected</h3>
            <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-primary)' }}>₹{totalTax.toFixed(2)}</h2>
          </div>
        </div>
      </div>

      <div className="glass mt-6" style={{ padding: '1.5rem' }}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} style={{ color: 'var(--text-secondary)' }} />
          <h3 style={{ margin: 0 }}>Detailed Sales Activity (All Time)</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Date</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Reference (Inv #)</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Party Name</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Taxable Amt</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Tax Amt</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>Total Value</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }}>{inv.date}</td>
                <td style={{ padding: '1rem' }}>{inv.invoiceNumber}</td>
                <td style={{ padding: '1rem' }}>{inv.customerName}</td>
                <td style={{ padding: '1rem' }}>₹{inv.subTotal.toFixed(2)}</td>
                <td style={{ padding: '1rem' }}>₹{inv.totalTax.toFixed(2)}</td>
                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--primary-color)' }}>₹{inv.total.toFixed(2)}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No data available for reports.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
