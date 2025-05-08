const Item = require('../models/itemModel.js');
const User = require('../models/userModel.js');

// Get all items
exports.getAllItems = async (req, res) => {
  try {
    const items = await Item.find(); // Retrieves all items from the Item collection in database
    res.json(items); // Sends the retrieved items as a JSON response
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get item by ID
exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id); // Retrieves the item from the Item collection 
    // using the ID provided in the request parameters
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    res.json(item);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.status(500).send('Server error');
  }
};

// Create new item
exports.createItem = async (req, res) => {
  try {
    const { name, type, description, effects, price, rarity } = req.body;
    
    // Create new item
    const newItem = new Item({
      name,
      type,
      description,
      effects,
      price,
      rarity,
      user: req.user.id
    });
    
    // Saves the new item to the database
    const item = await newItem.save();
    
    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Update item
exports.updateItem = async (req, res) => {
  try {
    const { name, type, description, effects, price, rarity } = req.body;
    
    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (type) updateFields.type = type;
    if (description) updateFields.description = description;
    if (effects) updateFields.effects = effects;
    if (price) updateFields.price = price;
    if (rarity) updateFields.rarity = rarity;
    
    // Find item
    let item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Check if user owns the item
    if (item.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    // Update item
    item = await Item.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );
    
    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Delete item
exports.deleteItem = async (req, res) => {
  try {
    // Find item
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    // Check if user owns the item 
    if (item.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    // Delete item
    await Item.findByIdAndRemove(req.params.id);
    
    res.json({ message: 'Item removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.status(500).send('Server error');
  }
};

// @desc    Get all items
// @route   GET /api/items
// @access  Private
exports.getItems = async (req, res) => {
  try {
    // Filter by type if specified in query
    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    const items = await Item.find(filter);
    
    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (err) {
    console.error('Error fetching items:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: err.message
    });
  }
};

// @desc    Get a single item
// @route   GET /api/items/:id
// @access  Private
exports.getItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: item
    });
  } catch (err) {
    console.error('Error fetching item:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: err.message
    });
  }
};

// @desc    Purchase an item
// @route   POST /api/items/:id/purchase
// @access  Private
exports.purchaseItem = async (req, res) => {
  try {
    // Find the item
    const item = await Item.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
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
    
    // Get the price in coins
    const priceCoins = item.price && item.price.coins ? item.price.coins : 0;
    
    // Check if user has enough coins
    if (user.coins < priceCoins) {
      return res.status(400).json({
        success: false,
        error: 'Not enough coins to purchase this item'
      });
    }
    
    // Deduct coins
    user.coins -= priceCoins;
    
    // Add item to inventory or increase quantity if already owned
    const existingItem = user.inventory.find(
      invItem => invItem.item.toString() === item._id.toString()
    );
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      user.inventory.push({
        item: item._id,
        quantity: 1
      });
    }
    
    // Save updated user
    await user.save();
    
    // Get full inventory with populated items
    const updatedUser = await User.findById(req.user.id).populate({
      path: 'inventory.item',
      model: 'Item',
      select: 'name type description effects rarity'
    });
    
    res.status(200).json({
      success: true,
      message: `Successfully purchased ${item.name}`,
      data: {
        coins: updatedUser.coins,
        inventory: updatedUser.inventory
      }
    });
  } catch (err) {
    console.error('Error purchasing item:', err.message);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: err.message
    });
  }
};