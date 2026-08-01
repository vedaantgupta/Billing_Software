import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Trash2, Check, Upload } from 'lucide-react';
import '@/features/letters/styles/SignatureModal.css';

const SignatureModal = ({ isOpen, onClose, onSave }) => {
  const sigCanvas = useRef(null);
  const [activeTab, setActiveTab] = useState('draw');
  const [uploadedImage, setUploadedImage] = useState(null);

  if (!isOpen) return null;

  const clear = () => {
    sigCanvas.current.clear();
  };

  const handleSave = () => {
    if (activeTab === 'draw') {
      if (sigCanvas.current.isEmpty()) {
        alert('Please provide a signature first.');
        return;
      }
      const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      onSave(dataUrl);
    } else {
      if (!uploadedImage) {
        alert('Please upload an image first.');
        return;
      }
      onSave(uploadedImage);
    }
    onClose();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        setUploadedImage(readerEvent.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="signature-modal-overlay">
      <div className="signature-modal">
        <div className="modal-header">
          <h3>Add Signature</h3>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-tabs">
          <button 
            className={activeTab === 'draw' ? 'active' : ''} 
            onClick={() => setActiveTab('draw')}
          >
            Draw
          </button>
          <button 
            className={activeTab === 'upload' ? 'active' : ''} 
            onClick={() => setActiveTab('upload')}
          >
            Upload
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'draw' ? (
            <div className="draw-area">
              <SignatureCanvas 
                ref={sigCanvas}
                penColor='black'
                canvasProps={{width: 500, height: 200, className: 'sigCanvas'}}
              />
              <button className="clear-btn" onClick={clear}><Trash2 size={16} /> Clear</button>
            </div>
          ) : (
            <div className="upload-area">
              {uploadedImage ? (
                <div className="preview-container">
                  <img src={uploadedImage} alt="Uploaded signature" />
                  <button className="clear-btn" onClick={() => setUploadedImage(null)}>Change</button>
                </div>
              ) : (
                <label className="upload-label">
                  <Upload size={32} />
                  <span>Click to upload signature image</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} hidden />
                </label>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex items-center gap-2" onClick={handleSave}>
            <Check size={16} /> Insert Signature
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignatureModal;
