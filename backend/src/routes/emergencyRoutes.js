const express = require('express');
const router = express.Router();
const emergencyController = require('../controllers/emergencyController');
const { protect } = require('../middlewares/authMiddleware');

// POST /api/emergency/trigger
router.post('/trigger', protect, emergencyController.triggerAlert);

// GET /api/emergency/history (Must be before /:id)
router.get('/history', protect, emergencyController.getUserHistory);

// GET /api/emergency/nearby-users (Must be before /:id)
router.get('/nearby-users', protect, emergencyController.getNearbyActiveUsers);

// GET /api/emergency/:id
router.get('/:id', emergencyController.getEventById);

// GET /api/emergency/:id/nearby
router.get('/:id/nearby', emergencyController.getNearbyServices);

module.exports = router;
