const express = require('express');
const router = express.Router(); // to create modular, mountable route handlers
const { check, validationResult } = require('express-validator'); // from the express-validator library used for validating and sanitizing user input
const auth = require('backend/middleware/auth.js');
const User = require('backend/models/userModel.js');

// @route   GET api/users
// @desc    Get all users  
// @access  Private/Admin  restricted to admin users
router.get('/', auth, async (req, res) => {
  try {
    // Check if requesting user is admin
    const user = await User.findById(req.user.id).select('-password');
    if (!user.isAdmin) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const users = await User.find().select('-password'); // fetches all users from the database without password
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/users/me
// @desc    Get current user profile
// @access  Private                     get the profile of the currently authenticated user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password'); // fetches the current user's details from the database, excluding the password
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/users/:id     :id : placeholder for the user ID
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password'); // fetches the user details from the database using the ID provided in the request parameters
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   PUT api/users/me
// @desc    Update current user profile
// @access  Private
router.put('/me', [ // check functions from express-validator 
// used to validate the name and email fields in the request body.
  auth,
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { name, email, avatar } = req.body;
  
  try {
    let user = await User.findById(req.user.id); // fetches the current user's details from the database using the ID from the authenticated request
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Update user fields
    user.name = name;
    user.email = email;
    if (avatar) user.avatar = avatar; // checks if an avatar value is provided in the request body
    // If an avatar is provided, it sets the avatar field of the user object to this value
    
    await user.save(); // saved to the database
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/users/me
// @desc    Delete current user
// @access  Private
router.delete('/me', auth, async (req, res) => {
  try {
    // Remove user
    await User.findByIdAndRemove(req.user.id);
    res.json({ msg: 'User deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;