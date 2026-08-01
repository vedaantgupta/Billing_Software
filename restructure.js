import fs from 'fs';
import path from 'path';

// 1. Configure Vite Config & jsconfig.json
const configureProject = () => {
  const viteConfigPath = path.resolve('vite.config.js');
  if (fs.existsSync(viteConfigPath)) {
    let content = fs.readFileSync(viteConfigPath, 'utf8');
    if (!content.includes('alias:')) {
      console.log('Configuring Vite path aliases in vite.config.js...');
      let updated = content;
      if (updated.includes('plugins: [react()]')) {
        updated = updated.replace(
          'plugins: [react()]',
          "plugins: [react()],\n  resolve: {\n    alias: {\n      '@': path.resolve('./src'),\n    },\n  }"
        );
        if (!updated.includes("import path from 'path'")) {
          updated = "import path from 'path';\n" + updated;
        }
        fs.writeFileSync(viteConfigPath, updated);
      }
    }
  }

  const jsconfigPath = path.resolve('jsconfig.json');
  console.log('Creating jsconfig.json...');
  const jsconfig = {
    compilerOptions: {
      baseUrl: ".",
      paths: {
        "@/*": ["src/*"]
      }
    },
    include: ["src/**/*"]
  };
  fs.writeFileSync(jsconfigPath, JSON.stringify(jsconfig, null, 2));
};

// 2. Feature Mappings
const featureMapping = {
  Login: 'auth', Register: 'auth', ForgotPassword: 'auth', AuthPages: 'auth', AuthLayout: 'auth',
  Contact: 'contacts', Contacts: 'contacts', AddContact: 'contacts', LedgerPrint: 'contacts',
  Product: 'products', Products: 'products', PublicProductDetail: 'products',
  Bank: 'banking', AdvancedLoanCalculator: 'banking', CreditReport: 'banking', Loan: 'banking',
  Letter: 'letters', Letters: 'letters', Snippet: 'letters', Template: 'letters', Variable: 'letters', Signature: 'letters',
  Project: 'projects', Projects: 'projects', Meet: 'projects', group_call: 'projects', chat: 'projects',
  Staff: 'staff', RecordStaffPayment: 'staff',
  Expense: 'expenses', Expenses: 'expenses', AddDailyExpense: 'expenses', DailyExpenses: 'expenses',
  Income: 'accounting', AddOtherIncome: 'accounting', ProfitLoss: 'dashboard', ProfitLossOverview: 'dashboard',
  Invoice: 'documents', Quotation: 'documents', Order: 'documents', Challan: 'documents', Note: 'documents', Payment: 'documents', ProformaInvoice: 'documents', DeliveryChallan: 'documents', JobWork: 'documents', InwardPayment: 'documents', OutwardPayment: 'documents', CreateInwardPayment: 'documents', CreateOutwardPayment: 'documents', PaymentDetails: 'documents', DocumentList: 'documents', DocumentTypeSelection: 'documents',
  CardBuilder: 'tools', BusinessCard: 'tools', Spreadsheet: 'tools', WordProcessor: 'tools',
  Dashboard: 'dashboard', AIAssistant: 'dashboard', IndiaSalesMap: 'dashboard', IndiaMapData: 'dashboard',
  Compliance: 'compliance',
  Report: 'reports', Reports: 'reports', BankingReport: 'reports',
  Settings: 'settings'
};

const keys = Object.keys(featureMapping).sort((a, b) => b.length - a.length);

const getFeature = (filename) => {
  const lower = filename.toLowerCase();
  for (const key of keys) {
    if (lower.includes(key.toLowerCase())) {
      return featureMapping[key];
    }
  }
  return null;
};

const getNewPath = (filePath) => {
  const oldAbs = path.resolve(filePath);
  const filename = path.basename(filePath);
  const nameWithoutExt = path.basename(filePath, path.extname(filePath));
  const ext = path.extname(filePath);

  const relative = path.relative(path.resolve('src'), oldAbs);
  if (relative.startsWith('..') || relative === '') {
    return { newAbs: oldAbs, isMoved: false };
  }

  const parts = relative.split(path.sep);
  if (parts.length === 1) {
    const entryFiles = ['App.jsx', 'App.css', 'main.jsx', 'index.css'];
    if (entryFiles.includes(filename)) {
      return { newAbs: oldAbs, isMoved: false };
    }
  }

  if (nameWithoutExt === 'Layout' || nameWithoutExt === 'ProtectedRoute' || nameWithoutExt === 'AuthLayout') {
    return {
      newAbs: path.resolve('src', 'components', 'layout', filename),
      isMoved: true
    };
  }

  const feature = getFeature(nameWithoutExt);
  if (feature) {
    let subfolder = '';
    if (ext === '.css') {
      subfolder = 'styles';
    } else if (ext === '.js' || ext === '.jsx') {
      const isComponent = nameWithoutExt.endsWith('Modal') ||
                          nameWithoutExt.endsWith('Gauge') ||
                          nameWithoutExt.endsWith('Picker') ||
                          nameWithoutExt.endsWith('Panel') ||
                          nameWithoutExt.endsWith('Sidebar') ||
                          nameWithoutExt.endsWith('Toolbar') ||
                          nameWithoutExt.endsWith('Extensions') ||
                          nameWithoutExt.endsWith('Card') ||
                          nameWithoutExt.endsWith('Template') ||
                          nameWithoutExt.endsWith('List') ||
                          nameWithoutExt.endsWith('Selection') ||
                          nameWithoutExt.endsWith('PrintTemplate') ||
                          nameWithoutExt.endsWith('PrintModal') ||
                          nameWithoutExt.endsWith('Row') ||
                          nameWithoutExt.endsWith('Cell') ||
                          filePath.includes('src' + path.sep + 'components');
      subfolder = isComponent ? 'components' : 'pages';
    } else {
      subfolder = 'assets';
    }
    return {
      newAbs: path.resolve('src', 'features', feature, subfolder, filename),
      isMoved: true
    };
  }

  if (filePath.includes('src' + path.sep + 'components')) {
    return {
      newAbs: path.resolve('src', 'components', 'ui', filename),
      isMoved: true
    };
  }

  return { newAbs: oldAbs, isMoved: false };
};

const getAllFiles = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath));
    } else {
      results.push(filePath);
    }
  });
  return results;
};

const buildFileMap = (files) => {
  const fileMap = {};
  const targetToOld = {};

  const sortedFiles = [...files].sort((a, b) => {
    const depthA = a.split(path.sep).length;
    const depthB = b.split(path.sep).length;
    return depthB - depthA;
  });

  for (const file of sortedFiles) {
    const oldAbs = path.resolve(file);
    const { newAbs, isMoved } = getNewPath(file);
    
    const relativeToSrc = path.relative(path.resolve('src'), newAbs).replace(/\\/g, '/');
    let aliasPath = '@/' + relativeToSrc;
    if (aliasPath.endsWith('.jsx')) aliasPath = aliasPath.slice(0, -4);
    else if (aliasPath.endsWith('.js')) aliasPath = aliasPath.slice(0, -3);

    let isDuplicate = false;
    if (isMoved) {
      if (targetToOld[newAbs]) {
        isDuplicate = true;
      } else {
        targetToOld[newAbs] = file;
      }
    }

    fileMap[oldAbs] = {
      newAbs,
      aliasPath,
      isMoved,
      isDuplicate
    };
  }

  return fileMap;
};

const resolveImport = (filePath, importPath, fileMap) => {
  if (!importPath.startsWith('.')) {
    return null;
  }

  const fileDir = path.dirname(filePath);
  const resolved = path.resolve(fileDir, importPath);

  const candidates = [
    resolved,
    resolved + '.jsx',
    resolved + '.js',
    resolved + '.css',
    path.join(resolved, 'index.jsx'),
    path.join(resolved, 'index.js')
  ];

  for (const cand of candidates) {
    if (fileMap[cand]) {
      return fileMap[cand].aliasPath;
    }
  }

  return null;
};

const updateImports = (content, filePath, fileMap) => {
  const ext = path.extname(filePath);
  if (ext !== '.js' && ext !== '.jsx' && ext !== '.css') {
    return content;
  }

  let updated = content;

  if (ext === '.js' || ext === '.jsx') {
    const importExportRegex = /(import|export)\s+(?:[^'"]+\s+from\s+)?(['"])([^'"]+)\2/g;
    updated = updated.replace(importExportRegex, (fullMatch, type, quote, imp) => {
      const newImp = resolveImport(filePath, imp, fileMap);
      if (newImp) {
        return fullMatch.replace(quote + imp + quote, quote + newImp + quote);
      }
      return fullMatch;
    });

    const dynamicImportRegex = /import\((['"])([^'"]+)\1\)/g;
    updated = updated.replace(dynamicImportRegex, (fullMatch, quote, imp) => {
      const newImp = resolveImport(filePath, imp, fileMap);
      return newImp ? `import(${quote}${newImp}${quote})` : fullMatch;
    });

    const requireRegex = /require\((['"])([^'"]+)\1\)/g;
    updated = updated.replace(requireRegex, (fullMatch, quote, imp) => {
      const newImp = resolveImport(filePath, imp, fileMap);
      return newImp ? `require(${quote}${newImp}${quote})` : fullMatch;
    });
  } else if (ext === '.css') {
    const cssImportRegex = /@import\s+(['"])([^'"]+)\1/g;
    updated = updated.replace(cssImportRegex, (fullMatch, quote, imp) => {
      const newImp = resolveImport(filePath, imp, fileMap);
      return newImp ? `@import ${quote}${newImp}${quote}` : fullMatch;
    });

    const cssImportUrlRegex = /@import\s+url\((['"]?)([^'")]+)\1\)/g;
    updated = updated.replace(cssImportUrlRegex, (fullMatch, quote, imp) => {
      const newImp = resolveImport(filePath, imp, fileMap);
      return newImp ? `@import url(${quote}${newImp}${quote})` : fullMatch;
    });
  }

  return updated;
};

const ensureDirectoryExists = (filePath) => {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
};

const main = () => {
  console.log('--- Starting Restructuring Script ---');
  configureProject();

  const srcDir = path.resolve('src');
  if (!fs.existsSync(srcDir)) {
    console.error('Error: src directory does not exist!');
    process.exit(1);
  }

  const allFiles = getAllFiles(srcDir);
  console.log(`Found ${allFiles.length} files in src/`);

  const fileMap = buildFileMap(allFiles);
  const fileContents = {};

  // Read all file contents into memory
  for (const oldAbs of Object.keys(fileMap)) {
    if (fs.existsSync(oldAbs)) {
      fileContents[oldAbs] = fs.readFileSync(oldAbs, 'utf8');
    }
  }

  // Move files, write updated content, and delete duplicates/old files
  for (const [oldAbs, info] of Object.entries(fileMap)) {
    if (info.isDuplicate) {
      if (fs.existsSync(oldAbs)) {
        fs.unlinkSync(oldAbs);
        console.log(`Deleted duplicate source file: ${path.relative('.', oldAbs)}`);
      }
      continue;
    }

    const content = fileContents[oldAbs];
    if (content === undefined) continue;

    const updatedContent = updateImports(content, oldAbs, fileMap);
    ensureDirectoryExists(info.newAbs);

    fs.writeFileSync(info.newAbs, updatedContent, 'utf8');

    if (info.newAbs !== oldAbs) {
      if (fs.existsSync(oldAbs)) {
        fs.unlinkSync(oldAbs);
        console.log(`Moved & updated: ${path.relative('.', oldAbs)} -> ${path.relative('.', info.newAbs)}`);
      }
    } else {
      console.log(`Updated imports in-place: ${path.relative('.', oldAbs)}`);
    }
  }

  console.log('--- Restructuring Completed Successfully ---');
};

main();
