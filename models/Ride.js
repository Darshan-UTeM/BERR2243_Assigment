const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pickup: String,
  destination: String,
  status: { type: String, enum: ['requested', 'accepted', 'completed'], default: 'requested' },
  fare: Number,
  requestedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ride', rideSchema);
