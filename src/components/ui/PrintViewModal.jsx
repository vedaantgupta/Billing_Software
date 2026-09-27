import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import PrintTemplate from '@/features/letters/components/PrintTemplate';
import { Printer, Copy, X, Send, Download, Check, ExternalLink } from 'lucide-react';
import { getDB, getItems } from '@/utils/db';
import { useAuth } from '@/hooks/useAuth';
import '@/components/ui/PrintViewModal.css';

const PrintViewModal = ({ doc, onClose }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [copies, setCopies] = useState({
    original: true,
    duplicate: false,
    transport: false,
    office: false
  });

  const isSalarySlip = doc?.docType === 'Salary Slip';
  const isPaymentReceipt = doc?.docType === 'Payment In';

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

  const getFileName = () => {
    const rawNo = doc.invoiceNumber || doc.fullReceiptNo || doc.invoiceDetail?.invoiceNo || doc.offerDetail?.offerNo || 'Document';
    const cleanNo = String(rawNo).replace(/[\/\\?%*:|"<>]/g, '-');
    return `${doc.docType || 'Document'}_${cleanNo}.pdf`;
  };

  // Helper to generate a PDF Blob using html2pdf
  const generatePdfBlob = async () => {
    const element = document.querySelector('.pvm-print-render-area');
    if (!element || !window.html2pdf) return null;

    const opt = {
      margin: 0,
      filename: getFileName(),
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      const blob = await window.html2pdf().set(opt).from(element).outputPdf('blob');
      return blob;
    } catch (err) {
      console.warn('PDF blob generation error:', err);
      return null;
    }
  };

  // WhatsApp Send (with Web Share API file attachment or auto-download fallback)
  const handleWhatsApp = async () => {
    const phone = doc.customerPhone || doc.vendorPhone || doc.customerInfo?.phoneNo || doc.vendorInfo?.phoneNo || "";
    const cleanPhone = phone.replace(/\D/g, '');
    const fileName = getFileName();
    const docNumber = doc.invoiceNumber || doc.fullReceiptNo || doc.offerDetail?.offerNo || 'Document';
    const partyName = doc.customerName || doc.vendorName || doc.customerInfo?.ms || doc.vendorInfo?.ms || 'Valued Party';
    const totalAmt = Number(doc.total || doc.grandTotal || doc.amount || 0).toFixed(2);

    const messageText = isSalarySlip
      ? `Hello ${doc.staffName || 'Employee'},\n\nSharing your Payslip for ${doc.month} ${doc.year}.\nTotal Salary: ₹${Number(doc.calculatedSalary || 0).toFixed(2)}\n\nThank you!`
      : `Hello ${partyName},\n\nSharing your ${doc.docType || 'Invoice'} #${docNumber} for ₹${totalAmt}.\n\nThank you!`;

    setIsGeneratingPdf(true);
    setStatusMessage('Preparing document...');

    try {
      const blob = await generatePdfBlob();
      if (blob && navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: fileName,
            text: messageText,
            files: [file]
          });
          setIsGeneratingPdf(false);
          setStatusMessage('');
          return;
        }
      }

      // Fallback for Desktop WhatsApp Web: Auto-download the PDF so user can attach it immediately
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }

      const waMsg = encodeURIComponent(`${messageText}\n\n(Attached PDF document: ${fileName} downloaded to your device)`);
      const waUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${waMsg}`
        : `https://wa.me/?text=${waMsg}`;
      window.open(waUrl, '_blank');
    } catch (e) {
      console.warn('WhatsApp share fallback:', e);
      const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}` : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
      window.open(waUrl, '_blank');
    } finally {
      setIsGeneratingPdf(false);
      setStatusMessage('');
    }
  };

  // Email Send (auto-downloads PDF attachment and opens Gmail compose)
  const handleEmail = async () => {
    const email = doc.customerEmail || doc.vendorEmail || doc.customerInfo?.email || doc.vendorInfo?.email || "";
    const fileName = getFileName();
    const docNumber = doc.invoiceNumber || doc.fullReceiptNo || doc.offerDetail?.offerNo || 'Document';
    const partyName = doc.customerName || doc.vendorName || doc.customerInfo?.ms || doc.vendorInfo?.ms || 'Valued Customer';
    const totalAmt = Number(doc.total || doc.grandTotal || doc.amount || 0).toFixed(2);

    const subject = encodeURIComponent(`${doc.docType || 'Document'} #${docNumber} from ${user?.firstName || 'Our Company'}`);
    const body = encodeURIComponent(`Hello ${partyName},\n\nPlease find your ${doc.docType || 'Invoice'} #${docNumber} attached.\n\nTotal Amount: ₹${totalAmt}\n\n(The PDF file "${fileName}" has been downloaded to your system for attachment.)\n\nThank you!`);

    setIsGeneratingPdf(true);
    try {
      const blob = await generatePdfBlob();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (e) {}
    setIsGeneratingPdf(false);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank');
  };

  // SMS Handler
  const handleSMS = () => {
    const phone = doc.customerPhone || doc.vendorPhone || doc.customerInfo?.phoneNo || doc.vendorInfo?.phoneNo || "";
    const cleanPhone = phone.replace(/\D/g, '');
    const docNumber = doc.invoiceNumber || doc.fullReceiptNo || 'Doc';
    const totalAmt = Number(doc.total || doc.grandTotal || doc.amount || 0).toFixed(2);
    const smsText = encodeURIComponent(`Invoice #${docNumber} for Rs. ${totalAmt} generated. Thank you for your business!`);

    if (cleanPhone) {
      window.open(`sms:${cleanPhone}?body=${smsText}`, '_blank');
    } else {
      navigator.clipboard?.writeText(decodeURIComponent(smsText));
      alert('SMS text copied to clipboard (no customer phone number recorded).');
    }
  };

  // New Tab Handler: Opens a clean printable document in a new browser window/tab
  const handleOpenNewTab = () => {
    const renderArea = document.querySelector('.pvm-print-render-area');
    if (!renderArea) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to open the document in a new tab.');
      return;
    }

    // Collect all stylesheets from the current document
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('\n');

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${doc.invoiceNumber || 'Document'} - Print View</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          ${styles}
          <style>
            body {
              background: #f1f5f9;
              margin: 0;
              padding: 20px 0;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .pvm-print-render-area {
              display: flex;
              flex-direction: column;
              gap: 20px;
            }
            .top-toolbar {
              position: fixed;
              top: 10px;
              right: 20px;
              z-index: 1000;
              display: flex;
              gap: 10px;
            }
            .toolbar-btn {
              padding: 8px 16px;
              border: none;
              border-radius: 6px;
              font-weight: 600;
              cursor: pointer;
              background: #2563eb;
              color: white;
              font-size: 13px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            @media print {
              .top-toolbar { display: none !important; }
              body { background: white !important; padding: 0 !important; }
            }
          </style>
        </head>
        <body>
          <div class="top-toolbar">
            <button class="toolbar-btn" onclick="window.print()">Print Document</button>
            <button class="toolbar-btn" style="background:#475569;" onclick="window.close()">Close</button>
          </div>
          <div class="pvm-print-render-area">
            ${renderArea.innerHTML}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Copy Link Handler
  const handleCopyLink = () => {
    const docNumber = doc.invoiceNumber || doc.fullReceiptNo || doc.id || '';
    const shareUrl = `${window.location.origin}/documents?search=${encodeURIComponent(docNumber)}`;
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleDownload = () => {
    const element = document.querySelector('.pvm-print-render-area');
    if (!element) return;

    if (window.html2pdf) {
      const opt = {
        margin: 0,
        filename: getFileName(),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollX: 0,
          scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      window.html2pdf().set(opt).from(element).save();
    } else {
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
          <div className="pvm-title">
            Print / View Document {isGeneratingPdf && <span style={{ fontSize: '12px', color: '#0284c7', marginLeft: '10px' }}>({statusMessage})</span>}
          </div>
          <div className="pvm-header-actions">
            <button className="pvm-btn pvm-btn-cyan" onClick={handleOpenNewTab} title="Open document in a dedicated new tab">
              <ExternalLink size={14} /> New Tab
            </button>
            <button className="pvm-btn pvm-btn-blue" onClick={handleCopyLink} title="Copy document reference link">
              {copiedLink ? <Check size={14} color="#a7f3d0" /> : <Copy size={14} />} {copiedLink ? 'Copied!' : 'Copy Link'}
            </button>
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
          {!isSalarySlip && !isPaymentReceipt && (
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
              <button className="pvm-action-btn pvm-btn-whatsapp" onClick={handleWhatsApp} disabled={isGeneratingPdf}>
                <Send size={14} /> WhatsApp
              </button>
              <button className="pvm-action-btn pvm-btn-email" onClick={handleEmail} disabled={isGeneratingPdf}>
                <Send size={14} /> Email
              </button>
              <button className="pvm-action-btn pvm-btn-sms" onClick={handleSMS}>
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
