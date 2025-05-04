// Game mechanics calculations

/**
 * Check if pet should level up based on experience
 * @param {Object} pet - Pet mongoose document
 * @returns {Object} - Updated pet and level up status
 */
exports.checkLevelUp = (pet) => {
    let leveledUp = false;
    let levelsGained = 0;
    let requiredXP = pet.level * pet.level * 100;
    while (pet.experience >= requiredXP) {
        pet.level += 1;
        pet.experience -= requiredXP;
        levelsGained += 1;
        leveledUp = true;
        // Increase pet stats (use atk, def, hp, sp)
        pet.stats.atk += Math.floor(Math.random() * 5) + 1;
        pet.stats.def += Math.floor(Math.random() * 5) + 1;
        pet.stats.hp += Math.floor(Math.random() * 20) + 10;
        pet.stats.sp += Math.floor(Math.random() * 10) + 5;
        requiredXP = pet.level * pet.level * 100;
    }
    return {
        pet,
        leveledUp,
        levelsGained,
        nextLevelXP: requiredXP
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
    
    // Adjust based on pet stats vs quest requirements (use atk/def)
    const atkDiff = (pet.stats.atk || 0) - (quest.requirements.minAtk || 0);
    const defDiff = (pet.stats.def || 0) - (quest.requirements.minDef || 0);
    const hpDiff = (pet.stats.hp || 0) - (quest.requirements.minHp || 0);
    const spDiff = (pet.stats.sp || 0) - (quest.requirements.minSp || 0);
    successChance += (atkDiff + defDiff) * 2 + (hpDiff + spDiff) * 0.1;
    
    // Adjust based on pet happiness
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