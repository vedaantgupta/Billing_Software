const path = require('path');
const fs = require('fs');

// Path diagnostics for better env loading
const envPaths = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend', '.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`[CONFIG] Loaded .env from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const { getAIResponse } = require('./aiService');
const app = express();
const port = process.env.PORT || 5000;

// Start of application logic

const uri = process.env.MONGO_DB_DNS;

if (!uri) {
  console.error('CRITICAL ERROR: MONGO_DB_DNS is NOT defined in your .env file!');
  console.error('Current ENV Keys:', Object.keys(process.env).filter(k => k.includes('MONGO')));
}

const client = new MongoClient(uri);

app.use(cors());
app.use(express.json());

// Collections initialization
let db, usersCollection, workCollection, salesCollection;
let isDbConnected = false;

async function tryConnect() {
  try {
    console.log('Attempting to connect to MongoDB Atlas using DNS string...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB Atlas');

    db = client.db('billing_database');
    usersCollection = db.collection('users');
    workCollection = db.collection('work');
    salesCollection = db.collection('sales');
    isDbConnected = true;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    isDbConnected = false;
  }
}

// Middleware to check DB status
const checkDB = (req, res, next) => {
  if (!isDbConnected) {
    return res.status(503).json({
      message: 'Database connection is not established. Please check your configuration.',
      details: 'Internal connection state: disconnected'
    });
  }
  next();
};

// Auth: Register
app.post('/api/register', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const userData = req.body;
    const existingUser = await usersCollection.findOne({
      $or: [{ email: userData.email }, { username: userData.username }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }

    const result = await usersCollection.insertOne({
      ...userData,
      createdAt: new Date(),
      status: 'active',
      role: 'user'
    });

    const newUser = {
      id: result.insertedId,
      ...userData,
      status: 'active',
      role: 'user',
      createdAt: new Date()
    };
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json(userWithoutPassword);
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Error registering user: ' + err.message });
  }
});

// Auth: Login
app.post('/api/login', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const { identifier, password } = req.body;
    const user = await usersCollection.findOne({
      $or: [{ email: identifier }, { username: identifier }],
      password: password
    });

    if (user) {
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Login error' });
  }
});

// Auth: Forgot Password
app.post('/api/forgot-password', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const { email } = req.body;
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await usersCollection.updateOne(
      { email },
      { $set: { resetOtp: otp, resetOtpExpiry: new Date(Date.now() + 15 * 60 * 1000) } }
    );

    console.log(`[DEV LOG] Generated OTP for ${email}: ${otp}`);

    res.json({ message: 'Verification code sent successfully' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Error processing request' });
  }
});

// Auth: Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const { email, otp } = req.body;
    const user = await usersCollection.findOne({
      email,
      resetOtp: otp,
      resetOtpExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: 'Error verifying OTP' });
  }
});

// Auth: Reset Password
app.post('/api/reset-password', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const { email, otp, newPassword } = req.body;

    const user = await usersCollection.findOne({
      email,
      resetOtp: otp,
      resetOtpExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    await usersCollection.updateOne(
      { email },
      {
        $set: { password: newPassword },
        $unset: { resetOtp: "", resetOtpExpiry: "" }
      }
    );

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// Save Work
app.post('/api/work', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const { userId, type, data } = req.body;
    const result = await workCollection.insertOne({
      userId,
      type,
      data,
      timestamp: new Date()
    });
    res.status(201).json({ id: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Error saving work' });
  }
});

// Get Work
app.get('/api/work/:userId', async (req, res) => {
  if (!isDbConnected) {
    return res.status(503).json({
      message: 'Database is currently offline. Please check your Atlas configuration.',
      userId: req.params.userId
    });
  }
  try {
    const { userId } = req.params;
    const { type } = req.query;
    const query = { userId };
    if (type) query.type = type;

    const work = await workCollection.find(query).toArray();
    res.json(work);
  } catch (err) {
    console.error('Error fetching work:', err);
    res.status(500).json({ message: 'Error fetching work: ' + err.message });
  }
});

// Update Work
app.patch('/api/work/:userId/:id', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const { userId, id } = req.params;
    const updates = req.body;

    // Preserve original data.id — only fall back to the URL id if no id in updates
    const dataWithId = { ...updates, id: updates.id || id };

    const query = { userId };
    if (ObjectId.isValid(id) && (String(id).length === 12 || String(id).length === 24)) {
      query.$or = [{ 'data.id': id }, { _id: new ObjectId(id) }];
    } else {
      query['data.id'] = id;
    }

    const result = await workCollection.updateOne(
      query,
      { $set: { 'data': dataWithId, timestamp: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ message: 'Updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating work' });
  }
});

// Delete Work
app.delete('/api/work/:userId/:id', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const { userId, id } = req.params;

    const query = { userId };
    if (ObjectId.isValid(id) && (String(id).length === 12 || String(id).length === 24)) {
      query.$or = [{ 'data.id': id }, { _id: new ObjectId(id) }];
    } else {
      query['data.id'] = id;
    }

    const result = await workCollection.deleteOne(query);

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting work' });
  }
});

// Sales Analytics: Get Top States by Sale
app.get('/api/analytics/top-states', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const salesData = await salesCollection.aggregate([
      {
        $group: {
          _id: "$state",
          totalSales: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 10 }
    ]).toArray();
    res.json(salesData);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching analytics' });
  }
});

// AI Assistant Route
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { prompt, history, userId } = req.body;
    console.log(`[AI] New request from user ${userId}. Prompt: "${prompt}"`);
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    let businessContext = "No specific business data available yet.";

    if (userId && isDbConnected) {
      // Fetch comprehensive business data to give AI deep context
      const [products, contacts, sales, staff, loans, banks, expenses, income, documents, ledger] = await Promise.all([
        workCollection.find({ userId, type: 'products' }).toArray(),
        workCollection.find({ userId, type: 'contacts' }).toArray(),
        salesCollection.find({ userId }).toArray(),
        workCollection.find({ userId, type: 'staff' }).toArray(),
        workCollection.find({ userId, type: 'loans' }).toArray(),
        workCollection.find({ userId, type: 'banks' }).toArray(),
        workCollection.find({ userId, type: 'expenses' }).toArray(),
        workCollection.find({ userId, type: 'income' }).toArray(),
        workCollection.find({ userId, type: 'documents' }).toArray(),
        workCollection.find({ userId, type: 'ledger_transactions' }).toArray()
      ]);

      const totalSales = sales.reduce((sum, s) => sum + (Number(s.amount || s.grandTotal || s.total) || 0), 0);
      const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.data?.grandTotal || e.data?.amount || e.data?.total) || 0), 0);
      const totalIncome = income.reduce((sum, i) => sum + (Number(i.data?.grandTotal || i.data?.amount || i.data?.total) || 0), 0);

      // Loans: Principal is the field for the borrowed/lent amount
      const totalLoanAmount = loans.reduce((sum, l) => sum + (Number(l.data?.principal || l.data?.amount) || 0), 0);
      const totalLoanTaken = loans.filter(l => l.data?.type === 'borrow').reduce((sum, l) => sum + (Number(l.data?.principal || l.data?.amount) || 0), 0);
      const totalLoanGiven = loans.filter(l => l.data?.type === 'lend').reduce((sum, l) => sum + (Number(l.data?.principal || l.data?.amount) || 0), 0);

      // Analyze Low Stock
      const lowStockItems = products.filter(p => {
        const stock = Number(p.data?.stock) || 0;
        const alertLevel = Number(p.data?.lowStockAlert) || 5;
        return stock <= alertLevel;
      }).map(p => `${p.data?.name} (Stock: ${p.data?.stock}, Alert at: ${p.data?.lowStockAlert})`);

      // Analyze Ledger Outstanding (Total Dr - Total Cr per contact)
      const contactBalances = {};
      ledger.forEach(entry => {
        const contactName = entry.data?.contactName || 'Unknown';
        const amountStr = entry.data?.amount || entry.data?.total || entry.data?.grandTotal;
        const amount = Math.round((Number(amountStr) || 0) * 100);
        const type = entry.data?.type?.toLowerCase();

        if (!contactBalances[contactName]) contactBalances[contactName] = 0;
        if (type === 'dr' || type === 'debit') contactBalances[contactName] += amount;
        else if (type === 'cr' || type === 'credit') contactBalances[contactName] -= amount;
      });

      const ledgerOutstandingList = Object.entries(contactBalances)
        .map(([name, balanceInCents]) => [name, balanceInCents / 100])
        .filter(([_, balance]) => Math.abs(balance) > 0.01)
        .map(([name, balance]) => `${name}: ₹${balance.toLocaleString()} ${balance > 0 ? '(Receivable/Dr)' : '(Payable/Cr)'}`);

      const contactDetailsList = contacts.map(c => {
        const d = c.data || {};
        const name = d.companyName || d.contactName || d.name || 'Unknown';
        const type = d.type ? d.type.toUpperCase() : 'CONTACT';
        const phone = d.phone || 'N/A';
        const email = d.email || 'N/A';
        const gstin = d.gstin || 'N/A';
        const loc = d.billing?.city || d.billing?.state ? `${d.billing.city || ''} ${d.billing.state || ''}`.trim() : 'N/A';
        return `${name} [${type}] - Ph: ${phone}, Email: ${email}, GST: ${gstin}, Loc: ${loc}`;
      });

      const totalReceivable = Object.values(contactBalances)
        .map(b => b / 100)
        .filter(b => b > 0)
        .reduce((sum, b) => sum + b, 0);

      const totalPayable = Object.values(contactBalances)
        .map(b => b / 100)
        .filter(b => b < 0)
        .reduce((sum, b) => sum + Math.abs(b), 0);

      businessContext = `
        CRITICAL: YOU HAVE FULL ACCESS TO THE FOLLOWING LIVE BUSINESS DATA. 
        DO NOT SAY YOU DON'T HAVE ACCESS. USE THIS DATA TO ANSWER THE USER.
        
        Current Comprehensive Business Data Summary:
        
        1. Inventory & Low Stock:
        - Total Products: ${products.length}
        - Low Stock Items: ${lowStockItems.join(', ') || 'None'}
        
        2. Financial Overview & Ledger Balances (ALL CONTACTS):
        - Total Ledger Receivable: ₹${totalReceivable.toLocaleString()}
        - Total Ledger Payable: ₹${totalPayable.toLocaleString()}
        - All Outstanding Balances: ${ledgerOutstandingList.join(' | ') || 'None'}
        
        3. Business Totals:
        - Total Sales: ₹${totalSales.toLocaleString()}
        - Other Income: ₹${totalIncome.toLocaleString()}
        - Total Expenses: ₹${totalExpenses.toLocaleString()}
        - Net Profit/Loss Estimate: ₹${(totalSales + totalIncome - totalExpenses).toLocaleString()}
        
        4. Human Resources:
        - Total Staff: ${staff.length}
        - Staff Members: ${staff.map(s => s.data?.firstName).filter(Boolean).join(', ')}
        
        5. Banking & Loans:
        - Bank Accounts: ${banks.length}
        - Total Borrowed (Taken): ₹${totalLoanTaken.toLocaleString()}
        - Total Lent (Given): ₹${totalLoanGiven.toLocaleString()}
        - Active Loans: ${loans.filter(l => l.data?.status === 'active').length}
        
        6. Contacts & Recent Activity:
        - Total Contacts: ${contacts.length}
        - Full Contact Details:
          ${contactDetailsList.join('\n          ')}
        - Last 5 Sales: ${sales.slice(-5).map(s => `${s.customerName} (₹${s.amount || s.grandTotal || s.total})`).join(' | ')}
      `;
    }

    console.log(`[AI] Context length: ${businessContext.length}`);
    const response = await getAIResponse(prompt, history || [], businessContext);
    res.json({ response });
  } catch (err) {
    console.error('AI Route error:', err);
    res.status(500).json({ message: 'Error communicating with AI assistant' });
  }
});

// Start the server immediately, then try to connect to DB
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  tryConnect();
});
