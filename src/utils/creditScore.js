/**
 * Credit Score Calculation Engine
 * Range: 300 - 900
 * Factors:
 * 1. Base Score: 700 (New account / neutral)
 * 2. Repayment History (35%): On-time vs late payments.
 * 3. Credit Utilization (30%): Total debt vs perceived limit.
 * 4. Credit Age (15%): Time since first loan.
 * 5. Payment Percentage (20%): Total repaid amount vs total payable.
 */

export const calculateCreditScore = (loans = [], contactId = null) => {
  // Filter for specific contact if provided, otherwise calculate global
  const targetLoans = contactId 
    ? loans.filter(l => l.contactId === contactId || l._dbId === contactId)
    : loans;

  if (targetLoans.length === 0) return 750; // Neutral starting point

  let score = 700;

  // 1. Repayment History Impact
  let totalPayments = 0;
  let onTimePayments = 0;
  
  targetLoans.forEach(loan => {
    const payments = loan.payments || [];
    totalPayments += payments.length;
    
    // For this simulation, we assume all recorded payments are "on-time" 
    // unless compared against a due date (which we'll add in future).
    // Logic: Each payment improves the score slightly.
    onTimePayments += payments.length;
  });

  if (totalPayments > 0) {
    const repaymentRatio = onTimePayments / totalPayments;
    score += (repaymentRatio * 100) - 50; // -50 to +50 impact
  }

  // 2. Repayment Percentage Progress
  let totalPayable = 0;
  let totalRepaid = 0;
  
  targetLoans.forEach(loan => {
    const P = parseFloat(loan.principal) || 0;
    const emi = parseFloat(loan.emi) || 0;
    const tenure = parseFloat(loan.tenure) || 0;
    
    totalPayable += (emi * tenure) || P;
    totalRepaid += parseFloat(loan.repaidAmount) || 0;
  });

  if (totalPayable > 0) {
    const progressRatio = totalRepaid / totalPayable;
    score += (progressRatio * 100); // Up to +100 for fulfilling obligations
  }

  // 3. Credit Utilization (Penalty for high debt)
  // For simplicity, we compare total borrowed against a theoretical 10L limit
  const totalDebt = targetLoans
    .filter(l => l.type === 'borrow')
    .reduce((acc, l) => acc + (parseFloat(l.principal) - (parseFloat(l.repaidAmount) || 0)), 0);
  
  const utilization = Math.min(totalDebt / 1000000, 1);
  if (utilization > 0.3) {
    score -= (utilization * 50); // Up to -50 for high utilization
  }

  // 4. Credit Age
  const oldestLoan = targetLoans.reduce((oldest, current) => {
    const curDate = new Date(current.createdAt || current.startDate);
    return curDate < oldest ? curDate : oldest;
  }, new Date());
  
  const ageInMonths = (new Date() - oldestLoan) / (1000 * 60 * 60 * 24 * 30.44);
  score += Math.min(ageInMonths * 2, 50); // Up to +50 for older credit history

  // Bounds check
  return Math.min(900, Math.max(300, Math.round(score)));
};

export const getQualitativeLabel = (score) => {
  if (score >= 800) return { label: 'Excellent', color: '#059669' }; // Deep Green
  if (score >= 720) return { label: 'Good', color: '#10b981' };      // Green
  if (score >= 650) return { label: 'Average', color: '#d97706' };   // Amber
  if (score >= 500) return { label: 'Fair', color: '#ea580c' };      // Orange
  return { label: 'Poor', color: '#dc2626' };                      // Red
};

export const getCreditFactors = (loans = []) => {
  if (loans.length === 0) return [];

  const factors = [];
  
  // 1. Payment History
  let totalPayments = 0;
  loans.forEach(l => totalPayments += (l.payments || []).length);
  factors.push({
    title: 'Payment History',
    status: totalPayments > 0 ? 'Positive' : 'Neutral',
    impact: totalPayments > 5 ? '+High' : '+Medium',
    desc: totalPayments > 0 ? `You have recorded ${totalPayments} on-time installments.` : 'No payment history recorded yet.',
    score: Math.min(totalPayments * 10, 100)
  });

  // 2. Credit Utilization
  const totalBorrowed = loans.filter(l => l.type === 'borrow').reduce((acc, l) => acc + (parseFloat(l.principal) || 0), 0);
  const totalRepaid = loans.filter(l => l.type === 'borrow').reduce((acc, l) => acc + (parseFloat(l.repaidAmount) || 0), 0);
  const currentDebt = totalBorrowed - totalRepaid;
  const utilization = Math.min(currentDebt / 1000000, 1);
  
  factors.push({
    title: 'Credit Utilization',
    status: utilization < 0.3 ? 'Excellent' : utilization < 0.6 ? 'Good' : 'High',
    impact: utilization < 0.3 ? '+High' : '-Medium',
    desc: utilization < 0.3 ? 'Your debt levels are very low compared to limits.' : 'Consider reducing overall debt to improve score.',
    score: Math.max(0, 100 - (utilization * 100))
  });

  // 3. Credit Age
  const oldestLoan = loans.reduce((oldest, current) => {
    const curDate = new Date(current.createdAt || current.startDate);
    return curDate < oldest ? curDate : oldest;
  }, new Date());
  const ageInMonths = (new Date() - oldestLoan) / (1000 * 60 * 60 * 24 * 30.44);
  
  factors.push({
    title: 'Account Age',
    status: ageInMonths > 12 ? 'Positive' : 'New',
    impact: ageInMonths > 12 ? '+High' : 'Neutral',
    desc: ageInMonths > 12 ? `Active credit history of ${Math.round(ageInMonths)} months.` : 'Building credit history duration.',
    score: Math.min(ageInMonths * 8, 100)
  });

  // 4. Fulfillment Ratio
  const totalPrincipal = loans.reduce((acc, l) => acc + (parseFloat(l.principal) || 0), 0);
  const totalRepaidAll = loans.reduce((acc, l) => acc + (parseFloat(l.repaidAmount) || 0), 0);
  const fulfillRatio = totalRepaidAll / totalPrincipal;
  
  factors.push({
    title: 'Fulfillment Ratio',
    status: fulfillRatio > 0.5 ? 'Excellent' : 'Improving',
    impact: '+Medium',
    desc: `You have cleared ${Math.round(fulfillRatio * 100)}% of your total loan principal.`,
    score: Math.min(fulfillRatio * 100, 100)
  });

  return factors;
};
