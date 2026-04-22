import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './LoanPrintTemplate.css';

const LoanPrintTemplate = ({ loan, contact, company }) => {
  if (!loan || !contact) return null;

  const contactName = contact.companyName || contact.contactName || contact.name || 'Unknown';
  
  // Total logic
  const principal = parseFloat(loan.principal) || 0;
  const isLend = loan.type === 'lend'; // lend = given, borrow = taken
  const emi = parseFloat(loan.emi) || 0;
  const tenure = parseInt(loan.tenure) || 0;
  const totalPayable = emi * tenure;
  
  // Add opening transaction (the loan itself)
  const initialTransaction = {
    id: loan.id,
    date: loan.date || new Date(loan.createdAt).toISOString().split('T')[0] || 'N/A',
    description: `Loan Disbursal (${isLend ? 'Given' : 'Taken'})`,
    ref: loan.id.slice(-8).toUpperCase(),
    drAmount: isLend ? totalPayable : 0,  // If lent, it's a debit (receivable)
    crAmount: isLend ? 0 : totalPayable   // If borrowed, it's a credit (payable)
  };

  const payments = loan.payments || [];
  
  // Map payments
  const mappedPayments = payments.map(p => {
    const amt = parseFloat(p.amount) || 0;
    return {
      id: p.id,
      date: p.date,
      description: p.note || 'Repayment',
      ref: p.paymentMethod || 'Manual',
      // If lent (receivable), a payment reduces balance so it's a Credit.
      // If borrowed (payable), a payment reduces balance so it's a Debit.
      drAmount: isLend ? 0 : amt,
      crAmount: isLend ? amt : 0
    };
  });

  const transactions = [initialTransaction, ...mappedPayments].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  let runningBalance = 0;
  const rows = transactions.map((tx, idx) => {
    if (tx.drAmount > 0) runningBalance += tx.drAmount;
    if (tx.crAmount > 0) runningBalance -= tx.crAmount;
    
    const balanceAbs = Math.abs(runningBalance);
    const balancePos = runningBalance > 0 ? 'Dr' : (runningBalance < 0 ? 'Cr' : 'Nil');

    return {
      ...tx,
      srNo: idx + 1,
      runningBalanceAbs: balanceAbs,
      runningBalancePos: balancePos,
    };
  });

  const totalDebit = rows.reduce((sum, r) => sum + r.drAmount, 0);
  const totalCredit = rows.reduce((sum, r) => sum + r.crAmount, 0);
  const netBalance = Math.abs(totalDebit - totalCredit);
  const netPosition = totalDebit > totalCredit ? 'Dr' : (totalCredit > totalDebit ? 'Cr' : 'Nil');

  const printDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const printTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  return (
    <div className="loanpt-multi-page-container">
      <div className="loanpt-print-container">
        <div className="loanpt-page-border">

          {/* ── HEADER ── */}
          <div className="loanpt-header">
            <div className="loanpt-header-left">
              <div className="loanpt-company-name-text">{company?.name || 'YOUR COMPANY'}</div>
              <div className="loanpt-company-address">{company?.address || ''}</div>
              {company?.gstin && (
                <div className="loanpt-company-gstin">
                  <span className="loanpt-label">GSTIN:</span> {company.gstin}
                </div>
              )}
            </div>
            <div className="loanpt-header-right">
              {company?.logo && (
                <img src={company.logo} alt={company.name} className="loanpt-company-logo" />
              )}
              <div className="loanpt-header-meta-list">
                {company?.phone && (
                  <div className="loanpt-header-meta-item">
                    <span className="loanpt-label">Phone:</span> {company.phone}
                  </div>
                )}
                {company?.email && (
                  <div className="loanpt-header-meta-item">
                    <span className="loanpt-label">Email:</span> {company.email}
                  </div>
                )}
                {company?.pan && (
                  <div className="loanpt-header-meta-item">
                    <span className="loanpt-label">PAN:</span> {company.pan}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── TITLE BAR ── */}
          <div className="loanpt-title-bar">
            <div className="loanpt-title-left">LOAN ACCOUNT STATEMENT</div>
            <div className="loanpt-title-right">
              Status: {loan.status === 'closed' ? 'CLOSED' : 'ACTIVE'}
            </div>
          </div>

          {/* ── PARTY & DOC INFO ── */}
          <div className="loanpt-party-section">
            <div className="loanpt-party-left">
              <div className="loanpt-section-heading">Loan Party Details</div>
              <table className="loanpt-party-table">
                <tbody>
                  <tr>
                    <th>Name</th>
                    <td>: <strong>{contactName}</strong></td>
                  </tr>
                  {(contact.address) && (
                    <tr>
                      <th>Address</th>
                      <td>: {contact.address}</td>
                    </tr>
                  )}
                  {contact.phone && (
                    <tr>
                      <th>Phone</th>
                      <td>: {contact.phone}</td>
                    </tr>
                  )}
                  {loan.pan && (
                    <tr>
                      <th>PAN</th>
                      <td>: {loan.pan}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="loanpt-party-right">
              <div className="loanpt-section-heading">Loan Summary Details</div>
              <table className="loanpt-party-table">
                <tbody>
                  <tr>
                    <th>Loan Ref</th>
                    <td>: {loan.id.slice(-8).toUpperCase()}</td>
                  </tr>
                  <tr>
                    <th>Disbursal Date</th>
                    <td>: {loan.date || new Date(loan.createdAt).toISOString().split('T')[0]}</td>
                  </tr>
                  <tr>
                    <th>Expected EMI</th>
                    <td>: ₹{emi.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                  <tr>
                    <th>Interest Rate</th>
                    <td>: {loan.interestRate}% ({loan.interestType})</td>
                  </tr>
                  <tr>
                    <th>Tenure</th>
                    <td>: {tenure} {loan.tenureUnit || (loan.frequency === 'monthly' ? 'Months' : 'Years')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ── SUMMARY CARDS ── */}
          <div className="loanpt-summary-bar">
            <div className="loanpt-summary-card loanpt-card-principal">
              <div className="loanpt-summary-card-label">Principal Amount</div>
              <div className="loanpt-summary-card-value">₹{principal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div className="loanpt-summary-card-sub">Initial Sanctioned Amount</div>
            </div>
            <div className="loanpt-summary-card loanpt-card-payable">
              <div className="loanpt-summary-card-label">Total Payable</div>
              <div className="loanpt-summary-card-value">₹{totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div className="loanpt-summary-card-sub">Including Interest</div>
            </div>
            <div className="loanpt-summary-card loanpt-card-balance">
              <div className="loanpt-summary-card-label">Outstanding Balance</div>
              <div className="loanpt-summary-card-value">₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
              <div className="loanpt-summary-card-sub">
                {netPosition === 'Dr' ? 'Amount to Receive' : (netPosition === 'Cr' ? 'Amount to Pay' : 'Settled')}
              </div>
            </div>
          </div>

          {/* ── TRANSACTIONS TABLE ── */}
          <div className="loanpt-table-container">
            <table className="loanpt-main-table">
              <thead>
                <tr>
                  <th className="loanpt-th-sr">Sr.</th>
                  <th className="loanpt-th-date">Date</th>
                  <th className="loanpt-th-desc">Transaction Description / Note</th>
                  <th className="loanpt-th-ref">Mode / Ref</th>
                  <th className="loanpt-th-dr">Debit (Dr)</th>
                  <th className="loanpt-th-cr">Credit (Cr)</th>
                  <th className="loanpt-th-balance">Running Balance</th>
                  <th className="loanpt-th-pos">Dr/Cr</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((row) => (
                    <tr key={row.id || row.srNo} className={`loanpt-row ${row.drAmount > 0 ? 'loanpt-row-dr' : 'loanpt-row-cr'}`}>
                      <td className="loanpt-td-center loanpt-td-sr">{row.srNo}</td>
                      <td className="loanpt-td-center loanpt-td-date">{row.date}</td>
                      <td className="loanpt-td-left loanpt-td-desc">
                        <div className="loanpt-desc-main">{row.description}</div>
                      </td>
                      <td className="loanpt-td-center loanpt-td-ref">{row.ref}</td>
                      <td className="loanpt-td-right loanpt-td-dr">
                        {row.drAmount > 0 ? (
                          <span className="loanpt-amount-dr">
                            {row.drAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        ) : <span className="loanpt-empty-cell">—</span>}
                      </td>
                      <td className="loanpt-td-right loanpt-td-cr">
                        {row.crAmount > 0 ? (
                          <span className="loanpt-amount-cr">
                            {row.crAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        ) : <span className="loanpt-empty-cell">—</span>}
                      </td>
                      <td className="loanpt-td-right loanpt-td-balance">
                        <strong>{row.runningBalanceAbs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </td>
                      <td className={`loanpt-td-center loanpt-td-pos ${row.runningBalancePos === 'Dr' ? 'loanpt-pos-dr' : (row.runningBalancePos === 'Cr' ? 'loanpt-pos-cr' : '')}`}>
                        {row.runningBalancePos}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="loanpt-empty-state">
                      No transactions recorded.
                    </td>
                  </tr>
                )}

                <tr className="loanpt-spacer-row">
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>

              {/* Totals footer */}
              <tfoot>
                <tr className="loanpt-totals-row">
                  <td colSpan="4" className="loanpt-totals-label">
                    Grand Total
                  </td>
                  <td className="loanpt-td-right loanpt-totals-dr">
                    {totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="loanpt-td-right loanpt-totals-cr">
                    {totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="loanpt-td-right loanpt-totals-balance">
                    {netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`loanpt-td-center loanpt-totals-pos ${netPosition === 'Dr' ? 'loanpt-pos-dr' : (netPosition === 'Cr' ? 'loanpt-pos-cr' : '')}`}>
                    {netPosition}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── FOOTER ── */}
          <div className="loanpt-footer">
            <div className="loanpt-footer-left">
              {/* Account Summary */}
              <div className="loanpt-balance-summary-box">
                <div className="loanpt-balance-summary-title">Balance Summary</div>
                <div className="loanpt-balance-summary-row loanpt-balance-net-row">
                  <span>Outstanding Balance</span>
                  <span className={netPosition === 'Dr' ? 'loanpt-dr-text' : 'loanpt-cr-text'}>
                    ₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {netPosition !== 'Nil' ? `(${netPosition})` : ''}
                  </span>
                </div>
                <div className="loanpt-balance-status">
                  {netPosition === 'Dr'
                    ? `${contactName} owes you ₹${netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`
                    : (netPosition === 'Cr' 
                      ? `You owe ₹${netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to ${contactName}.`
                      : 'Account is completely settled.')}
                </div>
              </div>

              {/* Declaration */}
              <div className="loanpt-declaration-box">
                <div className="loanpt-declaration-title">Declaration</div>
                <div className="loanpt-declaration-text">
                  This loan statement is computer-generated. Repayments shown are subject to realization. Please contact us for any discrepancies.
                </div>
              </div>
            </div>

            <div className="loanpt-footer-right">
              {/* QR Code */}
              {company?.upiId && netBalance > 0 && isLend && (
                <div className="loanpt-qr-box">
                  <QRCodeCanvas
                    value={`upi://pay?pa=${company.upiId}&pn=${encodeURIComponent(company?.name || '')}&am=${Math.round(netBalance)}&cu=INR&tn=${encodeURIComponent('Loan Settlement - ' + contactName)}`}
                    size={70}
                    level="H"
                  />
                  <div className="loanpt-qr-label">SCAN TO PAY EMI</div>
                  <div className="loanpt-qr-upi">{company.upiId}</div>
                </div>
              )}

              {/* Signature Block */}
              <div className="loanpt-signature-box">
                <div className="loanpt-sig-certified">
                  Certified that the particulars given above are true and correct.
                </div>
                <div className="loanpt-sig-for">For {company?.name || 'Company'}</div>
                {company?.signature ? (
                  <div className="loanpt-sig-image-wrap">
                    <img src={company.signature} alt="Signature" className="loanpt-sig-image" />
                  </div>
                ) : (
                  <div className="loanpt-sig-space"></div>
                )}
                <div className="loanpt-sig-line"></div>
                <div className="loanpt-sig-label">Authorised Signatory</div>
                <div className="loanpt-sig-name">{company?.ownerName || ''}</div>
              </div>
            </div>
          </div>

          <div className="loanpt-bottom-strip">
            <span>Printed on {printDate} at {printTime}</span>
            <span>System-generated loan statement</span>
            <span>{company?.name || ''}</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoanPrintTemplate;
