import React from 'react';
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

const PrintTemplate = ({ doc: rawDoc, company, type: rawType, copyType = 'ORIGINAL FOR RECIPIENT' }) => {
  if (!rawDoc) return null;

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

  const displayType = isQuotation ? 'OFFER' : isJobWork ? 'JOB WORK ORDER' : (rawType || 'TAX INVOICE');

  return (
    <div className="print-container">
      <div className="print-page-border">
        {/* Header Block */}
        <div className="pt-header">
          <div className="pt-header-left">
            <h1>{company?.name || 'VEDAANT POOLS TECHNOLOGY'}</h1>
            <p>{company?.address || 'HOUSE NO L-1, VANDANA VIHAR COLONY, BHANGAD ROAD\nBEHIND PAGARE GAS GODOWN\nIndore, Madhya Pradesh - 452011'}</p>
          </div>
          <div className="pt-header-right">
            <table>
              <tbody>
                <tr><td>Name</td><td>: {company?.ownerName || 'yogendra gupta'}</td></tr>
                <tr><td>Phone</td><td>: {company?.phone || '09479940047'}</td></tr>
                <tr><td>Email</td><td>: {company?.email || 'vedaantpools@gmail.com'}</td></tr>
                <tr><td>PAN</td><td>: {company?.pan || 'AGZPG1057G'}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* GSTIN & Title Bar */}
        <div className="pt-title-bar">
          <div className="pt-title-gstin"><strong>GSTIN :</strong> {company?.gstin || '23AGZPG1057G1ZD'}</div>
          <div className="pt-title-text">{displayType}</div>
          <div className="pt-title-original">{copyType}</div>
        </div>

        {/* Customer & Document Details */}
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

        {/* Main Items Table */}
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
              {items.map((item, idx) => (
                <tr key={idx} className="pt-item-row">
                  <td className="td-center">{item.srNo}</td>
                  <td className="td-left">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div className="pt-product-name">{item.name}</div>
                        {item.note && <div className="pt-product-desc">{item.note}</div>}
                      </div>
                      {item.image && (
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="pt-product-image" 
                        />
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
              {/* Individual empty cells to maintain vertical lines */}
              <tr className="pt-empty-row">
                <td></td><td></td><td></td><td></td><td></td><td></td>
                {isIntraState ? (
                  <><td></td><td></td><td></td><td></td></>
                ) : (
                  <><td></td><td></td></>
                )}
                <td></td>
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

        {/* Footer Area */}
        <div className="pt-footer-container">
          <div className="pt-footer-left">
            <div className="pt-footer-box" style={{height: '40px'}}>
               <div className="pt-section-title-small">Total in words</div>
               <div className="pt-words-text">{toWords(Math.round(totals.total))}</div>
            </div>
            <div className="pt-footer-box pt-bank-box">
               <div className="pt-section-title-small">Bank Details</div>
               <table className="pt-bank-table">
                 <tbody>
                   <tr><th>Name</th><td>{rawDoc.bank || company?.bankName || 'CANARA BANK'}</td></tr>
                   <tr><th>Branch</th><td>{company?.bankBranch || 'MR-10 ROAD VIJAY NAGAR INDORE'}</td></tr>
                   <tr><th>Acc. Number</th><td>{company?.bankAccNumber || '5566201000132'}</td></tr>
                   <tr><th>IFSC</th><td>{company?.bankIfsc || 'CNRB0005566'}</td></tr>
                 </tbody>
               </table>
            </div>
            <div className="pt-footer-box pt-terms-box" style={{borderBottom: '1.5px solid #00adef'}}>
               <div className="pt-section-title-small">Terms and Conditions</div>
               <div className="pt-terms-text">
                 {rawDoc.terms?.length ? (
                   rawDoc.terms.map((t, i) => <div key={i}><strong>{t.title}:</strong> {t.detail}</div>)
                 ) : (
                   <>
                     Subject to our home Jurisdiction.<br/>
                     Our Responsibility Ceases as soon as goods leaves our Premises.<br/>
                     Goods once sold will not taken back.
                   </>
                 )}
               </div>
            </div>
            <div className="pt-footer-box">
               <div className="pt-section-title-small">Payment condition</div>
               <div className="pt-terms-text">100% advance against finalization of offer</div>
            </div>
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
               <div className="pt-sig-company">For {company?.name || 'VEDAANT POOLS TECHNOLOGY'}</div>
               <div className="pt-sig-label">Authorised Signatory</div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrintTemplate;
