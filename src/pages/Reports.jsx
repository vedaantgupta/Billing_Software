import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import {
  TrendingUp, TrendingDown, CreditCard, Wallet, Calendar,
  BarChart3, PieChart, ShoppingBag, FileText, Package,
  ArrowUpRight, ArrowDownRight, Filter, Download
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import DateRangePicker from '../components/DateRangePicker';
import './Reports.css';

dayjs.extend(isBetween);

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Reports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: dayjs().subtract(29, 'day').toDate(),
    end: dayjs().toDate()
  });

  // Raw data state
  const [data, setData] = useState({
    documents: [],
    invoices: [],
    inwardPayments: [],
    outwardPayments: [],
    expenses: [],
    products: []
  });

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [docs, invs, inward, outward, exp, prod] = await Promise.all([
        getItems('documents', user.id),
        getItems('invoices', user.id),
        getItems('inwardPayments', user.id),
        getItems('outwardPayments', user.id),
        getItems('dailyExpenses', user.id),
        getItems('products', user.id)
      ]);

      setData({
        documents: docs || [],
        invoices: invs || [],
        inwardPayments: inward || [],
        outwardPayments: outward || [],
        expenses: exp || [],
        products: prod || []
      });
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Combined documents (old invoices + new documents)
  const allSalesDocs = useMemo(() => {
    const start = dayjs(dateRange.start).startOf('day');
    const end = dayjs(dateRange.end).endOf('day');

    const combined = [
      ...data.invoices.map(i => ({ ...i, docType: 'Sale Invoice' })),
      ...data.documents.filter(d => ['Sale Invoice', 'Invoice'].includes(d.docType || 'Invoice'))
    ].filter(d => {
      const date = d.date || d.invoiceDetail?.date;
      return date && dayjs(date).isBetween(start, end, 'day', '[]');
    });

    return combined.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data.invoices, data.documents, dateRange]);

  const allPurchaseDocs = useMemo(() => {
    const start = dayjs(dateRange.start).startOf('day');
    const end = dayjs(dateRange.end).endOf('day');

    return data.documents
      .filter(d => d.docType === 'Purchase Invoice')
      .filter(d => {
        const date = d.date || d.invoiceDetail?.date;
        return date && dayjs(date).isBetween(start, end, 'day', '[]');
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [data.documents, dateRange]);

  const allExpenses = useMemo(() => {
    const start = dayjs(dateRange.start).startOf('day');
    const end = dayjs(dateRange.end).endOf('day');

    return [
      ...data.expenses.map(e => ({ ...e, type: 'Expense' })),
      ...data.outwardPayments.filter(p => p.category !== 'Vendor Payment')
    ].filter(e => {
      const date = e.date || e.timestamp;
      return date && dayjs(date).isBetween(start, end, 'day', '[]');
    });
  }, [data.expenses, data.outwardPayments, dateRange]);

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalSales = allSalesDocs.reduce((sum, d) => sum + (Number(d.total) || 0), 0);
    const totalPurchase = allPurchaseDocs.reduce((sum, d) => sum + (Number(d.total) || 0), 0);
    const totalExp = allExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netProfit = totalSales - (totalPurchase + totalExp);
    const totalTax = allSalesDocs.reduce((sum, d) => sum + (Number(d.totalTax) || Number(d.cgst) + Number(d.sgst) + Number(d.igst) || 0), 0);

    return { totalSales, totalPurchase, totalExp, netProfit, totalTax };
  }, [allSalesDocs, allPurchaseDocs, allExpenses]);

  // Chart Data
  const trendData = useMemo(() => {
    const days = [];
    const start = dayjs(dateRange.start);
    const end = dayjs(dateRange.end);
    let curr = start;

    while (curr.isBefore(end) || curr.isSame(end, 'day')) {
      const dateStr = curr.format('YYYY-MM-DD');
      const sales = allSalesDocs
        .filter(d => d.date === dateStr)
        .reduce((sum, d) => sum + (Number(d.total) || 0), 0);
      const purchases = allPurchaseDocs
        .filter(d => d.date === dateStr)
        .reduce((sum, d) => sum + (Number(d.total) || 0), 0);

      days.push({
        date: curr.format('DD MMM'),
        Sales: sales,
        Purchases: purchases
      });
      curr = curr.add(1, 'day');
    }
    return days;
  }, [allSalesDocs, allPurchaseDocs, dateRange]);

  const expenseCategoryData = useMemo(() => {
    const cats = {};
    allExpenses.forEach(e => {
      const cat = e.category || 'Other';
      cats[cat] = (cats[cat] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [allExpenses]);

  if (loading && user) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Generating Intelligence Reports...</div>;
  }

  const KPICard = ({ title, value, icon: Icon, color, trend }) => (
    <div className="kpi-card">
      <div className="kpi-icon-wrapper" style={{ backgroundColor: `${color}15`, color: color }}>
        <Icon size={24} />
      </div>
      <div>
        <span className="kpi-title">{title}</span>
        <h2 className="kpi-value">₹{value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
        {trend && (
          <div className={`kpi-trend ${trend > 0 ? 'trend-up' : 'trend-down'}`}>
            {trend > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {Math.abs(trend)}% vs last period
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="reports-container">
      {/* Header */}
      <div className="reports-header animate-fade-in">
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Business Analytics</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>Comprehensive financial reporting & insights</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <DateRangePicker
            initialRange={dateRange}
            onChange={(range) => setDateRange(range)}
          />
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Download size={18} /> Export PDF
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="reports-nav animate-fade-in">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'sales', label: 'Sales Activity', icon: FileText },
          { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
          { id: 'expenses', label: 'Expenses', icon: PieChart },
          { id: 'gst', label: 'GST Summary', icon: CreditCard },
          { id: 'inventory', label: 'Stock Valuation', icon: Package },
        ].map(tab => (
          <button
            key={tab.id}
            className={`report-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} style={{ marginBottom: '-2px', marginRight: '8px' }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Views */}
      <div className="animate-fade-in">
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="kpi-grid">
              <KPICard title="Revenue" value={metrics.totalSales} icon={TrendingUp} color="var(--report-primary)" trend={12.5} />
              <KPICard title="Direct Costs" value={metrics.totalPurchase} icon={ShoppingBag} color="var(--report-warning)" trend={-2.4} />
              <KPICard title="Operating Exp" value={metrics.totalExp} icon={Wallet} color="var(--report-danger)" trend={5.1} />
              <KPICard title="Net Profit" value={metrics.netProfit} icon={BarChart3} color="var(--report-success)" trend={8.2} />
            </div>

            <div className="charts-grid">
              <div className="chart-container">
                <div className="chart-header">
                  <h3 className="chart-title">Revenue vs Purchases Trend</h3>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--report-primary)' }}>● Revenue</span>
                    <span style={{ color: 'var(--report-warning)' }}>● Purchases</span>
                  </div>
                </div>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--report-primary)" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="var(--report-primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      />
                      <Area type="monotone" dataKey="Sales" stroke="var(--report-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                      <Area type="monotone" dataKey="Purchases" stroke="var(--report-warning)" strokeWidth={2} fillOpacity={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-container">
                <h3 className="chart-title" style={{ marginBottom: '2rem' }}>Expense Breakdown</h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={expenseCategoryData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {expenseCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  {expenseCategoryData.slice(0, 4).map((cat, i) => (
                    <div key={cat.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[i % COLORS.length] }}></div>
                        {cat.name}
                      </span>
                      <span style={{ fontWeight: 600 }}>₹{cat.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="report-table-wrapper">
            <div className="report-table-header">
              <h3 style={{ margin: 0 }}>Detailed Sales Activity</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="Search party or ref..." className="form-control" style={{ maxWidth: '250px' }} />
              </div>
            </div>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Party Name</th>
                  <th>Taxable</th>
                  <th>Tax</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {allSalesDocs.map(d => (
                  <tr key={d.id}>
                    <td>{d.date}</td>
                    <td style={{ fontWeight: 600 }}>{d.invoiceNumber}</td>
                    <td>{d.customerName || d.name}</td>
                    <td>₹{Number(d.subTotal || d.total - (d.totalTax || 0)).toLocaleString()}</td>
                    <td>₹{Number(d.totalTax || 0).toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: 'var(--report-primary)' }}>₹{Number(d.total).toLocaleString()}</td>
                    <td><span className="status-badge status-completed">Collected</span></td>
                  </tr>
                ))}
                {allSalesDocs.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No sales recorded in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'purchases' && (
          <div className="report-table-wrapper">
            <div className="report-table-header">
              <h3 style={{ margin: 0 }}>Detailed Purchase Inward</h3>
            </div>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Refernece #</th>
                  <th>Vendor</th>
                  <th>Taxable</th>
                  <th>GST</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {allPurchaseDocs.map(d => (
                  <tr key={d.id}>
                    <td>{d.date}</td>
                    <td style={{ fontWeight: 600 }}>{d.invoiceNumber}</td>
                    <td>{d.customerName || d.vendorName}</td>
                    <td>₹{Number(d.subTotal).toLocaleString()}</td>
                    <td>₹{Number(d.totalTax).toLocaleString()}</td>
                    <td style={{ fontWeight: 700 }}>₹{Number(d.total).toLocaleString()}</td>
                  </tr>
                ))}
                {allPurchaseDocs.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No purchases recorded in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="report-table-wrapper">
            <div className="report-table-header">
              <h3 style={{ margin: 0 }}>Operations & Expenses</h3>
            </div>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {allExpenses.map((e, idx) => (
                  <tr key={idx}>
                    <td>{e.date}</td>
                    <td><span className="status-badge status-pending">{e.category || 'General'}</span></td>
                    <td>{e.description || e.notes || 'Business Expense'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--report-danger)' }}>₹{Number(e.amount).toLocaleString()}</td>
                  </tr>
                ))}
                {allExpenses.length === 0 && (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No expenses recorded in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'gst' && (
          <div className="gst-grid">
            <div className="gst-card">
              <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--report-primary)' }}>
                <FileText size={20} />
                <h3 style={{ margin: 0 }}>GSTR-1 Summary (Sales)</h3>
              </div>
              <div className="gst-row">
                <span className="gst-label">B2B Taxable Value</span>
                <span className="gst-value">₹{metrics.totalSales.toLocaleString()}</span>
              </div>
              <div className="gst-row">
                <span className="gst-label">Central Tax (CGST)</span>
                <span className="gst-value">₹{(metrics.totalTax / 2).toLocaleString()}</span>
              </div>
              <div className="gst-row">
                <span className="gst-label">State Tax (SGST)</span>
                <span className="gst-value">₹{(metrics.totalTax / 2).toLocaleString()}</span>
              </div>
              <div className="gst-row" style={{ marginTop: '1rem', borderTop: '2px solid var(--border-color)', paddingTop: '1rem' }}>
                <span className="gst-label" style={{ fontWeight: 700 }}>Total Liability</span>
                <span className="gst-value" style={{ color: 'var(--report-danger)', fontSize: '1.25rem' }}>₹{metrics.totalTax.toLocaleString()}</span>
              </div>
            </div>

            <div className="gst-card">
              <div className="flex items-center gap-2 mb-4" style={{ color: 'var(--report-success)' }}>
                <ShoppingBag size={20} />
                <h3 style={{ margin: 0 }}>GSTR-3B ITC (Purchases)</h3>
              </div>
              <div className="gst-row">
                <span className="gst-label">Eligible ITC (Purchases)</span>
                <span className="gst-value">₹{allPurchaseDocs.reduce((sum, d) => sum + (Number(d.totalTax) || 0), 0).toLocaleString()}</span>
              </div>
              <div className="gst-row">
                <span className="gst-label">ITC From Expenses</span>
                <span className="gst-value">₹0.00</span>
              </div>
              <div className="gst-row" style={{ marginTop: '1rem', borderTop: '2px solid var(--border-color)', paddingTop: '1rem' }}>
                <span className="gst-label" style={{ fontWeight: 700 }}>Total ITC Available</span>
                <span className="gst-value" style={{ color: 'var(--report-success)', fontSize: '1.25rem' }}>₹{allPurchaseDocs.reduce((sum, d) => sum + (Number(d.totalTax) || 0), 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="report-table-wrapper">
            <div className="report-table-header">
              <h3 style={{ margin: 0 }}>Stock Valuation Report</h3>
              <div style={{ padding: '0.5rem 1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', color: 'var(--report-primary)', fontWeight: 700 }}>
                Total Asset Value: ₹{data.products.reduce((sum, p) => sum + (Number(p.stock) || 0) * (Number(p.purchasePrice) || Number(p.price) * 0.7), 0).toLocaleString()}
              </div>
            </div>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU / Code</th>
                  <th>Current Stock</th>
                  <th>Value (Purchase)</th>
                  <th>Total Asset Value</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.sku || 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${Number(p.stock) < 5 ? 'status-cancelled' : 'status-completed'}`}>
                        {p.stock} {p.unit || 'Units'}
                      </span>
                    </td>
                    <td>₹{Number(p.purchasePrice || p.price * 0.7).toLocaleString()}</td>
                    <td style={{ fontWeight: 700 }}>₹{((Number(p.stock) || 0) * (Number(p.purchasePrice) || Number(p.price) * 0.7)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
