const Pet = require('../models/petModel');
const User = require('../models/userModel');
const gameLogic = require('../utils/gameLogic');

// @desc    Create new pet
// @route   POST /api/pets
// @access  Private
exports.createPet = async (req, res, next) => {
  try {
    req.body.owner = req.user.id;
    
    // Check if user already has a pet
    const existingPet = await Pet.findOne({ owner: req.user.id });
    
    if (existingPet) {
      return res.status(400).json({
        success: false,
        error: 'You already have a pet'
      });
    }
    
    const pet = await Pet.create(req.body);
    
    // Update user with the selected pet
    const updatedUser = await User.findByIdAndUpdate(req.user.id, {
      hasSelectedPet: true,
      selectedPet: pet._id
    }, { new: true }).select('-password');
    
    res.status(201).json({
      success: true,
      data: {
        pet,
        user: updatedUser
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all pets for user
// @route   GET /api/pets
// @access  Private
exports.getPets = async (req, res, next) => {
  try {
    const pets = await Pet.find({ owner: req.user.id });
    
    // Update stats for all pets based on time passed
    for (let pet of pets) {
      await pet.updateStats();
    }
    
    res.status(200).json({
      success: true,
      count: pets.length,
      data: pets
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single pet
// @route   GET /api/pets/:id
// @access  Private
exports.getPet = async (req, res, next) => {
  try {
    const pet = await Pet.findById(req.params.id);
    
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Pet not found'
      });
    }
    
    // Check if pet belongs to user
    if (pet.owner.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this pet'
      });
    }
    
    // Update pet stats
    await pet.updateStats();
    
    res.status(200).json({
      success: true,
      data: pet
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Feed pet
// @route   PUT /api/pets/:id/feed
// @access  Private
exports.feedPet = async (req, res, next) => {
  try {
    const { itemId } = req.body;
    
    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an item to feed'
      });
    }
    
    // Get pet
    let pet = await Pet.findById(req.params.id);
    
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Pet not found'
      });
    }
    
    // Check if pet belongs to user
    if (pet.owner.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to feed this pet'
      });
    }
    
    // Find the item in user's inventory
    const user = await User.findById(req.user.id);
    const inventoryItem = user.inventory.find(i => i.item.toString() === itemId);
    
    if (!inventoryItem || inventoryItem.quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Item not found in inventory'
      });
    }
    
    // Get item details
    const Item = require('../models/Item');
    const item = await Item.findById(itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    // Check if item is food
    if (item.type !== 'food') {
      return res.status(400).json({
        success: false,
        error: 'This item cannot be used for feeding'
      });
    }
    
    // Apply item effects to pet
    pet.attributes.hunger = Math.min(100, pet.attributes.hunger + item.effects.hunger);
    pet.attributes.health = Math.min(100, pet.attributes.health + item.effects.health);
    pet.attributes.happiness = Math.min(100, pet.attributes.happiness + item.effects.happiness);
    pet.experience += item.effects.experience;
    
    const levelUpResult = gameLogic.checkLevelUp(pet);
    pet = levelUpResult.pet;
    
    pet.lastFed = Date.now();
    
    await pet.save();
    
    inventoryItem.quantity--;
    if (inventoryItem.quantity <= 0) {
      user.inventory = user.inventory.filter(i => i.item.toString() !== itemId);
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      data: pet,
      levelUp: levelUpResult.leveledUp
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Play with pet
// @route   PUT /api/pets/:id/play
// @access  Private
exports.playWithPet = async (req, res, next) => {
  try {
    const { itemId } = req.body;
    
    let pet = await Pet.findById(req.params.id);
    
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Pet not found'
      });
    }
    
    // Check if pet belongs to user
    if (pet.owner.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to play with this pet'
      });
    }
    
    if (itemId) {
      // Check if the item in user's inventory
      const user = await User.findById(req.user.id);
      const inventoryItem = user.inventory.find(i => i.item.toString() === itemId);
      
      if (!inventoryItem || inventoryItem.quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Item not found in inventory'
        });
      }
      
      // Get item details
      const Item = require('../models/Item');
      const item = await Item.findById(itemId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Item not found'
        });
      }
      
      // Check if item is a toy
      if (item.type !== 'toy') {
        return res.status(400).json({
          success: false,
          error: 'This item cannot be used for playing'
        });
      }
      
      // Apply item effects to pet
      pet.attributes.happiness = Math.min(100, pet.attributes.happiness + item.effects.happiness);
      pet.experience += item.effects.experience;
      
      // Decrease item quantity in inventory
      inventoryItem.quantity--;
      if (inventoryItem.quantity <= 0) {
        user.inventory = user.inventory.filter(i => i.item.toString() !== itemId);
      }
      
      await user.save();
    } else {
      pet.attributes.happiness = Math.min(100, pet.attributes.happiness + 10);
      pet.experience += 5;
    }
    
    const levelUpResult = gameLogic.checkLevelUp(pet);
    pet = levelUpResult.pet;
    
    pet.lastInteraction = Date.now();
    
    await pet.save();
    
    res.status(200).json({
      success: true,
      data: pet,
      levelUp: levelUpResult.leveledUp
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Select a pet as the user's chosen pet
// @route   PUT /api/pets/:id/select
// @access  Private
exports.selectPet = async (req, res, next) => {
  try {
    const petId = req.params.id;
    
    // Validate pet ID
    if (!petId || petId === 'undefined') {
      return res.status(400).json({
        success: false,
        error: 'Invalid pet ID provided'
      });
    }
    
    const pet = await Pet.findById(petId);
    
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Pet not found'
      });
    }
    
    // Check if pet belongs to user
    if (pet.owner.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to select this pet'
      });
    }
    
    // Update user with the selected pet
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      {
        hasSelectedPet: true,
        selectedPet: pet._id
      },
      { new: true }
    ).select('-password');
    
    res.status(200).json({
      success: true,
      data: {
        user,
        pet
      }
    });
  } catch (err) {
    next(err);
  }
};