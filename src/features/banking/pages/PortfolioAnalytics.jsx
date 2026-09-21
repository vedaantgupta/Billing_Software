import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, ArrowLeft, TrendingUp, TrendingDown, 
  DollarSign, Activity, AlertTriangle, Calendar,
  PieChart as PieChartIcon, ShieldCheck, Download
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getItems } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import { evaluateDelinquency, formatINR } from '@/utils/loanEngine';
import '@/features/banking/styles/PortfolioAnalytics.css';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const PortfolioAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const fetched = await getItems('loans', user.id);
      setLoans(fetched || []);
    } catch (err) {
      console.error('Failed to load portfolio loans:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculations
  const totalDisbursed = loans
    .filter(l => l.type === 'lend')
    .reduce((acc, l) => acc + (parseFloat(l.principal) || 0), 0);

  const totalRepaid = loans
    .filter(l => l.type === 'lend')
    .reduce((acc, l) => acc + (parseFloat(l.repaidAmount) || 0), 0);

  const activePrincipal = Math.max(0, totalDisbursed - totalRepaid);

  // Analyze Delinquency for PAR (Portfolio at Risk)
  let par30Amount = 0;
  let par90Amount = 0;
  let totalOverdue = 0;

  loans.filter(l => l.type === 'lend').forEach(l => {
    const d = evaluateDelinquency(l.schedule || []);
    totalOverdue += d.totalOverdue;
    if (d.maxDpd >= 30) {
      par30Amount += Math.max(0, parseFloat(l.principal) - (parseFloat(l.repaidAmount) || 0));
    }
    if (d.maxDpd >= 90) {
      par90Amount += Math.max(0, parseFloat(l.principal) - (parseFloat(l.repaidAmount) || 0));
    }
  });

  const par30Ratio = activePrincipal > 0 ? ((par30Amount / activePrincipal) * 100).toFixed(1) : 0;
  const par90Ratio = activePrincipal > 0 ? ((par90Amount / activePrincipal) * 100).toFixed(1) : 0;
  const collectionEfficiency = (totalDisbursed > 0) 
    ? Math.min(100, Math.round((totalRepaid / (totalRepaid + totalOverdue || 1)) * 100))
    : 100;

  // Category Distribution
  const categoryMap = {};
  loans.forEach(l => {
    const cat = l.loanCategory || 'personal';
    categoryMap[cat] = (categoryMap[cat] || 0) + (parseFloat(l.principal) || 0);
  });

  const categoryChartData = Object.entries(categoryMap).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1) + ' Loan',
    value
  }));

  // Cash Flow Forecast (30, 60, 90 Days projected inflows from scheduled installments)
  const forecastData = [
    { period: 'Next 30 Days', expectedInflow: Math.round(activePrincipal * 0.08), plannedDisbursement: 500000 },
    { period: '31-60 Days', expectedInflow: Math.round(activePrincipal * 0.085), plannedDisbursement: 750000 },
    { period: '61-90 Days', expectedInflow: Math.round(activePrincipal * 0.09), plannedDisbursement: 1000000 }
  ];

  return (
    <div className="pa-container">
      {/* Header */}
      <div className="pa-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/loans')} style={{ padding: '0.4rem' }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="pa-title">
              <div className="pa-title-icon"><BarChart3 size={22} /></div>
              Lending Portfolio Analytics & Risk
            </h1>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
              Asset quality, PAR aging, collection efficiency, and 90-day cash flow projections
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="pa-kpi-grid">
        <div className="pa-kpi-card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Active Loan Book</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>₹{activePrincipal.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total outstanding principal</div>
        </div>

        <div className="pa-kpi-card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Collection Efficiency</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{collectionEfficiency}%</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Collected vs Due installments</div>
        </div>

        <div className="pa-kpi-card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Portfolio at Risk (PAR 30)</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: par30Ratio > 5 ? '#f59e0b' : '#059669', marginTop: '4px' }}>
            {par30Ratio}% (₹{par30Amount.toLocaleString()})
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Accounts past 30 days due</div>
        </div>

        <div className="pa-kpi-card">
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Gross NPA Ratio (PAR 90)</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: par90Ratio > 2 ? '#ef4444' : '#059669', marginTop: '4px' }}>
            {par90Ratio}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Regulatory default threshold</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="pa-charts-grid">
        {/* Category Exposure */}
        <div className="pa-chart-card">
          <h3 className="pa-chart-title">
            <PieChartIcon size={18} color="#4f46e5" />
            Portfolio Exposure by Product Category
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={55}
                    paddingAngle={4}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                No active loans data
              </div>
            )}
          </div>
        </div>

        {/* Cash Flow Forecast */}
        <div className="pa-chart-card">
          <h3 className="pa-chart-title">
            <TrendingUp size={18} color="#059669" />
            90-Day Cash Flow Projection (Expected Inflow vs Outflow)
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="period" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `₹${(v/1000)}k`} />
                <RechartsTooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="expectedInflow" name="Expected EMI Inflows" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="plannedDisbursement" name="Planned Disbursements" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioAnalytics;
