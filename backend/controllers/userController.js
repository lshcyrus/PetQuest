const User = require('../models/userModel.js');
const Item = require('../models/itemModel.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      username,
      email,
      password
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    // Save user to database
    await user.save();

    // Create and return JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Check if user exists by email or username
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (username) {
      user = await User.findOne({ username });
    }
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create and return JWT token
    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('selectedPet');
    
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { username, email } = req.body; // Extracts username and email from the request
    
    // Build update object
    const updateFields = {}; // hold the fields to be updated
    // Adds username OR email to the update object
    if (username) updateFields.username = username;
    if (email) updateFields.email = email;
    
    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,//find the user by their ID and updates the specified fields
      { $set: updateFields },
      { new: true } // ensures the updated document is returned
    ).select('-password');
    
    res.json(user);// Sends the updated user data as a JSON response
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Get user inventory with populated item details
// @route   GET /api/users/me/inventory
// @access  Private
exports.getUserInventory = async (req, res) => {
  try {
    // Find the user and populate their inventory items with full details
    const user = await User.findById(req.user.id)
      .populate({
        path: 'inventory.item',
        model: 'Item',
        select: 'name type description effects rarity'
      });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user.inventory
    });
  } catch (err) {
    console.error('Error fetching user inventory:', err);
    res.status(500).json({
      success: false,
      error: 'Server error while fetching inventory'
    });
  }
};

// @desc    Update user coins (add or set)
// @route   PUT /api/users/me/coins
// @access  Private
exports.updateUserCoins = async (req, res) => {
  try {
    const { coins, delta } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (typeof delta === 'number') {
      user.coins = Math.max(0, user.coins + delta);
    } else if (typeof coins === 'number') {
      user.coins = Math.max(0, coins);
    } else {
      return res.status(400).json({ success: false, error: 'No coins or delta provided' });
    }
    await user.save();
    res.status(200).json({ success: true, coins: user.coins });
  } catch (err) {
    console.error('Error updating user coins:', err);
    res.status(500).json({ success: false, error: 'Server error while updating coins' });
  }
};

// @desc    Update user gems (add or set)
// @route   PUT /api/users/me/gems
// @access  Private
exports.updateUserGems = async (req, res) => {
  try {
    const { gems, delta } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (typeof delta === 'number') {
      user.gems = Math.max(0, user.gems + delta);
    } else if (typeof gems === 'number') {
      user.gems = Math.max(0, gems);
    } else {
      return res.status(400).json({ success: false, error: 'No gems or delta provided' });
    }
    await user.save();
    return res.status(200).json({
      success: true,
      data: { gems: user.gems }
    });
  } catch (error) {
    console.error('Error updating user gems:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Add battle reward items to user inventory
// @route   POST /api/users/me/battle-rewards
// @access  Private
exports.addBattleRewards = async (req, res) => {
  try {
    // Check if items array is provided
    const { items } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No items provided or invalid items format'
      });
    }
    
    // Find the user
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const addedItems = [];
    
    // Process each item from the rewards
    for (const itemInfo of items) {
      // Validate item info
      if (!itemInfo.type || !itemInfo.rarity) {
        console.warn('Invalid item info:', itemInfo);
        continue;
      }
      
      // Find a random item of the given type and rarity from the database
      const matchingItems = await Item.find({
        type: itemInfo.type,
        rarity: itemInfo.rarity
      });
      
      if (matchingItems.length === 0) {
        console.warn(`No items found for type: ${itemInfo.type}, rarity: ${itemInfo.rarity}`);
        continue;
      }
      
      // Select a random item from the matching items
      const selectedItem = matchingItems[Math.floor(Math.random() * matchingItems.length)];
      
      // Check if the item already exists in user's inventory
      const existingItem = user.inventory.find(
        inv => inv.item.toString() === selectedItem._id.toString()
      );
      
      if (existingItem) {
        // Increment quantity if item already exists
        existingItem.quantity += 1;
      } else {
        // Add the new item to inventory
        user.inventory.push({
          item: selectedItem._id,
          quantity: 1
        });
      }
      
      // Add to the list of successfully added items
      addedItems.push({
        name: selectedItem.name,
        type: selectedItem.type,
        rarity: selectedItem.rarity
      });
    }
    
    // Save the updated user
    await user.save();
    
    // Return the list of added items
    return res.status(200).json({
      success: true,
      data: {
        addedItems
      }
    });
  } catch (error) {
    console.error('Error adding battle rewards:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};