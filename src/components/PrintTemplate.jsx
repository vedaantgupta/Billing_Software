import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './PrintTemplate.css';

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
              <div className="pt-ss-sig-line"></div>
              <div className="pt-ss-sig-label">Authorized Signatory</div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>HR Manager / Finance</div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ── Payment Receipt (Inward) Voucher Template ──
  if (rawDoc.docType === 'Payment In' || rawType === 'Payment In') {
    const p = rawDoc;
    const amount = Number(p.amount) || 0;

    return (
      <div className="print-container pt-payment-voucher">
        <div className="pt-pv-wrapper">
          
          {/* 1. Top Header */}
          <div className="pt-pv-top-header">
             <div className="pt-pv-company-meta">
               <h1 className="pt-pv-company-name">{company?.name || 'VEDAANT POOLS TECHNOLOGY'}</h1>
               <div className="pt-pv-company-address">
                 {company?.address || 'HOUSE NO L-1, VANDANA VIHAR COLONGY, BHANGAD ROAD BEHIND PAGARE GAS GODOWN indore, Madhya Pradesh - 452011'}
               </div>
             </div>
             <div className="pt-pv-owner-meta">
               <table>
                 <tbody>
                   <tr><th>Name</th><td>: {company?.ownerName || '-'}</td></tr>
                   <tr><th>Phone</th><td>: {company?.phone || '-'}</td></tr>
                   <tr><th>Email</th><td>: {company?.email || '-'}</td></tr>
                   <tr><th>PAN</th><td>: {company?.pan || '-'}</td></tr>
                 </tbody>
               </table>
             </div>
          </div>

          {/* 2. Title Bar */}
          <div className="pt-pv-title-bar">
            <div className="pt-pv-gstin">GSTIN : {company?.gstin || '-'}</div>
            <div className="pt-pv-title-text">RECEIPT VOUCHER</div>
            <div className="pt-pv-placeholder"></div>
          </div>

          {/* 3. Customer Detail Box */}
          <div className="pt-pv-customer-section">
            <div className="pt-pv-customer-grid">
              <div className="pt-pv-grid-left">
                <div className="pt-pv-section-header">Customer Detail</div>
                <div className="pt-pv-details-content">
                  <table>
                    <tbody>
                      <tr><th>M/S</th><td>: {p.customerName || '-'}</td></tr>
                      <tr><th style={{ verticalAlign: 'top' }}>Address</th><td>: {p.address || '-'}</td></tr>
                      <tr><th>Phone</th><td>: {p.phone || '-'}</td></tr>
                      <tr><th>GSTIN</th><td>: {p.gstinPan || '-'}</td></tr>
                      <tr><th>State</th><td>: {p.state || 'Madhya Pradesh (23)'}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="pt-pv-grid-right">
                <div className="pt-pv-section-header-blank">&nbsp;</div>
                <div className="pt-pv-receipt-meta-content">
                  <table>
                    <tbody>
                      <tr><th>Receipt No.</th><td>RP-690607</td></tr>
                      <tr><th>Receipt Date</th><td>2026-04-06</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Main Body Table */}
          <div className="pt-pv-table-container">
            <table className="pt-pv-main-table">
              <thead>
                <tr>
                  <th className="th-sr">Sr.No.</th>
                  <th className="th-particulars">Particulars</th>
                  <th className="th-amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="pt-pv-item-row">
                  <td className="td-sr">1</td>
                  <td className="td-particulars">
                    <div className="pt-pv-account-block">
                      <strong>Account :</strong>
                      <div className="pt-pv-account-name">{p.customerName}</div>
                      {p.invoiceList && <div className="pt-pv-invoice-no">Invoice No : {p.invoiceList}</div>}
                    </div>
                    
                    <div className="pt-pv-remarks-block">
                      <strong>Remarks :</strong>
                      <div className="pt-pv-remarks-text">{p.remarks || '-'}</div>
                    </div>

                    <div className="pt-pv-through-block">
                      <strong>Through :</strong>
                      <div className="pt-pv-through-text">{p.paymentType || 'ONLINE'}</div>
                    </div>
                  </td>
                  <td className="td-amount">
                    {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
                {/* Spacer row to push footer down */}
                <tr className="pt-pv-spacer-row">
                  <td className="td-sr"></td>
                  <td className="td-particulars"></td>
                  <td className="td-amount"></td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" className="td-total-label"></td>
                  <td className="td-total-value">{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 5. Footer Sections */}
          <div className="pt-pv-footer">
            <div className="pt-pv-footer-row">
              <div className="pt-pv-words-box">
                <div className="pt-pv-footer-label">Total in words</div>
                <div className="pt-pv-words-text">{toWords(Math.round(amount))}</div>
              </div>
              <div className="pt-pv-amount-summary">
                <div className="pt-pv-summary-item">
                  <span>Total Amount</span>
                  <span className="pt-pv-final-amount">₹ {amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="pt-pv-footer-row">
               <div className="pt-pv-terms-box">
                 <div className="pt-pv-footer-label">Terms and Conditions</div>
                 <div className="pt-pv-terms-text">
                   Subject to our home Jurisdiction.<br />
                   Our Responsibility Ceases as soon as goods leaves our Premises.<br />
                   Goods once sold will not taken back.<br />
                   Delivery Ex-Premises.
                 </div>
               </div>
               <div className="pt-pv-signature-box">
                 <div className="pt-pv-certified-text">Certified that the particulars given above are true and correct.</div>
                 <div className="pt-pv-for-comp">For {company?.name || 'VEDAANT POOLS TECHNOLOGY'}</div>
                 <div className="pt-pv-sig-space"></div>
                 <div className="pt-pv-sig-label">Authorised Signatory</div>
               </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ── Data Normalization for different doc types ──
  const isQuotation = rawDoc.docType === 'Quotation' || rawType === 'Quotation';
  const isProforma = rawDoc.docType === 'Proforma Invoice' || rawType === 'Proforma Invoice';
  const isJobWork = rawDoc.docType === 'Job Work' || rawType === 'Job Work';
  const hasCustomerInfo = !!rawDoc.customerInfo;

  // Standardize the document structure for the template
  const doc = {
    ...rawDoc,
    customerName: hasCustomerInfo ? rawDoc.customerInfo?.ms : (rawDoc.customerName || rawDoc.vendorInfo?.ms || '-'),
    customerAddress: hasCustomerInfo ? rawDoc.customerInfo?.address : (rawDoc.customerAddress || rawDoc.vendorInfo?.address || '-'),
    customerPhone: hasCustomerInfo ? rawDoc.customerInfo?.phoneNo : (rawDoc.customerPhone || rawDoc.vendorInfo?.phoneNo || '-'),
    customerGstin: hasCustomerInfo ? rawDoc.customerInfo?.gstinPan : (rawDoc.customerGstin || rawDoc.vendorInfo?.gstinPan || '-'),
    placeOfSupply: hasCustomerInfo ? rawDoc.customerInfo?.placeOfSupply : (rawDoc.placeOfSupply || rawDoc.vendorInfo?.placeOfSupply || '-'),
    invoiceNumber: isQuotation ? `${rawDoc.docNumberPrefix}${rawDoc.offerDetail?.offerNo}${rawDoc.docNumberPostfix}`
      : isProforma ? `${rawDoc.docPrefix || ''}${rawDoc.piDetail?.piNo || ''}${rawDoc.docPostfix || ''}`
        : isJobWork ? `${rawDoc.docPrefix || ''}${rawDoc.jwDetail?.jobWorkNo || ''}${rawDoc.docPostfix || ''}`
          : (rawDoc.invoiceNumber || '-'),
    date: isQuotation ? rawDoc.offerDetail?.date
      : isProforma ? rawDoc.piDetail?.date
        : isJobWork ? rawDoc.jwDetail?.date
          : (rawDoc.date || '-'),
  };

  // Determine Tax Columns (CGST/SGST vs IGST)
  // Logic: In India, if Supplier State == Customer Place of Supply State -> CGST + SGST
  // Otherwise -> IGST
  const isIntraState = (company?.state || 'Madhya Pradesh').toLowerCase() === (doc.placeOfSupply || '').split(' (')[0].toLowerCase();

  // Ensure items have calculated tax values
  const items = (doc.items || []).map((item, index) => {
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
  // Based on reference image: Header + Footer repeat on every page.
  // Capacity set to 15 items per page.
  const PAGE_CAPACITY = 15;

  const pages = [];
  let remainingItems = [...items];

  // Chunking into equal sized pages
  let pageIdx = 0;
  while (remainingItems.length > 0 || pageIdx === 0) {
    const chunk = remainingItems.splice(0, PAGE_CAPACITY);
    pages.push(chunk);
    pageIdx++;
    if (remainingItems.length === 0) break;
  }

  const displayType = isQuotation ? 'OFFER' : isJobWork ? 'JOB WORK ORDER' : (rawType || 'TAX INVOICE');

  return (
    <div className="pt-multi-page-container">
      {pages.map((pageItems, pIdx) => {
        const isFirstPage = pIdx === 0;
        const isLastPage = pIdx === pages.length - 1;

        return (
          <div className="print-container" key={pIdx}>
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
                  <div className="pt-section-title">Customer Detail</div>
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
                        <th style={{ width: '100px' }}>{isQuotation ? 'OFFER No.' : isJobWork ? 'Order No.' : 'Invoice No.'}</th>
                        <td style={{ fontSize: '13px' }}>: <strong>{doc.invoiceNumber || '-'}</strong></td>
                      </tr>
                      <tr>
                        <th>{isQuotation ? 'OFFER Date' : isJobWork ? 'Order Date' : 'Invoice Date'}</th>
                        <td>: {doc.date || '-'}</td>
                      </tr>
                      {doc.challanNo && <tr><th>Challan No.</th><td>: {doc.challanNo}</td></tr>}
                      {doc.offerDetail?.lrNo && <tr><th>L.R. No.</th><td>: {doc.offerDetail.lrNo}</td></tr>}
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
