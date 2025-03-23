// Game mechanics calculations

/**
 * Check if pet should level up based on experience
 * @param {Object} pet - Pet mongoose document
 * @returns {Object} - Updated pet and level up status
 */
exports.checkLevelUp = (pet) => {
    // Calculate required XP for next level (formula: level^2 * 100)
    const requiredXP = pet.level * pet.level * 100;
    
    // Check if pet has enough XP to level up
    if (pet.experience >= requiredXP) {
      // Level up
      pet.level += 1;
      pet.experience -= requiredXP;
      
      // Increase pet stats
      pet.skills.strength += Math.floor(Math.random() * 3) + 1;
      pet.skills.intelligence += Math.floor(Math.random() * 3) + 1;
      pet.skills.agility += Math.floor(Math.random() * 3) + 1;
      pet.skills.charisma += Math.floor(Math.random() * 3) + 1;
      
      // Restore pet health and energy
      pet.attributes.health = 100;
      pet.attributes.energy = 100;
      
      return {
        pet,
        leveledUp: true
      };
    }
    
    return {
      pet,
      leveledUp: false
    };
  };
  
  /**
   * Calculate success chance for a quest based on pet stats
   * @param {Object} pet - Pet mongoose document
   * @param {Object} quest - Quest mongoose document
   * @returns {Boolean} - Whether the quest was successful
   */
  exports.calculateQuestSuccess = (pet, quest) => {
    // Base success chance
    let successChance = 70;
    
    // Adjust based on pet level vs quest min level
    const levelDifference = pet.level - quest.requirements.minLevel;
    successChance += levelDifference * 5;
    
    // Adjust based on pet stats vs quest requirements
    const strengthDiff = pet.skills.strength - quest.requirements.minStrength;
    const intelligenceDiff = pet.skills.intelligence - quest.requirements.minIntelligence;
    const agilityDiff = pet.skills.agility - quest.requirements.minAgility;
    const charismaDiff = pet.skills.charisma - quest.requirements.minCharisma;
    
    successChance += (strengthDiff + intelligenceDiff + agilityDiff + charismaDiff) * 2;
    
    // Adjust based on pet health and happiness
    if (pet.attributes.health < 50) {
      successChance -= (50 - pet.attributes.health) * 0.5;
    }
    
    if (pet.attributes.happiness < 50) {
      successChance -= (50 - pet.attributes.happiness) * 0.3;
    }
    
    // Adjust based on quest difficulty
    switch (quest.difficulty) {
      case 'easy':
        successChance += 10;
        break;
      case 'medium':
        // No adjustment
        break;
      case 'hard':
        successChance -= 10;
        break;
      case 'expert':
        successChance -= 20;
        break;
    }
    
    // Cap success chance between 5% and 95%
    successChance = Math.max(5, Math.min(95, successChance));
    
    // Roll for success
    return Math.random() * 100 <= successChance;
  };