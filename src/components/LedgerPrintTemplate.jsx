import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './LedgerPrintTemplate.css';

const LedgerPrintTemplate = ({ contact, balanceInfo, company, dateRange }) => {
  if (!contact || !balanceInfo) return null;

  const contactName = contact.companyName || contact.customerName || contact.name || 'Unknown';
  const transactions = [...(balanceInfo.transactions || [])].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // Build rows with running balance
  let runningBalance = 0;
  const rows = transactions.map((tx, idx) => {
    const amt = Number(tx.amount) || 0;
    if (tx.type === 'dr' || tx.type === 'debit') {
      runningBalance += amt;
    } else {
      runningBalance -= amt;
    }
    const balanceAbs = Math.abs(runningBalance);
    const balancePos = runningBalance >= 0 ? 'Dr' : 'Cr';

    return {
      ...tx,
      srNo: idx + 1,
      drAmount: (tx.type === 'dr' || tx.type === 'debit') ? amt : 0,
      crAmount: (tx.type === 'cr' || tx.type === 'credit') ? amt : 0,
      runningBalanceAbs: balanceAbs,
      runningBalancePos: balancePos,
    };
  });

  const totalDebit = balanceInfo.debit || 0;
  const totalCredit = balanceInfo.credit || 0;
  const netBalance = balanceInfo.balance || 0;
  const netPosition = balanceInfo.position || 'Dr';

  const printDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  const printTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  // Split transactions across pages (max 22 per page for proper A4 fit)
  const PAGE_SIZE = 22;
  const pages = [];
  for (let i = 0; i < Math.max(1, Math.ceil(rows.length / PAGE_SIZE)); i++) {
    pages.push(rows.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE));
  }

  return (
    <div className="lpt-multi-page-container">
      {pages.map((pageRows, pIdx) => {
        const isFirstPage = pIdx === 0;
        const isLastPage = pIdx === pages.length - 1;

        return (
          <div className="lpt-print-container" key={pIdx}>
            <div className="lpt-page-border">

              {/* ── HEADER ── */}
              <div className="lpt-header">
                <div className="lpt-header-left">
                  <div className="lpt-company-name-text">{company?.name || 'YOUR COMPANY'}</div>
                  <div className="lpt-company-address">{company?.address || ''}</div>
                  {company?.gstin && (
                    <div className="lpt-company-gstin">
                      <span className="lpt-label">GSTIN:</span> {company.gstin}
                    </div>
                  )}
                </div>
                <div className="lpt-header-right">
                  {company?.logo && (
                    <img src={company.logo} alt={company.name} className="lpt-company-logo" />
                  )}
                  <div className="lpt-header-meta-list">
                    {company?.phone && (
                      <div className="lpt-header-meta-item">
                        <span className="lpt-label">Phone:</span> {company.phone}
                      </div>
                    )}
                    {company?.email && (
                      <div className="lpt-header-meta-item">
                        <span className="lpt-label">Email:</span> {company.email}
                      </div>
                    )}
                    {company?.pan && (
                      <div className="lpt-header-meta-item">
                        <span className="lpt-label">PAN:</span> {company.pan}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── TITLE BAR ── */}
              <div className="lpt-title-bar">
                <div className="lpt-title-left">ACCOUNT LEDGER STATEMENT</div>
                <div className="lpt-title-right">
                  {pages.length > 1 && `Page ${pIdx + 1} of ${pages.length}`}
                </div>
              </div>

              {/* ── PARTY & DOC INFO ── (only on first page) */}
              {isFirstPage && (
                <div className="lpt-party-section">
                  <div className="lpt-party-left">
                    <div className="lpt-section-heading">Party / Account Details</div>
                    <table className="lpt-party-table">
                      <tbody>
                        <tr>
                          <th>M/S</th>
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
                        {contact.gstin && (
                          <tr>
                            <th>GSTIN</th>
                            <td>: {contact.gstin}</td>
                          </tr>
                        )}
                        <tr>
                          <th>Type</th>
                          <td>: <span className="lpt-type-badge">{contact.type || 'contact'}</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="lpt-party-right">
                    <div className="lpt-section-heading">Statement Information</div>
                    <table className="lpt-party-table">
                      <tbody>
                        <tr>
                          <th>Print Date</th>
                          <td>: {printDate}</td>
                        </tr>
                        <tr>
                          <th>Print Time</th>
                          <td>: {printTime}</td>
                        </tr>
                        {dateRange?.from && (
                          <tr>
                            <th>Period From</th>
                            <td>: {dateRange.from}</td>
                          </tr>
                        )}
                        {dateRange?.to && (
                          <tr>
                            <th>Period To</th>
                            <td>: {dateRange.to}</td>
                          </tr>
                        )}
                        <tr>
                          <th>Total Entries</th>
                          <td>: {transactions.length}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── SUMMARY CARDS ── (only on first page) */}
              {isFirstPage && (
                <div className="lpt-summary-bar">
                  <div className="lpt-summary-card lpt-card-debit">
                    <div className="lpt-summary-card-label">Total Debit (Dr)</div>
                    <div className="lpt-summary-card-value">₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div className="lpt-summary-card-sub">Amount Receivable / Given</div>
                  </div>
                  <div className="lpt-summary-card lpt-card-credit">
                    <div className="lpt-summary-card-label">Total Credit (Cr)</div>
                    <div className="lpt-summary-card-value">₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div className="lpt-summary-card-sub">Amount Received / Bought</div>
                  </div>
                  <div className={`lpt-summary-card lpt-card-balance ${netPosition === 'Dr' ? 'lpt-card-balance-dr' : 'lpt-card-balance-cr'}`}>
                    <div className="lpt-summary-card-label">Net Balance</div>
                    <div className="lpt-summary-card-value">₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div className="lpt-summary-card-sub">
                      {netPosition === 'Dr' ? 'You will Collect (Dr)' : 'You will Pay (Cr)'}
                    </div>
                  </div>
                </div>
              )}

              {/* ── TRANSACTIONS TABLE ── */}
              <div className="lpt-table-container">
                <table className="lpt-main-table">
                  <thead>
                    <tr>
                      <th className="lpt-th-sr">Sr.</th>
                      <th className="lpt-th-date">Date</th>
                      <th className="lpt-th-desc">Description / Narration</th>
                      <th className="lpt-th-ref">Ref / Doc Type</th>
                      <th className="lpt-th-dr">Debit (Dr)</th>
                      <th className="lpt-th-cr">Credit (Cr)</th>
                      <th className="lpt-th-balance">Balance</th>
                      <th className="lpt-th-pos">Dr/Cr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.length > 0 ? (
                      pageRows.map((row) => (
                        <tr key={row.id || row.srNo} className={`lpt-row ${row.drAmount > 0 ? 'lpt-row-dr' : 'lpt-row-cr'}`}>
                          <td className="lpt-td-center lpt-td-sr">{row.srNo}</td>
                          <td className="lpt-td-center lpt-td-date">{row.date}</td>
                          <td className="lpt-td-left lpt-td-desc">
                            <div className="lpt-desc-main">{row.description || (row.type === 'dr' ? 'Debit Entry' : 'Credit Entry')}</div>
                          </td>
                          <td className="lpt-td-center lpt-td-ref">{row.docType || 'Manual'}</td>
                          <td className="lpt-td-right lpt-td-dr">
                            {row.drAmount > 0 ? (
                              <span className="lpt-amount-dr">
                                {row.drAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            ) : <span className="lpt-empty-cell">—</span>}
                          </td>
                          <td className="lpt-td-right lpt-td-cr">
                            {row.crAmount > 0 ? (
                              <span className="lpt-amount-cr">
                                {row.crAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                            ) : <span className="lpt-empty-cell">—</span>}
                          </td>
                          <td className="lpt-td-right lpt-td-balance">
                            <strong>{row.runningBalanceAbs.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                          </td>
                          <td className={`lpt-td-center lpt-td-pos ${row.runningBalancePos === 'Dr' ? 'lpt-pos-dr' : 'lpt-pos-cr'}`}>
                            {row.runningBalancePos}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="lpt-empty-state">
                          No transactions recorded for this account.
                        </td>
                      </tr>
                    )}

                    {/* Spacer row — individual cells keep column borders visible */}
                    <tr className="lpt-spacer-row">
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

                  {/* Totals footer on every page */}
                  <tfoot>
                    <tr className="lpt-totals-row">
                      <td colSpan="4" className="lpt-totals-label">
                        {isLastPage ? 'Grand Total' : `Subtotal (Page ${pIdx + 1})`}
                      </td>
                      <td className="lpt-td-right lpt-totals-dr">
                        {totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="lpt-td-right lpt-totals-cr">
                        {totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="lpt-td-right lpt-totals-balance">
                        {netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`lpt-td-center lpt-totals-pos ${netPosition === 'Dr' ? 'lpt-pos-dr' : 'lpt-pos-cr'}`}>
                        {netPosition}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* ── FOOTER ── (only on last page) */}
              {isLastPage && (
                <div className="lpt-footer">
                  <div className="lpt-footer-left">
                    {/* Balance Summary */}
                    <div className="lpt-balance-summary-box">
                      <div className="lpt-balance-summary-title">Account Summary</div>
                      <div className="lpt-balance-summary-row">
                        <span>Total Debit Entries</span>
                        <span className="lpt-dr-text">₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="lpt-balance-summary-row">
                        <span>Total Credit Entries</span>
                        <span className="lpt-cr-text">₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="lpt-balance-summary-divider" />
                      <div className="lpt-balance-summary-row lpt-balance-net-row">
                        <span>Net Balance ({netPosition})</span>
                        <span className={netPosition === 'Dr' ? 'lpt-dr-text' : 'lpt-cr-text'}>
                          ₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="lpt-balance-status">
                        {netPosition === 'Dr'
                          ? `${contactName} owes you ₹${netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : netBalance === 0
                            ? 'Account is fully settled.'
                            : `You owe ₹${netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} to ${contactName}`}
                      </div>
                    </div>

                    {/* Terms / Declaration */}
                    <div className="lpt-declaration-box">
                      <div className="lpt-declaration-title">Declaration</div>
                      <div className="lpt-declaration-text">
                        This is a computer-generated ledger statement and does not require a physical signature.
                        All figures are in Indian Rupees (₹). Please contact us immediately for any discrepancies.
                      </div>
                    </div>
                  </div>

                  <div className="lpt-footer-right">
                    {/* QR Code */}
                    {company?.upiId && (
                      <div className="lpt-qr-box">
                        <QRCodeCanvas
                          value={`upi://pay?pa=${company.upiId}&pn=${encodeURIComponent(company?.name || '')}&am=${Math.round(netBalance)}&cu=INR&tn=${encodeURIComponent('Ledger Settlement - ' + contactName)}`}
                          size={70}
                          level="H"
                        />
                        <div className="lpt-qr-label">SCAN TO PAY</div>
                        <div className="lpt-qr-upi">{company.upiId}</div>
                      </div>
                    )}

                    {/* Signature Block */}
                    <div className="lpt-signature-box">
                      <div className="lpt-sig-certified">
                        Certified that the particulars given above are true and correct.
                      </div>
                      <div className="lpt-sig-for">For {company?.name || 'Company'}</div>
                      {company?.signature ? (
                        <div className="lpt-sig-image-wrap">
                          <img src={company.signature} alt="Signature" className="lpt-sig-image" />
                        </div>
                      ) : (
                        <div className="lpt-sig-space"></div>
                      )}
                      <div className="lpt-sig-line"></div>
                      <div className="lpt-sig-label">Authorised Signatory</div>
                      <div className="lpt-sig-name">{company?.ownerName || ''}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Watermark / Footer Tag */}
              <div className="lpt-bottom-strip">
                <span>Printed on {printDate} at {printTime}</span>
                <span>This is a system-generated statement</span>
                <span>{company?.name || ''}</span>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LedgerPrintTemplate;
