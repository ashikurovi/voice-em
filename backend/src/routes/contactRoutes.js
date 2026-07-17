const express = require('express');
const router = express.Router();
const { getContacts, addContact, deleteContact } = require('../controllers/contactController');
const { protect } = require('../middlewares/authMiddleware');

// Protect all contact routes
router.use(protect);

router.route('/')
  .get(getContacts)
  .post(addContact);

router.route('/:id')
  .delete(deleteContact);

module.exports = router;
