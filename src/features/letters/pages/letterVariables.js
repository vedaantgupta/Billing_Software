export const replaceVariables = (html, data) => {
  if (!html) return '';
  return html.replace(/{{(.*?)}}/g, (_, key) => {
    return data[key.trim()] || '';
  });
};

// Available variables that the user can pick from
export const availableVariables = [
  { id: 'company-name', label: 'Company Name' },
  { id: 'company-address', label: 'Company Address' },
  { id: 'company-phone', label: 'Company Phone' },
  { id: 'company-email', label: 'Company Email' },
  { id: 'company-website', label: 'Company Website' },
  { id: 'gst-number', label: 'GST Number' },
  { id: 'pan-number', label: 'PAN Number' },
  { id: 'customer-name', label: 'Customer Name' },
  { id: 'mobile', label: 'Customer Mobile' },
  { id: 'email', label: 'Customer Email' },
  { id: 'letter-no', label: 'Letter Number' },
  { id: 'letter-date', label: 'Letter Date' },
];
