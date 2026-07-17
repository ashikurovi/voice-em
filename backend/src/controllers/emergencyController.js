const emergencyService = require('../services/emergencyService');
const EmergencyEvent = require('../models/EmergencyEvent');
const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../models/User');
const { activeSockets } = require('../utils/socketStore');

// Get user SOS history
const getUserHistory = async (req, res, next) => {
  try {
    const events = await EmergencyEvent.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
};

const triggerAlert = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const userName = req.user.fullName;

    const { 
      lat, 
      lng, 
      battery, 
      contacts, 
      triggerType, // e.g. 'POLICE', 'FIRE_SERVICE', 'GENERAL'
      authorityEmails // Optional array of emails passed directly from the mobile app (OSM lookup)
    } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'Location coordinates missing' });
    }

    const event = await emergencyService.triggerEmergency(
      userId, 
      userName, 
      lat, 
      lng, 
      battery, 
      contacts || [], 
      triggerType, 
      authorityEmails || []
    );
    
    res.status(200).json({ 
      success: true, 
      message: `Emergency (${triggerType || 'GENERAL'}) triggered successfully.`, 
      eventId: event._id 
    });
  } catch (error) {
    next(error);
  }
};

const getEventById = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid Tracking ID format.' });
    }

    const event = await EmergencyEvent.findById(req.params.id).populate('userId', 'fullName phoneNumber');
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
};

const getNearbyServices = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid Tracking ID format.' });
    }

    const event = await EmergencyEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    const lat = event.locationTrail[0].lat;
    const lng = event.locationTrail[0].lng;
    const radius = 5000; // Reduced to 5km to prevent Overpass API 504 Gateway Timeout

    // Overpass QL query to find nearby police, hospital, and pharmacy
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="police"](around:${radius},${lat},${lng});
        node["amenity"="hospital"](around:${radius},${lat},${lng});
        node["amenity"="pharmacy"](around:${radius},${lat},${lng});
        node["amenity"="fire_station"](around:${radius},${lat},${lng});
        node["emergency"="ambulance_station"](around:${radius},${lat},${lng});
        node["emergency"="rescue_station"](around:${radius},${lat},${lng});
      );
      out body;
      >;
      out skel qt;
    `;

    // Overpass API requires a custom User-Agent, otherwise it returns 406 Not Acceptable
    const response = await axios.post('https://overpass-api.de/api/interpreter', 
      `data=${encodeURIComponent(overpassQuery)}`, 
      {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'VoiceEmergencySystemApp/1.0 (https://github.com/emergency-system)'
        }
      }
    );

    const elements = response.data.elements || [];
    
    // Helper function to calculate distance using Haversine formula
    const getDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return (R * c).toFixed(1);
    };

    // Format the response
    const nearbyServices = elements
      .filter(el => el.type === 'node' && el.tags)
      .map(el => {
        let addressParts = [];
        if (el.tags['addr:housenumber']) addressParts.push(el.tags['addr:housenumber']);
        if (el.tags['addr:street']) addressParts.push(el.tags['addr:street']);
        if (el.tags['addr:city'] || el.tags['is_in:city']) addressParts.push(el.tags['addr:city'] || el.tags['is_in:city']);
        if (el.tags['addr:postcode']) addressParts.push(el.tags['addr:postcode']);
        
        const address = el.tags['addr:full'] || (addressParts.length > 0 ? addressParts.join(', ') : null);
        const distanceStr = getDistance(lat, lng, el.lat, el.lon);
        const distanceVal = parseFloat(distanceStr);
        
        return {
          id: el.id,
          lat: el.lat,
          lng: el.lon,
          type: el.tags.amenity || el.tags.emergency, // police, hospital, pharmacy, fire_station, ambulance_station, rescue_station
          name: el.tags.name || 'Unknown',
          phone: el.tags.phone || el.tags['contact:phone'] || '999',
          email: el.tags.email || el.tags['contact:email'] || null,
          website: el.tags.website || el.tags['contact:website'] || null,
          address: address ? `${address} (${distanceStr} km away)` : `${distanceStr} km away from your location`,
          distance: distanceVal
        };
      });

    // Sort by closest distance first
    nearbyServices.sort((a, b) => a.distance - b.distance);

    res.status(200).json({ success: true, data: nearbyServices });
  } catch (error) {
    console.error('Overpass API Error:', error.message);
    // Return empty array instead of 500 error so frontend doesn't crash
    res.status(200).json({ success: true, data: [] });
  }
};

const getNearbyActiveUsers = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const currentUserId = req.user._id.toString();

    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'Latitude and Longitude are required' });
    }

    const myLat = parseFloat(lat);
    const myLng = parseFloat(lng);

    // Helper function to calculate distance in km using Haversine formula
    const getDistanceKm = (lat1, lon1, lat2, lon2) => {
      const toRad = x => (x * Math.PI) / 180;
      const R = 6371; // Earth's radius in km
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let nearbyUsersResult = [];

    // Fetch all users with a saved lastLocation
    const allUsers = await User.find({ 
      'lastLocation.lat': { $exists: true }, 
      'lastLocation.lng': { $exists: true } 
    }).select('fullName phoneNumber lastLocation');

    for (const user of allUsers) {
      if (user._id.toString() === currentUserId) continue; // Skip self

      const distance = getDistanceKm(myLat, myLng, user.lastLocation.lat, user.lastLocation.lng);
      
      // Check if within 1 km and location was updated recently (optional, let's say within last 24h)
      // For now, just distance
      if (distance <= 1.0) {
        nearbyUsersResult.push({
          _id: user._id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          distance: distance.toFixed(2)
        });
      }
    }

    // Sort by closest distance first
    nearbyUsersResult.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

    res.status(200).json({ success: true, data: nearbyUsersResult });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserHistory,
  triggerAlert,
  getEventById,
  getNearbyServices,
  getNearbyActiveUsers
};
