const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { protect } = require('../../middleware/auth');
const Item = require('../../models/itemModel.js');
const User = require('../../models/userModel.js');
const { 
  createItem, 
  getItems, 
  getItem, 
  purchaseItem 
} = require('../../controllers/itemController');

// @route   GET /api/items
// @desc    Get all items
// @access  Private
router.get('/', protect, getItems);

// @route   GET /api/items/:id
// @desc    Get a single item
// @access  Private
router.get('/:id', protect, getItem);

// @route   POST /api/items
// @desc    Create a new item
// @access  Private
router.post('/', protect, createItem);

// @route   POST /api/items/:id/purchase
// @desc    Purchase an item
// @access  Private
router.post('/:id/purchase', protect, purchaseItem);

// @route   PUT api/items/:id
// @desc    Update an item
// @access  Private/Admin
router.put('/:id', [
  protect,
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
router.delete('/:id', protect, async (req, res) => {
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

module.exports = router;