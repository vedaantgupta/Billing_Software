const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 5000;

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

// Start the server immediately, then try to connect to DB
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  tryConnect();
});
