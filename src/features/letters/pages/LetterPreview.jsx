import React from 'react';
import '@/features/letters/styles/LetterPreview.css';

const LetterPreview = React.forwardRef(({ htmlContent, margins = 'normal', orientation = 'portrait', pageSize = 'letter' }, ref) => {
  return (
    <div className={`letter-preview-scroll-wrapper margin-${margins} orientation-${orientation} size-${pageSize}`}>
      <div className="a4-preview-wrapper">
        <div className={`a4-paper ${margins} ${orientation} ${pageSize}`} ref={ref}>
          <div 
            className="a4-content tiptap-preview" 
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
          />
        </div>
      </div>
    </div>
  );
});

export default LetterPreview;
