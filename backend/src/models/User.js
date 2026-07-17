const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String }, // Required when using JWT auth
  role: { type: String, enum: ['USER', 'SUPERADMIN'], default: 'USER' },
  bloodGroup: { type: String },
  stealthModeEnabled: { type: Boolean, default: true },
  lastLocation: {
    lat: { type: Number },
    lng: { type: Number },
    updatedAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
