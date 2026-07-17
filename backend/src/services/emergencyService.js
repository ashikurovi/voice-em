const EmergencyEvent = require('../models/EmergencyEvent');
const AuthorityDirectory = require('../models/AuthorityDirectory');
const Contact = require('../models/Contact');
const { sendEmergencyEmail } = require('./emailService');
const { activeSockets, getIo } = require('../utils/socketStore');
const User = require('../models/User');

// Helper to calculate distance in km using Haversine formula
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

const triggerEmergency = async (userId, userName, lat, lng, battery, familyContacts, triggerType = 'GENERAL', clientProvidedAuthorities = []) => {
  // 1. Log the event in the database
  const event = new EmergencyEvent({
    userId,
    status: 'ACTIVE',
    triggerType,
    locationTrail: [{ lat, lng, batteryLevel: battery }]
  });
  await event.save();

  // 2. Resolve Authority Emails
  let authorityEmails = [...clientProvidedAuthorities];

  // If a specific trigger type is called, we can try to find the nearest authority in the database
  if (triggerType === 'POLICE' || triggerType === 'FIRE_SERVICE') {
    try {
      // Find the nearest authority within 10km (10000 meters)
      const nearestAuthority = await AuthorityDirectory.findOne({
        type: triggerType,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat] // MongoDB requires Longitude first, then Latitude
            },
            $maxDistance: 10000
          }
        }
      });
      
      if (nearestAuthority && nearestAuthority.email) {
        authorityEmails.push(nearestAuthority.email);
        console.log(`[ROUTING] Found nearest ${triggerType}: ${nearestAuthority.name}`);
      }
    } catch (err) {
      console.error('[ROUTING ERROR] Failed to find nearest authority', err);
    }
  }

  // 3. Fetch User's Emergency Contacts
  let dispatchPhoneNumbers = [];
  if (triggerType !== 'SILENT') {
    try {
      const userContacts = await Contact.find({ userId });
      dispatchPhoneNumbers = userContacts.map(c => c.phoneNumber);
      if (dispatchPhoneNumbers.length > 0) {
        console.log(`[SMS DISPATCH] Triggering emergency SMS & Call to: ${dispatchPhoneNumbers.join(', ')}`);
        // Here you would integrate Twilio or Vonage API to send real SMS
        // Example: await twilioClient.messages.create({ body: 'SOS! Help me! Link: ...', to: contactPhone, from: ourNumber })
      }
    } catch (err) {
      console.error('[CONTACTS ERROR] Failed to fetch emergency contacts', err);
    }
  }

  // 4. Notify Nearby Portal Users (Sockets within 1km)
  if (triggerType !== 'SILENT') {
    try {
      const io = getIo();
      if (io) {
        let notifiedCount = 0;
        for (const [activeUserId, socketData] of activeSockets.entries()) {
          // Skip the victim themselves
          if (activeUserId === userId.toString()) continue;

          const distance = getDistanceKm(lat, lng, socketData.lat, socketData.lng);
          if (distance <= 1.0) { // 1 km radius
            io.to(socketData.socketId).emit('incoming_sos', {
              eventId: event._id,
              victimName: userName,
              triggerType,
              distance: distance.toFixed(2),
              lat,
              lng
            });
            notifiedCount++;
          }
        }
        console.log(`[SOCKET NOTIFICATION] Sent SOS alert to ${notifiedCount} nearby active users.`);
      }

      // 4.5 Notify Nearby Portal Users via Mobile SMS (Database check)
      let nearbyPhoneNumbers = [];
      const allUsers = await User.find({ 
        'lastLocation.lat': { $exists: true }, 
        'lastLocation.lng': { $exists: true } 
      });

      for (const user of allUsers) {
        if (user._id.toString() === userId.toString()) continue; // Skip victim

        const distance = getDistanceKm(lat, lng, user.lastLocation.lat, user.lastLocation.lng);
        if (distance <= 1.0) {
          nearbyPhoneNumbers.push(user.phoneNumber);
        }
      }

      if (nearbyPhoneNumbers.length > 0) {
        const trackingLink = `http://localhost:3000/track/${event._id}`;
        console.log(`\n[SMS DISPATCH - NEARBY USERS]`);
        console.log(`Triggering SMS to ${nearbyPhoneNumbers.length} nearby users within 1km.`);
        console.log(`Numbers: ${nearbyPhoneNumbers.join(', ')}`);
        console.log(`Message: "URGENT: SOS Alert nearby (${triggerType})! ${userName} needs help! Tracking Link: ${trackingLink}"\n`);
        // Here you would integrate Twilio or Vonage API to send real SMS
      }

    } catch (err) {
      console.error('[NEARBY NOTIFICATION ERROR] Failed to notify nearby users', err);
    }
  }

  // 5. Dispatch the emails to family + authorities
  if (triggerType !== 'SILENT') {
    await sendEmergencyEmail(userName, lat, lng, battery, familyContacts, triggerType, authorityEmails);
  }
  
  return event;
};

module.exports = {
  triggerEmergency
};
