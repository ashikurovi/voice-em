const express = require('express');
const router = express.Router();
const { getUsers, getEvents, addAuthority } = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');
const { admin } = require('../middlewares/adminMiddleware');

// All routes in this file are protected and require SUPERADMIN role
router.use(protect, admin);

router.route('/users').get(getUsers);
router.route('/events').get(getEvents);
router.route('/authorities').post(addAuthority);

module.exports = router;
