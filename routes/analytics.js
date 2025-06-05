const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = mongoose.connection.collection('users');

router.get('/passengers', async (req, res) => {
  try {
    const result = await User.aggregate([
      {
        $lookup: {
          from: 'rides',
          localField: '_id',
          foreignField: 'userId',
          as: 'rideDetails'
        }
      },
      { $unwind: '$rideDetails' },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          totalRides: { $sum: 1 },
          totalFare: { $sum: '$rideDetails.fare' },
          avgDistance: { $avg: '$rideDetails.distance' }
        }
      },
      {
        $project: {
          _id: 0,
          name: 1,
          totalRides: 1,
          totalFare: 1,
          avgDistance: 1
        }
      }
    ]).toArray();

    res.json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
