import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Download, Printer, PieChart as PieChartIcon, 
  List, Calculator, Settings, Layers, IndianRupee, Landmark
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import './AdvancedLoanCalculator.css';

const COLORS = ['#10b981', '#f59e0b', '#3b82f6'];

const formatInr = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
}).format(value);

const AdvancedLoanCalculator = () => {
  const navigate = useNavigate();

  // Core Inputs
  const [inputs, setInputs] = useState({
    principal: 5000000,
    rate: 8.5,
    tenure: 20,
    tenureType: 'years', // years, months
    processingFeePercent: 1.0,
    
    // Prepayment Inputs
    extraMonthly: 0,
    extraYearly: 0,
    
    // Comparison Inputs
    compRate: 8.0,
    compTenure: 20
  });

  const handleInput = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: Number(value) || 0 }));
  };

  const handleSelect = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  // --- Calculation Engine ---
  const computations = useMemo(() => {
    const p = inputs.principal;
    const annualRate = inputs.rate;
    const r = annualRate / 12 / 100;
    const n = inputs.tenureType === 'years' ? inputs.tenure * 12 : inputs.tenure;
    
    // Processing Fee
    const fee = (p * inputs.processingFeePercent) / 100;

    let emi = 0;
    let totalPayable = p;
    let totalInterest = 0;
    let amortization = [];
    let closingBalance = p;
    
    // Handling Standard Compound/Reducing Balance
    if (r > 0 && n > 0) {
      emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    } else if (n > 0) {
      emi = p / n;
    }

    let actualTenure = 0;

    // Generate accurate Amortization considering prepayments
    for (let month = 1; month <= n; month++) {
      if (closingBalance <= 0) break;

      const interestForMonth = closingBalance * r;
      
      // Determine what the user actually pays (Standard EMI + Prepayments)
      let currentPayment = emi;
      
      // Add extra monthly prepayment
      if (inputs.extraMonthly > 0) {
        currentPayment += inputs.extraMonthly;
      }
      
      // Add extra yearly prepayment (every 12th month)
      if (inputs.extraYearly > 0 && month % 12 === 0) {
        currentPayment += inputs.extraYearly;
      }

      let principalForMonth = currentPayment - interestForMonth;

      // Adjust closing month if payment exceeds balance
      if (principalForMonth > closingBalance) {
        principalForMonth = closingBalance;
        currentPayment = principalForMonth + interestForMonth;
      }

      const openingBalance = closingBalance;
      closingBalance = closingBalance - principalForMonth;

      totalInterest += interestForMonth;
      actualTenure++;

      amortization.push({
        month,
        opening: openingBalance,
        emiPaid: currentPayment,
        principalInfo: principalForMonth,
        interestInfo: interestForMonth,
        closing: Math.max(0, closingBalance)
      });
    }

    totalPayable = p + totalInterest + fee;
    
    // Compute Comparison Scenario (if needed)
    let compEmi = 0, compTotalInt = 0, compTotalPay = p;
    const cn = inputs.compTenure * 12; // assuming years for simplicity in compare mode
    const cr = inputs.compRate / 12 / 100;
    if (cr > 0 && cn > 0) {
      compEmi = (p * cr * Math.pow(1 + cr, cn)) / (Math.pow(1 + cr, cn) - 1);
      compTotalPay = compEmi * cn;
      compTotalInt = compTotalPay - p;
    }

    // Tax Benefits (India Section 24(b) logic for Home Loan approx) - max 2L interest deduction per year.
    const firstYearInterest = amortization.slice(0, 12).reduce((sum, a) => sum + a.interestInfo, 0);
    const taxSavingApprox = Math.min(firstYearInterest, 200000) * 0.3; // Assuming 30% slab

    return {
      emi,
      totalInterest,
      totalPayable,
      fee,
      amortization,
      actualTenure,
      diffTenure: n - actualTenure, // months saved
      compEmi,
      compTotalInt,
      taxSavingApprox
    };

  }, [inputs]);

  // Render Charts Data
  const pieData = [
    { name: 'Principal', value: inputs.principal },
    { name: 'Total Interest', value: computations.totalInterest },
    { name: 'Processing Fees', value: computations.fee }
  ];

  // Helper macro to format tenure into Years and Months
  const formatTenure = (totalMonths) => {
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    if (y > 0 && m > 0) return `${y} Years ${m} Months`;
    if (y > 0) return `${y} Years`;
    return `${m} Months`;
  };

  return (
    <div className="alc-page">
      <div className="alc-container">
        
        {/* Header */}
        <div className="alc-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="alc-btn alc-btn-outline" onClick={() => navigate('/loans')} style={{ padding: '0.5rem' }}>
              <ArrowLeft size={20} />
            </button>
            <div className="alc-title">
              <h1>Advanced Loan Calculator</h1>
              <p>Simulate, analyze, and map your financial obligations accurately</p>
            </div>
          </div>
          
          <div className="alc-actions">
            <button className="alc-btn alc-btn-primary" onClick={() => window.print()}>
              <Printer size={18} /> Print PDF
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="alc-grid">
          
          {/* LEFT COLUMN: Inputs Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="alc-card alc-input-section">
              <h2 className="alc-label" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}><Calculator size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'sub' }}/> Core Loan Details</h2>
              
              <div className="alc-input-group">
                <div className="alc-input-header">
                  <span className="alc-label">Loan Amount (Principal)</span>
                  <span className="alc-value-display font-bold text-primary">{formatInr(inputs.principal)}</span>
                </div>
                <input 
                  type="range" className="alc-slider" min="10000" max="50000000" step="10000"
                  value={inputs.principal} onChange={(e) => handleInput('principal', e.target.value)}
                />
                <input 
                  type="number" value={inputs.principal} 
                  onChange={(e) => handleInput('principal', e.target.value)} 
                />
              </div>

              <div className="alc-input-group">
                <div className="alc-input-header">
                  <span className="alc-label">Interest Rate p.a (%)</span>
                  <span className="alc-value-display font-bold">{inputs.rate}%</span>
                </div>
                <input 
                  type="range" className="alc-slider" min="1" max="30" step="0.1"
                  value={inputs.rate} onChange={(e) => handleInput('rate', e.target.value)}
                />
                <input 
                  type="number" value={inputs.rate} step="0.1"
                  onChange={(e) => handleInput('rate', e.target.value)} 
                />
              </div>

              <div className="alc-input-group">
                <div className="alc-input-header">
                  <span className="alc-label">Loan Tenure</span>
                  <span className="alc-value-display font-bold">{inputs.tenure} {inputs.tenureType}</span>
                </div>
                <input 
                  type="range" className="alc-slider" min="1" max={inputs.tenureType === 'years' ? 30 : 360} step="1"
                  value={inputs.tenure} onChange={(e) => handleInput('tenure', e.target.value)}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="number" value={inputs.tenure} style={{ flex: 1 }}
                    onChange={(e) => handleInput('tenure', e.target.value)} 
                  />
                  <select value={inputs.tenureType} onChange={(e) => handleSelect('tenureType', e.target.value)}>
                    <option value="years">Years</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>

              <div className="alc-input-group">
                <div className="alc-input-header">
                  <span className="alc-label">Processing Fees (%)</span>
                  <span className="alc-value-display font-bold">{inputs.processingFeePercent}%</span>
                </div>
                <input 
                  type="number" value={inputs.processingFeePercent} step="0.1"
                  onChange={(e) => handleInput('processingFeePercent', e.target.value)} 
                />
              </div>
            </div>

            {/* PREPAYMENT SECTION */}
            <div className="alc-card alc-input-section alc-prepayment-card">
              <h2 className="alc-label" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#6366f1', borderBottom: '1px solid #cbd5e1', paddingBottom: '0.5rem' }}><Layers size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'sub' }}/> Prepayment Simulation</h2>
              <div className="alc-input-group">
                <span className="alc-label">Extra Monthly EMI</span>
                <input 
                  type="number" value={inputs.extraMonthly} 
                  onChange={(e) => handleInput('extraMonthly', e.target.value)} 
                  placeholder="e.g. 5000"
                />
                <small style={{ color: '#64748b' }}>Added on top of standard EMI every month</small>
              </div>
              
              <div className="alc-input-group">
                <span className="alc-label">Extra Yearly Payment</span>
                <input 
                  type="number" value={inputs.extraYearly} 
                  onChange={(e) => handleInput('extraYearly', e.target.value)} 
                  placeholder="e.g. 50000"
                />
                <small style={{ color: '#64748b' }}>Paid once every 12 months</small>
              </div>
            </div>

            {/* COMPARISON SECTION */}
            <div className="alc-card alc-input-section alc-compare-card-input">
              <h2 className="alc-label" style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: '#2563eb', borderBottom: '1px solid #bfdbfe', paddingBottom: '0.5rem' }}><Landmark size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'sub' }}/> Compare with Scenario B</h2>
              <div className="alc-input-group">
                <span className="alc-label">Scenario B: Interest Rate (%)</span>
                <input 
                  type="number" step="0.1" value={inputs.compRate} 
                  onChange={(e) => handleInput('compRate', e.target.value)} 
                />
              </div>
              
              <div className="alc-input-group">
                <span className="alc-label">Scenario B: Tenure (Years)</span>
                <input 
                  type="number" value={inputs.compTenure} 
                  onChange={(e) => handleInput('compTenure', e.target.value)} 
                />
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Results Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Primary Results */}
            <div className="alc-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="alc-results-wrapper">
                <div className="alc-main-result">
                  <h3>Monthly EMI</h3>
                  <div className="alc-emi-value">{formatInr(computations.emi)}</div>
                  {inputs.extraMonthly > 0 && (
                    <div style={{ marginTop: '0.8rem', color: '#166534', fontWeight: 600, fontSize: '1.1rem', background: 'rgba(255,255,255,0.4)', display: 'inline-block', padding: '0.5rem 1rem', borderRadius: '1rem' }}>
                      Actual Payment (w/ extra): {formatInr(computations.emi + inputs.extraMonthly)}
                    </div>
                  )}
                  <div style={{ marginTop: '1.5rem', background: '#ecfdf5', border: '1px solid #10b981', padding: '1rem', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.85rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Time Required to Close Loan</div>
                    <div style={{ fontSize: '1.5rem', color: '#065f46', fontWeight: 900 }}>{formatTenure(computations.actualTenure)}</div>
                  </div>
                </div>
                
                <div className="alc-sub-results">
                  <div className="alc-stat-box">
                    <span>Principal Amount</span>
                    <strong>{formatInr(inputs.principal)}</strong>
                  </div>
                  <div className="alc-stat-box">
                    <span>Total Interest</span>
                    <strong style={{ color: '#f59e0b' }}>{formatInr(computations.totalInterest)}</strong>
                  </div>
                  <div className="alc-stat-box">
                    <span>Total Amount Payable</span>
                    <strong>{formatInr(computations.totalPayable)}</strong>
                  </div>
                  <div className="alc-stat-box">
                    <span>Processing Fees</span>
                    <strong style={{ color: '#dc2626' }}>{formatInr(computations.fee)}</strong>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Chart and Advanced Info */}
            <div className="alc-card">
              <h3 className="alc-label" style={{ textAlign: 'center', marginBottom: '0' }}>Principal vs Interest Split</h3>
              <div className="alc-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => formatInr(value)} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div className="alc-label" style={{ marginBottom: '0.5rem' }}>Estimated 1st Year Tax Benefit (Sec 24b)</div>
                <strong style={{ color: '#10b981', fontSize: '1.5rem' }}>{formatInr(computations.taxSavingApprox)}</strong>
              </div>
            </div>

            {/* Prepayment Results */}
            {computations.diffTenure > 0 && (
              <div className="alc-card" style={{ background: '#fffbeb', border: '2px solid #fde68a' }}>
                <h3 style={{ color: '#d97706', margin: '0 0 1rem 0' }}><Layers size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'sub' }}/> Prepayment Savings!</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '1.1rem' }}>
                  <span style={{ fontWeight: 600 }}>Original Tenure:</span>
                  <span>{formatTenure(computations.actualTenure + computations.diffTenure)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1.1rem' }}>
                  <span style={{ fontWeight: 600 }}>New Accelerated Tenure:</span>
                  <span style={{ color: '#059669', fontWeight: 700 }}>{formatTenure(computations.actualTenure)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '2px dashed #fcd34d' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.25rem' }}>Total Time Saved:</span>
                  <span style={{ color: '#059669', fontWeight: 800, fontSize: '1.25rem' }}>{formatTenure(computations.diffTenure)}</span>
                </div>
              </div>
            )}

            {/* Comparison Results */}
            <div className="alc-card alc-compare-section">
              <h3 className="alc-label" style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}><Landmark size={18} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'sub' }}/> Loan Comparison Outcome</h3>
              <div className="alc-compare-grid">
                <div className={`alc-compare-card ${computations.totalInterest <= computations.compTotalInt ? 'winner' : ''}`}>
                  <h4 style={{ margin: '0 0 1rem 0' }}>Current Scenario</h4>
                  <div className="alc-stat-box" style={{ marginBottom: '0.5rem' }}>
                    <span>Calculated EMI</span>
                    <strong>{formatInr(computations.emi)}</strong>
                  </div>
                  <div className="alc-stat-box">
                    <span>Total Interest Target</span>
                    <strong>{formatInr(computations.totalInterest)}</strong>
                  </div>
                </div>
                
                <div className={`alc-compare-card ${computations.compTotalInt < computations.totalInterest ? 'winner' : ''}`}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#2563eb' }}>Scenario B</h4>
                  <div className="alc-stat-box" style={{ marginBottom: '0.5rem' }}>
                    <span>Calculated EMI</span>
                    <strong>{formatInr(computations.compEmi)}</strong>
                  </div>
                  <div className="alc-stat-box">
                    <span>Total Interest Target</span>
                    <strong>{formatInr(computations.compTotalInt)}</strong>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default AdvancedLoanCalculator;
