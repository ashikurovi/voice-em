const User = require('../models/User');
const EmergencyEvent = require('../models/EmergencyEvent');
const AuthorityDirectory = require('../models/AuthorityDirectory');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-passwordHash');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all emergency events
// @route   GET /api/admin/events
// @access  Private/Admin
const getEvents = async (req, res, next) => {
  try {
    const events = await EmergencyEvent.find({}).populate('userId', 'fullName phoneNumber email');
    res.status(200).json({ success: true, count: events.length, data: events });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a new authority (Police/Fire/Hospital)
// @route   POST /api/admin/authorities
// @access  Private/Admin
const addAuthority = async (req, res, next) => {
  try {
    const { type, name, email, phoneNumber, lat, lng } = req.body;
    
    const authority = new AuthorityDirectory({
      type,
      name,
      email,
      phoneNumber,
      location: {
        type: 'Point',
        coordinates: [lng, lat] // GeoJSON format: Longitude first
      }
    });

    await authority.save();
    res.status(201).json({ success: true, data: authority });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getEvents,
  addAuthority
};
