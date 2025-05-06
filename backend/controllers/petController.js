const Pet = require('../models/petModel');
const User = require('../models/userModel');
const gameLogic = require('../utils/gameLogic');

// @desc    Create new pet
// @route   POST /api/pets
// @access  Private
exports.createPet = async (req, res, next) => {
  try {
    console.log('Create pet request received:', req.body);
    req.body.owner = req.user.id;
    
    // Check if user already has a pet
    const existingPet = await Pet.findOne({ owner: req.user.id });
    
    if (existingPet) {
      console.log('User already has a pet:', existingPet._id);
      return res.status(400).json({
        success: false,
        error: 'You already have a pet'
      });
    }
    
    console.log('Creating pet with data:', req.body);
    const pet = await Pet.create(req.body);
    console.log('Pet created:', pet._id);
    
    // Update user with the selected pet
    const updatedUser = await User.findByIdAndUpdate(req.user.id, {
      hasSelectedPet: true,
      selectedPet: pet._id
    }, { new: true }).select('-password');
    console.log('User updated with pet:', updatedUser._id);
    
    res.status(201).json({
      success: true,
      data: {
        pet,
        user: updatedUser
      }
    });
  } catch (err) {
    console.error('Error creating pet:', err.message);
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
    const Item = require('../models/itemModel');
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
    pet.attributes.happiness = Math.min(100, pet.attributes.happiness + item.effects.happiness);
    pet.experience += item.effects.experience;
    
    // Regenerate 10 stamina if not full
    if (pet.attributes.stamina < 100) {
      pet.attributes.stamina = Math.min(100, pet.attributes.stamina + 10);
    }
    
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
      const Item = require('../models/itemModel');
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

// @desc    Rename pet
// @route   PUT /api/pets/:id/rename
// @access  Private
exports.renamePet = async (req, res, next) => {
  try {
    console.log('Rename pet request received for pet ID:', req.params.id);
    console.log('New name:', req.body.name);
    
    // Validate request body
    if (!req.body.name || req.body.name.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Pet name is required'
      });
    }
    
    // Get pet
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
        error: 'Not authorized to rename this pet'
      });
    }
    
    // Update pet name
    pet.name = req.body.name.trim();
    await pet.save();
    
    console.log('Pet renamed successfully:', pet.name);
    
    res.status(200).json({
      success: true,
      data: pet
    });
  } catch (err) {
    console.error('Error renaming pet:', err.message);
    next(err);
  }
};

// @desc    Train pet to gain experience
// @route   PUT /api/pets/:id/train
// @access  Private
exports.trainPet = async (req, res, next) => {
  try {
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
        error: 'Not authorized to train this pet'
      });
    }
    
    // Check if pet has enough stamina
    if (pet.attributes.stamina < 10) {
      return res.status(400).json({
        success: false,
        error: 'Pet does not have enough stamina to train'
      });
    }
    
    // Add experience and decrease stamina
    pet.experience += 20;
    pet.attributes.stamina = Math.max(0, pet.attributes.stamina - 10);
    
    // Check if pet levels up
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

// @desc    Use medicine to regenerate HP
// @route   PUT /api/pets/:id/medicine
// @access  Private
exports.medicinePet = async (req, res, next) => {
  try {
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
        error: 'Not authorized to give medicine to this pet'
      });
    }
    
    // Check if the pet already has full HP
    if (pet.currentHP >= pet.stats.hp) {
      return res.status(400).json({
        success: false,
        error: 'Pet already has full HP'
      });
    }
    
    // Set or increment current HP
    if (pet.currentHP === undefined) {
      pet.currentHP = Math.min(pet.stats.hp, pet.stats.hp * 0.2 + (pet.currentHP || 0));
    } else {
      // Regenerate 20% of max HP
      pet.currentHP = Math.min(pet.stats.hp, pet.currentHP + (pet.stats.hp * 0.2));
    }
    
    pet.lastInteraction = Date.now();
    
    await pet.save();
    
    res.status(200).json({
      success: true,
      data: pet
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Take pet outdoors for temporary buffs
// @route   PUT /api/pets/:id/outdoor
// @access  Private
exports.outdoorPet = async (req, res, next) => {
  try {
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
        error: 'Not authorized to take this pet outdoors'
      });
    }
    
    // Check if pet already has active buffs
    if (pet.activeBuffs && pet.activeBuffs.expiresAt > Date.now()) {
      return res.status(400).json({
        success: false,
        error: 'Pet already has active buffs'
      });
    }
    
    // Generate random buffs - 10% increase to a random combination of stats
    const buffAmount = 0.1; // 10% buff
    const buffDuration = 30 * 60 * 1000; // 30 minutes in milliseconds
    
    // Initialize activeBuffs if it doesn't exist
    if (!pet.activeBuffs) {
      pet.activeBuffs = {};
    }
    
    // Apply buffs to random stats (HP, SP, ATK, DEF)
    const statOptions = ['hp', 'sp', 'atk', 'def'];
    const selectedStats = [];
    
    // Randomly select 2-3 stats to buff
    const numStatsToBuff = Math.floor(Math.random() * 2) + 2; // 2 or 3
    
    for (let i = 0; i < numStatsToBuff; i++) {
      const randomIndex = Math.floor(Math.random() * statOptions.length);
      const stat = statOptions.splice(randomIndex, 1)[0];
      selectedStats.push(stat);
    }
    
    // Set buff values
    pet.activeBuffs.stats = {};
    selectedStats.forEach(stat => {
      pet.activeBuffs.stats[stat] = Math.floor(pet.stats[stat] * buffAmount);
    });
    
    // Set expiration time
    pet.activeBuffs.expiresAt = Date.now() + buffDuration;
    
    // Update pet interaction time
    pet.lastInteraction = Date.now();
    
    await pet.save();
    
    res.status(200).json({
      success: true,
      data: pet,
      buffDetails: {
        buffedStats: selectedStats,
        duration: '30 minutes'
      }
    });
  } catch (err) {
    next(err);
  }
};