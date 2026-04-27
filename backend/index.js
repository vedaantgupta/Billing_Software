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
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const multer = require('multer');
const { getAIResponse } = require('./aiService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 5000;

// Start of application logic

const uri = process.env.MONGO_DB_DNS;

if (!uri) {
  console.error('CRITICAL ERROR: MONGO_DB_DNS is NOT defined in your .env file!');
  console.error('Current ENV Keys:', Object.keys(process.env).filter(k => k.includes('MONGO')));
}

const client = new MongoClient(uri);

app.use(cors());
app.use(express.json({ limit: '2048mb' }));
app.use(express.urlencoded({ limit: '2048mb', extended: true }));

// Configure Multer for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Serve static files from uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Collections initialization
let db, usersCollection, workCollection, salesCollection, meetsCollection, meetMessagesCollection;
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
    meetsCollection = db.collection('meets');
    meetMessagesCollection = db.collection('meet_messages');
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

// Global Project Chat (Supports Group & Private)
app.get('/api/chat/:projectId', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const { projectId } = req.params;
    const { userId, recipientId } = req.query;
    const chatCollection = db.collection('project_messages');

    let query = { projectId };

    if (!recipientId || recipientId === 'group') {
      // Group chat
      query.$or = [{ recipientId: null }, { recipientId: 'group' }];
    } else {
      // Private chat between two users
      query.$or = [
        { senderId: userId, recipientId: recipientId },
        { senderId: recipientId, recipientId: userId }
      ];
    }

    const messages = await chatCollection.find(query).sort({ timestamp: 1 }).toArray();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching chat' });
  }
});

app.post('/api/chat', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const msgData = req.body;
    const chatCollection = db.collection('project_messages');
    await chatCollection.insertOne({
      ...msgData,
      timestamp: new Date()
    });
    res.status(201).json({ message: 'Sent' });
  } catch (err) {
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Global Project Members
app.get('/api/project-members/:projectId', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const { projectId } = req.params;
    const membersCollection = db.collection('project_members');
    const members = await membersCollection.find({ projectId }).toArray();
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching members' });
  }
});

app.post('/api/meet/create', checkDB, async (req, res) => {
  try {
    const { userId, userName, code } = req.body;
    const existing = await meetsCollection.findOne({ code });
    if (existing) {
      return res.status(400).json({ message: 'Meeting code already exists. Please choose another or use the suggested one.' });
    }
    const meet = {
      code,
      creatorId: userId,
      creatorName: userName,
      createdAt: new Date(),
      status: 'active'
    };
    await meetsCollection.insertOne(meet);
    res.status(201).json(meet);
  } catch (err) {
    res.status(500).json({ message: 'Error creating meeting' });
  }
});

app.get('/api/meet/verify/:code', checkDB, async (req, res) => {
  try {
    const { code } = req.params;
    const meet = await meetsCollection.findOne({ code });
    if (!meet) {
      return res.status(404).json({ message: 'Meeting not found' });
    }
    res.json(meet);
  } catch (err) {
    res.status(500).json({ message: 'Error verifying meeting' });
  }
});

app.get('/api/meet/messages/:code', checkDB, async (req, res) => {
  try {
    const { code } = req.params;
    const messages = await meetMessagesCollection.find({ meetCode: code }).sort({ timestamp: 1 }).toArray();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

app.post('/api/meet/upload', checkDB, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({
      url: fileUrl,
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
      filename: req.file.filename
    });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

app.post('/api/meet/messages/save', checkDB, async (req, res) => {
  try {
    const message = {
      ...req.body,
      timestamp: new Date()
    };
    await meetMessagesCollection.insertOne(message);
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: 'Error saving message' });
  }
});

app.post('/api/project-members/join', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const { projectId, userId, name } = req.body;
    const membersCollection = db.collection('project_members');

    // Check if user is already a member
    const existing = await membersCollection.findOne({ projectId, userId });
    if (existing) return res.json(existing);

    // Check if this is the first member (Admin)
    const count = await membersCollection.countDocuments({ projectId });
    const isOriginalAdmin = count === 0;
    const role = isOriginalAdmin ? 'Admin' : 'Member';

    const newMember = {
      projectId,
      userId,
      name,
      role,
      isOriginalAdmin,
      joinedAt: new Date()
    };

    await membersCollection.insertOne(newMember);
    res.status(201).json(newMember);
  } catch (err) {
    res.status(500).json({ message: 'Error joining project' });
  }
});

app.patch('/api/project-members/role', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const { projectId, userId, newRole } = req.body;
    const membersCollection = db.collection('project_members');
    await membersCollection.updateOne(
      { projectId, userId },
      { $set: { role: newRole } }
    );
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating role' });
  }
});

// File Upload Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  });
});

// We'll use a separate collection to track 'kicked' status so we can show the message
app.delete('/api/project-members/:projectId/:userId', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const { projectId, userId } = req.params;
    const { removedBy } = req.query; // Admin who is doing the removal
    const membersCollection = db.collection('project_members');
    const kickedCollection = db.collection('project_kicked');

    // Prevent deleting original admin
    const member = await membersCollection.findOne({ projectId, userId });
    if (member && member.isOriginalAdmin) {
      return res.status(403).json({ message: 'Cannot remove the original project admin' });
    }

    await kickedCollection.insertOne({
      projectId,
      userId,
      removedBy,
      type: req.query.type || 'full', // 'full' or 'chat'
      timestamp: new Date()
    });

    if (req.query.type === 'chat') {
      await membersCollection.updateOne(
        { projectId, userId },
        { $set: { chatBlocked: true, removedByChat: removedBy } }
      );
    } else {
      await membersCollection.updateOne(
        { projectId, userId },
        { $set: { accessBlocked: true, removedByFull: removedBy } }
      );
    }
    res.json({ message: 'Member blocked' });
  } catch (err) {
    res.status(500).json({ message: 'Error blocking member' });
  }
});

app.post('/api/project-members/unblock', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const { projectId, userId } = req.body;
    const membersCollection = db.collection('project_members');
    await membersCollection.updateOne(
      { projectId, userId },
      { $set: { chatBlocked: false, accessBlocked: false }, $unset: { removedByChat: "", removedByFull: "" } }
    );
    res.json({ message: 'Member restored' });
  } catch (err) {
    res.status(500).json({ message: 'Error restoring member' });
  }
});

app.get('/api/project-kicked/:projectId/:userId', async (req, res) => {
  if (!isDbConnected) return res.status(503).json({ message: 'DB not connected' });
  try {
    const { projectId, userId } = req.params;
    const kickedCollection = db.collection('project_kicked');
    const record = await kickedCollection.findOne({ projectId, userId });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: 'Error' });
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

// Socket.io Logic
const meetParticipants = {}; // Stores participants per meetCode: { code: [ { id, name, socketId } ] }

io.on('connection', (socket) => {
  console.log('⚡ User connected:', socket.id);

  socket.on('join_project', (projectId) => {
    socket.join(projectId);
    console.log(`👤 User ${socket.id} joined project: ${projectId}`);
  });

  socket.on('join_private', (data) => {
    // Unique room for two users
    const room = [data.userId, data.recipientId].sort().join('_');
    socket.join(room);
    console.log(`🔒 User ${socket.id} joined private room: ${room}`);
  });

  socket.on('join_meet', (data) => {
    const { code, userId, userName } = data;
    socket.join(`meet_${code}`);

    // Add to participants
    if (!meetParticipants[code]) meetParticipants[code] = [];
    
    const existing = meetParticipants[code].find(p => p.id === userId);
    if (!existing) {
      meetParticipants[code].push({ id: userId, name: userName, socketId: socket.id, status: 'online' });
      
      // Broadcast system message for join
      io.to(`meet_${code}`).emit('receive_meet_message', {
        meetCode: code,
        senderId: 'system',
        senderName: 'System',
        text: `${userName} joined the meeting`,
        timestamp: new Date(),
        isSystem: true
      });
    } else {
      existing.socketId = socket.id;
      existing.status = 'online';
    }

    console.log(`🤝 User ${userName} joined meet room: meet_${code}`);
    io.to(`meet_${code}`).emit('participants_update', meetParticipants[code]);

    // Store data on socket for disconnect handling
    socket.meetCode = code;
    socket.userId = userId;
    socket.userName = userName;
  });

  socket.on('leave_meet', (data) => {
    const { code, userId, userName } = data;
    if (meetParticipants[code]) {
      const p = meetParticipants[code].find(p => p.id === userId);
      if (p) {
        p.status = 'left';
        io.to(`meet_${code}`).emit('participants_update', meetParticipants[code]);
        io.to(`meet_${code}`).emit('receive_meet_message', {
          meetCode: code,
          senderId: 'system',
          senderName: 'System',
          text: `${userName} left the meeting`,
          timestamp: new Date(),
          isSystem: true
        });
      }
    }
  });

  socket.on('send_meet_message', async (data) => {
    const message = {
      meetCode: data.meetCode,
      senderId: data.senderId,
      senderName: data.senderName,
      text: data.text,
      timestamp: new Date()
    };
    if (isDbConnected) {
      await meetMessagesCollection.insertOne(message);
    }
    io.to(`meet_${data.meetCode}`).emit('receive_meet_message', message);
  });

  socket.on('send_meet_private_message', async (data) => {
    const message = {
      meetCode: data.meetCode,
      senderId: data.senderId,
      senderName: data.senderName,
      recipientId: data.recipientId,
      text: data.text,
      timestamp: new Date(),
      isPrivate: true
    };

    // Room name for private chat between two users in a meet
    const room = [data.senderId, data.recipientId].sort().join('_');
    socket.join(room); // Ensure sender is in room

    // We don't save private messages to DB for now as per "meet" nature, 
    // but we could if needed.

    // Emit to both
    io.to(room).emit('receive_meet_private_message', message);

    // Also notify the recipient specifically if they aren't in the room yet
    const recipient = meetParticipants[data.meetCode]?.find(p => p.id === data.recipientId);
    if (recipient) {
      io.to(recipient.socketId).emit('private_message_notification', message);
    }
  });

  // WebRTC Signaling
  socket.on('call_request', (data) => {
    // data: { meetCode, callerId, callerName, recipientId, signalData, type: 'voice' | 'video' }
    const recipient = meetParticipants[data.meetCode]?.find(p => p.id === data.recipientId);
    if (recipient) {
      io.to(recipient.socketId).emit('incoming_call', {
        callerId: data.callerId,
        callerName: data.callerName,
        signalData: data.signalData,
        type: data.type
      });
    }
  });

  socket.on('answer_call', (data) => {
    // data: { meetCode, callerId, recipientId, signalData }
    const caller = meetParticipants[data.meetCode]?.find(p => p.id === data.callerId);
    if (caller) {
      io.to(caller.socketId).emit('call_accepted', {
        signalData: data.signalData,
        recipientId: data.recipientId
      });
    }
  });

  socket.on('ice_candidate', (data) => {
    const recipient = meetParticipants[data.meetCode]?.find(p => p.id === data.recipientId);
    if (recipient) {
      io.to(recipient.socketId).emit('ice_candidate', {
        candidate: data.candidate,
        senderId: data.senderId
      });
    }
  });

  socket.on('end_call', (data) => {
    const recipient = meetParticipants[data.meetCode]?.find(p => p.id === data.recipientId);
    if (recipient) {
      io.to(recipient.socketId).emit('call_ended', { senderId: data.senderId });
    }
  });

  socket.on('join_group_call', (data) => {
    // data: { meetCode, userId, userName, type, targets }
    const { meetCode, userId, userName, type, targets } = data;
    
    if (targets && targets.length > 0) {
      // Send only to specific targets
      meetParticipants[meetCode]?.forEach(p => {
        if (targets.includes(p.id)) {
          io.to(p.socketId).emit('incoming_group_call', {
            meetCode,
            callerId: userId,
            callerName: userName,
            type
          });
        }
      });
    } else {
      // Broadcast to everyone else
      socket.to(`meet_${meetCode}`).emit('incoming_group_call', {
        meetCode,
        callerId: userId,
        callerName: userName,
        type
      });
    }
  });

  socket.on('accept_group_call', (data) => {
    // data: { meetCode, userId, userName, callerId, targets }
    // Notify the room that this user joined
    socket.to(`meet_${data.meetCode}`).emit('user_joined_group_call', {
      userId: data.userId,
      userName: data.userName
    });
    // Also notify ALL recipients of the original call about this join
    socket.to(`meet_${data.meetCode}`).emit('call_participant_joined', {
      userId: data.userId,
      userName: data.userName
    });
  });

  socket.on('group_call_signal', (data) => {
    // data: { meetCode, recipientId, senderId, signalData }
    const recipient = meetParticipants[data.meetCode]?.find(p => p.id === data.recipientId);
    if (recipient) {
      io.to(recipient.socketId).emit('group_call_signal', {
        senderId: data.senderId,
        signalData: data.signalData
      });
    }
  });

  socket.on('group_call_ice', (data) => {
    const recipient = meetParticipants[data.meetCode]?.find(p => p.id === data.recipientId);
    if (recipient) {
      io.to(recipient.socketId).emit('group_call_ice', {
        senderId: data.senderId,
        candidate: data.candidate
      });
    }
  });

  socket.on('leave_group_call', (data) => {
    socket.to(`meet_${data.meetCode}`).emit('user_left_group_call', {
      userId: data.userId
    });
  });

  socket.on('send_message', (data) => {
    if (data.recipientId && data.recipientId !== 'group') {
      // Send to private room
      const room = [data.senderId, data.recipientId].sort().join('_');
      io.to(room).emit('receive_message', data);
    } else {
      // Broadcast to everyone in the project room
      io.to(data.projectId).emit('receive_message', data);
    }
  });

  socket.on('project_update', (data) => {
    // Broadcast to everyone in the room to refresh their data
    io.to(data.projectId).emit('project_data_refreshed', data);
  });

  socket.on('disconnect', () => {
    if (socket.meetCode && socket.userId) {
      const code = socket.meetCode;
      if (meetParticipants[code]) {
        const p = meetParticipants[code].find(p => p.id === socket.userId);
        if (p && p.status !== 'left') {
          p.status = 'offline';
          io.to(`meet_${code}`).emit('participants_update', meetParticipants[code]);
        }
      }
    }
    console.log('❌ User disconnected:', socket.id);
  });
});

// Start the server immediately, then try to connect to DB
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  tryConnect();
});
