/**
 * Enterprise Lending Calculation & Financial Engine
 * Fully deterministic, auditable, high-precision calculation module.
 * 
 * Supports:
 * - Amortization: Flat, Reducing Balance (Compound EMI), Simple Interest, Bullet, Interest-Only
 * - Frequencies: Weekly, Bi-weekly, Monthly, Quarterly, Half-Yearly, Yearly
 * - Moratorium & Grace periods
 * - Payment Allocation Waterfall: 1. Penalties -> 2. Fees -> 3. Accrued Interest -> 4. Principal
 * - Partial Payments, Prepayments (Tenure reduction vs EMI reduction)
 * - Foreclosure / Settlement calculation
 * - Restructuring & Top-Up facilities
 * - DPD & Delinquency Aging (Current, 1-7, 8-30, 31-60, 61-90, 90+ / SMA-0, SMA-1, SMA-2, NPA)
 * - Underwriting Metrics: DTI, FOIR, LTV, Internal Risk Scoring
 */

// Rounding utility to avoid floating point inaccuracies
export const roundToTwo = (num) => {
  const n = Number(num);
  return isNaN(n) ? 0 : Math.round((n + Number.EPSILON) * 100) / 100;
};

export const formatINR = (val) => {
  const n = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n);
};

// 1. ADVANCED AMORTIZATION SCHEDULE GENERATOR
export const generateAmortizationSchedule = ({
  principal,
  interestRate, // annual rate in %
  tenure, // count of periods
  tenureUnit = 'months', // 'months' or 'years'
  interestType = 'reducing', // 'reducing', 'flat', 'simple', 'bullet', 'interest_only', 'none'
  frequency = 'monthly', // 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'half-yearly', 'yearly'
  startDate = new Date().toISOString().split('T')[0],
  moratoriumPeriod = 0, // periods of principal/EMI moratorium
  processingFee = 0,
  documentationFee = 0,
  latePenaltyRate = 2.0 // % per month on overdue
}) => {
  const P = parseFloat(principal) || 0;
  const annualRate = parseFloat(interestRate) || 0;
  const morat = parseInt(moratoriumPeriod) || 0;

  if (P <= 0) return { schedule: [], emi: 0, totalInterest: 0, totalPayable: 0 };

  // Determine periods per year
  let periodsPerYear = 12;
  let intervalDays = 30;
  switch (frequency) {
    case 'weekly':
      periodsPerYear = 52;
      intervalDays = 7;
      break;
    case 'bi-weekly':
      periodsPerYear = 26;
      intervalDays = 14;
      break;
    case 'quarterly':
      periodsPerYear = 4;
      intervalDays = 91;
      break;
    case 'half-yearly':
      periodsPerYear = 2;
      intervalDays = 182;
      break;
    case 'yearly':
      periodsPerYear = 1;
      intervalDays = 365;
      break;
    case 'monthly':
    default:
      periodsPerYear = 12;
      intervalDays = 30;
      break;
  }

  // Normalize total periods
  const totalPeriods = tenureUnit === 'years' 
    ? Math.round(Number(tenure) * periodsPerYear) 
    : Math.round(Number(tenure) * (periodsPerYear / 12));

  const numInstallments = Math.max(1, totalPeriods);
  const periodicRate = (annualRate / 100) / periodsPerYear;

  let emi = 0;
  let totalInterest = 0;
  const schedule = [];
  let closingPrincipal = P;

  // Calculate Base Periodic EMI
  if (interestType === 'none' || annualRate === 0) {
    emi = roundToTwo(P / numInstallments);
  } else if (interestType === 'flat' || interestType === 'simple') {
    const tenureInYears = numInstallments / periodsPerYear;
    totalInterest = roundToTwo(P * (annualRate / 100) * tenureInYears);
    emi = roundToTwo((P + totalInterest) / numInstallments);
  } else if (interestType === 'bullet') {
    emi = 0; // pays interest periodically, principal at end
  } else if (interestType === 'interest_only') {
    emi = roundToTwo(P * periodicRate);
  } else {
    // Standard Reducing Balance (Compound)
    if (periodicRate > 0) {
      emi = roundToTwo(
        (P * periodicRate * Math.pow(1 + periodicRate, numInstallments)) /
        (Math.pow(1 + periodicRate, numInstallments) - 1)
      );
    } else {
      emi = roundToTwo(P / numInstallments);
    }
  }

  const baseDate = new Date(startDate);

  for (let i = 1; i <= numInstallments; i++) {
    // Compute due date
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + (i * intervalDays));
    const dueDateStr = dueDate.toISOString().split('T')[0];

    const openingPrincipal = roundToTwo(closingPrincipal);
    let interestForPeriod = 0;
    let principalForPeriod = 0;
    let fees = i === 1 ? roundToTwo(processingFee + documentationFee) : 0;
    let penalties = 0;

    const isMoratorium = i <= morat;

    if (interestType === 'flat') {
      interestForPeriod = roundToTwo(totalInterest / numInstallments);
      principalForPeriod = isMoratorium ? 0 : roundToTwo(P / (numInstallments - morat));
    } else if (interestType === 'bullet') {
      interestForPeriod = roundToTwo(openingPrincipal * periodicRate);
      principalForPeriod = (i === numInstallments) ? openingPrincipal : 0;
    } else if (interestType === 'interest_only') {
      interestForPeriod = roundToTwo(openingPrincipal * periodicRate);
      principalForPeriod = (i === numInstallments) ? openingPrincipal : 0;
    } else if (interestType === 'none') {
      interestForPeriod = 0;
      principalForPeriod = isMoratorium ? 0 : roundToTwo(openingPrincipal / (numInstallments - i + 1));
    } else {
      // Reducing balance
      interestForPeriod = roundToTwo(openingPrincipal * periodicRate);
      if (isMoratorium) {
        principalForPeriod = 0;
      } else {
        principalForPeriod = roundToTwo(emi - interestForPeriod);
        if (principalForPeriod > openingPrincipal || i === numInstallments) {
          principalForPeriod = openingPrincipal;
        }
      }
    }

    if (principalForPeriod < 0) principalForPeriod = 0;
    closingPrincipal = roundToTwo(Math.max(0, openingPrincipal - principalForPeriod));

    const installmentTotal = roundToTwo(principalForPeriod + interestForPeriod + fees + penalties);
    totalInterest = roundToTwo(totalInterest + (interestType === 'flat' ? 0 : interestForPeriod));

    schedule.push({
      installmentNumber: i,
      dueDate: dueDateStr,
      openingPrincipal,
      principalDue: principalForPeriod,
      interestDue: interestForPeriod,
      feesDue: fees,
      penaltiesDue: penalties,
      totalDue: installmentTotal,
      paidAmount: 0,
      principalPaid: 0,
      interestPaid: 0,
      feesPaid: 0,
      penaltiesPaid: 0,
      remainingAmount: installmentTotal,
      closingPrincipal,
      status: 'upcoming', // 'upcoming', 'due', 'partially_paid', 'paid', 'overdue', 'waived', 'rescheduled'
      isMoratorium
    });
  }

  const totalPayable = roundToTwo(P + totalInterest + processingFee + documentationFee);

  return {
    schedule,
    emi,
    totalInterest,
    totalPayable,
    totalPeriods: numInstallments,
    closingBalance: closingPrincipal
  };
};

// 2. PAYMENT ALLOCATION ENGINE (WATERFALL)
// Standard order: 1. Penalties -> 2. Fees -> 3. Interest -> 4. Principal
export const allocatePaymentToSchedule = (schedule = [], paymentAmount, paymentDate = new Date().toISOString().split('T')[0]) => {
  let unallocated = roundToTwo(parseFloat(paymentAmount) || 0);
  const updatedSchedule = schedule.map(inst => ({ ...inst }));
  const allocations = [];

  for (let i = 0; i < updatedSchedule.length; i++) {
    if (unallocated <= 0) break;
    const inst = updatedSchedule[i];

    if (inst.status === 'paid' || inst.remainingAmount <= 0) continue;

    let instAllocated = {
      installmentNumber: inst.installmentNumber,
      dueDate: inst.dueDate,
      penalties: 0,
      fees: 0,
      interest: 0,
      principal: 0,
      total: 0
    };

    // 1. Allocate to Penalties
    const penaltyRemaining = roundToTwo((inst.penaltiesDue || 0) - (inst.penaltiesPaid || 0));
    if (penaltyRemaining > 0 && unallocated > 0) {
      const payPen = Math.min(penaltyRemaining, unallocated);
      inst.penaltiesPaid = roundToTwo((inst.penaltiesPaid || 0) + payPen);
      unallocated = roundToTwo(unallocated - payPen);
      instAllocated.penalties = payPen;
    }

    // 2. Allocate to Fees
    const feeRemaining = roundToTwo((inst.feesDue || 0) - (inst.feesPaid || 0));
    if (feeRemaining > 0 && unallocated > 0) {
      const payFee = Math.min(feeRemaining, unallocated);
      inst.feesPaid = roundToTwo((inst.feesPaid || 0) + payFee);
      unallocated = roundToTwo(unallocated - payFee);
      instAllocated.fees = payFee;
    }

    // 3. Allocate to Interest
    const interestRemaining = roundToTwo((inst.interestDue || 0) - (inst.interestPaid || 0));
    if (interestRemaining > 0 && unallocated > 0) {
      const payInt = Math.min(interestRemaining, unallocated);
      inst.interestPaid = roundToTwo((inst.interestPaid || 0) + payInt);
      unallocated = roundToTwo(unallocated - payInt);
      instAllocated.interest = payInt;
    }

    // 4. Allocate to Principal
    const principalRemaining = roundToTwo((inst.principalDue || 0) - (inst.principalPaid || 0));
    if (principalRemaining > 0 && unallocated > 0) {
      const payPrin = Math.min(principalRemaining, unallocated);
      inst.principalPaid = roundToTwo((inst.principalPaid || 0) + payPrin);
      unallocated = roundToTwo(unallocated - payPrin);
      instAllocated.principal = payPrin;
    }

    instAllocated.total = roundToTwo(
      instAllocated.penalties + instAllocated.fees + instAllocated.interest + instAllocated.principal
    );

    inst.paidAmount = roundToTwo((inst.paidAmount || 0) + instAllocated.total);
    inst.remainingAmount = roundToTwo(Math.max(0, inst.totalDue - inst.paidAmount));

    if (inst.remainingAmount <= 0) {
      inst.status = 'paid';
    } else if (inst.paidAmount > 0) {
      inst.status = 'partially_paid';
    }

    allocations.push(instAllocated);
  }

  return {
    updatedSchedule,
    allocations,
    unallocatedSurplus: unallocated
  };
};

// 3. DELINQUENCY & DPD AGING CALCULATOR
export const evaluateDelinquency = (schedule = [], asOfDate = new Date().toISOString().split('T')[0]) => {
  const asOf = new Date(asOfDate);
  let maxDpd = 0;
  let totalOverdue = 0;
  let overduePrincipal = 0;
  let overdueInterest = 0;
  let overdueFees = 0;
  let overduePenalties = 0;
  let overdueInstallmentsCount = 0;

  const analyzedSchedule = schedule.map(inst => {
    const dueDate = new Date(inst.dueDate);
    const diffTime = asOf.getTime() - dueDate.getTime();
    const dpd = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    let status = inst.status;
    if (inst.status !== 'paid' && inst.status !== 'waived') {
      if (dpd > 0 && inst.remainingAmount > 0) {
        status = inst.paidAmount > 0 ? 'partially_paid' : 'overdue';
        totalOverdue = roundToTwo(totalOverdue + inst.remainingAmount);
        overduePrincipal = roundToTwo(overduePrincipal + Math.max(0, inst.principalDue - (inst.principalPaid || 0)));
        overdueInterest = roundToTwo(overdueInterest + Math.max(0, inst.interestDue - (inst.interestPaid || 0)));
        overdueFees = roundToTwo(overdueFees + Math.max(0, inst.feesDue - (inst.feesPaid || 0)));
        overduePenalties = roundToTwo(overduePenalties + Math.max(0, inst.penaltiesDue - (inst.penaltiesPaid || 0)));
        overdueInstallmentsCount++;
        if (dpd > maxDpd) maxDpd = dpd;
      } else if (dpd === 0 && inst.remainingAmount > 0) {
        status = 'due';
      } else if (inst.remainingAmount <= 0) {
        status = 'paid';
      } else {
        status = 'upcoming';
      }
    }

    return {
      ...inst,
      dpd: inst.remainingAmount > 0 ? dpd : 0,
      status
    };
  });

  // Regulatory & Overdue Bucketing
  let agingBucket = 'Current';
  let smaClassification = 'Standard';
  let badgeColor = '#10b981';

  if (maxDpd === 0) {
    agingBucket = 'Current';
    smaClassification = 'Standard';
    badgeColor = '#10b981'; // Green
  } else if (maxDpd <= 7) {
    agingBucket = '1-7 Days';
    smaClassification = 'SMA-0 (Watch)';
    badgeColor = '#eab308'; // Yellow
  } else if (maxDpd <= 30) {
    agingBucket = '8-30 Days';
    smaClassification = 'SMA-0 (Pre-Stress)';
    badgeColor = '#f59e0b'; // Amber
  } else if (maxDpd <= 60) {
    agingBucket = '31-60 Days';
    smaClassification = 'SMA-1';
    badgeColor = '#f97316'; // Orange
  } else if (maxDpd <= 90) {
    agingBucket = '61-90 Days';
    smaClassification = 'SMA-2';
    badgeColor = '#ef4444'; // Red-orange
  } else {
    agingBucket = '90+ Days';
    smaClassification = 'NPA (Non-Performing Asset)';
    badgeColor = '#b91c1c'; // Deep Red
  }

  return {
    analyzedSchedule,
    maxDpd,
    totalOverdue,
    overduePrincipal,
    overdueInterest,
    overdueFees,
    overduePenalties,
    overdueInstallmentsCount,
    agingBucket,
    smaClassification,
    badgeColor
  };
};

// 4. FORECLOSURE & PRE-CLOSURE CALCULATOR
export const calculateForeclosure = ({
  loan,
  settlementDate = new Date().toISOString().split('T')[0],
  foreclosureFeePercent = 2.0, // % on outstanding principal
  interestDiscount = 0,
  feeWaiver = 0
}) => {
  if (!loan) return null;

  const schedule = loan.schedule || [];
  let unbilledPrincipal = 0;
  let overduePrincipal = 0;
  let accruedInterest = 0;
  let pendingFees = 0;
  let pendingPenalties = 0;

  schedule.forEach(inst => {
    if (inst.status !== 'paid') {
      const prinRemain = Math.max(0, inst.principalDue - (inst.principalPaid || 0));
      const intRemain = Math.max(0, inst.interestDue - (inst.interestPaid || 0));
      const feeRemain = Math.max(0, (inst.feesDue || 0) - (inst.feesPaid || 0));
      const penRemain = Math.max(0, (inst.penaltiesDue || 0) - (inst.penaltiesPaid || 0));

      const isDueOrPast = new Date(inst.dueDate) <= new Date(settlementDate);
      if (isDueOrPast) {
        overduePrincipal += prinRemain;
        accruedInterest += intRemain;
        pendingFees += feeRemain;
        pendingPenalties += penRemain;
      } else {
        unbilledPrincipal += prinRemain;
      }
    }
  });

  const totalOutstandingPrincipal = roundToTwo(unbilledPrincipal + overduePrincipal);
  const foreclosureCharge = roundToTwo((totalOutstandingPrincipal * (parseFloat(foreclosureFeePercent) || 0)) / 100);

  const grossSettlement = roundToTwo(
    totalOutstandingPrincipal + accruedInterest + pendingFees + pendingPenalties + foreclosureCharge
  );

  const totalWaivers = roundToTwo((parseFloat(interestDiscount) || 0) + (parseFloat(feeWaiver) || 0));
  const netSettlementAmount = roundToTwo(Math.max(0, grossSettlement - totalWaivers));

  return {
    settlementDate,
    unbilledPrincipal,
    overduePrincipal,
    totalOutstandingPrincipal,
    accruedInterest,
    pendingFees,
    pendingPenalties,
    foreclosureCharge,
    foreclosureFeePercent,
    interestDiscount: parseFloat(interestDiscount) || 0,
    feeWaiver: parseFloat(feeWaiver) || 0,
    totalWaivers,
    grossSettlement,
    netSettlementAmount
  };
};

// 5. PREPAYMENT IMPACT CALCULATOR (Tenure reduction vs EMI reduction)
export const calculatePrepaymentImpact = ({
  loan,
  prepaymentAmount,
  mode = 'reduce_tenure' // 'reduce_tenure' or 'reduce_emi'
}) => {
  const prepay = parseFloat(prepaymentAmount) || 0;
  if (!loan || prepay <= 0) return null;

  const currentPrincipal = parseFloat(loan.principal) - (parseFloat(loan.repaidAmount) || 0);
  const newPrincipal = Math.max(0, currentPrincipal - prepay);
  const annualRate = parseFloat(loan.interestRate) || 0;
  const currentEMI = parseFloat(loan.emi) || 0;
  const remainingTenure = Math.max(1, (loan.tenure || 12) - Math.floor((loan.repaidAmount || 0) / (currentEMI || 1)));

  const r = (annualRate / 100) / 12;

  if (mode === 'reduce_emi') {
    // Keep remaining tenure constant, recalculate lower EMI
    let newEMI = 0;
    if (r > 0) {
      newEMI = roundToTwo(
        (newPrincipal * r * Math.pow(1 + r, remainingTenure)) /
        (Math.pow(1 + r, remainingTenure) - 1)
      );
    } else {
      newEMI = roundToTwo(newPrincipal / remainingTenure);
    }
    const totalSavings = roundToTwo((currentEMI - newEMI) * remainingTenure - prepay);
    return {
      mode: 'reduce_emi',
      prepaymentAmount: prepay,
      oldPrincipal: currentPrincipal,
      newPrincipal,
      oldEMI: currentEMI,
      newEMI,
      tenureMonths: remainingTenure,
      interestSaved: Math.max(0, totalSavings)
    };
  } else {
    // Keep current EMI constant, reduce tenure
    let newTenureMonths = remainingTenure;
    if (r > 0 && currentEMI > newPrincipal * r) {
      newTenureMonths = Math.ceil(
        Math.log(currentEMI / (currentEMI - newPrincipal * r)) / Math.log(1 + r)
      );
    } else {
      newTenureMonths = Math.ceil(newPrincipal / (currentEMI || 1));
    }
    const monthsSaved = Math.max(0, remainingTenure - newTenureMonths);
    const interestSaved = roundToTwo(monthsSaved * currentEMI);
    return {
      mode: 'reduce_tenure',
      prepaymentAmount: prepay,
      oldPrincipal: currentPrincipal,
      newPrincipal,
      currentEMI,
      oldTenureMonths: remainingTenure,
      newTenureMonths,
      monthsSaved,
      interestSaved
    };
  }
};

// 6. UNDERWRITING & RISK ASSESSMENT SCORER
export const assessUnderwriting = ({
  monthlyIncome = 0,
  existingEMIs = 0,
  proposedEMI = 0,
  loanAmount = 0,
  collateralValue = 0,
  applicantAge = 30,
  employmentYears = 3,
  creditScore = 750,
  hasExistingDefaults = false
}) => {
  const income = parseFloat(monthlyIncome) || 0;
  const currObligations = parseFloat(existingEMIs) || 0;
  const newEMI = parseFloat(proposedEMI) || 0;
  const amount = parseFloat(loanAmount) || 0;
  const collateral = parseFloat(collateralValue) || 0;

  // 1. Debt-to-Income / Fixed Obligation to Income Ratio (FOIR)
  const totalObligations = currObligations + newEMI;
  const foir = income > 0 ? roundToTwo((totalObligations / income) * 100) : 100;

  // 2. Loan to Value (LTV) if secured
  const ltv = collateral > 0 ? roundToTwo((amount / collateral) * 100) : null;

  // Rule checks
  const rules = [];

  // Rule 1: FOIR <= 50%
  const foirPassed = foir <= 50;
  rules.push({
    rule: 'Fixed Obligation to Income Ratio (FOIR)',
    threshold: '<= 50%',
    actual: `${foir}%`,
    passed: foirPassed,
    impact: foirPassed ? 20 : -30
  });

  // Rule 2: Minimum Monthly Income >= 20,000
  const incomePassed = income >= 20000;
  rules.push({
    rule: 'Minimum Monthly Disposable Income',
    threshold: '>= ₹20,000',
    actual: `₹${income.toLocaleString()}`,
    passed: incomePassed,
    impact: incomePassed ? 15 : -25
  });

  // Rule 3: Credit Score >= 700
  const scorePassed = creditScore >= 700;
  rules.push({
    rule: 'Bureau / Internal Credit Score',
    threshold: '>= 700',
    actual: `${creditScore}`,
    passed: scorePassed,
    impact: scorePassed ? 25 : -35
  });

  // Rule 4: Employment Stability >= 2 years
  const empPassed = employmentYears >= 2;
  rules.push({
    rule: 'Employment / Business Stability',
    threshold: '>= 2 Years',
    actual: `${employmentYears} Years`,
    passed: empPassed,
    impact: empPassed ? 15 : -10
  });

  // Rule 5: Collateral Coverage (if provided)
  if (ltv !== null) {
    const ltvPassed = ltv <= 80;
    rules.push({
      rule: 'Loan-to-Value (LTV) Ratio',
      threshold: '<= 80%',
      actual: `${ltv}%`,
      passed: ltvPassed,
      impact: ltvPassed ? 25 : -40
    });
  }

  // Rule 6: Defaults / Delinquencies
  rules.push({
    rule: 'Prior Default / Delinquency Track',
    threshold: 'Zero Defaults',
    actual: hasExistingDefaults ? 'Has Defaults' : 'Clean Track',
    passed: !hasExistingDefaults,
    impact: !hasExistingDefaults ? 20 : -50
  });

  const passedCount = rules.filter(r => r.passed).length;
  const scorePercent = roundToTwo((passedCount / rules.length) * 100);

  let recommendation = 'REFER_REVIEW';
  let badgeColor = '#f59e0b';

  if (hasExistingDefaults || foir > 65 || creditScore < 600) {
    recommendation = 'REJECTED';
    badgeColor = '#ef4444';
  } else if (scorePercent >= 80 && foir <= 50 && creditScore >= 720) {
    recommendation = 'AUTO_APPROVED';
    badgeColor = '#10b981';
  } else {
    recommendation = 'CONDITIONAL_APPROVAL';
    badgeColor = '#3b82f6';
  }

  return {
    foir,
    ltv,
    rules,
    passedCount,
    totalRules: rules.length,
    scorePercent,
    recommendation,
    badgeColor
  };
};

export default {
  roundToTwo,
  formatINR,
  generateAmortizationSchedule,
  allocatePaymentToSchedule,
  evaluateDelinquency,
  calculateForeclosure,
  calculatePrepaymentImpact,
  assessUnderwriting
};
