import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import PrintTemplate from './PrintTemplate';
import { Printer, Copy, X, Send, Download } from 'lucide-react';
import { getDB, getItems } from '../utils/db';
import { useAuth } from '../hooks/useAuth';
import { useEffect } from 'react';
import './PrintViewModal.css';

const PrintViewModal = ({ doc, onClose }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [copies, setCopies] = useState({
    original: true,
    duplicate: false,
    transport: false,
    office: false
  });

  const isSalarySlip = doc?.docType === 'Salary Slip';

  useEffect(() => {
    if (user?.id) {
      getItems('products', user.id).then(setProducts);
    }
  }, [user?.id]);

  if (!doc) return null;

  const handleCopyChange = (key) => {
    setCopies(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getCopyText = (key) => {
    switch (key) {
      case 'original': return 'ORIGINAL FOR RECIPIENT';
      case 'duplicate': return 'DUPLICATE FOR TRANSPORTER';
      case 'transport': return 'TRIPLICATE FOR TRANSPORTER';
      case 'office': return 'QUADRUPLICATE FOR SUPPLIER';
      default: return 'EXTRA COPY';
    }
  };

  const activeCopies = Object.entries(copies).filter(([_, v]) => v).map(([k]) => k);
  if (activeCopies.length === 0) activeCopies.push('original'); // fallback

  const handleWhatsApp = () => {
    const phone = doc.customerPhone || "";
    const cleanPhone = phone.replace(/\D/g, '');
    const message = isSalarySlip 
      ? encodeURIComponent(`Hello ${doc.staffName || 'Employee'},\n\nSharing your Payslip for ${doc.month} ${doc.year}.\n\nTotal Salary: ₹${Number(doc.calculatedSalary).toFixed(2)}\n\nThank you!`)
      : encodeURIComponent(`Hello ${doc.customerName || 'Customer'},\n\nSharing your ${doc.docType || 'Invoice'} #${doc.invoiceNumber} for ₹${Number(doc.total).toFixed(2)}.\n\nThank you!`);
    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const handleEmail = () => {
    const email = doc.customerEmail || "";
    const subject = isSalarySlip 
      ? encodeURIComponent(`Payslip for ${doc.month} ${doc.year} - ${doc.staffName}`)
      : encodeURIComponent(`${doc.docType || 'Invoice'} #${doc.invoiceNumber} from ${user?.firstName || 'Our Company'}`);
    const body = isSalarySlip
      ? encodeURIComponent(`Hello ${doc.staffName || 'Employee'},\n\nPlease find your Payslip for ${doc.month} ${doc.year} attached below.\n\nNet Salary: ₹${Number(doc.calculatedSalary).toFixed(2)}\n\nThank you!`)
      : encodeURIComponent(`Hello ${doc.customerName || 'Customer'},\n\nPlease find the details for your ${doc.docType} below.\n\nTotal Amount: ₹${Number(doc.total).toFixed(2)}\n\nThank you!`);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
  };

  const handleDownload = () => {
    const element = document.querySelector('.pvm-print-render-area');
    if (!element) return;

    if (window.html2pdf) {
      const opt = {
        margin: 0,
        filename: `${doc.invoiceNumber || 'Document'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      // Directly generate and download PDF
      window.html2pdf().set(opt).from(element).save();
    } else {
      // Fallback
      window.print();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="pvm-overlay">
      <div className="pvm-container">
        
        {/* Top Header */}
        <div className="pvm-header print-hide">
          <div className="pvm-title">Print / View Document</div>
          <div className="pvm-header-actions">
             <button className="pvm-btn pvm-btn-cyan" onClick={() => window.open(window.location.href, '_blank')}>
               <Copy size={14} style={{transform: 'scaleX(-1) rotate(-90deg)'}} /> New Tab 
             </button>
             <button className="pvm-btn pvm-btn-blue"><Copy size={14} /> Copy Link</button>
             <button className="pvm-btn-close" onClick={onClose}><X size={16} /></button>
          </div>
        </div>

        {/* Scrollable Document Area */}
        <div className="pvm-body">
           <div className="pvm-print-render-area">
             {activeCopies.map(key => (
               <div key={key} className="pvm-page-wrapper">
                 <PrintTemplate 
                    doc={doc} 
                    company={getDB()?.company} 
                    products={products}
                    type={doc.docType} 
                    copyType={getCopyText(key)} 
                  />
               </div>
             ))}
           </div>
        </div>

        {/* Bottom Footer */}
        <div className="pvm-footer print-hide">
           {!isSalarySlip && (
             <div className="pvm-checkbox-row">
               <label><input type="checkbox" checked={copies.original} onChange={() => handleCopyChange('original')} /> Original</label>
               <label><input type="checkbox" checked={copies.duplicate} onChange={() => handleCopyChange('duplicate')} /> Duplicate</label>
               <label><input type="checkbox" checked={copies.transport} onChange={() => handleCopyChange('transport')} /> Transport</label>
               <label><input type="checkbox" checked={copies.office} onChange={() => handleCopyChange('office')} /> Office</label>
             </div>
           )}
           
           <div className="pvm-actions-row">
             <button className="pvm-action-btn pvm-btn-gray" onClick={onClose}><X size={14} /> Close</button>
             
             <div className="pvm-right-actions">
                <button className="pvm-action-btn pvm-btn-whatsapp" onClick={handleWhatsApp}>
                  <Send size={14} /> Whatsapp
                </button>
                <button className="pvm-action-btn pvm-btn-email" onClick={handleEmail}>
                  <Send size={14} /> Email
                </button>
                <button className="pvm-action-btn pvm-btn-sms" onClick={() => alert('SMS feature coming soon')}>
                  <Send size={14} /> SMS
                </button>
                <button className="pvm-action-btn pvm-btn-download" onClick={handleDownload}>
                  <Download size={14} /> Download
                </button>
                <button className="pvm-action-btn pvm-btn-print" onClick={handlePrint}>
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

export default PrintViewModal;
