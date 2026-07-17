const mongoose = require('mongoose');

const authorityDirectorySchema = new mongoose.Schema({
  type: { type: String, enum: ['POLICE', 'FIRE_SERVICE', 'HOSPITAL'], required: true },
  name: { type: String, required: true },
  email: { type: String },
  phoneNumber: { type: String, required: true },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [longitude, latitude] for $near queries
  }
}, { timestamps: true });

// Create a 2dsphere index for geospatial queries
authorityDirectorySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('AuthorityDirectory', authorityDirectorySchema);
