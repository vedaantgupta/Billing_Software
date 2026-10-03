import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import '@/features/letters/styles/PrintTemplate.css';

// Helper for Number to Words (Indian Currency)
const toWords = (num) => {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];

  const convert_less_than_thousand = (n) => {
    let res = "";
    if (n >= 100) {
      res += ones[Math.floor(n / 100)] + " HUNDRED ";
      n %= 100;
    }
    if (n >= 10 && n <= 19) {
      res += teens[n - 10] + " ";
    } else {
      if (n >= 20) {
        res += tens[Math.floor(n / 10)] + " ";
        n %= 10;
      }
      if (n > 0) {
        res += ones[n] + " ";
      }
    }
    return res;
  };

  if (num === 0) return 'ZERO RUPEES ONLY';

  let result = "";
  let crore = Math.floor(num / 10000000);
  num %= 10000000;
  let lakh = Math.floor(num / 100000);
  num %= 100000;
  let thousand = Math.floor(num / 1000);
  num %= 1000;
  let remaining = Math.floor(num);

  if (crore > 0) result += convert_less_than_thousand(crore) + "CRORE ";
  if (lakh > 0) result += convert_less_than_thousand(lakh) + "LAKH ";
  if (thousand > 0) result += convert_less_than_thousand(thousand) + "THOUSAND ";
  if (remaining > 0) result += convert_less_than_thousand(remaining);

  return result.trim() + " RUPEES ONLY";
};

const PrintTemplate = ({ doc: rawDoc, company, products = [], type: rawType, copyType = 'ORIGINAL FOR RECIPIENT' }) => {
  if (!rawDoc) return null;

  // ── Salary Slip Template ──
  if (rawDoc.docType === 'Salary Slip' || rawType === 'Salary Slip') {
    const s = rawDoc;

    // Detailed Calculation Logic (Breakdown of Total Salary)
    const monthlySalary = Number(s.salary) || 0;
    const totalDays = Number(s.attendanceDays) || 30;
    const absentDays = Number(s.absences) || 0;
    const workedDays = totalDays - absentDays;

    // Visual Breakdown
    const basic = monthlySalary * 0.50;
    const hra = monthlySalary * 0.20;
    const conveyance = Math.min(monthlySalary * 0.05, 1600);
    const medical = Math.min(monthlySalary * 0.05, 1250);
    const special = monthlySalary - basic - hra - conveyance - medical;

    const grossEarnings = basic + hra + conveyance + medical + special;

    // Actual Extras from record
    const bonusValue = Number(s.bonus) || 0;
    const overtimeValue = Number(s.overtime) || 0;

    // Actual Deductions from record
    // Note: We use the passed values directly if they exist to ensure correctness
    const pfValue = Number(s.pf) || 0;
    const tdsValue = Number(s.tds) || 0;
    const advanceRecoveryValue = Number(s.advanceRecovery) || 0;

    // LOP Calculation
    const dailyWage = monthlySalary / totalDays;
    const lopAmount = dailyWage * absentDays;

    const totalDeductions = pfValue + tdsValue + advanceRecoveryValue + lopAmount;
    const netSalary = (grossEarnings + bonusValue + overtimeValue) - totalDeductions;

    return (
      <div className="print-container pt-salary-slip">
        <div className="pt-ss-container">

          {/* Header */}
          <div className="pt-ss-main-header">
            <div className="pt-ss-company-info">
              <h1 className="pt-ss-company-name">{company?.name}</h1>
              <p className="pt-ss-company-address">{company?.address}</p>
            </div>
            {company?.logo && (
              <img src={company.logo} alt="Logo" style={{ maxHeight: '60px', maxWidth: '200px', objectFit: 'contain' }} />
            )}
          </div>

          <div className="pt-ss-title-banner">
            PAYSLIP / SALARY STATEMENT
          </div>

          {/* Employee Details */}
          <div className="pt-ss-details-grid">
            <div className="pt-ss-detail-column">
              <div className="pt-ss-detail-row">
                <span className="pt-ss-detail-label">Employee Name:</span>
                <span className="pt-ss-detail-value">{s.staffName}</span>
              </div>
              <div className="pt-ss-detail-row">
                <span className="pt-ss-detail-label">Employee ID:</span>
                <span className="pt-ss-detail-value">{s.staffId?.slice(-6).toUpperCase()}</span>
              </div>
              <div className="pt-ss-detail-row">
                <span className="pt-ss-detail-label">Department:</span>
                <span className="pt-ss-detail-value">{s.department}</span>
              </div>
              <div className="pt-ss-detail-row">
                <span className="pt-ss-detail-label">Designation:</span>
                <span className="pt-ss-detail-value">{s.designation}</span>
              </div>
            </div>
            <div className="pt-ss-detail-column">
              <div className="pt-ss-detail-row">
                <span className="pt-ss-detail-label">Pay Period:</span>
                <span className="pt-ss-detail-value">{s.month} {s.year}</span>
              </div>
              <div className="pt-ss-detail-row">
                <span className="pt-ss-detail-label">Pay Date:</span>
                <span className="pt-ss-detail-value">{new Date().toLocaleDateString('en-GB')}</span>
              </div>
              <div className="pt-ss-detail-row">
                <span className="pt-ss-detail-label">Bank Name:</span>
                <span className="pt-ss-detail-value">{s.bankName || '-'}</span>
              </div>
              <div className="pt-ss-detail-row">
                <span className="pt-ss-detail-label">Bank A/c No:</span>
                <span className="pt-ss-detail-value">{s.accountNumber || '-'}</span>
              </div>
            </div>
          </div>

          {/* Earnings & Deductions Table */}
          <div className="pt-ss-table-wrapper">
            <div className="pt-ss-table-header">
              <div>EARNINGS</div>
              <div>DEDUCTIONS</div>
            </div>
            <div className="pt-ss-table-body">
              <div className="pt-ss-table-col">
                <div className="pt-ss-table-row">
                  <span className="pt-ss-item-name">Basic Salary</span>
                  <span className="pt-ss-item-value">{basic.toFixed(2)}</span>
                </div>
                <div className="pt-ss-table-row">
                  <span className="pt-ss-item-name">House Rent Allowance (HRA)</span>
                  <span className="pt-ss-item-value">{hra.toFixed(2)}</span>
                </div>
                <div className="pt-ss-table-row">
                  <span className="pt-ss-item-name">Conveyance Allowance</span>
                  <span className="pt-ss-item-value">{conveyance.toFixed(2)}</span>
                </div>
                <div className="pt-ss-table-row">
                  <span className="pt-ss-item-name">Medical Allowance</span>
                  <span className="pt-ss-item-value">{medical.toFixed(2)}</span>
                </div>
                <div className="pt-ss-table-row">
                  <span className="pt-ss-item-name">Special Allowance</span>
                  <span className="pt-ss-item-value">{special.toFixed(2)}</span>
                </div>
                {overtimeValue > 0 && (
                  <div className="pt-ss-table-row">
                    <span className="pt-ss-item-name">Overtime Pay</span>
                    <span className="pt-ss-item-value">{overtimeValue.toFixed(2)}</span>
                  </div>
                )}
                {bonusValue > 0 && (
                  <div className="pt-ss-table-row">
                    <span className="pt-ss-item-name">Bonus / Incentives</span>
                    <span className="pt-ss-item-value">{bonusValue.toFixed(2)}</span>
                  </div>
                )}
                {/* Spacer rows to keep columns aligned */}
                <div className="pt-ss-table-row" style={{ height: '30px' }}></div>
              </div>
              <div className="pt-ss-table-col">
                <div className="pt-ss-table-row">
                  <span className="pt-ss-item-name">PF / ESI Contribution</span>
                  <span className="pt-ss-item-value">{pfValue.toFixed(2)}</span>
                </div>
                <div className="pt-ss-table-row">
                  <span className="pt-ss-item-name">TDS / Professional Tax</span>
                  <span className="pt-ss-item-value">{tdsValue.toFixed(2)}</span>
                </div>
                <div className="pt-ss-table-row">
                  <span className="pt-ss-item-name">Loss of Pay (LOP)</span>
                  <span className="pt-ss-item-value">{lopAmount.toFixed(2)}</span>
                </div>
                {advanceRecoveryValue > 0 && (
                  <div className="pt-ss-table-row">
                    <span className="pt-ss-item-name">Advance Recovery</span>
                    <span className="pt-ss-item-value">{advanceRecoveryValue.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="pt-ss-table-footer">
              <div className="pt-ss-footer-col">
                <span>TOTAL EARNINGS</span>
                <span>₹{(grossEarnings + bonusValue + overtimeValue).toFixed(2)}</span>
              </div>
              <div className="pt-ss-footer-col">
                <span>TOTAL DEDUCTIONS</span>
                <span>₹{totalDeductions.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Net Pay Box */}
          <div className="pt-ss-net-box">
            <div className="pt-ss-net-label-col">
              <span className="pt-ss-net-title">NET PAYABLE AMOUNT (In-hand)</span>
              <span className="pt-ss-net-words">({toWords(Math.round(netSalary))})</span>
            </div>
            <div className="pt-ss-net-amount">₹{netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>

          {/* Lower Grid (Attendance & Identity) */}
          <div className="pt-ss-bottom-grid">
            <div className="pt-ss-bottom-column">
              <div className="pt-ss-section-title">Attendance Details</div>
              <div className="pt-ss-bottom-card">
                <div className="pt-ss-detail-row">
                  <span className="pt-ss-detail-label">Total Working Days:</span>
                  <span className="pt-ss-detail-value">{totalDays}</span>
                </div>
                <div className="pt-ss-detail-row">
                  <span className="pt-ss-detail-label">Days Present:</span>
                  <span className="pt-ss-detail-value">{s.attendanceDays - s.absences - (s.paidLeaves || 0)}</span>
                </div>
                <div className="pt-ss-detail-row">
                  <span className="pt-ss-detail-label">Paid Leaves:</span>
                  <span className="pt-ss-detail-value">{s.paidLeaves || 0}</span>
                </div>
                <div className="pt-ss-detail-row">
                  <span className="pt-ss-detail-label">Days Absent / LOP:</span>
                  <span className="pt-ss-detail-value">{s.absences}</span>
                </div>
              </div>
            </div>
            <div className="pt-ss-bottom-column">
              <div className="pt-ss-section-title">Additional Information</div>
              <div className="pt-ss-bottom-card">
                <div className="pt-ss-detail-row">
                  <span className="pt-ss-detail-label">PF UAN:</span>
                  <span className="pt-ss-detail-value">{s.uanNumber || '-'}</span>
                </div>
                <div className="pt-ss-detail-row">
                  <span className="pt-ss-detail-label">PAN Number:</span>
                  <span className="pt-ss-detail-value">{s.panNumber || '-'}</span>
                </div>
                <div className="pt-ss-detail-row">
                  <span className="pt-ss-detail-label">ESI Number:</span>
                  <span className="pt-ss-detail-value">{s.esiNumber || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer / QR / Signature */}
          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <QRCodeCanvas
                value={`PAYSLIP: ${s.staffName} | Net: ₹${netSalary.toFixed(2)}`}
                size={60}
                level="M"
              />
              <div style={{ fontSize: '9px', color: '#64748b', lineHeight: '1.4' }}>
                <strong>Computer Generated Payslip.</strong><br />
                Verify using internal portal.<br />
                Confidential Document.
              </div>
            </div>
            <div className="pt-ss-signature">
              {company?.signature && (
                <img src={company.signature} alt="Signature" style={{ maxHeight: '50px', display: 'block', margin: '0 auto 5px' }} />
              )}
              <div className="pt-ss-sig-line"></div>
              <div className="pt-ss-sig-label">Authorized Signatory</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>HR Manager / Finance</div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ── Letter / Official Business Document Template ──
  if (rawDoc.docType === 'Letter' || rawDoc.docType === 'Document' || rawType === 'Letter' || rawType === 'Document') {
    const l = rawDoc;
    const rawDate = l.date || l.createdAt?.split('T')[0] || '';
    const dateParts = rawDate.split('-');
    const dateFormatted = dateParts.length === 3 && dateParts[0].length === 4
      ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
      : (rawDate || new Date().toLocaleDateString('en-GB'));
    const letterNo = l.invoiceNumber || l.letterNo || 'LTR-1';
    const recipient = l.customerName || l.recipient || l.customerInfo?.ms || '';
    const showLetterhead = l.includeLetterhead !== false && l.letterheadTheme !== 'stationery';
    const accentColor = l.accentColor || '#2563eb';
    const letterheadTheme = l.letterheadTheme || 'executive';
    const topMargin = l.letterheadTheme === 'stationery' && l.topMargin ? `${l.topMargin}mm` : '0';

    return (
      <div className="print-container pt-letter-print single-page" style={{ boxSizing: 'border-box', width: '100%', maxWidth: '210mm', padding: '16mm 18mm', color: '#0f172a', fontSize: '13px', lineHeight: '1.7', height: 'auto', minHeight: '290mm', position: 'relative', paddingTop: topMargin !== '0' ? topMargin : '16mm' }}>
        {/* Security Watermark */}
        {l.watermarkEnabled && l.watermarkText && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
            <span style={{ transform: 'rotate(-45deg)', fontSize: '5rem', fontWeight: 900, letterSpacing: '0.25em', color: '#000000', textTransform: 'uppercase', opacity: l.watermarkOpacity || 0.08 }}>
              {l.watermarkText}
            </span>
          </div>
        )}

        <div className="pt-letter-sheet" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', zIndex: 2 }}>
          {showLetterhead && (
            <div className="pt-letter-head" style={{
              borderBottom: letterheadTheme === 'classic' ? '3px double #0f172a' : `3px solid ${accentColor}`,
              borderLeft: letterheadTheme === 'minimal' ? `4px solid ${accentColor}` : undefined,
              paddingLeft: letterheadTheme === 'minimal' ? '12px' : undefined,
              textAlign: letterheadTheme === 'classic' ? 'center' : 'left',
              paddingBottom: '12px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', justifyContent: letterheadTheme === 'classic' ? 'center' : 'space-between', alignItems: 'center', flexDirection: letterheadTheme === 'classic' ? 'column' : 'row', gap: '8px' }}>
                <div>
                  <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', fontFamily: letterheadTheme === 'classic' ? 'Merriweather, serif' : 'inherit' }}>
                    {company?.name || 'Company Name'}
                  </h1>
                  <p style={{ fontSize: '12px', color: '#475569', margin: '2px 0' }}>{company?.address}</p>
                  <p style={{ fontSize: '11px', color: '#475569', margin: '2px 0' }}>
                    {company?.phone && `Phone: ${company.phone} `}
                    {company?.email && `| Email: ${company.email} `}
                    {company?.website && `| Web: ${company.website}`}
                  </p>
                  {(company?.gstin || company?.pan) && (
                    <p style={{ fontSize: '11px', color: '#334155', margin: '3px 0 0', display: 'flex', gap: '15px', justifyContent: letterheadTheme === 'classic' ? 'center' : 'flex-start' }}>
                      {company?.gstin && <span><strong>GSTIN:</strong> {company.gstin}</span>}
                      {company?.pan && <span><strong>PAN:</strong> {company.pan}</span>}
                    </p>
                  )}
                </div>
                {company?.logo && (
                  <img src={company.logo} alt="Logo" style={{ maxHeight: '60px', maxWidth: '140px', objectFit: 'contain' }} />
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '16px', paddingBottom: '8px', borderBottom: '1px dashed #cbd5e1' }}>
            <div><strong>Ref No:</strong> {letterNo}</div>
            <div><strong>Date:</strong> {dateFormatted}</div>
          </div>

          {recipient && (
            <div style={{ marginBottom: '16px', fontSize: '13px', lineHeight: '1.5' }}>
              <p style={{ margin: 0, color: '#64748b' }}>To,</p>
              <p style={{ margin: '2px 0 0', fontWeight: 'bold', fontSize: '14px', color: '#0f172a' }}>{recipient}</p>
              {l.customerInfo?.address && <p style={{ margin: '2px 0 0', color: '#334155' }}>{l.customerInfo.address}</p>}
              {l.customerInfo?.phoneNo && <p style={{ margin: '2px 0 0', color: '#334155' }}>Phone: {l.customerInfo.phoneNo}</p>}
            </div>
          )}

          {l.subject && (
            <div style={{ margin: '14px 0', fontSize: '13px', fontWeight: 'bold', borderBottom: `1px solid ${accentColor}`, paddingBottom: '4px', color: '#0f172a' }}>
              SUBJECT: {l.subject.toUpperCase()}
            </div>
          )}

          <div className="pt-letter-body tiptap-preview" style={{ flex: 1, fontSize: '13px', lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: bodyHtml }} />

          {/* Signoff & Seal */}
          <div style={{ marginTop: '36px', display: 'flex', justifyContent: 'flex-end', pageBreakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {l.includeSeal && (
                <div style={{ width: '85px', height: '85px', border: '3px double #dc2626', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#dc2626', padding: '4px', userSelect: 'none', transform: 'rotate(-8deg)', background: 'rgba(254, 242, 242, 0.4)' }}>
                  <span style={{ fontSize: '6.5px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {(company?.name || 'OFFICIAL SEAL').slice(0, 20)}
                  </span>
                  <div style={{ fontSize: '8.5px', fontWeight: 900, letterSpacing: '0.1em', borderTop: '1px solid #dc2626', borderBottom: '1px solid #dc2626', padding: '1px 0', margin: '2px 0', width: '80%' }}>
                    VERIFIED
                  </div>
                  <span style={{ fontSize: '6px', fontWeight: 600 }}>
                    {dateFormatted}
                  </span>
                </div>
              )}

              <div style={{ minWidth: '210px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '13px' }}>Yours faithfully,</p>
                <p style={{ margin: '4px 0 0', fontWeight: 'bold', fontSize: '14px' }}>For {company?.name || 'Company'}</p>
                {(l.signature || company?.signature) && (
                  <img src={l.signature || company?.signature} alt="Signature" style={{ maxHeight: '48px', display: 'block', margin: '8px auto' }} />
                )}
                <div style={{ borderTop: '1px solid #475569', margin: '14px auto 4px', width: '160px' }}></div>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>{l.signatoryName || 'Authorized Signatory'}</p>
                {l.signatoryDesignation && <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{l.signatoryDesignation}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Official Standard Payment In / Out & Expense / Income Voucher Print Template ──
  if (
    rawDoc.docType === 'Payment In' || rawType === 'Payment In' ||
    rawDoc.docType === 'Payment Out' || rawType === 'Payment Out' ||
    rawDoc.docType === 'Daily Expense' || rawType === 'Daily Expense' ||
    rawDoc.docType === 'Expense Voucher' || rawType === 'Expense Voucher' ||
    rawDoc.docType === 'Other Income' || rawType === 'Other Income' ||
    rawDoc.docType === 'Income Voucher' || rawType === 'Income Voucher'
  ) {
    const p = rawDoc;
    const isOutward = rawDoc.docType === 'Payment Out' || rawType === 'Payment Out' ||
      rawDoc.docType === 'Daily Expense' || rawType === 'Daily Expense' ||
      rawDoc.docType === 'Expense Voucher' || rawType === 'Expense Voucher';
    const amount = Number(p.grandTotal || p.total || p.amount || 0);
    const docNo = p.invoiceNumber || p.expenseNo ? `EXP-${p.expenseNo}` : (p.incomeNo ? `INC-${p.incomeNo}` : (p.fullReceiptNo || p.receiptNumber || p.fullVoucherNo || p.voucherNumber || p.fullPaymentNo || p.paymentNumber || '-'));
    const partyName = isOutward 
      ? (p.vendorName || p.title || p.msName || p.vendorInfo?.ms || '-') 
      : (p.customerName || p.title || p.msName || p.customerInfo?.ms || '-');
    const voucherTitle = isOutward ? 'EXPENSE PAYMENT VOUCHER' : 'OFFICIAL INCOME RECEIPT';
    const hasItems = Array.isArray(p.items) && p.items.length > 0 && (p.items[0]?.name || p.items[0]?.description);

    return (
      <div className="print-container single-page">
        <div className="print-page-border">

          {/* 1. Header Block */}
          <div className="pt-header">
            <div className="pt-header-left">
              {company?.logo ? (
                <img src={company.logo} alt={company.name} style={{ maxHeight: '80px', maxWidth: '280px', objectFit: 'contain', marginBottom: '8px' }} />
              ) : (
                <h1>{company?.name || 'Company Name'}</h1>
              )}
              <p>{company?.address || 'Company Address'}</p>
            </div>
            <div className="pt-header-right">
              <table>
                <tbody>
                  <tr><td>Name</td><td>: {company?.ownerName || '-'}</td></tr>
                  <tr><td>Phone</td><td>: {company?.phone || '-'}</td></tr>
                  <tr><td>Email</td><td>: {company?.email || '-'}</td></tr>
                  <tr><td>PAN</td><td>: {company?.pan || '-'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Title Bar */}
          <div className="pt-title-bar">
            <div className="pt-title-gstin"><strong>GSTIN :</strong> {company?.gstin || '-'}</div>
            <div className="pt-title-text">{voucherTitle}</div>
            <div className="pt-title-original">{copyType || 'ORIGINAL'}</div>
          </div>

          {/* 3. Details Container */}
          <div className="pt-details-container">
            <div className="pt-customer-details">
              <div className="pt-section-title">{isOutward ? 'Paid To / Vendor Detail' : 'Received From / Customer Detail'}</div>
              <table className="pt-details-table">
                <tbody>
                  <tr><th>M/S</th><td>: <strong>{partyName}</strong></td></tr>
                  <tr><th style={{ verticalAlign: 'top' }}>Address</th><td style={{ whiteSpace: 'pre-wrap' }}>: {p.address || p.vendorInfo?.address || p.customerInfo?.address || '-'}</td></tr>
                  <tr><th>Phone</th><td>: {p.phone || p.vendorInfo?.phoneNo || p.customerInfo?.phoneNo || '-'}</td></tr>
                  <tr><th>GSTIN</th><td>: {p.gstinPan || p.vendorInfo?.gstinPan || p.customerInfo?.gstinPan || '-'}</td></tr>
                  <tr><th>State</th><td>: {p.state || p.vendorInfo?.placeOfSupply || company?.state || 'Madhya Pradesh (23)'}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="pt-invoice-details">
              <table className="pt-details-table" style={{ marginTop: '10px' }}>
                <tbody>
                  <tr>
                    <th style={{ width: '120px' }}>{isOutward ? 'Voucher No.' : 'Receipt No.'}</th>
                    <td style={{ fontSize: '13px' }}>: <strong>{docNo}</strong></td>
                  </tr>
                  <tr>
                    <th>Date</th>
                    <td>: {p.date || '-'}</td>
                  </tr>
                  <tr>
                    <th>Payment Mode</th>
                    <td>: <strong>{p.paymentType || 'CASH'}</strong></td>
                  </tr>
                  {(p.invoiceList || p.refNo || p.expenseDetail?.refNo || p.incomeDetail?.refNo) && (
                    <tr>
                      <th>Reference / Bill</th>
                      <td>: {p.invoiceList || p.refNo || p.expenseDetail?.refNo || p.incomeDetail?.refNo}</td>
                    </tr>
                  )}
                  {p.category && (
                    <tr>
                      <th>Category</th>
                      <td>: {p.category}</td>
                    </tr>
                  )}
                  <tr>
                    <th>Status</th>
                    <td>: <span style={{ color: isOutward ? '#e11d48' : '#059669', fontWeight: 700 }}>{p.status || (isOutward ? 'Disbursed / Paid' : 'Received')}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Main Particulars Table */}
          <div className="pt-table-container">
            <table className="pt-main-table">
              <thead>
                <tr>
                  <th className="th-sr" style={{ width: '45px' }}>Sr.<br />No.</th>
                  <th className="th-product">Particulars / Description</th>
                  <th className="th-hsn" style={{ width: '100px' }}>Qty / Unit</th>
                  <th className="th-qty" style={{ width: '120px' }}>Rate (₹)</th>
                  <th className="th-total" style={{ width: '150px' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {hasItems ? (
                  p.items.map((item, idx) => {
                    const itemAmt = Number(item.total || item.amount || (Number(item.rate || 0) * Number(item.quantity || 1)));
                    return (
                      <tr key={idx} className="pt-item-row">
                        <td className="td-center">{idx + 1}</td>
                        <td className="td-left">
                          <div style={{ fontWeight: 700, fontSize: '12px' }}>{item.name || item.description || 'Expense Item'}</div>
                          {item.note && (
                            <div style={{ fontSize: '11px', color: '#475569', marginTop: '3px' }}>
                              Note: {item.note}
                            </div>
                          )}
                        </td>
                        <td className="td-center">{item.quantity || item.qty || 1} {item.unit || item.uom || 'NOS'}</td>
                        <td className="td-right">₹{Number(item.rate || item.price || 0).toFixed(2)}</td>
                        <td className="td-right" style={{ fontSize: '12px', fontWeight: 700 }}>
                          ₹{itemAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="pt-item-row">
                    <td className="td-center">1</td>
                    <td className="td-left">
                      <div style={{ fontWeight: 700, fontSize: '12px' }}>
                        {isOutward ? `Payment disbursed to ${partyName}` : `Payment received from ${partyName}`}
                      </div>
                      {(p.remarks || p.notes || p.documentNote) && (
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px' }}>
                          <strong>Remarks:</strong> {p.remarks || p.notes || p.documentNote}
                        </div>
                      )}
                    </td>
                    <td className="td-center">1 VOUCHER</td>
                    <td className="td-right">₹{amount.toFixed(2)}</td>
                    <td className="td-right" style={{ fontSize: '13px', fontWeight: 800 }}>
                      ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}

                {/* Empty spacer row for standard full-height print balance */}
                <tr className="pt-empty-row">
                  <td colSpan={5} style={{ height: '100%' }}></td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="pt-totals-row">
                  <td colSpan="4" className="td-right"><strong>Grand Total Amount</strong></td>
                  <td className="td-right" style={{ fontSize: '13px', fontWeight: 900 }}>
                    ₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 5. Footer Area */}
          <div className="pt-footer-container">
            <div className="pt-footer-left">
              <div className="pt-footer-box" style={{ minHeight: '40px' }}>
                <div className="pt-section-title-small">Total in words</div>
                <div className="pt-words-text">{toWords(Math.round(amount))}</div>
              </div>

              {company?.bankName && (
                <div className="pt-footer-box pt-bank-box">
                  <div className="pt-section-title-small">Bank Details</div>
                  <table className="pt-bank-table">
                    <tbody>
                      <tr><th>Bank Name</th><td>{company.bankName}</td></tr>
                      {company.bankBranch && <tr><th>Branch</th><td>{company.bankBranch}</td></tr>}
                      {company.bankAccNumber && <tr><th>Acc. Number</th><td>{company.bankAccNumber}</td></tr>}
                      {company.bankIfsc && <tr><th>IFSC Code</th><td>{company.bankIfsc}</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="pt-footer-box pt-terms-box" style={{ borderBottom: 'none' }}>
                <div className="pt-section-title-small">Terms & Conditions</div>
                <div className="pt-terms-text" style={{ whiteSpace: 'pre-line' }}>
                  {isOutward
                    ? '1. Payment issued subject to clearance and internal audit verification.\n2. Please preserve this payment voucher for your statutory accounting records.'
                    : '1. Payment received subject to realization of cheque / bank clearance.\n2. This is a computer generated official payment receipt voucher.'}
                </div>
              </div>
            </div>

            <div className="pt-footer-right">
              <table className="pt-summary-table">
                <tbody>
                  <tr className="pt-grand-total">
                    <th>{isOutward ? 'Total Amount Paid' : 'Total Amount Received'}</th>
                    <td>₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr><td colSpan="2" className="pt-eoe">(E & O.E.)</td></tr>
                </tbody>
              </table>

              <div className="pt-signature-box">
                <div className="pt-certify-text">Certified that the particulars given above are true and correct.</div>
                <div className="pt-sig-company">For {company?.name || 'Company'}</div>
                {company?.signature ? (
                  <div style={{ textAlign: 'center', padding: '5px 0' }}>
                    <img src={company.signature} alt="Signature" style={{ maxHeight: '60px', mixBlendMode: 'multiply' }} />
                  </div>
                ) : (
                  <div style={{ height: '40px' }}></div>
                )}
                <div className="pt-sig-label">Authorised Signatory</div>
              </div>
            </div>
          </div>

          {/* Page indicator */}
          <div style={{ textAlign: 'center', padding: '4px', fontSize: '9px', fontWeight: 600, borderTop: '1px dashed #eee' }}>
            Page 1 of 1
          </div>

        </div>
      </div>
    );
  }

  // ── Official Daily Expense (Payment Voucher) & Other Income (Receipt Voucher) Print Template ──
  if (
    rawDoc.docType === 'Daily Expense' || rawType === 'Daily Expense' ||
    rawDoc.docType === 'Expense Voucher' || rawType === 'Expense Voucher' ||
    rawDoc.docType === 'Other Income' || rawType === 'Other Income' ||
    rawDoc.docType === 'Income Voucher' || rawType === 'Income Voucher'
  ) {
    const isExpense = rawDoc.docType === 'Daily Expense' || rawDoc.docType === 'Expense Voucher' || rawType === 'Daily Expense' || rawType === 'Expense Voucher';
    const amount = Number(rawDoc.grandTotal || rawDoc.total || rawDoc.amount || 0);
    const voucherNo = isExpense 
      ? (rawDoc.expenseNo ? `EXP-${rawDoc.expenseNo}` : (rawDoc.invoiceNumber || 'EXP-VOUCHER'))
      : (rawDoc.incomeNo ? `INC-${rawDoc.incomeNo}` : (rawDoc.invoiceNumber || 'INC-RECEIPT'));
    const partyName = isExpense 
      ? (rawDoc.title || rawDoc.msName || rawDoc.payee || 'Expense Account') 
      : (rawDoc.msName || rawDoc.title || rawDoc.payer || 'Income Source');
    const paymentMode = rawDoc.paymentType || 'CASH';
    const docDate = rawDoc.date || rawDoc.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0];
    const items = Array.isArray(rawDoc.items) && rawDoc.items.length > 0 ? rawDoc.items : null;

    return (
      <div className="print-container single-page">
        <div className="print-page-border">

          {/* 1. Header Block */}
          <div className="pt-header">
            <div className="pt-header-left">
              {company?.logo ? (
                <img src={company.logo} alt={company.name} style={{ maxHeight: '80px', maxWidth: '280px', objectFit: 'contain', marginBottom: '8px' }} />
              ) : (
                <h1>{company?.name || 'Company Name'}</h1>
              )}
              <p>{company?.address || 'Company Address'}</p>
            </div>
            <div className="pt-header-right">
              <table>
                <tbody>
                  <tr><td>Name</td><td>: {company?.ownerName || '-'}</td></tr>
                  <tr><td>Phone</td><td>: {company?.phone || '-'}</td></tr>
                  <tr><td>Email</td><td>: {company?.email || '-'}</td></tr>
                  <tr><td>PAN</td><td>: {company?.pan || '-'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Title Bar */}
          <div className="pt-title-bar">
            <div className="pt-title-gstin"><strong>GSTIN :</strong> {company?.gstin || '-'}</div>
            <div className="pt-title-text" style={{ color: isExpense ? '#e11d48' : '#059669' }}>
              {isExpense ? 'PAYMENT / EXPENSE VOUCHER' : 'MISCELLANEOUS INCOME RECEIPT'}
            </div>
            <div className="pt-title-original">{copyType || 'ORIGINAL'}</div>
          </div>

          {/* 3. Details Container */}
          <div className="pt-details-container">
            <div className="pt-customer-details">
              <div className="pt-section-title">{isExpense ? 'Paid To / Beneficiary Account' : 'Received From / Payer Account'}</div>
              <table className="pt-details-table">
                <tbody>
                  <tr><th>Name / Particulars</th><td>: <strong>{partyName}</strong></td></tr>
                  {rawDoc.phone && <tr><th>Contact Phone</th><td>: {rawDoc.phone}</td></tr>}
                  <tr><th>Category</th><td>: <span style={{ fontWeight: 600, color: '#334155' }}>{rawDoc.category || 'General'}</span></td></tr>
                  <tr><th>Payment Mode</th><td>: <strong>{paymentMode}</strong></td></tr>
                  {rawDoc.refNo && <tr><th>Reference / Txn ID</th><td>: {rawDoc.refNo}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="pt-invoice-details">
              <table className="pt-details-table" style={{ marginTop: '10px' }}>
                <tbody>
                  <tr>
                    <th style={{ width: '130px' }}>{isExpense ? 'Voucher No.' : 'Receipt No.'}</th>
                    <td style={{ fontSize: '13px' }}>: <strong>{voucherNo}</strong></td>
                  </tr>
                  <tr>
                    <th>Date</th>
                    <td>: {docDate}</td>
                  </tr>
                  <tr>
                    <th>Payment Status</th>
                    <td>: <span style={{ color: isExpense ? '#0284c7' : '#059669', fontWeight: 700 }}>Settled / Cleared</span></td>
                  </tr>
                  {rawDoc.isGstEnabled && (
                    <tr>
                      <th>GST Treatment</th>
                      <td>: <span style={{ color: '#6366f1', fontWeight: 600 }}>GST Registered Expense</span></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Main Particulars Table */}
          <div className="pt-table-container">
            <table className="pt-main-table">
              <thead>
                <tr>
                  <th className="th-sr" style={{ width: '45px' }}>Sr.<br />No.</th>
                  <th className="th-product">Particulars / Account Description</th>
                  {isExpense && rawDoc.isGstEnabled && <th style={{ width: '70px', textAlign: 'center' }}>GST Rate</th>}
                  <th style={{ width: '110px', textAlign: 'center' }}>Payment Mode</th>
                  <th className="th-total" style={{ width: '150px' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items ? (
                  items.map((item, idx) => (
                    <tr key={item.id || idx} className="pt-item-row">
                      <td className="td-center">{idx + 1}</td>
                      <td className="td-left">
                        <div style={{ fontWeight: 700, fontSize: '12px' }}>{item.name || partyName}</div>
                        {item.note && (
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{item.note}</div>
                        )}
                        {item.qty > 0 && (
                          <div style={{ fontSize: '10px', color: '#475569', marginTop: '2px' }}>
                            Qty: {item.qty} {item.uom || ''} @ ₹{Number(item.price || 0).toFixed(2)}
                            {item.discount > 0 && ` (Disc: ₹${item.discount})`}
                          </div>
                        )}
                      </td>
                      {isExpense && rawDoc.isGstEnabled && (
                        <td className="td-center">{item.tax ? `${item.tax}%` : '0%'}</td>
                      )}
                      <td className="td-center" style={{ fontWeight: 600 }}>{paymentMode}</td>
                      <td className="td-right" style={{ fontSize: '12px', fontWeight: 700 }}>
                        {Number(item.total || item.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="pt-item-row">
                    <td className="td-center">1</td>
                    <td className="td-left">
                      <div style={{ fontWeight: 700, fontSize: '12px' }}>
                        {isExpense ? `Expense settlement towards: ${partyName}` : `Income receipt from: ${partyName}`}
                      </div>
                      <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
                        Category: {rawDoc.category || 'General'}
                      </div>
                    </td>
                    {isExpense && rawDoc.isGstEnabled && <td className="td-center">-</td>}
                    <td className="td-center" style={{ fontWeight: 600 }}>{paymentMode}</td>
                    <td className="td-right" style={{ fontSize: '13px', fontWeight: 800 }}>
                      {amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}

                {/* Empty spacer row for standard full-height print balance */}
                <tr className="pt-empty-row">
                  <td colSpan={isExpense && rawDoc.isGstEnabled ? 5 : 4} style={{ height: '100%' }}></td>
                </tr>
              </tbody>
              <tfoot>
                {isExpense && rawDoc.totalTax > 0 && (
                  <>
                    <tr style={{ borderTop: '1px solid #cbd5e1', fontSize: '11px' }}>
                      <td colSpan={rawDoc.isGstEnabled ? 4 : 3} className="td-right">Taxable Amount:</td>
                      <td className="td-right">₹ {Number(rawDoc.totalTaxable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                    <tr style={{ fontSize: '11px' }}>
                      <td colSpan={rawDoc.isGstEnabled ? 4 : 3} className="td-right">GST Tax Amount:</td>
                      <td className="td-right">₹ {Number(rawDoc.totalTax || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </>
                )}
                <tr className="pt-totals-row">
                  <td colSpan={isExpense && rawDoc.isGstEnabled ? 4 : 3} className="td-right">
                    <strong>{isExpense ? 'Total Net Expense Paid' : 'Total Net Income Received'}</strong>
                  </td>
                  <td className="td-right" style={{ fontSize: '13px', fontWeight: 900 }}>
                    ₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 5. Footer Area */}
          <div className="pt-footer-container">
            <div className="pt-footer-left">
              <div className="pt-footer-box" style={{ minHeight: '40px' }}>
                <div className="pt-section-title-small">Total in words</div>
                <div className="pt-words-text">{toWords(Math.round(amount))}</div>
              </div>

              <div className="pt-footer-box pt-terms-box" style={{ borderBottom: 'none' }}>
                <div className="pt-section-title-small">Auditing Narration / Notes</div>
                <div className="pt-terms-text" style={{ whiteSpace: 'pre-line' }}>
                  {rawDoc.notes || rawDoc.remarks || (
                    isExpense
                      ? '1. Official business expenditure disbursed in accordance with accounting policies.\n2. Preserved for statutory internal and tax audits.'
                      : '1. Official receipt voucher for miscellaneous income / non-operating revenue.\n2. Computer-generated official voucher.'
                  )}
                </div>
              </div>

              {/* QR Code Verification */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderTop: '1px solid #cbd5e1' }}>
                <QRCodeCanvas 
                  value={JSON.stringify({ voucher: voucherNo, amount, date: docDate, company: company?.name })}
                  size={50}
                  level="M"
                />
                <div style={{ fontSize: '9px', color: '#64748b', lineHeight: '1.4' }}>
                  <strong>Digital Voucher Verification</strong><br />
                  Voucher #{voucherNo} | Auth: System Verified<br />
                  Date: {docDate}
                </div>
              </div>
            </div>

            <div className="pt-footer-right">
              <table className="pt-summary-table">
                <tbody>
                  <tr className="pt-grand-total">
                    <th>{isExpense ? 'Total Paid' : 'Total Received'}</th>
                    <td>₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr><td colSpan="2" className="pt-eoe">(E & O.E.)</td></tr>
                </tbody>
              </table>

              <div className="pt-signature-box">
                <div className="pt-certify-text">Certified that the particulars given above are true and correct.</div>
                <div className="pt-sig-company">For {company?.name || 'Company'}</div>
                {company?.signature ? (
                  <div style={{ textAlign: 'center', padding: '5px 0' }}>
                    <img src={company.signature} alt="Signature" style={{ maxHeight: '60px', mixBlendMode: 'multiply' }} />
                  </div>
                ) : (
                  <div style={{ height: '40px' }}></div>
                )}
                <div className="pt-sig-label">Authorised Signatory</div>
              </div>
            </div>
          </div>

          {/* Page indicator */}
          <div style={{ textAlign: 'center', padding: '4px', fontSize: '9px', fontWeight: 600, borderTop: '1px dashed #eee' }}>
            Page 1 of 1
          </div>

        </div>
      </div>
    );
  }

  // ── Data Normalization for different doc types ──
  const docType = rawDoc.docType || rawType || 'Sale Invoice';
  const isQuotation = docType === 'Quotation' || docType === 'Offer';
  const isProforma = docType === 'Proforma Invoice';
  const isJobWork = docType === 'Job Work';
  const isPurchase = docType === 'Purchase Invoice' || docType === 'Purchase Order' || docType === 'Debit Note';
  const isChallan = docType === 'Delivery Challan';
  const isSaleOrder = docType === 'Sale Order';
  const isCreditNote = docType === 'Credit Note';
  const isDebitNote = docType === 'Debit Note';

  const partyName = rawDoc.customerInfo?.ms || rawDoc.customerName || rawDoc.vendorInfo?.ms || rawDoc.vendorName || rawDoc.name || '-';
  const partyAddress = rawDoc.customerInfo?.address || rawDoc.customerAddress || rawDoc.vendorInfo?.address || rawDoc.vendorAddress || '-';
  const partyPhone = rawDoc.customerInfo?.phoneNo || rawDoc.customerPhone || rawDoc.vendorInfo?.phoneNo || rawDoc.vendorPhone || '-';
  const partyGstin = rawDoc.customerInfo?.gstinPan || rawDoc.customerGstin || rawDoc.vendorInfo?.gstinPan || rawDoc.vendorGstin || '-';
  const partyPan = rawDoc.customerInfo?.pan || rawDoc.customerPan || rawDoc.vendorInfo?.pan || rawDoc.vendorPan || '-';
  const partyPlaceOfSupply = rawDoc.customerInfo?.placeOfSupply || rawDoc.placeOfSupply || rawDoc.vendorInfo?.placeOfSupply || 'Madhya Pradesh';

  let resolvedInvoiceNumber = rawDoc.invoiceNumber;
  if (!resolvedInvoiceNumber || resolvedInvoiceNumber === '-') {
    if (isQuotation && rawDoc.offerDetail?.offerNo) {
      resolvedInvoiceNumber = `${rawDoc.docNumberPrefix || 'QTN/'}${rawDoc.offerDetail.offerNo}${rawDoc.docNumberPostfix || '/25-26'}`;
    } else if (isProforma && (rawDoc.proDetail?.proNo || rawDoc.piDetail?.piNo)) {
      resolvedInvoiceNumber = `${rawDoc.docPrefix || 'PI/'}${rawDoc.proDetail?.proNo || rawDoc.piDetail?.piNo}${rawDoc.docPostfix || '/25-26'}`;
    } else if (isChallan && rawDoc.dcDetail?.challanNo) {
      resolvedInvoiceNumber = `${rawDoc.docPrefix || 'DC/'}${rawDoc.dcDetail.challanNo}${rawDoc.docPostfix || '/25-26'}`;
    } else if (isSaleOrder && rawDoc.soDetail?.soNo) {
      resolvedInvoiceNumber = `${rawDoc.docPrefix || 'SO/'}${rawDoc.soDetail.soNo}${rawDoc.docPostfix || '/25-26'}`;
    } else if (isCreditNote && rawDoc.cnDetail?.cnNo) {
      resolvedInvoiceNumber = `CN-${rawDoc.cnDetail.cnNo}`;
    } else if (isDebitNote && rawDoc.dnDetail?.dnNo) {
      resolvedInvoiceNumber = `DN-${rawDoc.dnDetail.dnNo}`;
    } else if (isJobWork && rawDoc.jwDetail?.jobWorkNo) {
      resolvedInvoiceNumber = `${rawDoc.docPrefix || 'JW-'}${rawDoc.jwDetail.jobWorkNo}`;
    } else if (rawDoc.invoiceDetail?.invoiceNo) {
      const pfx = docType === 'Purchase Order' ? 'PO-' : docType === 'Purchase Invoice' ? 'PUR-' : 'SINV-';
      resolvedInvoiceNumber = `${pfx}${rawDoc.invoiceDetail.invoiceNo}`;
    } else {
      resolvedInvoiceNumber = '-';
    }
  }

  const resolvedDate = isQuotation ? (rawDoc.offerDetail?.date || rawDoc.date)
    : isProforma ? (rawDoc.proDetail?.date || rawDoc.piDetail?.date || rawDoc.date)
      : isJobWork ? (rawDoc.jwDetail?.date || rawDoc.date)
        : isChallan ? (rawDoc.dcDetail?.date || rawDoc.date)
          : isSaleOrder ? (rawDoc.soDetail?.date || rawDoc.date)
            : (rawDoc.invoiceDetail?.date || rawDoc.date || '-');

  // Standardize the document structure for the template
  const doc = {
    ...rawDoc,
    customerName: partyName,
    customerAddress: partyAddress,
    customerPhone: partyPhone,
    customerGstin: partyGstin,
    customerPan: partyPan,
    placeOfSupply: partyPlaceOfSupply,
    invoiceNumber: resolvedInvoiceNumber,
    date: resolvedDate,
  };

  // Determine Tax Columns (CGST/SGST vs IGST)
  const isIntraState = (company?.state || 'Madhya Pradesh').toLowerCase() === (doc.placeOfSupply || '').split(' (')[0].toLowerCase();

  // Filter out empty rows so that blank items (added in editing table) are NOT VISIBLE in print
  const validRawItems = (doc.items || []).filter(item => {
    if (!item) return false;
    return Boolean(item.name && item.name.trim()) || Boolean(item.productId) || (Number(item.rate) > 0 || Number(item.amount) > 0);
  });

  const rawItemsToRender = validRawItems.length > 0 ? validRawItems : (doc.items?.length > 0 ? [doc.items[0]] : []);

  // Ensure items have calculated tax values
  const items = rawItemsToRender.map((item, index) => {
    const quantity = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    const taxableValue = Number(item.amount) || (rate * quantity);
    const taxRate = Number(item.taxRate) || 0;

    // Split tax
    const cgstRate = taxRate / 2;
    const sgstRate = taxRate / 2;
    const cgstAmount = isIntraState ? (taxableValue * cgstRate) / 100 : 0;
    const sgstAmount = isIntraState ? (taxableValue * sgstRate) / 100 : 0;
    const igstAmount = !isIntraState ? (taxableValue * taxRate) / 100 : 0;

    const total = taxableValue + cgstAmount + sgstAmount + igstAmount;

    // Look up image from products master list if not present on item
    const productMaster = products.find(p => p.id === item.productId || p._dbId === item.productId);
    const itemImage = item.image || productMaster?.image;

    return {
      ...item,
      quantity,
      rate,
      taxableValue,
      taxRate,
      cgstRate,
      sgstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
      total,
      image: itemImage,
      srNo: index + 1
    };
  });

  const totals = items.reduce((acc, it) => ({
    qty: acc.qty + it.quantity,
    taxable: acc.taxable + it.taxableValue,
    cgst: acc.cgst + it.cgstAmount,
    sgst: acc.sgst + it.sgstAmount,
    igst: acc.igst + it.igstAmount,
    total: acc.total + it.total
  }), { qty: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });

  // ── Pagination Logic ──
  // 10 items comfortably fit on a single A4 page with full header & footer
  const PAGE_CAPACITY = 10;

  const pages = [];
  let remainingItems = [...items];

  let pageIdx = 0;
  while (remainingItems.length > 0 || pageIdx === 0) {
    const chunk = remainingItems.splice(0, PAGE_CAPACITY);
    pages.push(chunk);
    pageIdx++;
    if (remainingItems.length === 0) break;
  }

  const getDisplayType = (t) => {
    switch (t) {
      case 'Quotation':
      case 'Offer': return 'QUOTATION / OFFER';
      case 'Proforma Invoice': return 'PROFORMA INVOICE';
      case 'Delivery Challan': return 'DELIVERY CHALLAN';
      case 'Sale Order': return 'SALES ORDER';
      case 'Purchase Order': return 'PURCHASE ORDER';
      case 'Purchase Invoice': return 'PURCHASE INVOICE';
      case 'Credit Note': return 'CREDIT NOTE';
      case 'Debit Note': return 'DEBIT NOTE';
      case 'Job Work': return 'JOB WORK ORDER';
      case 'Letter': return 'OFFICIAL LETTER';
      case 'Sale Invoice':
      case 'Invoice':
      default: return 'TAX INVOICE';
    }
  };

  const getDocNumberLabel = (t) => {
    switch (t) {
      case 'Quotation':
      case 'Offer': return 'OFFER No.';
      case 'Proforma Invoice': return 'P.I. No.';
      case 'Delivery Challan': return 'Challan No.';
      case 'Sale Order': return 'Order No.';
      case 'Purchase Order': return 'P.O. No.';
      case 'Purchase Invoice': return 'Bill No.';
      case 'Credit Note': return 'Credit Note No.';
      case 'Debit Note': return 'Debit Note No.';
      case 'Job Work': return 'Job Work No.';
      default: return 'Invoice No.';
    }
  };

  const displayType = getDisplayType(docType);
  const numberLabel = getDocNumberLabel(docType);
  const partyHeaderLabel = isPurchase ? 'Vendor Detail' : 'Customer Detail';

  return (
    <div className="pt-multi-page-container">
      {pages.map((pageItems, pIdx) => {
        const isFirstPage = pIdx === 0;
        const isLastPage = pIdx === pages.length - 1;

        return (
          <div className={`print-container ${pages.length === 1 ? 'single-page' : ''}`} key={pIdx}>
            <div className="print-page-border">
              {/* Header Block - Repeats on Every Page */}
              <div className="pt-header">
                <div className="pt-header-left">
                  {company?.logo ? (
                    <img src={company.logo} alt={company.name} style={{ maxHeight: '80px', maxWidth: '280px', objectFit: 'contain', marginBottom: '8px' }} />
                  ) : (
                    <h1>{company?.name || ''}</h1>
                  )}
                  <p>{company?.address || ''}</p>
                </div>
                <div className="pt-header-right">
                  <table>
                    <tbody>
                      <tr><td>Name</td><td>: {company?.ownerName || '-'}</td></tr>
                      <tr><td>Phone</td><td>: {company?.phone || '-'}</td></tr>
                      <tr><td>Email</td><td>: {company?.email || '-'}</td></tr>
                      <tr><td>PAN</td><td>: {company?.pan || '-'}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-title-bar">
                <div className="pt-title-gstin"><strong>GSTIN :</strong> {company?.gstin || '-'}</div>
                <div className="pt-title-text">{displayType}</div>
                <div className="pt-title-original">{copyType}</div>
              </div>

              <div className="pt-details-container">
                <div className="pt-customer-details">
                  <div className="pt-section-title">{partyHeaderLabel}</div>
                  <table className="pt-details-table">
                    <tbody>
                      <tr><th>M/S</th><td>: {doc.customerName || '-'}</td></tr>
                      <tr><th style={{ verticalAlign: 'top' }}>Address</th><td style={{ whiteSpace: 'pre-wrap' }}>: {doc.customerAddress || '-'}</td></tr>
                      <tr><th>Phone</th><td>: {doc.customerPhone || '-'}</td></tr>
                      <tr><th>GSTIN</th><td>: {doc.customerGstin || '-'}</td></tr>
                      <tr><th>PAN</th><td>: {doc.customerPan || '-'}</td></tr>
                      <tr><th>Place of Supply</th><td>: {doc.placeOfSupply || '-'}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="pt-invoice-details">
                  <table className="pt-details-table" style={{ marginTop: '10px' }}>
                    <tbody>
                      <tr>
                        <th style={{ width: '110px' }}>{numberLabel}</th>
                        <td style={{ fontSize: '13px' }}>: <strong>{doc.invoiceNumber || '-'}</strong></td>
                      </tr>
                      <tr>
                        <th>Date</th>
                        <td>: {doc.date || '-'}</td>
                      </tr>
                      {(doc.challanNo || doc.invoiceDetail?.challanNo || doc.dcDetail?.challanNo) && (
                        <tr><th>Challan No.</th><td>: {doc.challanNo || doc.invoiceDetail?.challanNo || doc.dcDetail?.challanNo}</td></tr>
                      )}
                      {(doc.poNo || doc.invoiceDetail?.poNo) && (
                        <tr><th>P.O. No.</th><td>: {doc.poNo || doc.invoiceDetail?.poNo}</td></tr>
                      )}
                      {(doc.cnDetail?.invoiceNo || doc.dnDetail?.invoiceNo) && (
                        <tr><th>Orig. Inv No.</th><td>: {doc.cnDetail?.invoiceNo || doc.dnDetail?.invoiceNo}</td></tr>
                      )}
                      {(doc.offerDetail?.lrNo || doc.invoiceDetail?.lrNo || doc.dcDetail?.lrNo) && (
                        <tr><th>L.R. No.</th><td>: {doc.offerDetail?.lrNo || doc.invoiceDetail?.lrNo || doc.dcDetail?.lrNo}</td></tr>
                      )}
                      {(doc.ewayNo || doc.invoiceDetail?.ewayNo || doc.dcDetail?.ewayNo) && (
                        <tr><th>E-Way Bill:</th><td>: {doc.ewayNo || doc.invoiceDetail?.ewayNo || doc.dcDetail?.ewayNo}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Main Items Table - Repeats on every page */}
              <div className="pt-table-container">
                <table className="pt-main-table">
                  <thead>
                    <tr>
                      <th className="th-sr" rowSpan="2">Sr.<br />No.</th>
                      <th className="th-product" rowSpan="2">Name of Product / Service</th>
                      <th className="th-hsn" rowSpan="2">HSN / SAC</th>
                      <th className="th-qty" rowSpan="2">Qty</th>
                      <th className="th-rate" rowSpan="2">Rate</th>
                      <th className="th-taxable" rowSpan="2">Taxable Value</th>
                      {isIntraState ? (
                        <>
                          <th className="th-tax" colSpan="2">CGST</th>
                          <th className="th-tax" colSpan="2">SGST</th>
                        </>
                      ) : (
                        <th className="th-tax" colSpan="2">IGST</th>
                      )}
                      <th className="th-total" rowSpan="2">Total</th>
                    </tr>
                    <tr>
                      {isIntraState ? (
                        <>
                          <th className="th-tax-sub">%</th>
                          <th className="th-tax-sub">Amount</th>
                          <th className="th-tax-sub">%</th>
                          <th className="th-tax-sub">Amount</th>
                        </>
                      ) : (
                        <>
                          <th className="th-tax-sub">%</th>
                          <th className="th-tax-sub">Amount</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((item, idx) => (
                      <tr key={idx} className="pt-item-row">
                        <td className="td-center">{item.srNo}</td>
                        <td className="td-left">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div className="pt-product-name">{item.name}</div>
                              {item.note && <div className="pt-product-desc">{item.note}</div>}
                            </div>
                            {item.image && (
                              <img src={item.image} alt={item.name} className="pt-product-image" />
                            )}
                          </div>
                        </td>
                        <td className="td-center">{item.hsn || '-'}</td>
                        <td className="td-right">{(item.quantity).toFixed(2)} {item.unit?.split(' ')[0] || ''}</td>
                        <td className="td-right">{(item.rate).toFixed(2)}</td>
                        <td className="td-right">{(item.taxableValue).toFixed(2)}</td>
                        {isIntraState ? (
                          <>
                            <td className="td-center">{(item.cgstRate).toFixed(2)}</td>
                            <td className="td-right">{(item.cgstAmount).toFixed(2)}</td>
                            <td className="td-center">{(item.sgstRate).toFixed(2)}</td>
                            <td className="td-right">{(item.sgstAmount).toFixed(2)}</td>
                          </>
                        ) : (
                          <>
                            <td className="td-center">{(item.taxRate).toFixed(2)}</td>
                            <td className="td-right">{(item.igstAmount).toFixed(2)}</td>
                          </>
                        )}
                        <td className="td-right">{(item.total).toFixed(2)}</td>
                      </tr>
                    ))}

                    {/* Empty spacer row to push footer down */}
                    <tr className="pt-empty-row">
                      <td colSpan={isIntraState ? 11 : 9} style={{ height: '100%' }}></td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="pt-totals-row">
                      <td colSpan="3" className="td-right"><strong>Total</strong></td>
                      <td className="td-right"><strong>{totals.qty.toFixed(2)}</strong></td>
                      <td></td>
                      <td className="td-right"><strong>{totals.taxable.toFixed(2)}</strong></td>
                      {isIntraState ? (
                        <>
                          <td></td><td className="td-right"><strong>{totals.cgst.toFixed(2)}</strong></td>
                          <td></td><td className="td-right"><strong>{totals.sgst.toFixed(2)}</strong></td>
                        </>
                      ) : (
                        <>
                          <td></td><td className="td-right"><strong>{totals.igst.toFixed(2)}</strong></td>
                        </>
                      )}
                      <td className="td-right"><strong>{(totals.taxable + totals.cgst + totals.sgst + totals.igst).toFixed(2)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Footer Area - Repeats on Every Page */}
              <div className="pt-footer-container">
                <div className="pt-footer-left">
                  <div className="pt-footer-box" style={{ minHeight: '40px' }}>
                    <div className="pt-section-title-small">Total in words</div>
                    <div className="pt-words-text">{toWords(Math.round(totals.total))}</div>
                  </div>
                  <div className="pt-footer-box pt-bank-box">
                    <div className="pt-section-title-small">Bank Details</div>
                    <table className="pt-bank-table">
                      <tbody>
                        <tr><th>Name</th><td>{company?.bankName || '-'}</td></tr>
                        <tr><th>Branch</th><td>{company?.bankBranch || '-'}</td></tr>
                        <tr><th>Acc. Number</th><td>{company?.bankAccNumber || '-'}</td></tr>
                        <tr><th>IFSC</th><td>{company?.bankIfsc || '-'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="pt-footer-box pt-terms-box" style={{ borderBottom: '1.5px solid #00adef' }}>
                    <div className="pt-section-title-small">Terms and Conditions</div>
                    <div className="pt-terms-text">
                      {rawDoc.terms?.length ? (
                        rawDoc.terms.map((t, i) => <div key={i}><strong>{t.title}:</strong> {t.detail}</div>)
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{company?.terms || '-'}</div>
                      )}
                    </div>
                  </div>
                  <div className="pt-footer-box">
                    <div className="pt-section-title-small">Payment condition</div>
                    <div className="pt-terms-text">{company?.paymentTerms || '-'}</div>
                  </div>

                  {company?.upiId && (
                    <div className="pt-footer-box pt-qr-box" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '10px', background: '#f8fafc', padding: '10px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                      <QRCodeCanvas
                        value={`upi://pay?pa=${company.upiId}&pn=${encodeURIComponent(company.name || '')}&am=${Math.round(totals.total)}&cu=INR&tn=${encodeURIComponent('Inv ' + (doc.invoiceNumber || ''))}`}
                        size={80}
                        level="H"
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#00adef', marginBottom: '4px' }}>SCAN & PAY VIA UPI</div>
                        <div style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.2' }}>
                          Quick payment using any UPI App (GPay, PhonePe, Paytm, etc.)
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: '600', color: '#1e293b', marginTop: '4px' }}>UPI ID: {company.upiId}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-footer-right">
                  <table className="pt-summary-table">
                    <tbody>
                      <tr><th>Taxable Amount</th><td>{totals.taxable.toFixed(2)}</td></tr>
                      {isIntraState ? (
                        <>
                          <tr><th>Add : CGST</th><td>{totals.cgst.toFixed(2)}</td></tr>
                          <tr><th>Add : SGST</th><td>{totals.sgst.toFixed(2)}</td></tr>
                        </>
                      ) : (
                        <tr><th>Add : IGST</th><td>{totals.igst.toFixed(2)}</td></tr>
                      )}
                      <tr><th>Total Tax</th><td>{(totals.cgst + totals.sgst + totals.igst).toFixed(2)}</td></tr>
                      <tr className="pt-grand-total">
                        <th>Total Amount After Tax</th>
                        <td>₹{(totals.taxable + totals.cgst + totals.sgst + totals.igst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr><td colSpan="2" className="pt-eoe">(E & O.E.)</td></tr>
                    </tbody>
                  </table>

                  <div className="pt-signature-box">
                    <div className="pt-certify-text">Certified that the particulars given above are true and correct.</div>
                    <div className="pt-sig-company">For {company?.name || ''}</div>
                    {company?.signature && (
                      <div style={{ textAlign: 'center', padding: '5px 0' }}>
                        <img src={company.signature} alt="Signature" style={{ maxHeight: '60px', mixBlendMode: 'multiply' }} />
                      </div>
                    )}
                    <div className="pt-sig-label">Authorised Signatory</div>
                  </div>
                </div>
              </div>

              {/* Page indicator at very bottom */}
              <div style={{ textAlign: 'center', padding: '5px', fontSize: '9px', fontWeight: 600, borderTop: '1px dashed #eee' }}>
                Page {pIdx + 1} of {pages.length}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PrintTemplate;
