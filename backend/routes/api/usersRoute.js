const express = require('express');
const router = express.Router(); // to create modular, mountable route handlers
const { check, validationResult } = require('express-validator'); // from the express-validator library used for validating and sanitizing user input
const {protect} = require('../../middleware/auth.js');
const User = require('../../models/userModel.js');
const { getUserInventory } = require('../../controllers/userController');
const userController = require('../../controllers/userController');

// @route   GET api/users
// @desc    Get all users  
// @access  Private/Admin  restricted to admin users
router.get('/', protect, async (req, res) => {
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
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    console.log('Accessing /users/me route, user ID:', req.user._id.toString());
    
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('selectedPet');
    
    if (!user) {
      console.log('User not found in /me route for ID:', req.user._id);
      return res.status(404).json({ 
        success: false,
        msg: 'User not found' 
      });
    }
    
    console.log('User found, returning profile for:', user.username);
    
    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('Error in /users/me route:', err);
    
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err.message
    });
  }
});

// @route   GET api/users/:id     :id : placeholder for the user ID
// @desc    Get user by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
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
protect,
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
router.delete('/me', protect, async (req, res) => {
  try {
    // Remove user
    await User.findByIdAndRemove(req.user.id);
    res.json({ msg: 'User deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get user inventory
router.get("/me/inventory", protect, getUserInventory);

// Add route to update user coins
router.put('/me/coins', protect, userController.updateUserCoins);

// Add route to update user gems
router.put('/me/gems', protect, userController.updateUserGems);

// Add route to process battle rewards
router.post('/me/battle-rewards', protect, userController.addBattleRewards);

module.exports = router;