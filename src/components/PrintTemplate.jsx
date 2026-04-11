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
    // Calculate values if not provided
    const totalDays = s.attendanceDays || 30;
    const absentDays = s.absences || 0;
    const presentDays = totalDays - absentDays;
    const baseSalary = Number(s.salary) || 0;
    const dailyWage = baseSalary / totalDays;
    const deduction = dailyWage * absentDays;
    const netSalary = s.calculatedSalary || (baseSalary - deduction);

    return (
      <div className="print-container pt-salary-slip">
        <div className="print-page-border" style={{ padding: '40px', border: '1px solid #e2e8f0' }}>
          
          {/* Header */}
          <div className="pt-ss-header">
            <div className="pt-header-left">
              {company?.logo ? (
                <img src={company.logo} alt={company.name} style={{ maxHeight: '60px', marginBottom: '10px' }} />
              ) : (
                <h1 style={{ color: '#6366f1', fontSize: '28px', margin: 0 }}>{company?.name}</h1>
              )}
              <p style={{ fontSize: '11px', color: '#64748b', maxWidth: '300px' }}>{company?.address}</p>
            </div>
            <div className="pt-ss-title-group" style={{ textAlign: 'right' }}>
              <h2>PAYSLIP</h2>
              <p>{s.month} {s.year}</p>
            </div>
          </div>

          {/* Employee Info Grid */}
          <div className="pt-ss-info-grid">
            <div className="pt-ss-info-column">
              <div className="pt-ss-info-item">
                <span className="pt-ss-info-label">Employee Name</span>
                <span className="pt-ss-info-value">{s.staffName}</span>
              </div>
              <div className="pt-ss-info-item">
                <span className="pt-ss-info-label">Designation</span>
                <span className="pt-ss-info-value">{s.designation}</span>
              </div>
            </div>
            <div className="pt-ss-info-column">
              <div className="pt-ss-info-item">
                <span className="pt-ss-info-label">Department</span>
                <span className="pt-ss-info-value">{s.department}</span>
              </div>
              <div className="pt-ss-info-item">
                <span className="pt-ss-info-label">Employee ID</span>
                <span className="pt-ss-info-value">EMP-{s.staffId?.slice(-4).toUpperCase() || 'NA'}</span>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="pt-ss-attendance-bar">
            <div className="pt-ss-att-item">
              <div className="pt-ss-att-label">Total Days</div>
              <div className="pt-ss-att-value">{totalDays}</div>
            </div>
            <div className="pt-ss-att-item">
              <div className="pt-ss-att-label">Worked Days</div>
              <div className="pt-ss-att-value">{presentDays}</div>
            </div>
            <div className="pt-ss-att-item">
              <div className="pt-ss-att-label">Unpaid Leaves</div>
              <div className="pt-ss-att-value">{absentDays}</div>
            </div>
          </div>

          {/* Main Earnings/Deductions Grid */}
          <div className="pt-ss-main-grid">
            <div className="pt-ss-col earnings">
              <div className="pt-ss-col-header">
                <span>Earnings</span>
                <span>Amount (₹)</span>
              </div>
              <div className="pt-ss-row">
                <span className="pt-ss-row-label">Basic Salary</span>
                <span className="pt-ss-row-value">{baseSalary.toFixed(2)}</span>
              </div>
              <div className="pt-ss-row">
                <span className="pt-ss-row-label">Fixed Allowances</span>
                <span className="pt-ss-row-value">0.00</span>
              </div>
              <div className="pt-ss-col-footer">
                <span>Total Earnings</span>
                <span>₹{baseSalary.toFixed(2)}</span>
              </div>
            </div>
            <div className="pt-ss-col deductions">
              <div className="pt-ss-col-header">
                <span>Deductions</span>
                <span>Amount (₹)</span>
              </div>
              <div className="pt-ss-row">
                <span className="pt-ss-row-label">Unpaid Leave</span>
                <span className="pt-ss-row-value">{deduction.toFixed(2)}</span>
              </div>
              <div className="pt-ss-row">
                <span className="pt-ss-row-label">Professional Tax</span>
                <span className="pt-ss-row-value">0.00</span>
              </div>
              <div className="pt-ss-col-footer">
                <span>Total Deductions</span>
                <span>₹{deduction.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="pt-ss-summary-section">
            <div className="pt-ss-net-label">NET PAYABLE SALARY</div>
            <div className="pt-ss-net-value">₹{netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>

          <div className="pt-ss-words">
            Amount in words: {toWords(Math.round(netSalary))}
          </div>

          {/* QR and Signature */}
          <div className="pt-ss-qr-container">
            <div className="pt-ss-verification">
              <QRCodeCanvas 
                value={`PAYSLIP: ${s.staffName} | Month: ${s.month} ${s.year} | Net Pay: ₹${netSalary.toFixed(2)}`}
                size={70}
                level="M"
                includeMargin={false}
              />
              <div className="pt-ss-v-text">
                <h4>Verified Secure</h4>
                <p>Scan this QR to verify authenticity<br/>of this computer-generated payslip.</p>
              </div>
            </div>

            <div className="pt-ss-signature">
              <div className="pt-ss-sig-line"></div>
              <div className="pt-ss-sig-label">Authorized Signatory</div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>Date: {new Date().toLocaleDateString()}</div>
            </div>
          </div>

          {/* Bottom Note */}
          <div style={{ position: 'absolute', bottom: '40px', left: '40px', right: '40px', textAlign: 'center', fontSize: '9px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
            This is a computer generated document and does not require a physical signature. Confidential.
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
                       <tr><th style={{verticalAlign: 'top'}}>Address</th><td style={{whiteSpace: 'pre-wrap'}}>: {doc.customerAddress || '-'}</td></tr>
                       <tr><th>Phone</th><td>: {doc.customerPhone || '-'}</td></tr>
                       <tr><th>GSTIN</th><td>: {doc.customerGstin || '-'}</td></tr>
                       <tr><th>PAN</th><td>: {doc.customerPan || '-'}</td></tr>
                       <tr><th>Place of Supply</th><td>: {doc.placeOfSupply || '-'}</td></tr>
                     </tbody>
                   </table>
                </div>
                <div className="pt-invoice-details">
                   <table className="pt-details-table" style={{marginTop: '10px'}}>
                     <tbody>
                       <tr>
                        <th style={{width: '100px'}}>{isQuotation ? 'OFFER No.' : isJobWork ? 'Order No.' : 'Invoice No.'}</th>
                        <td style={{fontSize: '13px'}}>: <strong>{doc.invoiceNumber || '-'}</strong></td>
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
                      <th className="th-sr" rowSpan="2">Sr.<br/>No.</th>
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
                  <div className="pt-footer-box" style={{minHeight: '40px'}}>
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
                  <div className="pt-footer-box pt-terms-box" style={{borderBottom: '1.5px solid #00adef'}}>
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
                        <td>₹{(totals.taxable + totals.cgst + totals.sgst + totals.igst).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
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
