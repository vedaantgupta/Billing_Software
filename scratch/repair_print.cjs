const fs = require('fs');
const path = 'g:/Billing_Software/src/components/PrintTemplate.jsx';
let content = fs.readFileSync(path, 'utf8');

const target = `<div className="pt-pv-sig-space"></div>`;
const replacement = `{company?.signature ? (
                    <div style={{ textAlign: 'center', padding: '5px 0' }}>
                       <img src={company.signature} alt="Signature" style={{ maxHeight: '60px', mixBlendMode: 'multiply' }} />
                    </div>
                  ) : (
                    <div className="pt-pv-sig-space"></div>
                  )}`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully updated PrintTemplate.jsx');
} else {
    console.log('Target not found in PrintTemplate.jsx');
    // Try with different indentation or just search for the part of it
    if (content.includes('className="pt-pv-sig-space"')) {
        console.log('Found class, trying partial replace');
        // This is riskier but let's try to be precise
        const lines = content.split('\n');
        const index = lines.findIndex(l => l.includes('pt-pv-sig-space'));
        if (index !== -1) {
            const indent = lines[index].match(/^\s*/)[0];
            lines[index] = `${indent}{company?.signature ? (
${indent}  <div style={{ textAlign: 'center', padding: '5px 0' }}>
${indent}     <img src={company.signature} alt="Signature" style={{ maxHeight: '60px', mixBlendMode: 'multiply' }} />
${indent}  </div>
${indent}) : (
${indent}  <div className="pt-pv-sig-space"></div>
${indent})}`;
            fs.writeFileSync(path, lines.join('\n'), 'utf8');
            console.log('Successfully updated PrintTemplate.jsx via line index');
        }
    }
}
