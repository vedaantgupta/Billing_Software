export const letterTemplates = [
  // General
  {
    id: 'blank-document',
    category: 'General',
    title: 'Blank Document',
    content: `<p>Start typing your document here...</p>`
  },
  {
    id: 'formal-letterhead',
    category: 'General',
    title: 'Formal Business Letterhead',
    content: `
      <div style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 26px; color: #0f172a; letter-spacing: 0.5px;">{{company-name}}</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">
          {{company-address}} | Phone: {{company-phone}} | Email: {{company-email}}
        </p>
        <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">
          <strong>GSTIN:</strong> {{gst-number}} &nbsp;|&nbsp; <strong>PAN:</strong> {{pan-number}}
        </p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 14px;">
        <div><strong>Ref No:</strong> {{letter-no}}</div>
        <div><strong>Date:</strong> {{letter-date}}</div>
      </div>

      <div style="margin-bottom: 20px; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0;"><strong>To,</strong></p>
        <p style="margin: 0; font-weight: bold;">{{customer-name}}</p>
        <p style="margin: 0;">Contact: {{mobile}}</p>
        <p style="margin: 0;">Email: {{email}}</p>
      </div>

      <p style="font-size: 15px; font-weight: bold; margin: 20px 0 16px; text-decoration: underline;">
        Subject: Formal Business Communication
      </p>

      <p style="font-size: 14px; line-height: 1.8;">Dear Sir/Madam,</p>

      <p style="font-size: 14px; line-height: 1.8;">
        We are pleased to address this formal communication from <strong>{{company-name}}</strong>. Please enter the main body of your letter here detailing the key points, agreements, or requests.
      </p>

      <p style="font-size: 14px; line-height: 1.8;">
        Should you have any inquiries or require further information, please feel free to reach out directly to our office via phone at <strong>{{company-phone}}</strong> or email at <strong>{{company-email}}</strong>.
      </p>

      <div style="margin-top: 50px; font-size: 14px;">
        <p style="margin: 0;">Yours faithfully,</p>
        <p style="margin: 4px 0 0; font-weight: bold;">For {{company-name}}</p>
        <div style="height: 60px;"></div>
        <p style="margin: 0; border-top: 1px solid #94a3b8; display: inline-block; padding-top: 4px; font-weight: bold;">
          Authorized Signatory
        </p>
      </div>
    `
  },
  {
    id: 'spreadsheet',
    category: 'General',
    title: 'Spreadsheet Table',
    content: `
      <table style="width:100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="border: 1px solid #cbd5e1; padding: 8px;">Sr No.</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px;">Description</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px;">Qty</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px;">Rate (₹)</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">1</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Item Description</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">1</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">0.00</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">0.00</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">2</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Item Description</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">1</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">0.00</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">0.00</td>
          </tr>
        </tbody>
      </table>
    `
  },

  // Business
  {
    id: 'quotation-proposal',
    category: 'Business',
    title: 'Commercial Quotation Proposal',
    content: `
      <div style="text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #0369a1;">{{company-name}}</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">{{company-address}} | Contact: {{company-phone}}</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: #0284c7; font-weight: bold;">GSTIN: {{gst-number}}</p>
      </div>

      <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 12px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; font-size: 14px;">
          <div><strong>Quotation Ref:</strong> {{letter-no}}</div>
          <div><strong>Date:</strong> {{letter-date}}</div>
          <div><strong>Valid Until:</strong> 30 Days</div>
        </div>
      </div>

      <p><strong>To:</strong><br/>
      <strong>{{customer-name}}</strong><br/>
      Phone: {{mobile}} | Email: {{email}}</p>

      <p><strong>Subject: Commercial Quotation for Supply of Goods / Services</strong></p>

      <p>Dear Sir/Madam,</p>
      <p>Thank you for your valuable inquiry. We are pleased to submit our most competitive quotation as follows:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <thead>
          <tr style="background: #e0f2fe; color: #0369a1;">
            <th style="border: 1px solid #cbd5e1; padding: 8px;">#</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Item Description</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px;">Qty</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">Unit Price (₹)</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">1</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Product / Service Name</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">1</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">10,000.00</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">10,000.00</td>
          </tr>
        </tbody>
      </table>

      <p><strong>Commercial Terms & Conditions:</strong></p>
      <ol style="font-size: 13px; line-height: 1.7; color: #334155;">
        <li>Taxes: GST applicable as per government norms.</li>
        <li>Payment Terms: 100% advance or 30 days credit upon order confirmation.</li>
        <li>Delivery: Within 7-10 working days from date of purchase order.</li>
        <li>Freight & Transit Insurance: Extra at actuals unless specified otherwise.</li>
      </ol>

      <div style="margin-top: 40px;">
        <p style="margin: 0;">For <strong>{{company-name}}</strong></p>
        <div style="height: 50px;"></div>
        <p style="margin: 0; font-weight: bold;">Authorized Signatory</p>
      </div>
    `
  },
  {
    id: 'payment-reminder',
    category: 'Business',
    title: 'Outstanding Payment Demand Letter',
    content: `
      <div style="text-align: center; border-bottom: 2px solid #ef4444; padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #b91c1c;">{{company-name}}</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">{{company-address}} | Contact: {{company-phone}}</p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px;">
        <div><strong>Ref:</strong> {{letter-no}}</div>
        <div><strong>Date:</strong> {{letter-date}}</div>
      </div>

      <p><strong>To,</strong><br/>
      <strong>{{customer-name}}</strong><br/>
      Phone: {{mobile}}</p>

      <p style="font-weight: bold; color: #b91c1c; text-decoration: underline;">
        SUBJECT: DEMAND NOTICE FOR OVERDUE PAYMENT SETTLEMENT
      </p>

      <p>Dear Valued Client,</p>

      <p>
        We are writing to draw your urgent attention to the outstanding balance pending in your account against our previously submitted invoices. Despite previous reminders, we have not yet received payment.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <thead>
          <tr style="background: #fee2e2; color: #991b1b;">
            <th style="border: 1px solid #fca5a5; padding: 8px;">Invoice No.</th>
            <th style="border: 1px solid #fca5a5; padding: 8px;">Invoice Date</th>
            <th style="border: 1px solid #fca5a5; padding: 8px; text-align: right;">Total Amount (₹)</th>
            <th style="border: 1px solid #fca5a5; padding: 8px; text-align: right;">Overdue (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #fca5a5; padding: 8px; text-align: center;">INV-001</td>
            <td style="border: 1px solid #fca5a5; padding: 8px; text-align: center;">{{letter-date}}</td>
            <td style="border: 1px solid #fca5a5; padding: 8px; text-align: right;">25,000.00</td>
            <td style="border: 1px solid #fca5a5; padding: 8px; text-align: right; font-weight: bold; color: #b91c1c;">25,000.00</td>
          </tr>
        </tbody>
      </table>

      <p>
        Kindly arrange for the immediate transfer of the overdue amount via NEFT/RTGS/UPI to our bank account within 3 business days of receiving this notice. If payment has already been dispatched, please share the transaction reference details.
      </p>

      <div style="margin-top: 40px;">
        <p style="margin: 0;">Sincerely,</p>
        <p style="margin: 4px 0 0; font-weight: bold;">Accounts & Finance Department</p>
        <p style="margin: 0; font-weight: bold;">{{company-name}}</p>
      </div>
    `
  },

  // HR
  {
    id: 'appointment-letter',
    category: 'HR',
    title: 'Formal Appointment Letter',
    content: `
      <div style="text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #3730a3;">{{company-name}}</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">{{company-address}} | {{company-email}}</p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px;">
        <div><strong>Ref:</strong> HR/APPT/{{letter-no}}</div>
        <div><strong>Date:</strong> {{letter-date}}</div>
      </div>

      <p><strong>To,</strong><br/>
      <strong>[Employee Name]</strong><br/>
      Address: [Candidate Address]<br/>
      Phone: {{mobile}}</p>

      <p style="font-weight: bold; text-decoration: underline;">
        SUBJECT: LETTER OF APPOINTMENT AS [JOB TITLE]
      </p>

      <p>Dear [Employee Name],</p>

      <p>
        We are pleased to appoint you to the position of <strong>[Job Title]</strong> at <strong>{{company-name}}</strong>. Your employment shall commence on <strong>[Joining Date]</strong>.
      </p>

      <p><strong>Terms and Conditions of Employment:</strong></p>
      <ul style="line-height: 1.8; font-size: 14px;">
        <li><strong>Compensation:</strong> Your annual Cost to Company (CTC) will be ₹ [Salary Amount] per annum.</li>
        <li><strong>Probation Period:</strong> You will be on probation for a period of [3 / 6] months from your date of joining.</li>
        <li><strong>Place of Work:</strong> Your primary location of posting will be at our office in {{company-address}}.</li>
        <li><strong>Notice Period:</strong> Following probation, employment may be terminated by either party with [30] days written notice or gross salary in lieu thereof.</li>
      </ul>

      <p>We welcome you to our organization and look forward to a successful and productive association.</p>

      <div style="display: flex; justify-content: space-between; margin-top: 50px;">
        <div>
          <p style="margin: 0; font-weight: bold;">For {{company-name}}</p>
          <div style="height: 50px;"></div>
          <p style="margin: 0; font-weight: bold;">Authorized HR Signatory</p>
        </div>
        <div>
          <p style="margin: 0; font-weight: bold;">Candidate Acceptance</p>
          <div style="height: 50px;"></div>
          <p style="margin: 0; font-weight: bold;">Signature & Date</p>
        </div>
      </div>
    `
  },
  {
    id: 'experience-letter',
    category: 'HR',
    title: 'Experience & Relieving Certificate',
    content: `
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 25px;">
        <h1 style="margin: 0; font-size: 26px; color: #0f172a;">{{company-name}}</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">{{company-address}} | Contact: {{company-phone}}</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: #64748b;">GSTIN: {{gst-number}}</p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 14px;">
        <div><strong>Certificate No:</strong> EXP-{{letter-no}}</div>
        <div><strong>Date of Issue:</strong> {{letter-date}}</div>
      </div>

      <h2 style="text-align: center; font-size: 20px; letter-spacing: 1px; margin-bottom: 25px; text-decoration: underline;">
        TO WHOMSOEVER IT MAY CONCERN
      </h2>

      <p style="font-size: 15px; line-height: 2;">
        This is to certify that <strong>Mr./Ms. [Employee Name]</strong> was employed with <strong>{{company-name}}</strong> from <strong>[Start Date]</strong> to <strong>[Relieving Date]</strong>. At the time of relieving, their designation was <strong>[Job Title]</strong> in our <strong>[Department Name]</strong>.
      </p>

      <p style="font-size: 15px; line-height: 2;">
        During their tenure with us, we found them to be sincere, dedicated, and hardworking with high professional integrity. They have fulfilled all operational handover formalities and have been relieved from their duties with effect from the close of business hours on <strong>[Relieving Date]</strong>.
      </p>

      <p style="font-size: 15px; line-height: 2;">
        We wish them all the very best in their future career endeavors.
      </p>

      <div style="margin-top: 60px;">
        <p style="margin: 0; font-weight: bold;">For {{company-name}}</p>
        <div style="height: 60px;"></div>
        <p style="margin: 0; font-weight: bold;">Human Resources Department</p>
        <p style="margin: 0; font-size: 12px; color: #64748b;">Authorized Signatory</p>
      </div>
    `
  },

  // GST / Compliance
  {
    id: 'gst-declaration',
    category: 'GST / Compliance',
    title: 'GST / TDS Declaration Certificate',
    content: `
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px;">{{company-name}}</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">{{company-address}}</p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px;">
        <div><strong>Ref:</strong> GST/DECL/{{letter-no}}</div>
        <div><strong>Date:</strong> {{letter-date}}</div>
      </div>

      <h2 style="text-align: center; font-size: 18px; margin-bottom: 20px; text-decoration: underline;">
        DECLARATION UNDER GST / TAX COMPLIANCE
      </h2>

      <p style="font-size: 14px; line-height: 1.8;">
        We, <strong>{{company-name}}</strong>, having our principal place of business at {{company-address}}, hereby declare and confirm as follows:
      </p>

      <ol style="font-size: 14px; line-height: 1.8;">
        <li>Our Goods and Services Tax Identification Number (GSTIN) is <strong>{{gst-number}}</strong>.</li>
        <li>Our Permanent Account Number (PAN) is <strong>{{pan-number}}</strong>.</li>
        <li>We have regularly filed all our applicable GST returns (GSTR-1, GSTR-3B) and deposited taxes within statutory due dates.</li>
        <li>All supplies invoiced by us are genuine and duly reported in our GSTR-1, allowing eligible Input Tax Credit (ITC) to reflect in GSTR-2B.</li>
      </ol>

      <p style="margin-top: 40px; font-size: 14px;">
        For <strong>{{company-name}}</strong>
      </p>
      <div style="height: 50px;"></div>
      <p style="margin: 0; font-weight: bold;">Authorized Signatory / Partner / Director</p>
    `
  },
  {
    id: 'dispatch-authorization',
    category: 'Logistics',
    title: 'Material Dispatch & Gate Pass Letter',
    content: `
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px;">{{company-name}}</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">{{company-address}}</p>
      </div>

      <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px;">
        <div><strong>Gate Pass / Challan Ref:</strong> {{letter-no}}</div>
        <div><strong>Date:</strong> {{letter-date}}</div>
      </div>

      <p><strong>To: The Security / In-Charge</strong><br/>
      <strong>Receiver: {{customer-name}}</strong><br/>
      Phone: {{mobile}}</p>

      <p><strong>SUBJECT: MATERIAL DISPATCH AUTHORIZATION</strong></p>

      <p>Please permit the dispatch and transport of the following materials:</p>

      <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="border: 1px solid #cbd5e1; padding: 8px;">Sr.</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Material Description</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px;">Quantity</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px;">Vehicle / LR No.</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">1</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px;">Material description</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">[Qty]</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">[Vehicle No]</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 40px; display: flex; justify-content: space-between;">
        <div>
          <p style="margin: 0; font-weight: bold;">Prepared By</p>
        </div>
        <div>
          <p style="margin: 0; font-weight: bold;">Authorized By ({{company-name}})</p>
        </div>
      </div>
    `
  }
];

export const letterCategories = [
  'General',
  'Business',
  'HR',
  'GST / Compliance',
  'Logistics'
];
