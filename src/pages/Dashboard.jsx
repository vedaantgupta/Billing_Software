import React, { useState, useEffect } from 'react';
import { getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { TrendingUp, Users, Package, FileText, ArrowRight, Filter, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import IndiaMap from './IndiaMap';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import DateRangePicker from '../components/DateRangePicker';

dayjs.extend(isBetween);

const OutstandingCard = ({ title, typeLabel, amount, aging }) => {
  const tot = aging.total > 0 ? aging.total : 1;
  const pctC = (aging.current / tot) * 100;
  const pct1 = (aging.days1_15 / tot) * 100;
  const pct2 = (aging.days16_30 / tot) * 100;
  const pct3 = (aging.days30plus / tot) * 100;

  return (
    <div className="glass" style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>
        <Filter size={16} color="#94a3b8" />
      </div>

      <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', gap: '0.5rem' }}>
        {typeLabel} <span style={{ color: '#94a3b8' }}>₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>

      <div style={{ width: '100%', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', display: 'flex', marginBottom: '1.5rem' }}>
        {aging.total > 0 && (
          <>
            <div style={{ width: `${pctC}%`, backgroundColor: '#10b981' }}></div>
            <div style={{ width: `${pct1}%`, backgroundColor: '#facc15' }}></div>
            <div style={{ width: `${pct2}%`, backgroundColor: '#f97316' }}></div>
            <div style={{ width: `${pct3}%`, backgroundColor: '#dc2626' }}></div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', width: '100%' }}>
        <div style={{ flex: '0 0 auto', paddingRight: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.75rem' }}>CURRENT</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '10px', borderRadius: '4px', backgroundColor: '#10b981' }}></div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>₹ {aging.current.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div style={{ borderLeft: '1.5px dashed #cbd5e1', margin: '0 1rem', marginTop: '1.5rem' }}></div>

        <div style={{ flex: '1 1 auto' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '0.75rem' }}>OVERDUE</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '10px', borderRadius: '4px', backgroundColor: '#facc15' }}></div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>₹ {aging.days1_15.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', paddingLeft: '22px' }}>1-15 Days</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '10px', borderRadius: '4px', backgroundColor: '#f97316' }}></div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>₹ {aging.days16_30.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', paddingLeft: '22px' }}>16-30 Days</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '10px', borderRadius: '4px', backgroundColor: '#dc2626' }}></div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>₹ {aging.days30plus.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', paddingLeft: '22px' }}>30+ Days</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    sales: 0,
    customers: 0,
    products: 0,
    invoices: 0
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [stateWiseSales, setStateWiseSales] = useState([]);
  const [agingSales, setAgingSales] = useState({ current: 0, days1_15: 0, days16_30: 0, days30plus: 0, total: 0 });
  const [agingPurchases, setAgingPurchases] = useState({ current: 0, days1_15: 0, days16_30: 0, days30plus: 0, total: 0 });

  const [dateRange, setDateRange] = useState({
    start: dayjs().startOf('month').toDate(),
    end: dayjs().endOf('day').toDate()
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        const [invoices, docs, contacts, products, ledgerTxs] = await Promise.all([
          getItems('invoices', user.id),
          getItems('documents', user.id),
          getItems('contacts', user.id),
          getItems('products', user.id),
          getItems('ledger_transactions', user.id)
        ]);

        const allDocs = [...docs];
        invoices.forEach(inv => {
          if (!allDocs.find(d => d.id === inv.id)) {
            allDocs.push({ ...inv, docType: 'Invoice' });
          }
        });

        const saleInvoices = allDocs.filter(d => (d.docType || 'Invoice') === 'Invoice' || d.docType === 'Sale Invoice');
        
        // Filter by Date Range
        const filteredSaleInvoices = saleInvoices.filter(inv => {
          const invDate = dayjs(inv.date || inv.invoiceDetail?.date);
          return invDate.isBetween(dayjs(dateRange.start), dayjs(dateRange.end), 'day', '[]');
        });

        const sortedInvoices = filteredSaleInvoices.sort((a, b) => new Date(b.date) - new Date(a.date));

        const customers = contacts.filter(c => c.type === 'customer');

        // Aggregate sales by state for filtered invoices
        const salesByState = filteredSaleInvoices.reduce((acc, inv) => {
          const customer = contacts.find(c => c.id === inv.customerId || c.name === inv.customerName);
          const state = customer?.state || inv.placeOfSupply || 'Other';

          if (!acc[state]) acc[state] = 0;
          acc[state] += Number(inv.total) || 0;
          return acc;
        }, {});

        const formattedStateSales = Object.entries(salesByState).map(([state, total]) => ({
          state,
          total
        }));

        setStateWiseSales(formattedStateSales);

        setStats({
          sales: filteredSaleInvoices.reduce((acc, inv) => acc + (Number(inv.total) || 0), 0),
          customers: customers.length,
          products: products.length,
          invoices: filteredSaleInvoices.length
        });
        setRecentInvoices(sortedInvoices.slice(0, 5));

        // Calculate Aging
        const todayMs = new Date().setHours(0, 0, 0, 0);
        let sCurrent = 0, s1_15 = 0, s16_30 = 0, s30plus = 0;
        let pCurrent = 0, p1_15 = 0, p16_30 = 0, p30plus = 0;

        for (const contact of contacts) {
          const contactTxs = ledgerTxs.filter(t => t.contactId === contact.id);
          let dr = 0, cr = 0;
          contactTxs.forEach(t => {
            const amt = Math.round((Number(t.amount) || 0) * 100);
            if (t.type === 'dr' || t.type === 'debit') dr += amt;
            if (t.type === 'cr' || t.type === 'credit') cr += amt;
          });

          let balance = (dr - cr) / 100;

          if (balance > 0) {
            // Sales Outstanding
            const cDocs = allDocs.filter(d => (d.docType === 'Sale Invoice' || d.docType === 'Invoice') && (d.customerId === contact.id || d.customerName === contact.companyName));
            cDocs.sort((a, b) => new Date(b.date || b.invoiceDetail?.date) - new Date(a.date || a.invoiceDetail?.date));

            let rem = balance;
            for (const d of cDocs) {
              if (rem <= 0) break;
              const dTotal = Number(d.total) || Number(d.grandTotal) || 0;
              if (dTotal === 0) continue;
              const alloc = Math.min(rem, dTotal);
              rem -= alloc;

              const dt = d.dueDate ? new Date(d.dueDate) : new Date(d.date || d.invoiceDetail?.date || Date.now());
              dt.setHours(0, 0, 0, 0);
              const diffDays = Math.ceil((todayMs - dt.getTime()) / (1000 * 60 * 60 * 24));

              if (diffDays <= 0) sCurrent += alloc;
              else if (diffDays <= 15) s1_15 += alloc;
              else if (diffDays <= 30) s16_30 += alloc;
              else s30plus += alloc;
            }
            if (rem > 0) s30plus += rem;
          } else if (balance < 0) {
            // Purchase Outstanding
            let rem = Math.abs(balance);
            const cDocs = allDocs.filter(d => (d.docType === 'Purchase Invoice') && (d.vendorId === contact.id || d.vendorName === contact.companyName));
            cDocs.sort((a, b) => new Date(b.date || b.invoiceDetail?.date) - new Date(a.date || a.invoiceDetail?.date));

            for (const d of cDocs) {
              if (rem <= 0) break;
              const dTotal = Number(d.total) || Number(d.grandTotal) || 0;
              if (dTotal === 0) continue;
              const alloc = Math.min(rem, dTotal);
              rem -= alloc;

              const dt = d.dueDate ? new Date(d.dueDate) : new Date(d.date || d.invoiceDetail?.date || Date.now());
              dt.setHours(0, 0, 0, 0);
              const diffDays = Math.ceil((todayMs - dt.getTime()) / (1000 * 60 * 60 * 24));

              if (diffDays <= 0) pCurrent += alloc;
              else if (diffDays <= 15) p1_15 += alloc;
              else if (diffDays <= 30) p16_30 += alloc;
              else p30plus += alloc;
            }
            if (rem > 0) p30plus += rem;
          }
        }

        setAgingSales({ current: sCurrent, days1_15: s1_15, days16_30: s16_30, days30plus: s30plus, total: sCurrent + s1_15 + s16_30 + s30plus });
        setAgingPurchases({ current: pCurrent, days1_15: p1_15, days16_30: p16_30, days30plus: p30plus, total: pCurrent + p1_15 + p16_30 + p30plus });

      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user, dateRange.start, dateRange.end]);

  if (loading && user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--text-secondary)' }}>
        Loading Dashboard Data...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Dashboard Overview</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Monitoring business performance from <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{dayjs(dateRange.start).format('DD MMM YYYY')}</span> to <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{dayjs(dateRange.end).format('DD MMM YYYY')}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => window.location.reload()}
            style={{ padding: '0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Refresh Dashboard"
          >
            <RefreshCw size={18} />
          </button>

          <DateRangePicker
            initialRange={dateRange}
            onChange={(range) => setDateRange(range)}
          />

          <button className="btn btn-primary" onClick={() => navigate('/documents/select')}>
            + Create Document
          </button>
        </div>
      </div>


      <div className="flex gap-4 mb-4">
        <div className="glass w-full" style={{ padding: '1.5rem', borderTop: '4px solid var(--primary-color)' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Total Sales</h3>
            <TrendingUp size={24} color="var(--primary-color)" />
          </div>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', margin: '0.5rem 0' }}>₹{stats.sales.toFixed(2)}</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--success-color)', margin: 0 }}>+12% from last month</p>
        </div>

        <div className="glass w-full" style={{ padding: '1.5rem', borderTop: '4px solid #8b5cf6' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Total Invoices</h3>
            <FileText size={24} color="#8b5cf6" />
          </div>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', margin: '0.5rem 0' }}>{stats.invoices}</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--success-color)', margin: 0 }}>+4 new this week</p>
        </div>

        <div className="glass w-full" style={{ padding: '1.5rem', borderTop: '4px solid #10b981' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Customers</h3>
            <Users size={24} color="#10b981" />
          </div>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', margin: '0.5rem 0' }}>{stats.customers}</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>Active clients</p>
        </div>

        <div className="glass w-full" style={{ padding: '1.5rem', borderTop: '4px solid #f59e0b' }}>
          <div className="flex items-center justify-between mb-2">
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)' }}>Products</h3>
            <Package size={24} color="#f59e0b" />
          </div>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', margin: '0.5rem 0' }}>{stats.products}</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>Items in inventory</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <OutstandingCard
          title="Sales Outstanding"
          typeLabel="Total Receivables"
          amount={agingSales.total}
          aging={agingSales}
        />
        <OutstandingCard
          title="Purchase Outstanding"
          typeLabel="Total Payables"
          amount={agingPurchases.total}
          aging={agingPurchases}
        />
      </div>

      {/* India Sales Map Section */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', alignItems: 'flex-start' }}>
        {/* Map Panel */}
        <div className="glass" style={{ width: '600px', flex: '0 0 600px', height: '700px', padding: '1.5rem', minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexShrink: 0 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="var(--primary-color)" />
              Sales Distribution (India)
            </h3>
          </div>
          
          <div style={{ width: '100%', flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <IndiaMap salesData={stateWiseSales} />
          </div>
        </div>

        {/* Top States Table */}
        <div className="glass" style={{ flex: '1 1 auto', width: '100%', padding: '1.5rem', minWidth: '220px', maxHeight: '560px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: 0, marginBottom: '1rem', flexShrink: 0 }}>Top States by Sales</h3>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'sticky', top: 0, background: 'var(--card-bg)' }}>State</th>
                  <th style={{ padding: '0.5rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'sticky', top: 0, background: 'var(--card-bg)' }}>Amount</th>
                  <th style={{ padding: '0.5rem 0.5rem 0.5rem 1.75rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', position: 'sticky', top: 0, background: 'var(--card-bg)' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {stateWiseSales.sort((a, b) => b.total - a.total).map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>{s.state}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.875rem', color: 'var(--primary-color)', fontWeight: 600 }}>₹{s.total.toLocaleString()}</td>
                    <td style={{ padding: '0.75rem 0.5rem 0.75rem 1.75rem', textAlign: 'right', fontSize: '0.875rem' }}>
                      {stats.sales > 0 ? ((s.total / stats.sales) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
                {stateWiseSales.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No state data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="glass mt-4" style={{ padding: '1.5rem' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 style={{ margin: 0 }}>Recent Invoices</h3>
          <button className="btn btn-secondary" onClick={() => navigate('/documents')} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>
            View All <ArrowRight size={14} />
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Invoice #</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Customer</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Amount</th>
                <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map(inv => (
                <tr key={inv.id || Math.random().toString()} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} className="table-row-hover">
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: '1rem' }}>{inv.date}</td>
                  <td style={{ padding: '1rem' }}>{inv.customerName}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--primary-color)' }}>₹{Number(inv.total).toFixed(2)}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ background: '#d1fae5', color: '#065f46', padding: '0.25rem 0.5rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>Paid</span>
                  </td>
                </tr>
              ))}
              {recentInvoices.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No recent invoices found. Create one to get started!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`
        .table-row-hover:hover {
          background-color: rgba(99, 102, 241, 0.05);
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
