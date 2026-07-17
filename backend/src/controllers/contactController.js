const Contact = require('../models/Contact');

// Get all contacts for the logged-in user
exports.getContacts = async (req, res, next) => {
  try {
    const contacts = await Contact.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    next(error);
  }
};

// Add a new contact
exports.addContact = async (req, res, next) => {
  try {
    const { contactName, phoneNumber, relation } = req.body;

    if (!contactName || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'Name and Phone number are required' });
    }

    // Check if user already has 5 contacts (optional limit)
    const count = await Contact.countDocuments({ userId: req.user._id });
    if (count >= 5) {
      return res.status(400).json({ success: false, message: 'You can only add up to 5 emergency contacts' });
    }

    const contact = await Contact.create({
      userId: req.user._id,
      contactName,
      phoneNumber,
      relation
    });

    res.status(201).json({ success: true, data: contact });
  } catch (error) {
    next(error);
  }
};

// Delete a contact
exports.deleteContact = async (req, res, next) => {
  try {
    const contact = await Contact.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Contact not found or unauthorized' });
    }

    await contact.deleteOne();
    res.status(200).json({ success: true, message: 'Contact deleted successfully' });
  } catch (error) {
    next(error);
  }
};
