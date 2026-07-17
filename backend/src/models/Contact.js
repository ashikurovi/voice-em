const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contactName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String },
  relation: { type: String },
  priority: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);
