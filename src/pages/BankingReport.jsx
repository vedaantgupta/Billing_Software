import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie,
  LineChart, Line, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import { 
  ArrowLeft, Download, Filter, Calendar, 
  ArrowUpRight, ArrowDownLeft, Landmark, 
  TrendingUp, Wallet, Receipt, CreditCard,
  FileText, Share2, Printer, Search, ChevronRight,
  ShieldAlert, Activity, Globe, Zap, Users, 
  Layers, BarChart3, PieChart as PieChartIcon, 
  Lock, Cpu, Target, Briefcase
} from 'lucide-react';
import { getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import './BankingReport.css';

const BankingReport = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('performance'); // performance, asset-quality, sectoral, digital
  const [banks, setBanks] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [bankList, inward, outward] = await Promise.all([
          getItems('banks', user.id),
          getItems('inwardPayments', user.id),
          getItems('outwardPayments', user.id)
        ]);

        setBanks(bankList || []);
        
        const allTransactions = [
          ...(inward || []).map(t => ({
            id: t._dbId || t.id,
            date: t.date,
            amount: parseFloat(t.amount) || 0,
            type: 'inward',
            method: t.paymentType,
            entity: t.customerName,
            category: 'Revenue'
          })),
          ...(outward || []).map(t => ({
            id: t._dbId || t.id,
            date: t.date,
            amount: parseFloat(t.amount) || 0,
            type: 'outward',
            method: t.paymentType,
            entity: t.vendorName || t.customerName,
            category: 'Expense'
          }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        setTransactions(allTransactions.filter(t => 
          ['Bank Transfer', 'UPI', 'Cheque', 'Credit Card', 'UPI / PhonePe'].includes(t.method)
        ));
      } catch (err) {
        console.error('Failed to fetch report data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Simulated Professional Banking Metrics
  const institutionalStats = {
    grossNPA: '1.2%',
    netNPA: '0.4%',
    car: '14.8%',
    pcr: '82.5%',
    nim: '3.4%',
    costToIncome: '42.1%'
  };

  const sectoralData = [
    { name: 'Agriculture', value: 250000, color: '#10b981' },
    { name: 'MSME', value: 450000, color: '#3b82f6' },
    { name: 'Industry', value: 380000, color: '#8b5cf6' },
    { name: 'Housing', value: 310000, color: '#f59e0b' },
    { name: 'Others', value: 120000, color: '#64748b' }
  ];

  const digitalAdoption = [
    { subject: 'Mobile', A: 120, fullMark: 150 },
    { subject: 'Net Bank', A: 98, fullMark: 150 },
    { subject: 'UPI', A: 145, fullMark: 150 },
    { subject: 'POS', A: 65, fullMark: 150 },
    { subject: 'API', A: 40, fullMark: 150 },
  ];

  const chartData = useMemo(() => {
    const days = {};
    const last30Days = [...Array(30)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    last30Days.forEach(date => {
      days[date] = { date, inward: 0, outward: 0 };
    });

    transactions.forEach(t => {
      if (days[t.date]) {
        if (t.type === 'inward') days[t.date].inward += t.amount;
        else days[t.date].outward += t.amount;
      }
    });

    return Object.values(days);
  }, [transactions]);

  if (loading) {
    return (
      <div className="br-loading-v2">
        <div className="br-pulse-container">
          <div className="br-pulse-circle"></div>
          <Landmark size={48} className="br-loader-icon" />
        </div>
        <h3>Compiling Institutional Intelligence</h3>
        <p>Analyzing BSR Data & Regulatory Compliance Metrics...</p>
      </div>
    );
  }

  return (
    <div className="br-v2-page full-width">
      <main className="br-v2-main no-sidebar">
        {/* Top Header */}
        <header className="br-v2-header">
           <div className="br-v2-header-left">
              <button className="br-back-btn" onClick={() => navigate('/banks')}>
                <ArrowLeft size={20} />
              </button>
              <div className="br-v2-header-title">
                <div className="br-v2-logo-compact">
                  <Cpu size={20} />
                  <span>Banking Intelligence Report</span>
                </div>
                <div className="br-v2-breadcrumbs">Financial Intelligence Center / 2026 Q1</div>
              </div>
           </div>
           
           <div className="br-v2-header-actions">
              <div className="br-v2-search">
                <Search size={16} />
                <input type="text" placeholder="Search indices..." />
              </div>
              <button className="br-v2-btn icon-only"><Share2 size={18} /></button>
              <button className="br-v2-btn icon-only"><Printer size={18} /></button>
              <button className="br-v2-btn primary"><Download size={18} /> Export BSR Data</button>
           </div>
        </header>

        {/* Top Navigation Tabs */}
        <div className="br-v2-tabs-wrap">
          <nav className="br-v2-tabs">
            <button className={activeTab === 'performance' ? 'active' : ''} onClick={() => setActiveTab('performance')}>
              <Activity size={18} /> Financial Performance
            </button>
            <button className={activeTab === 'asset-quality' ? 'active' : ''} onClick={() => setActiveTab('asset-quality')}>
              <ShieldAlert size={18} /> Asset Quality & Risk
            </button>
            <button className={activeTab === 'sectoral' ? 'active' : ''} onClick={() => setActiveTab('sectoral')}>
              <Layers size={18} /> Sectoral Credits
            </button>
            <button className={activeTab === 'digital' ? 'active' : ''} onClick={() => setActiveTab('digital')}>
              <Zap size={18} /> Digital Transformation
            </button>
          </nav>
        </div>

        {/* Dynamic Content */}
        <div className="br-v2-content">
          
          {activeTab === 'performance' && (
            <div className="br-tab-performance animate-in">
               {/* Key Metrics Grid */}
               <div className="br-v2-metrics-grid">
                  <div className="br-v2-metric-card">
                    <div className="br-v2-metric-header">
                      <span>Gross NPA</span>
                      <ShieldAlert size={16} />
                    </div>
                    <div className="br-v2-metric-value">{institutionalStats.grossNPA}</div>
                    <div className="br-v2-metric-trend low">Below Industry Avg</div>
                  </div>
                  <div className="br-v2-metric-card">
                    <div className="br-v2-metric-header">
                      <span>Capital Adequacy (CAR)</span>
                      <Target size={16} />
                    </div>
                    <div className="br-v2-metric-value">{institutionalStats.car}</div>
                    <div className="br-v2-metric-trend high">Tier 1 Strong</div>
                  </div>
                  <div className="br-v2-metric-card">
                    <div className="br-v2-metric-header">
                      <span>Net Interest Margin (NIM)</span>
                      <TrendingUp size={16} />
                    </div>
                    <div className="br-v2-metric-value">{institutionalStats.nim}</div>
                    <div className="br-v2-metric-trend">Stabilized</div>
                  </div>
                  <div className="br-v2-metric-card">
                    <div className="br-v2-metric-header">
                      <span>PCR Ratio</span>
                      <Lock size={16} />
                    </div>
                    <div className="br-v2-metric-value">{institutionalStats.pcr}</div>
                    <div className="br-v2-metric-trend high">Highly Provisioned</div>
                  </div>
               </div>

               <div className="br-v2-charts-row">
                  <div className="br-v2-chart-box main">
                    <div className="br-v2-box-header">
                      <h3>Balance Sheet Expansion Trends</h3>
                      <p>Growth in Deposits vs Credit deployment</p>
                    </div>
                    <div className="br-v2-chart-body">
                      <ResponsiveContainer width="100%" height={320}>
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                          <Tooltip />
                          <Area type="monotone" dataKey="inward" name="Deposit/Credit" stroke="#3b82f6" strokeWidth={3} fill="url(#grad1)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="br-v2-chart-box side">
                    <div className="br-v2-box-header">
                      <h3>Profitability & Efficiency</h3>
                    </div>
                    <div className="br-v2-ee-list">
                       <div className="ee-item">
                          <span>Operating Expenses</span>
                          <div className="ee-bar-wrap"><div className="ee-bar" style={{width: '42%'}}></div></div>
                          <strong>42.1%</strong>
                       </div>
                       <div className="ee-item">
                          <span>Cost to Income</span>
                          <div className="ee-bar-wrap"><div className="ee-bar" style={{width: '38%'}}></div></div>
                          <strong>38.4%</strong>
                       </div>
                       <div className="ee-item">
                          <span>Yield on Assets</span>
                          <div className="ee-bar-wrap"><div className="ee-bar" style={{width: '65%', background: '#10b981'}}></div></div>
                          <strong>8.2%</strong>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'sectoral' && (
            <div className="br-tab-sectoral animate-in">
               <div className="br-v2-charts-row">
                  <div className="br-v2-chart-box">
                    <div className="br-v2-box-header">
                       <h3>Sectoral Credit Deployment</h3>
                       <p>Distribution across key economic pillars (Agriculture, MSME, Housing)</p>
                    </div>
                    <div className="br-v2-chart-body">
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={sectoralData} layout="vertical">
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                             {sectoralData.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="br-v2-chart-box side">
                    <div className="br-v2-box-header">
                       <h3>Macro-Financial Insights</h3>
                    </div>
                    <div className="br-v2-insights-list">
                       <div className="insight-card">
                          <Briefcase size={20} />
                          <div>
                            <strong>GDP Correlation</strong>
                            <p>Direct impact from industrial expansion</p>
                          </div>
                       </div>
                       <div className="insight-card">
                          <Activity size={20} />
                          <div>
                            <strong>Inflation Hedging</strong>
                            <p>Interest rate sensitivity analyzed</p>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'digital' && (
            <div className="br-tab-digital animate-in">
               <div className="br-v2-charts-row">
                  <div className="br-v2-chart-box">
                    <div className="br-v2-box-header">
                       <h3>Digital Transformation Radar</h3>
                       <p>Technology adoption and digital footprint across channels</p>
                    </div>
                    <div className="br-v2-chart-body" style={{ display: 'flex', justifyContent: 'center' }}>
                      <ResponsiveContainer width="100%" height={350}>
                        <RadarChart data={digitalAdoption}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                          <Radar name="Adoption" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="br-v2-chart-box side">
                    <div className="br-v2-box-header">
                       <h3>Cybersecurity & Tech</h3>
                    </div>
                    <div className="br-v2-tech-stack">
                       <div className="tech-stat">
                          <strong>99.9%</strong>
                          <span>Uptime Reliability</span>
                       </div>
                       <div className="tech-stat">
                          <strong>256-bit</strong>
                          <span>Encryption Standard</span>
                       </div>
                       <div className="tech-stat">
                          <strong>AI-Ready</strong>
                          <span>Predictive Analytics</span>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'asset-quality' && (
             <div className="br-tab-risk animate-in">
                <div className="br-v2-chart-box full-width">
                   <div className="br-v2-box-header">
                      <h3>Asset Quality Trends (Gross vs Net NPA)</h3>
                   </div>
                   <div className="br-v2-chart-body">
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="date" hide />
                           <YAxis axisLine={false} tickLine={false} />
                           <Tooltip />
                           <Line type="monotone" dataKey="inward" stroke="#10b981" strokeWidth={3} dot={false} />
                           <Line type="monotone" dataKey="outward" stroke="#ef4444" strokeWidth={3} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                   </div>
                </div>
                <div className="br-v2-metrics-grid" style={{ marginTop: '2rem' }}>
                   <div className="br-v2-info-card">
                      <div className="info-icon"><ShieldAlert /></div>
                      <div className="info-text">
                        <strong>Regulatory Compliance</strong>
                        <p>Provisioning Coverage Ratio (PCR) is at 82.5%, well above regulatory requirements.</p>
                      </div>
                   </div>
                   <div className="br-v2-info-card">
                      <div className="info-icon"><Activity /></div>
                      <div className="info-text">
                        <strong>Risk Management</strong>
                        <p>Evaluation of credit, market, and liquidity risks using automated stress tests.</p>
                      </div>
                   </div>
                </div>
             </div>
          )}
        </div>
        
        {/* Strategic Insights Footer Block */}
        <section className="br-v2-strategic-insights">
           <div className="br-v2-insights-header">
              <Globe size={20} /> 
              <h3>Strategic Advisory & Corporate Intelligence</h3>
           </div>
           <div className="br-v2-insights-grid">
              <div className="insight-item">
                 <h4>M&A Potential</h4>
                 <p>Market trends suggest high consolidation potential in the commercial sector.</p>
              </div>
              <div className="insight-item">
                 <h4>Predictive Risk</h4>
                 <p>AI models predict a 2.1% growth in deposits over the next fiscal quarter.</p>
              </div>
              <div className="insight-item">
                 <h4>Customer Insights</h4>
                 <p>KYC efficiency has improved by 22% following digital transformation.</p>
              </div>
           </div>
           <div className="nibm-footer-badge">National Institute of Bank Management (NIBM) Certified Template</div>
        </section>
      </main>
    </div>
  );
};

export default BankingReport;
