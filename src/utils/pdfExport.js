import html2pdf from 'html2pdf.js';

export const exportPDF = (element, filename = 'document.pdf', margins = 'normal', orientation = 'portrait', pageSize = 'letter') => {
  let pdfMargin = 25.4; // Default 1 inch
  if (margins === 'narrow') {
    pdfMargin = 12.7;
  } else if (margins === 'moderate') {
    pdfMargin = [25.4, 19.1, 25.4, 19.1]; // top, left, bottom, right
  } else if (margins === 'wide') {
    pdfMargin = [25.4, 50.8, 25.4, 50.8];
  }

  const opt = {
    margin:       pdfMargin,
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: pageSize, orientation: orientation }
  };
  html2pdf().set(opt).from(element).save();
};
