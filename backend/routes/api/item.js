const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('backend/middleware/auth.js');
const Item = require('backend/models/itemModel.js');
const User = require('backend/models/userModel.js');

// @route   GET api/items
// @desc    Get all items
// @access  Public
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().sort({ date: -1 });
    // fetch all items from the database, sorting them by date in descending order
    res.json(items);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/items/:id     :id : a placeholder for the item ID
// @desc    Get item by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id); // fetch the item from the database using the ID provided in the request parameters
    if (!item) {
      return res.status(404).json({ msg: 'Item not found' });
    }
    res.json(item);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Item not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   POST api/items
// @desc    Create an item
// @access  Private/Admin
router.post('/', [
  auth,
  [
    check('name', 'Name is required').not().isEmpty(),
    check('type', 'Type is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    check('effects', 'Effects is required').not().isEmpty(),
    check('price', 'Price is required').isNumeric(),
    check('rarity', 'Rarity is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id).select('-password');
    if (!user.isAdmin) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const { name, type, description, effects, price, rarity, image } = req.body;
    
    // Create new item
    const newItem = new Item({
        name, type, 
        description, effects, 
        price, rarity, image
    });
    
    const item = await newItem.save();
    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/items/:id
// @desc    Update an item
// @access  Private/Admin
router.put('/:id', [
  auth,
  [
    check('name', 'Name is required').not().isEmpty(),
    check('type', 'Type is required').not().isEmpty(),
    check('description', 'Description is required').not().isEmpty(),
    check('effects', 'Effects is required').not().isEmpty(),
    check('price', 'Price is required').isNumeric(),
    check('rarity', 'Rarity is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id).select('-password');
    if (!user.isAdmin) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const { name, type, description, effects, price, rarity, image } = req.body;
    
    let item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ msg: 'Item not found' });
    }
    
    // Update item fields
    item.name = name;
    item.type = type;
    item.description = description;
    if (image) item.image = image;
    item.price = price;
    item.effects = effects;
    item.rarity = rarity;
    
    await item.save();
    res.json(item);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Item not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/items/:id
// @desc    Delete an item
// @access  Private/Admin
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await User.findById(req.user.id).select('-password');
    if (!user.isAdmin) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ msg: 'Item not found' });
    }
    
    await item.remove();
    res.json({ msg: 'Item removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Item not found' });
    }
    res.status(500).send('Server error');
  }
});

// @route   GET api/items/rarity/:rarity
// @desc    Get items by rarity
// @access  Public
router.get('/rarity/:rarity', async (req, res) => {
  try {
    const items = await Item.find({ rarity: req.params.rarity }).sort({ date: -1 });
    res.json(items);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/items/:id/purchase
// @desc    Purchase an item for user
// @access  Private
router.post('/:id/purchase', auth, async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ msg: 'Item not found' });
    }
    
    const user = await User.findById(req.user.id); // find the user by their ID
    
    // Check if user has enough currency
    if (user.currency < item.price) {
      return res.status(400).json({ msg: 'Insufficient funds' });
    }
    
    // Add item to user inventory and deduct currency
    user.inventory.push(item.id);
    user.currency -= item.price;
    
    await user.save();
    res.json({ msg: 'Item purchased successfully', user });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Item not found' });
    }
    res.status(500).send('Server error');
  }
});

module.exports = router;