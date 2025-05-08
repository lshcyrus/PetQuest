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
    
    // Give the user 5 hp-potion when they create their first pet
    try {
      const Item = require('../models/itemModel');
      const hpPotionItem = await Item.findOne({ name: 'hp-potion' });
      if (hpPotionItem) {
        // Check if user already has the item in inventory
        const userDoc = await User.findById(req.user.id);
        const existingInvItem = userDoc.inventory.find((inv) => inv.item.toString() === hpPotionItem._id.toString());
        if (existingInvItem) {
          existingInvItem.quantity += 5; // add quantity if already present
        } else {
          userDoc.inventory.push({ item: hpPotionItem._id, quantity: 5 });
        }
        await userDoc.save();
      } else {
        console.warn('hp-potion item not found in database. Make sure to seed items.');
      }
    } catch (inventoryErr) {
      console.error('Error adding default hp-potions to user inventory:', inventoryErr);
    }

    // Give user 5 sp-potions when they create their first pet
    try {
      const Item = require('../models/itemModel');
      const spPotionItem = await Item.findOne({ name: 'sp-potion' });
      if (spPotionItem) {
        // Check if user already has the item in inventory
        const userDoc = await User.findById(req.user.id);
        const existingInvItem = userDoc.inventory.find((inv) => inv.item.toString() === spPotionItem._id.toString());
        if (existingInvItem) {
          existingInvItem.quantity += 5; // add quantity if already present
        } else {
          userDoc.inventory.push({ item: spPotionItem._id, quantity: 5 });
        }
        await userDoc.save();
      } else {
        console.warn('sp-potion item not found in database. Make sure to seed items.');
      }
    } catch (inventoryErr) {
      console.error('Error adding default sp-potions to user inventory:', inventoryErr);
    }
    

    // Give user an idiot sandwich when they create their first pet
    try {
      const Item = require('../models/itemModel');
      const idiotSandwichItem = await Item.findOne({ name: 'idiot sandwich' });
      if (idiotSandwichItem) {
        // Check if user already has the item in inventory  
        const userDoc = await User.findById(req.user.id);
        const existingInvItem = userDoc.inventory.find((inv) => inv.item.toString() === idiotSandwichItem._id.toString());
        if (existingInvItem) {
          existingInvItem.quantity += 1; // add quantity if already present
        } else {
          userDoc.inventory.push({ item: idiotSandwichItem._id, quantity: 1 }); 
        }
        await userDoc.save();
      } else {
        console.warn('idiot sandwich item not found in database. Make sure to seed items.');
      }
    } catch (inventoryErr) {
      console.error('Error adding idiot sandwich to user inventory:', inventoryErr);
    }
    
    
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
    
    // Get pet
    let pet = await Pet.findById(req.params.id);
    
    if (!pet) {
      return res.status(404).json({
        success: false,
        error: 'Pet not found'
      });
    }
    
    // Check if we're using direct feeding (without item)
    const directFeeding = !itemId;
    
    // Check if pet is already full (hunger = 0) or stamina is already full
    if (directFeeding) {
      if (pet.attributes.hunger <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Pet is already full'
        });
      }
      
      if (pet.attributes.stamina >= 100) {
        return res.status(400).json({
          success: false,
          error: 'Pet stamina already full'
        });
      }
    }
    
    // Check if pet belongs to user
    if (pet.owner.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to feed this pet'
      });
    }
    
    // Handle direct feeding (without item) or item-based feeding
    if (directFeeding) {
      // Apply direct feeding effects (decrease hunger, increase happiness)
      // 0 = full, 100 = very hungry
      pet.attributes.hunger = Math.max(0, pet.attributes.hunger - 15);
      
      // Increase happiness
      pet.attributes.happiness = Math.min(100, pet.attributes.happiness + 5);
      
      // Regenerate stamina
      pet.attributes.stamina = Math.min(100, pet.attributes.stamina + 10);
      
      pet.lastFed = Date.now();
      await pet.save();
      
      res.status(200).json({
        success: true,
        data: pet
      });
    } else {
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
      
      // Check if pet is already full (hunger = 0)
      if (pet.attributes.hunger <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Pet is already full'
        });
      }
      
      // Apply item effects to pet
      // Hunger should decrease when fed
      pet.attributes.hunger = Math.max(0, pet.attributes.hunger - item.effects.hunger);
      // Happiness increases as normal
      pet.attributes.happiness = Math.min(100, pet.attributes.happiness + item.effects.happiness);
      pet.experience += item.effects.experience;
      
      // Regenerate stamina based on the item's effect
      if (pet.attributes.stamina < 100) {
        pet.attributes.stamina = Math.min(100, pet.attributes.stamina + (item.effects.stamina || 10));
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
    }
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
    
    // training with item
    if (itemId) {
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
      
      // Check if item is equipment for training
      if (item.type !== 'equipment') {
        return res.status(400).json({
          success: false,
          error: 'This item cannot be used for training'
        });
      }
      
      // Apply equipment bonuses
      // Base exp gain + item bonus (additional 30 exp for equipment)
      pet.experience += 20 + (item.effects.experience || 30);
      
      // Reduce stamina cost
      const staminaCost = Math.max(5, 10 - (item.effects.stamina || 0));
      pet.attributes.stamina = Math.max(0, pet.attributes.stamina - staminaCost);
      
      // Decrease item quantity in inventory
      inventoryItem.quantity--;
      if (inventoryItem.quantity <= 0) {
        user.inventory = user.inventory.filter(i => i.item.toString() !== itemId);
      }
      
      await user.save();
    } else {
      // Standard training without item
      // Add experience and decrease stamina
      pet.experience += 20;
      pet.attributes.stamina = Math.max(0, pet.attributes.stamina - 10);
    }
    
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
        error: 'Not authorized to give medicine to this pet'
      });
    }
    
    // Check if the pet already has full HP and SP (no need for medicine)
    if (pet.currentHP >= pet.stats.hp && pet.currentSP >= pet.stats.sp) {
      return res.status(400).json({
        success: false,
        error: 'Pet already has full HP and SP'
      });
    }
    
    // Handle medicine item if provided
    if (itemId) {
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
      
      // Check if item is medicine
      if (item.type !== 'medicine') {
        return res.status(400).json({
          success: false,
          error: 'This item cannot be used for healing'
        });
      }
      
      // Determine HP/SP heal amounts
      let hpHeal = 0;
      let spHeal = 0;

      // Special case: best-potion fully restores HP & SP
      if (item.name === 'best-potion') {
        pet.currentHP = pet.stats.hp;
        pet.currentSP = pet.stats.sp;
      } else {
        hpHeal = item.effects.health || 0;
        spHeal = item.effects.sp || 0;

        // If neither specified, default HP heal 40%
        if (hpHeal === 0 && spHeal === 0) {
          hpHeal = Math.floor(pet.stats.hp * 0.4);
        }

        // Apply heals
        if (hpHeal > 0) {
          pet.currentHP = Math.min(pet.stats.hp, (pet.currentHP || pet.stats.hp) + hpHeal);
        }
        if (spHeal > 0) {
          pet.currentSP = Math.min(pet.stats.sp, (pet.currentSP || pet.stats.sp) + spHeal);
        }
      }
      
      // Some medicines might also improve other stats (e.g., happiness)
      if (item.effects.happiness) {
        pet.attributes.happiness = Math.min(100, pet.attributes.happiness + item.effects.happiness);
      }
      
      // Decrease item quantity in inventory
      inventoryItem.quantity--;
      if (inventoryItem.quantity <= 0) {
        user.inventory = user.inventory.filter(i => i.item.toString() !== itemId);
      }
      
      await user.save();
    } else {
      // Standard healing without item
      // Set or increase current HP
      if (pet.currentHP === undefined) {
        // Initialize to full HP if undefined
        pet.currentHP = pet.stats.hp;
      } else {
        // Regenerate 20% of max HP
        pet.currentHP = Math.min(pet.stats.hp, pet.currentHP + (pet.stats.hp * 0.2));
      }
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
    
    // Check if pet has enough stamina
    if (pet.attributes.stamina < 50) {
      return res.status(400).json({
        success: false,
        error: 'Not enough stamina for outdoor activity'
      });
    }
    
    // Get parameters from request or use defaults
    const { 
      hungerIncrease = 30, 
      staminaDecrease = 50, 
      buffDuration = 120 
    } = req.body;
    
    // Generate random buffs, 10% increase to a random combination of stats
    const buffAmount = 0.1; // 10% buff
    const buffDurationMs = buffDuration * 60 * 1000; // Convert minutes to milliseconds
    
    // Initialize activeBuffs if it doesn't exist
    if (!pet.activeBuffs) {
      pet.activeBuffs = {};
    }
    
    // Apply buffs to random stats
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
    pet.activeBuffs.expiresAt = Date.now() + buffDurationMs;
    
    // Update hunger (increase by 30)
    pet.attributes.hunger = Math.min(100, pet.attributes.hunger + hungerIncrease);
    
    // Decrease stamina by 50
    pet.attributes.stamina = Math.max(0, pet.attributes.stamina - staminaDecrease);
    
    // Update pet interaction time
    pet.lastInteraction = Date.now();
    
    await pet.save();
    
    res.status(200).json({
      success: true,
      data: pet,
      buffDetails: {
        buffedStats: selectedStats,
        duration: `${buffDuration} minutes`
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update pet stats (hp, sp, atk, def, etc.)
// @route   PUT /api/pets/:id/stats
// @access  Private
exports.updatePetStats = async (req, res, next) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      return res.status(404).json({ success: false, error: 'Pet not found' });
    }
    if (pet.owner.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized to update this pet' });
    }
    // Allow updating stats, current values, experience, and gold
    const allowedFields = ['hp', 'sp', 'atk', 'def', 'currentHP', 'currentSP', 'experience', 'gold'];
    let updated = false;
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'currentHP' || field === 'currentSP') {
          pet[field] = req.body[field];
        } else if (field === 'experience' || field === 'gold') {
          pet[field] = req.body[field];
        } else {
          pet.stats[field] = req.body[field];
        }
        updated = true;
      }
    });
    if (!updated) {
      return res.status(400).json({ success: false, error: 'No valid stat fields provided' });
    }
    await pet.save();
    res.status(200).json({ success: true, data: pet });
  } catch (err) {
    next(err);
  }
};

// @desc    Update pet attributes (happiness, stamina, etc.)
// @route   PUT /api/pets/:id/attributes
// @access  Private
exports.updatePetAttributes = async (req, res, next) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      return res.status(404).json({ success: false, error: 'Pet not found' });
    }
    if (pet.owner.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized to update this pet' });
    }
    // Only update provided fields in attributes
    const allowedFields = ['happiness', 'stamina', 'hunger'];
    let updated = false;
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        pet.attributes[field] = req.body[field];
        updated = true;
      }
    });
    if (!updated) {
      return res.status(400).json({ success: false, error: 'No valid attribute fields provided' });
    }
    await pet.save();
    res.status(200).json({ success: true, data: pet });
  } catch (err) {
    next(err);
  }
};

// @desc    Get pet attributes (happiness, stamina, etc.)
// @route   GET /api/pets/:id/attributes
// @access  Private
exports.getPetAttributes = async (req, res, next) => {
  try {
    const pet = await Pet.findById(req.params.id);
    if (!pet) {
      return res.status(404).json({ success: false, error: 'Pet not found' });
    }
    if (pet.owner.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized to access this pet' });
    }
    res.status(200).json({ success: true, data: pet.attributes });
  } catch (err) {
    next(err);
  }
};