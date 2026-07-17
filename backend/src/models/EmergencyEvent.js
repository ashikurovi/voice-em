const mongoose = require('mongoose');

const emergencyEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['ACTIVE', 'RESOLVED', 'FALSE_ALARM'], default: 'ACTIVE' },
  triggerType: { type: String, default: 'GENERAL' },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  locationTrail: [{
    lat: Number,
    lng: Number,
    timestamp: { type: Date, default: Date.now },
    batteryLevel: Number
  }]
}, { timestamps: true });

module.exports = mongoose.model('EmergencyEvent', emergencyEventSchema);
