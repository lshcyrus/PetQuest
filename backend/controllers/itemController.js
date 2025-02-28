const Item = require('backend/models/itemModel.js');

// Get all items
exports.getAllItems = async (req, res) => {
  try {
    const items = await Item.find(); // Retrieves all items from the Item collection in the database
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
    
    // Check if user owns the item ?????????????????????????
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