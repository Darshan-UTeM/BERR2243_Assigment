const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors'); // ✅ Added CORS

const port = 3000;

const app = express();
app.use(cors()); // ✅ Enable CORS
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

app.get('/', (req, res) => {
  res.send('🚕 Ride-hailing API is up and connected to MongoDB!');
});

// ✅ 1. GET /rides – Fetch all rides
app.get('/rides', async (req, res) => {
  try {
    const rides = await db.collection('rides').find().toArray();
    res.status(200).json(rides);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

// ✅ 2. POST /rides – Create a new ride
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

// ✅ 3. PATCH /rides/:id – Update ride status
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

// ✅ 4. DELETE /rides/:id – Cancel a ride
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

// USERS ENDPOINTS (CRUD)

app.post('/users', async (req, res) => {
  try {
    const user = req.body;

    if (!user.role) {
      return res.status(400).json({ error: 'User role is required (e.g., customer or driver)' });
    }

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

app.post('/auth/customer', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await db.collection('users').findOne({ email, password, role: 'customer' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.status(200).json({ message: 'Customer login successful', user });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err });
  }
});

app.post('/auth/driver', async (req, res) => {
  const { email, password } = req.body;
  try {
    const driver = await db.collection('users').findOne({ email, password, role: 'driver' });
    if (!driver) return res.status(401).json({ error: 'Invalid credentials' });
    res.status(200).json({ message: 'Driver login successful', driver });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err });
  }
});

// 🚗 DRIVER APIs
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

// ✅ UPDATED: PATCH /drivers/:id/status - Update driver status using MongoDB
app.patch('/drivers/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }

  try {
    console.log("Updating driver:", id, "to status:", status);

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id), role: 'driver' },
      { $set: { status } }
    );

    console.log("Update result:", result);

    if (result.modifiedCount === 1) {
      res.status(200).json({ message: 'Driver status updated' });
    } else {
      res.status(404).json({ message: 'Driver not found or status unchanged' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update driver status', details: err });
  }
});

// ✅ UPDATED: DELETE /admin/users/:id - Block/Delete user using MongoDB
app.delete('/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  const { requesterRole } = req.body;

  if (requesterRole !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }

  try {
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 1) {
      res.status(204).send(); // No Content
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user', details: err });
  }
});

// 🛡️ ADMIN APIs
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

// 🔐 UNIVERSAL LOGIN ENDPOINT
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  console.log("Login attempt:", { email, password });

  try {
    const user = await db.collection('users').findOne({ email, password });

    console.log("User found:", user);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const role =
      typeof user.role === 'string'
        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
        : 'User';

    res.status(200).json({
      message: `${role} login successful`,
      user
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

// ADD DESTINATION (customer request)
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
