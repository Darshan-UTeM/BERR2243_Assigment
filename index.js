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

// 1️⃣ POST /users – Create a new user
app.post('/users', async (req, res) => {
  try {
    const user = req.body;
    const result = await db.collection('users').insertOne(user);
    res.status(201).json({ message: 'User created', userId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// 2️⃣ GET /users – Get all users
app.get('/users', async (req, res) => {
  try {
    const users = await db.collection('users').find().toArray();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 3️⃣ PATCH /users/:id – Update user by ID
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

// 4️⃣ DELETE /users/:id – Delete user by ID
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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
