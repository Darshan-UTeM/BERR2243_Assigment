const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plateNo: { type: String, required: true },
  model: String,
  type: String,
  color: String,
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
