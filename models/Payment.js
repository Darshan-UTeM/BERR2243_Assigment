const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  amount: Number,
  method: { type: String, enum: ['cash', 'credit', 'wallet'], required: true },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  paidAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
