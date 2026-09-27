import html2pdf from 'html2pdf.js';

export const exportPDF = async (element, filename = 'document.pdf', margins = 'normal', orientation = 'portrait', pageSize = 'a4') => {
  if (!element) {
    console.error('exportPDF: No element provided for PDF generation');
    return false;
  }

  let pdfMargin = 0; // Default to 0 for designed A4 sheets with internal padding
  if (margins === 'normal') {
    pdfMargin = 0; // Seamless fit for custom styled sheets
  } else if (margins === 'standard') {
    pdfMargin = 10;
  } else if (margins === 'narrow') {
    pdfMargin = 5;
  } else if (margins === 'wide') {
    pdfMargin = 20;
  } else if (typeof margins === 'number' || Array.isArray(margins)) {
    pdfMargin = margins;
  }

  const opt = {
    margin: pdfMargin,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollY: 0,
      scrollX: 0,
      logging: false,
      letterRendering: true
    },
    jsPDF: {
      unit: 'mm',
      format: pageSize,
      orientation: orientation
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy']
    }
  };

  try {
    const pdfLib = (typeof window !== 'undefined' && window.html2pdf) ? window.html2pdf : html2pdf;
    await pdfLib().set(opt).from(element).save();
    return true;
  } catch (err) {
    console.error('Failed to export PDF via html2pdf:', err);
    // Fallback: trigger browser print
    window.print();
    return false;
  }
};

export default exportPDF;
