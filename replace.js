const fs = require('fs');
let jsx = fs.readFileSync('src/pages/PurchaseOrder.jsx', 'utf8');
jsx = jsx.replace(/className="pi-/g, 'className="po-');
jsx = jsx.replace(/className={`pi-/g, 'className={`po-');
jsx = jsx.replace(/'pi-/g, '\'po-');
fs.writeFileSync('src/pages/PurchaseOrder.jsx', jsx);
