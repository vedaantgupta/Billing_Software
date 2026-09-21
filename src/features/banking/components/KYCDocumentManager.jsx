import React, { useState } from 'react';
import { 
  FileText, Upload, CheckCircle, AlertTriangle, XCircle, 
  Eye, Download, RefreshCw, Shield, Sparkles, Check, X
} from 'lucide-react';

const DOC_TYPES = [
  'Identity Proof (PAN / Aadhaar / Passport)',
  'Address Proof (Utility Bill / Rent Agreement)',
  'Income Proof (Salary Slips / Form 16)',
  'Bank Statement (Last 6 Months)',
  'Business Registration / GST Certificate',
  'Collateral Ownership Deed / Title Documents',
  'Guarantor Identity & Undertaking'
];

const KYCDocumentManager = ({ 
  documents = [], 
  onAddDocument, 
  onUpdateStatus, 
  readOnly = false 
}) => {
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [docNumber, setDocNumber] = useState('');
  const [fileName, setFileName] = useState('');
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [showOcrReview, setShowOcrReview] = useState(false);

  // Simulated AI/OCR Extraction
  const handleSimulateUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setOcrScanning(true);

    setTimeout(() => {
      // Generate realistic extracted OCR payload
      const mockExtracted = {
        detectedType: docType.includes('PAN') ? 'PAN Card' : docType.includes('Aadhaar') ? 'Aadhaar Card' : 'Bank Statement',
        documentNumber: docType.includes('PAN') ? 'ABCDE' + Math.floor(1000 + Math.random() * 9000) + 'F' : '9876 5432 1098',
        nameOnDoc: 'RAHUL SHARMA',
        dobOrRegDate: '1988-06-15',
        address: 'Flat 402, Sunshine Heights, MG Road, Mumbai - 400050',
        confidenceScore: '96.8%'
      };

      setDocNumber(mockExtracted.documentNumber);
      setOcrResult(mockExtracted);
      setOcrScanning(false);
      setShowOcrReview(true);
    }, 1200);
  };

  const handleConfirmAddDoc = () => {
    if (!fileName && !docNumber) {
      alert('Please provide document details or upload a file.');
      return;
    }

    const newDoc = {
      id: Date.now().toString(),
      type: docType,
      documentNumber: docNumber || ocrResult?.documentNumber || 'REF-' + Date.now().toString().slice(-6),
      fileName: fileName || 'Scanned_Doc.pdf',
      uploadedAt: new Date().toISOString().split('T')[0],
      status: 'pending_review', // 'verified', 'pending_review', 'rejected'
      ocrExtracted: ocrResult || null,
      notes: ''
    };

    onAddDocument && onAddDocument(newDoc);
    setDocNumber('');
    setFileName('');
    setOcrResult(null);
    setShowOcrReview(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Upload & OCR Bar (Staff workspace) */}
      {!readOnly && (
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem'
        }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={16} color="#4f46e5" />
            Upload Document with Smart OCR Verification
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
            <div className="lp-field">
              <label>Document Category</label>
              <select value={docType} onChange={e => setDocType(e.target.value)}>
                {DOC_TYPES.map((t, i) => <option key={i} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="lp-field">
              <label>Document / ID Number</label>
              <input 
                placeholder="e.g. ABCDE1234F" 
                value={docNumber} 
                onChange={e => setDocNumber(e.target.value)} 
              />
            </div>

            <div className="lp-field">
              <label>Upload File (Image / PDF)</label>
              <input 
                type="file" 
                accept="image/*,.pdf" 
                onChange={handleSimulateUpload} 
                style={{ fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleConfirmAddDoc}
                disabled={ocrScanning}
                style={{ whiteSpace: 'nowrap' }}
              >
                {ocrScanning ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCw size={14} className="animate-spin" /> Scanning OCR...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={16} /> Save Document
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* OCR Review Preview */}
          {showOcrReview && ocrResult && (
            <div style={{
              marginTop: '1rem',
              background: '#eef2ff',
              border: '1px solid #c7d2fe',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#3730a3', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} color="#4f46e5" />
                  AI OCR Extracted Data (Staff Verification Required)
                </span>
                <span style={{ fontSize: '0.75rem', background: '#e0e7ff', color: '#4338ca', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                  Confidence: {ocrResult.confidenceScore}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.8rem' }}>
                <div><strong>Detected Doc:</strong> {ocrResult.detectedType}</div>
                <div><strong>Extracted ID:</strong> {ocrResult.documentNumber}</div>
                <div><strong>Name Detected:</strong> {ocrResult.nameOnDoc}</div>
                <div><strong>DOB / Reg:</strong> {ocrResult.dobOrRegDate}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document List Table */}
      <div className="la-table-card">
        <table className="la-table">
          <thead>
            <tr>
              <th>Document Type</th>
              <th>Document Number</th>
              <th>File Name</th>
              <th>Uploaded Date</th>
              <th>Verification Status</th>
              {!readOnly && <th style={{ textAlign: 'right' }}>Staff Action</th>}
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, idx) => {
              const status = doc.status || 'pending_review';
              return (
                <tr key={doc.id || idx}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={16} color="#4f46e5" />
                      {doc.type}
                    </div>
                  </td>
                  <td>
                    <code style={{ background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px', color: '#0f172a' }}>
                      {doc.documentNumber || '--'}
                    </code>
                  </td>
                  <td>
                    <span style={{ color: '#475569', fontSize: '0.85rem' }}>{doc.fileName || 'document.pdf'}</span>
                  </td>
                  <td>{doc.uploadedAt || 'Recent'}</td>
                  <td>
                    {status === 'verified' && (
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={13} /> Verified
                      </span>
                    )}
                    {status === 'pending_review' && (
                      <span style={{ background: '#fef3c7', color: '#b45309', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <AlertTriangle size={13} /> Pending Review
                      </span>
                    )}
                    {status === 'rejected' && (
                      <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <XCircle size={13} /> Rejected
                      </span>
                    )}
                  </td>
                  {!readOnly && (
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                        {status !== 'verified' && (
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#15803d', borderColor: '#bbf7d0' }}
                            onClick={() => onUpdateStatus && onUpdateStatus(doc.id, 'verified')}
                            title="Verify & Approve Document"
                          >
                            <Check size={14} /> Verify
                          </button>
                        )}
                        {status !== 'rejected' && (
                          <button 
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#b91c1c', borderColor: '#fecaca' }}
                            onClick={() => onUpdateStatus && onUpdateStatus(doc.id, 'rejected')}
                            title="Reject Document"
                          >
                            <X size={14} /> Reject
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}

            {documents.length === 0 && (
              <tr>
                <td colSpan={readOnly ? 5 : 6} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                  No documents uploaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default KYCDocumentManager;
