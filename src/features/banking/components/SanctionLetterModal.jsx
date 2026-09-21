import React from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, Download, ShieldCheck, CheckSquare, FileText } from 'lucide-react';
import { getDB } from '@/utils/db';

const SanctionLetterModal = ({ application, onClose }) => {
  if (!application) return null;

  const company = getDB()?.company || {
    name: 'Enterprise Lending & Finance Corp',
    address: 'Corporate Towers, Nariman Point, Mumbai - 400021',
    gstin: '27AABCU9603R1ZM'
  };

  const handlePrint = () => {
    window.print();
  };

  const refNumber = `SANC/${new Date().getFullYear()}/${(application.applicationNumber || 'APP').slice(-6)}`;
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const principal = parseFloat(application.requestedAmount) || 0;
  const rate = parseFloat(application.interestRate) || 12.0;
  const tenure = application.tenure || 24;
  const processingFee = Math.round(principal * 0.015);

  return createPortal(
    <div className="pvm-overlay" style={{ zIndex: 10000 }}>
      <div className="pvm-container" style={{ maxWidth: '850px', background: '#f1f5f9' }}>
        {/* Modal Actions Bar (hidden in print) */}
        <div className="pvm-header print-hide" style={{ background: 'white', padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
          <div className="pvm-title" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} color="#4f46e5" /> Formal Sanction Letter & Loan Agreement
          </div>
          <div className="pvm-header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button className="btn btn-primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} /> Print / Save as PDF
            </button>
            <button className="btn-icon" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="pvm-body" style={{ padding: '2rem' }}>
          <div id="sanction-letter-content" style={{
            background: 'white',
            padding: '3rem',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            fontFamily: 'serif',
            color: '#1e293b',
            lineHeight: '1.6'
          }}>
            {/* Header / Letterhead */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, color: '#0f172a', fontFamily: 'sans-serif' }}>
                  {company.name || 'Enterprise Lending Group'}
                </h1>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px', fontFamily: 'sans-serif' }}>
                  {company.address || 'Corporate Financial Center, India'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'sans-serif' }}>
                  GSTIN: {company.gstin || '27AABCU9603R1ZM'} • Reg No: NBFC/2026/8892
                </div>
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'sans-serif' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5' }}>LETTER OF SANCTION</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>Ref: {refNumber}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Date: {dateStr}</div>
              </div>
            </div>

            {/* Recipient */}
            <div style={{ marginBottom: '1.5rem', fontFamily: 'sans-serif' }}>
              <div style={{ fontSize: '0.9rem', color: '#64748b' }}>To,</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{application.applicantName}</div>
              <div style={{ fontSize: '0.9rem', color: '#475569' }}>Phone: {application.contactPhone}</div>
              {application.contactEmail && <div style={{ fontSize: '0.85rem', color: '#475569' }}>Email: {application.contactEmail}</div>}
            </div>

            {/* Subject */}
            <div style={{
              background: '#f8fafc',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '0.95rem',
              marginBottom: '1.5rem',
              fontFamily: 'sans-serif',
              borderLeft: '4px solid #4f46e5'
            }}>
              Subject: In-Principle Sanction of {application.loanCategory?.toUpperCase() || 'PERSONAL'} LOAN FACILITY of ₹{principal.toLocaleString('en-IN')}
            </div>

            {/* Letter Body */}
            <p style={{ fontSize: '0.95rem', marginBottom: '1.25rem' }}>
              Dear Sir/Madam,<br />
              We are pleased to inform you that with reference to your loan application <strong>#{application.applicationNumber}</strong>, 
              the competent credit underwriting authority has approved the sanction of credit facility as per the key terms and conditions set forth below:
            </p>

            {/* Key Terms Table */}
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              fontFamily: 'sans-serif'
            }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.6rem 0', color: '#64748b', width: '40%' }}>Sanctioned Principal Amount</td>
                  <td style={{ padding: '0.6rem 0', fontWeight: 700, color: '#0f172a' }}>₹{principal.toLocaleString('en-IN')} (Rupees {principal.toLocaleString('en-IN')} only)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.6rem 0', color: '#64748b' }}>Facility Type</td>
                  <td style={{ padding: '0.6rem 0', fontWeight: 600, textTransform: 'capitalize' }}>{application.loanCategory} Credit Facility</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.6rem 0', color: '#64748b' }}>Rate of Interest</td>
                  <td style={{ padding: '0.6rem 0', fontWeight: 600 }}>{rate}% Per Annum ({application.interestMethod || 'Reducing Balance'})</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.6rem 0', color: '#64748b' }}>Tenure</td>
                  <td style={{ padding: '0.6rem 0', fontWeight: 600 }}>{tenure} Months</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.6rem 0', color: '#64748b' }}>Repayment Mode</td>
                  <td style={{ padding: '0.6rem 0', fontWeight: 600 }}>Equated Monthly Installments (NACH / Auto-Debit / Direct Transfer)</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '0.6rem 0', color: '#64748b' }}>Processing & Verification Fee</td>
                  <td style={{ padding: '0.6rem 0', fontWeight: 600 }}>₹{processingFee.toLocaleString('en-IN')} + Applicable Taxes</td>
                </tr>
              </tbody>
            </table>

            {/* Conditions Precedent */}
            <div style={{ marginBottom: '2rem', fontSize: '0.85rem', color: '#475569' }}>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem', fontFamily: 'sans-serif' }}>
                Key Conditions Precedent to Disbursement:
              </div>
              <ul style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>Execution of formal Loan Agreement and Promissory Note by the borrower.</li>
                <li>Submission of verified KYC documents and bank mandate authentication.</li>
                <li>Clear title and hypothecation registration where collateral/security is applicable.</li>
                <li>This sanction letter is valid for 30 calendar days from the date of issue.</li>
              </ul>
            </div>

            {/* Signatures */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #cbd5e1', fontFamily: 'sans-serif' }}>
              <div>
                <div style={{ height: '40px' }}></div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Authorized Signatory</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>For {company.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ height: '40px' }}></div>
                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>Borrower's Acceptance</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>I accept all terms & conditions unconditionally</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SanctionLetterModal;
