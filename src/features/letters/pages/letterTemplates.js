export const letterTemplates = [
  // General
  {
    id: 'blank-document',
    category: 'General',
    title: 'Blank Document',
    content: `<p></p>`
  },
  {
    id: 'spreadsheet',
    category: 'General',
    title: 'Spreadsheet',
    content: `
      <table style="width:100%">
        <tbody>
          <tr>
            <th><p></p></th>
            <th><p></p></th>
            <th><p></p></th>
            <th><p></p></th>
          </tr>
          <tr>
            <td><p></p></td>
            <td><p></p></td>
            <td><p></p></td>
            <td><p></p></td>
          </tr>
          <tr>
            <td><p></p></td>
            <td><p></p></td>
            <td><p></p></td>
            <td><p></p></td>
          </tr>
          <tr>
            <td><p></p></td>
            <td><p></p></td>
            <td><p></p></td>
            <td><p></p></td>
          </tr>
          <tr>
            <td><p></p></td>
            <td><p></p></td>
            <td><p></p></td>
            <td><p></p></td>
          </tr>
          <tr>
            <td><p></p></td>
            <td><p></p></td>
            <td><p></p></td>
            <td><p></p></td>
          </tr>
          <tr>
            <td><p></p></td>
            <td><p></p></td>
            <td><p></p></td>
            <td><p></p></td>
          </tr>
        </tbody>
      </table>
    `
  },
  // Business
  {
    id: 'quotation',
    category: 'Business',
    title: 'Quotation',
    content: `
      <h2 style="text-align: center;">QUOTATION</h2>
      <p>Date: {{letter-date}}</p>
      <p>To,</p>
      <p><strong>{{customer-name}}</strong></p>
      <p>Dear Sir/Madam,</p>
      <p>Thank you for your inquiry. Please find below our quotation for the requested items/services.</p>
      <p>[Insert Table Here]</p>
      <p>Terms & Conditions:</p>
      <ul>
        <li>Validity: 30 Days</li>
        <li>Payment: 100% Advance</li>
      </ul>
      <p>Regards,</p>
      <p><strong>{{company-name}}</strong></p>
    `
  },
  {
    id: 'proforma-invoice-letter',
    category: 'Business',
    title: 'Proforma Invoice Letter',
    content: `
      <h2 style="text-align: center;">PROFORMA INVOICE</h2>
      <p>Date: {{letter-date}}</p>
      <p>To: {{customer-name}}</p>
      <p>Please find attached the proforma invoice for your reference.</p>
      <p>Regards,<br/>{{company-name}}</p>
    `
  },
  {
    id: 'sales-contract',
    category: 'Business',
    title: 'Sales Contract',
    content: `
      <h2 style="text-align: center;">SALES CONTRACT</h2>
      <p>Date: {{letter-date}}</p>
      <p>This agreement is made between <strong>{{company-name}}</strong> (Seller) and <strong>{{customer-name}}</strong> (Buyer).</p>
      <p>Both parties agree to the following terms and conditions regarding the sale of goods/services.</p>
    `
  },
  {
    id: 'payment-reminder',
    category: 'Business',
    title: 'Payment Reminder',
    content: `
      <h2 style="text-align: center;">PAYMENT REMINDER</h2>
      <p>Date: {{letter-date}}</p>
      <p>To: {{customer-name}}</p>
      <p>Dear Sir/Madam,</p>
      <p>This is a gentle reminder that your payment is currently overdue. Please arrange for the payment at your earliest convenience.</p>
      <p>Regards,<br/>{{company-name}}</p>
    `
  },
  // HR
  {
    id: 'offer-letter',
    category: 'HR',
    title: 'Offer Letter',
    content: `
      <h2 style="text-align: center;">OFFER LETTER</h2>
      <p>Date: {{letter-date}}</p>
      <p>To: [Candidate Name]</p>
      <p>We are pleased to offer you the position of [Job Title] at <strong>{{company-name}}</strong>.</p>
      <p>Please review the terms and conditions and sign below to accept this offer.</p>
      <p>Regards,<br/>HR Department, {{company-name}}</p>
    `
  },
  {
    id: 'appointment-letter',
    category: 'HR',
    title: 'Appointment Letter',
    content: `
      <h2 style="text-align: center;">APPOINTMENT LETTER</h2>
      <p>Date: {{letter-date}}</p>
      <p>To: [Employee Name]</p>
      <p>Welcome to <strong>{{company-name}}</strong>. This letter confirms your appointment as [Job Title].</p>
    `
  },
  {
    id: 'experience-letter',
    category: 'HR',
    title: 'Experience Letter',
    content: `
      <h2 style="text-align: center;">EXPERIENCE LETTER</h2>
      <p>Date: {{letter-date}}</p>
      <p>This is to certify that [Employee Name] has worked with <strong>{{company-name}}</strong> from [Start Date] to [End Date] as [Job Title].</p>
      <p>We wish them all the best in their future endeavors.</p>
    `
  },
  // GST / Compliance
  {
    id: 'gst-declaration',
    category: 'GST / Compliance',
    title: 'GST Declaration',
    content: `
      <h2 style="text-align: center;">GST DECLARATION</h2>
      <p>Date: {{letter-date}}</p>
      <p>We, <strong>{{company-name}}</strong>, having GSTIN {{gst-number}}, hereby declare that...</p>
    `
  },
  {
    id: 'noc',
    category: 'GST / Compliance',
    title: 'No Objection Certificate (NOC)',
    content: `
      <h2 style="text-align: center;">NO OBJECTION CERTIFICATE</h2>
      <p>Date: {{letter-date}}</p>
      <p>This is to certify that <strong>{{company-name}}</strong> has no objection regarding...</p>
    `
  },
  // Banking
  {
    id: 'bank-verification',
    category: 'Banking',
    title: 'Bank Verification',
    content: `
      <h2 style="text-align: center;">BANK VERIFICATION LETTER</h2>
      <p>Date: {{letter-date}}</p>
      <p>To The Branch Manager,</p>
      <p>This letter is to request verification for our account details associated with <strong>{{company-name}}</strong>.</p>
    `
  },
  // Logistics
  {
    id: 'dispatch-letter',
    category: 'Logistics',
    title: 'Dispatch Letter',
    content: `
      <h2 style="text-align: center;">DISPATCH LETTER</h2>
      <p>Date: {{letter-date}}</p>
      <p>To: {{customer-name}}</p>
      <p>This is to inform you that your goods have been dispatched. Tracking details are attached.</p>
      <p>Regards,<br/>{{company-name}}</p>
    `
  },
  // Legal
  {
    id: 'authorization-letter',
    category: 'Legal',
    title: 'Authorization Letter',
    content: `
      <h2 style="text-align: center;">AUTHORIZATION LETTER</h2>
      <p>Date: {{letter-date}}</p>
      <p>I, [Your Name], hereby authorize [Authorized Person] to act on behalf of <strong>{{company-name}}</strong> regarding...</p>
    `
  }
];

export const letterCategories = [
  'General',
  'Business',
  'HR',
  'GST / Compliance',
  'Banking',
  'Logistics',
  'Legal'
];
