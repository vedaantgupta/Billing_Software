import React from 'react';
import { createPortal } from 'react-dom';
import LoanPrintTemplate from './LoanPrintTemplate';
import { Printer, X, Download, Send } from 'lucide-react';
import { getDB } from '../utils/db';
import './PrintViewModal.css';

const LoanPrintModal = ({ loan, contact, onClose }) => {
  if (!loan || !contact) return null;

  const company = getDB()?.company;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const element = document.getElementById('loan-print-root');
    if (!element) return;

    const contactName = contact.companyName || contact.contactName || contact.name || 'Contact';

    if (window.html2pdf) {
      const opt = {
        margin: [0, 0, 0, 0],
        filename: `Loan_Statement_${contactName}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy']
        }
      };

      window.html2pdf().set(opt).from(element).save();
    } else {
      window.print();
    }
  };

  const handleWhatsApp = () => {
    const phone = contact.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    const name = contact.companyName || contact.contactName || contact.name || 'Customer';
    
    // Balance calc
    const totalPayable = loan.emi * (loan.tenure || 0);
    const repaid = loan.repaidAmount || 0;
    const balance = totalPayable - repaid;

    const message = encodeURIComponent(
      `Hello ${name},\n\nPlease find your Loan Account Statement as of ${new Date().toLocaleDateString(
        'en-IN'
      )}.\n\nOutstanding Balance: ₹${balance.toLocaleString('en-IN', {
        minimumFractionDigits: 2
      })}\n\nFor any queries, please contact us.\n\nThank you!`
    );

    const url = cleanPhone
      ? `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(url, '_blank');
  };

  return createPortal(
    <div className="pvm-overlay">
      <div className="pvm-container">

        {/* Header */}
        <div className="pvm-header print-hide">
          <div className="pvm-title">
            🧾 Loan Statement — {contact.companyName || contact.contactName || contact.name}
          </div>
          <div className="pvm-header-actions">
            <button className="pvm-btn-close" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="pvm-body">
          <div className="pvm-print-render-area">
            <div className="pvm-page-wrapper">

              {/* ✅ ONLY THIS PART WILL EXPORT */}
              <div id="loan-print-root">
                <LoanPrintTemplate
                  loan={loan}
                  contact={contact}
                  company={company}
                />
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pvm-footer print-hide">
          <div className="pvm-actions-row">
            <button className="pvm-action-btn pvm-btn-gray" onClick={onClose}>
              <X size={14} /> Close
            </button>

            <div className="pvm-right-actions">
              <button
                className="pvm-action-btn pvm-btn-whatsapp"
                onClick={handleWhatsApp}
              >
                <Send size={14} /> WhatsApp
              </button>

              <button
                className="pvm-action-btn pvm-btn-download"
                onClick={handleDownload}
              >
                <Download size={14} /> Download PDF
              </button>

              <button
                className="pvm-action-btn pvm-btn-print"
                onClick={handlePrint}
              >
                <Printer size={14} /> Print
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default LoanPrintModal;
