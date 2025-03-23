const Quest = require('../models/questModel');
const Pet = require('../models/petModel');
const User = require('../models/userModel');
const gameLogic = require('../utils/gameLogic');

// @desc    Get all available quests
// @route   GET /api/quests
// @access  Private
exports.getQuests = async (req, res, next) => {
  try {
    const quests = await Quest.find();
    
    res.status(200).json({
      success: true,
      count: quests.length,
      data: quests
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single quest
// @route   GET /api/quests/:id
// @access  Private
exports.getQuest = async (req, res, next) => {
  try {
    const quest = await Quest.findById(req.params.id);
    
    if (!quest) {
      return res.status(404).json({
        success: false,
        error: 'Quest not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: quest
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Start a quest
// @route   POST /api/quests/:id/start
// @access  Private
exports.startQuest = async (req, res, next) => {
  try {
    const { petId } = req.body;
    
    if (!petId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a pet for the quest'
      });
    }
    
    // Get quest
    const quest = await Quest.findById(req.params.id);
    
    if (!quest) {
      return res.status(404).json({
        success: false,
        error: 'Quest not found'
      });
    }
    
    // Get pet
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
        error: 'Not authorized to use this pet'
      });
    }
    
    // Update pet stats
    await pet.updateStats();
    
    // Reduce energy
    pet.attributes.energy -= quest.requirements.energyCost;
    
    // Set quest completion time
    const questEndTime = new Date(Date.now() + quest.duration * 60 * 1000);
    
    // Save quest to pet's active quests
    pet.activeQuest = {
      quest: quest._id,
      startTime: Date.now(),
      endTime: questEndTime
    };
    
    await pet.save();
    
    res.status(200).json({
      success: true,
      data: {
        quest,
        pet,
        endTime: questEndTime
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Complete a quest
// @route   POST /api/quests/:id/complete
// @access  Private
exports.completeQuest = async (req, res, next) => {
  try {
    const { petId } = req.body;
    
    if (!petId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide pet ID'
      });
    }
    
    // Get quest
    const quest = await Quest.findById(req.params.id);
    
    if (!quest) {
      return res.status(404).json({
        success: false,
        error: 'Quest not found'
      });
    }
    
    // Get pet
    let pet = await Pet.findById(petId);
    
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
        error: 'Not authorized to use this pet'
      });
    }
    
    // Check if pet is on this quest
    if (!pet.activeQuest || pet.activeQuest.quest.toString() !== req.params.id) {
      return res.status(400).json({
        success: false,
        error: 'This pet is not on this quest'
      });
    }
    
    // Check if quest is completed (time has passed)
    if (Date.now() < pet.activeQuest.endTime) {
      return res.status(400).json({
        success: false,
        error: 'Quest is not completed yet',
        timeRemaining: pet.activeQuest.endTime - Date.now()
      });
    }
    
    // Get user for rewards
    const user = await User.findById(req.user.id);
    
    // Calculate success chance and result
    const success = gameLogic.calculateQuestSuccess(pet, quest);
    
    if (success) {
      // Grant rewards
      pet.experience += quest.rewards.experience;
      user.currency.coins += quest.rewards.coins;
      user.currency.gems += quest.rewards.gems;
      
      // Add to completed quests
      pet.completedQuests.push(quest._id);
      
      // Check for item rewards
      for (const itemReward of quest.rewards.items) {
        const roll = Math.random() * 100;
        if (roll <= itemReward.chance) {
          // Add item to inventory
          const existingItem = user.inventory.find(
            i => i.item.toString() === itemReward.item.toString()
          );
          
          if (existingItem) {
            existingItem.quantity += 1;
          } else {
            user.inventory.push({
              item: itemReward.item,
              quantity: 1
            });
          }
        }
      }
      
      // Check for level up
      const levelUpResult = gameLogic.checkLevelUp(pet);
      pet = levelUpResult.pet;
    } else {
      // Failed quest - partial rewards
      pet.experience += Math.floor(quest.rewards.experience * 0.25);
      user.currency.coins += Math.floor(quest.rewards.coins * 0.1);
    }
    
    // Clear active quest
    pet.activeQuest = null;
    
    // Update stats
    pet.attributes.hunger = Math.max(0, pet.attributes.hunger - 15);
    pet.attributes.happiness = Math.max(0, pet.attributes.happiness - 5);
    
    // Save changes
    await pet.save();
    await user.save();
    
    res.status(200).json({
      success: true,
      questSuccess: success,
      data: {
        pet,
        rewards: {
          experience: success ? quest.rewards.experience : Math.floor(quest.rewards.experience * 0.25),
          coins: success ? quest.rewards.coins : Math.floor(quest.rewards.coins * 0.1),
          items: success ? quest.rewards.items.filter(i => Math.random() * 100 <= i.chance).map(i => i.item) : []
        }
      }
    });
  } catch (err) {
    next(err);
  }
};