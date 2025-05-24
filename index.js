const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config(); // ✅ Load .env variables
const jwt = require('jsonwebtoken');

const port = 3000;

const app = express();
app.use(cors());
app.use(express.json());

let db;

async function connectToMongoDB() {
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB!");
    db = client.db("testDB");
  } catch (err) {
    console.error("Error:", err);
  }
}

connectToMongoDB();

// 🔐 JWT Middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden: Access denied" });
    }
    next();
  };
};

app.get('/', (req, res) => {
  res.send('🚕 Ride-hailing API is up and connected to MongoDB!');
});

app.get('/rides', async (req, res) => {
  try {
    const rides = await db.collection('rides').find().toArray();
    res.status(200).json(rides);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

app.post('/rides', async (req, res) => {
  const ride = req.body;

  try {
    const result = await db.collection('rides').insertOne(ride);
    res.status(201).json({
      message: 'Ride created successfully',
      rideId: result.insertedId
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create ride', details: err });
  }
});

app.patch('/rides/:id', async (req, res) => {
  const rideId = req.params.id;
  const { status } = req.body;

  try {
    const result = await db.collection('rides').updateOne(
      { _id: new ObjectId(rideId) },
      { $set: { status } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    res.json({ message: 'Ride status updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ride', details: err });
  }
});

app.delete('/rides/:id', async (req, res) => {
  const rideId = req.params.id;

  try {
    const result = await db.collection('rides').deleteOne({ _id: new ObjectId(rideId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    res.json({ message: 'Ride cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel ride', details: err });
  }
});

// USERS ENDPOINTS
app.post('/users', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!role) {
      return res.status(400).json({ error: 'User role is required (e.g., customer or driver)' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = { email, password: hashedPassword, role };

    const result = await db.collection('users').insertOne(user);
    res.status(201).json({ message: 'User created', userId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.get('/users', async (req, res) => {
  try {
    const users = await db.collection('users').find().toArray();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: 'User updated successfully' });
    } else {
      res.status(404).json({ error: 'User not found or nothing to update' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 1) {
      res.status(200).json({ message: 'User deleted successfully' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// DRIVER APIs
app.patch('/drivers/:id/availability', async (req, res) => {
  const { id } = req.params;
  const { availability } = req.body;
  try {
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id), role: 'driver' },
      { $set: { availability } }
    );
    if (result.modifiedCount === 1) {
      res.status(200).json({ message: 'Availability updated' });
    } else {
      res.status(404).json({ error: 'Driver not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Update failed', details: err });
  }
});

app.patch('/drivers/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  try {
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id), role: 'driver' },
      { $set: { status } }
    );

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: 'Driver status updated' });
    } else {
      res.status(404).json({ message: 'Driver not found or status unchanged' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update driver status', details: err });
  }
});

// 🔐 Admin-only DELETE user route
app.delete('/admin/users/:id', authenticate, authorize(['admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 1) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user', details: err });
  }
});

app.patch('/admin/users/:id/block', async (req, res) => {
  const { id } = req.params;
  const { blocked } = req.body;
  try {
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $set: { blocked } }
    );
    if (result.modifiedCount === 1) {
      res.status(200).json({ message: `User ${blocked ? 'blocked' : 'unblocked'}` });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Block action failed', details: err });
  }
});

app.get('/admin/analytics', async (req, res) => {
  try {
    const totalUsers = await db.collection('users').countDocuments();
    const totalRides = await db.collection('rides').countDocuments();
    res.status(200).json({ totalUsers, totalRides });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics', details: err });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  console.log("Login attempt:", { email });

  try {
    const user = await db.collection('users').findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const role = typeof user.role === 'string'
      ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
      : 'User';

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      message: `${role} login successful`,
      token
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

app.post('/destinations', async (req, res) => {
  const { pickup, dropoff, customerId } = req.body;

  if (!pickup || !dropoff || !customerId) {
    return res.status(400).json({ error: 'pickup, dropoff, and customerId are required' });
  }

  try {
    const destination = { pickup, dropoff, customerId, createdAt: new Date() };
    const result = await db.collection('destinations').insertOne(destination);
    res.status(201).json({ message: 'Destination added', id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add destination', details: err });
  }
});

// ✅ Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
