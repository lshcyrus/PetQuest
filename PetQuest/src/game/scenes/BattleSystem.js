import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { Pet } from '../entities/Pet';
import { Enemy } from '../entities/enemy';
import { getGlobalContext } from '../../utils/contextBridge';
import { InventoryModal } from './InventoryModal';

// Battle logic separated from rendering
class BattleLogic {
    constructor(playerPet, enemy, battleground) {
        this.playerPet = playerPet;
        this.enemy = enemy;
        this.battleground = battleground;
        this.currentTurn = null;
        this.turnCount = 0;
        this.battleLog = [];
        this.isPlayerDefending = false;
        this.isEnemyDefending = false;
        this.itemUsedThisBattle = false; // Renamed from itemUsedThisTurn
        this.battleEnded = false;
        this.drops = [];
        this.actionInProgress = false;
    }

    startBattle() {
        this.battleLog = ['Battle started!']; 
        this.battleLog.push(`${this.playerPet.data.name} vs ${this.enemy.data.name}`);
        this.battleLog.push(`Battleground: ${this.battleground}`);
        
        // Determine first turn with coin toss
        this.currentTurn = Math.random() < 0.5 ? 'player' : 'enemy';
        this.battleLog.push(`${this.currentTurn === 'player' ? this.playerPet.data.name : this.enemy.data.name} goes first!`);
        this.turnCount = 0;
        this.itemUsedThisBattle = false; // Reset for the new battle
        return this.battleLog;
    }

    nextTurn() {
        if (this.checkBattleEnd()) return false;

        if (this.currentTurn === 'player') {
            this.currentTurn = 'enemy';
            this.isPlayerDefending = false;
            // Removed: this.itemUsedThisTurn = false;
        } else {
            this.currentTurn = 'player';
            this.isEnemyDefending = false;
            this.turnCount++;
        }
        this.battleLog.push(`Turn ${this.turnCount + 1}: ${this.currentTurn === 'player' ? this.playerPet.data.name : this.enemy.data.name}'s turn`);
        return true;
    }

    checkBattleEnd() {
        if (this.battleEnded) return true;

        // Check if player pet is defeated
        if (this.playerPet.data.stats.hp <= 0) {
            this.playerPet.data.stats.hp = 0; // Ensure HP doesn't go negative for display
            this.battleLog.push(`${this.playerPet.data.name} has been defeated. You lost the battle.`);
            this.battleEnded = true;
            return true;
        }
        
        // Check if enemy is defeated
        if (this.enemy.data.stats.hp <= 0) {
            this.enemy.data.stats.hp = 0; // Ensure HP doesn't go negative for display
            this.battleLog.push(`${this.enemy.data.name} has been defeated. You won the battle!`);
            this.drops = this.generateDrops();
            if (this.drops.length > 0) {
                this.battleLog.push(`${this.enemy.data.name} dropped: ${this.drops.join(', ')}`);
            }
            this.battleEnded = true;
            return true;
        }
        
        return false;
    }

    attack(attacker, defender, isDefenderDefending) {
        // Check SP cost (5 for basic attack)
        if (attacker.data.stats.sp < 5) {
            this.battleLog.push(`${attacker.data.name} does not have enough SP to attack!`);
            return false;
        }
        attacker.data.stats.sp -= 5;
        const attackerName = attacker.data.name;
        const defenderName = defender.data.name;
        
        // Get stats with fallbacks and apply buffs
        const attackerBuffs = attacker.data.activeBuffs ? attacker.data.activeBuffs.stats : {};
        const defenderBuffs = defender.data.activeBuffs ? defender.data.activeBuffs.stats : {};
        
        // Apply buffs to attack and defense stats
        const atkBuff = attackerBuffs.atk || 0;
        const defBuff = defenderBuffs.def || 0;
        
        const attackStat = (attacker.data.stats.atk || 10) + atkBuff;
        const defenseStat = (defender.data.stats.def || 5) + defBuff;

        let baseDamage = Math.max(1, attackStat - Math.floor(defenseStat / 2));
        const damageVariation = Math.random() * 0.2 + 0.9; // 90% to 110% damage
        let finalDamage = Math.floor(baseDamage * damageVariation);

        if (isDefenderDefending) {
            finalDamage = Math.floor(finalDamage * 0.5);
            this.battleLog.push(`${defenderName} is defending and takes reduced damage!`);
        }

        defender.data.stats.hp -= finalDamage;
        if (defender.data.stats.hp < 0) defender.data.stats.hp = 0;

        this.battleLog.push(`${attackerName} performs a Basic Attack on ${defenderName} for ${finalDamage} damage!`);
        this.battleLog.push(`${defenderName} has ${defender.data.stats.hp} HP remaining.`);
        return finalDamage;
    }

    useAbility(attacker, defender, abilityIndex, isDefenderDefending) {
        // Skill 1: Special Attack (costs 10 SP)
        if (abilityIndex === 0) {
            if (attacker.data.stats.sp < 10) {
                this.battleLog.push(`${attacker.data.name} does not have enough SP to use Special Attack!`);
                return false;
            }
            attacker.data.stats.sp -= 10;
            const attackerName = attacker.data.name;
            const defenderName = defender.data.name;
            
            // Apply buffs to attack and defense stats
            const attackerBuffs = attacker.data.activeBuffs ? attacker.data.activeBuffs.stats : {};
            const defenderBuffs = defender.data.activeBuffs ? defender.data.activeBuffs.stats : {};
            
            const atkBuff = attackerBuffs.atk || 0;
            const defBuff = defenderBuffs.def || 0;
            
            const attackStat = (attacker.data.stats.atk || 10) + atkBuff;
            const defenseStat = (defender.data.stats.def || 5) + defBuff;
            
            let baseDamage = Math.max(2, Math.floor(attackStat * 1.5) - defenseStat);
            let finalDamage = Math.floor(baseDamage * (Math.random() * 0.2 + 0.9));

            if (isDefenderDefending) {
                finalDamage = Math.floor(finalDamage * 0.5);
                this.battleLog.push(`${defenderName} is defending and takes reduced damage!`);
            }
            
            defender.data.stats.hp -= finalDamage;
            if (defender.data.stats.hp < 0) defender.data.stats.hp = 0;
            
            this.battleLog.push(`${attackerName} uses Special Attack on ${defenderName} for ${finalDamage} damage!`);
            this.battleLog.push(`${defenderName} has ${defender.data.stats.hp} HP remaining.`);
            return true;
        }
        // Skill 2: Heal Self (costs 10 SP)
        else if (abilityIndex === 1) {
            if (attacker.data.stats.sp < 10) {
                this.battleLog.push(`${attacker.data.name} does not have enough SP to heal!`);
                return false;
            }
            attacker.data.stats.sp -= 10;
            
            // Apply HP buff to max HP calculation
            const hpBuff = attacker.data.activeBuffs && attacker.data.activeBuffs.stats ? 
                (attacker.data.activeBuffs.stats.hp || 0) : 0;
                
            // Use maxhp directly from stats, plus any buffs
            const maxHp = (attacker.data.stats.maxhp || attacker.data.stats.hp) + hpBuff;
            let healAmount = Math.floor(maxHp * 0.25);
            
            attacker.data.stats.hp += healAmount;
            if (attacker.data.stats.hp > maxHp) {
                attacker.data.stats.hp = maxHp;
            }
            
            this.battleLog.push(`${attacker.data.name} uses healing and recovers ${healAmount} HP!`);
            this.battleLog.push(`${attacker.data.name} now has ${attacker.data.stats.hp}/${maxHp} HP.`);
            return true;
        }
        else {
            this.battleLog.push("Selected ability does not exist!");
            return false;
        }
    }

    defend(character) {
        // Defend costs 5 SP
        if (character.data.stats.sp < 5) {
            this.battleLog.push(`${character.data.name} does not have enough SP to defend!`);
            return false;
        }
        character.data.stats.sp -= 5;
        if (this.currentTurn === 'player' && character === this.playerPet) {
            this.isPlayerDefending = true;
            this.battleLog.push(`${this.playerPet.data.name} takes a defensive stance!`);
            return true;
        } 
        else if (this.currentTurn === 'enemy' && character === this.enemy) {
            this.isEnemyDefending = true;
            this.battleLog.push(`${this.enemy.data.name} takes a defensive stance!`);
            return true;
        }
        return false;
    }

    usePlayerItem(playerPet, item) {
        if (!item || !item.effects) {
            this.battleLog.push("Invalid item selected or item has no effects.");
            return false;
        }

        const petStats = playerPet.data.stats;
        const petBuffs = playerPet.data.activeBuffs && playerPet.data.activeBuffs.stats ? 
                         playerPet.data.activeBuffs.stats : { hp: 0, sp: 0 };

        // Determine max HP/SP considering buffs for healing calculation limits
        // These are the maximums the pet can currently reach
        const currentMaxHP = (petStats.maxhp || petStats.hp) + (petBuffs.hp || 0);
        const currentMaxSP = (petStats.maxsp || petStats.sp) + (petBuffs.sp || 0);
        
        // These are the current HP/SP values including buffs
        const currentHPWithBuffs = petStats.hp + (petBuffs.hp || 0);
        const currentSPWithBuffs = petStats.sp + (petBuffs.sp || 0);

        let healedHP = 0;
        let restoredSP = 0;
        let actualHealAmount = 0;
        let actualRestoreAmount = 0;

        // Apply health effects
        if (item.effects.health) {
            const potentialHeal = item.effects.health;
            if (item.name === 'best-potion' || potentialHeal >= 5000) { // Convention for full heal
                actualHealAmount = currentMaxHP - currentHPWithBuffs;
            } else {
                actualHealAmount = potentialHeal;
            }
            
            // Cap healing at current max HP
            if (currentHPWithBuffs + actualHealAmount > currentMaxHP) {
                actualHealAmount = currentMaxHP - currentHPWithBuffs;
            }
            
            // Ensure actualHealAmount is not negative if already at max
            actualHealAmount = Math.max(0, actualHealAmount); 

            petStats.hp += actualHealAmount;
            healedHP = actualHealAmount; // Record how much was actually healed for the log
        }

        // Apply SP effects
        if (item.effects.sp) {
            const potentialRestore = item.effects.sp;
            if (item.name === 'best-potion' || potentialRestore >= 1000) { // Convention for full restore
                actualRestoreAmount = currentMaxSP - currentSPWithBuffs;
            } else {
                actualRestoreAmount = potentialRestore;
            }

            // Cap restoration at current max SP
            if (currentSPWithBuffs + actualRestoreAmount > currentMaxSP) {
                actualRestoreAmount = currentMaxSP - currentSPWithBuffs;
            }
            
            // Ensure actualRestoreAmount is not negative
            actualRestoreAmount = Math.max(0, actualRestoreAmount);

            petStats.sp += actualRestoreAmount;
            restoredSP = actualRestoreAmount; // Record how much was actually restored
        }
        
        let logMessage = `${playerPet.data.name} used ${item.displayName || item.name}.`;
        if (healedHP > 0 && restoredSP > 0) {
            logMessage += ` Restored ${healedHP} HP and ${restoredSP} SP!`;
        } else if (healedHP > 0) {
            logMessage += ` Restored ${healedHP} HP!`;
        } else if (restoredSP > 0) {
            logMessage += ` Restored ${restoredSP} SP!`;
        } else if (item.name === 'best-potion' && (healedHP > 0 || restoredSP > 0)) {
            logMessage += ` Fully recovered!`;
        } else if ( (item.name === 'hp-potion' && currentHPWithBuffs >= currentMaxHP) ||
                    (item.name === 'sp-potion' && currentSPWithBuffs >= currentMaxSP) ||
                    (item.name === 'mixed-potion' && currentHPWithBuffs >= currentMaxHP && currentSPWithBuffs >= currentMaxSP) ||
                    (item.name === 'best-potion' && currentHPWithBuffs >= currentMaxHP && currentSPWithBuffs >= currentMaxSP) ) {
             logMessage += ` No effect, already at maximum.`;
        }
         else {
            logMessage += ` No significant effect.`;
        }

        this.battleLog.push(logMessage);
        const updatedHPWithBuffs = petStats.hp + (petBuffs.hp || 0);
        const updatedSPWithBuffs = petStats.sp + (petBuffs.sp || 0);
        this.battleLog.push(`${playerPet.data.name} HP: ${updatedHPWithBuffs}/${currentMaxHP}, SP: ${updatedSPWithBuffs}/${currentMaxSP}`);
        
        return true;
    }

    enemyAction() {
        if (this.battleEnded) return false;
        const enemy = this.enemy;
        // Simple AI: Try to use special attack if enough SP, else normal attack, else defend if possible
        if (enemy.data.stats.sp >= 10 && Math.random() < 0.5) {
            this.battleLog.push(`${enemy.data.name} prepares a Special Attack!`);
            if (this.useAbility(enemy, this.playerPet, 0, this.isPlayerDefending)) return 'special';
        }
        if (enemy.data.stats.sp >= 5 && Math.random() < 0.7) {
            this.battleLog.push(`${enemy.data.name} prepares a Basic Attack!`);
            if (this.attack(enemy, this.playerPet, this.isPlayerDefending)) return 'attack';
        }
        if (enemy.data.stats.sp >= 5) {
            this.battleLog.push(`${enemy.data.name} takes a defensive stance!`);
            if (this.defend(enemy)) return 'defend';
        }
        // If not enough SP for any action, skip turn
        this.battleLog.push(`${enemy.data.name} is too exhausted to act!`);
        return 'skip';
    }

    generateDrops() {
        const enemyLevel = this.enemy.data.level || 1;
        const difficulty = this.battleground.selectedDifficulty || 1; 
        const allDrops = [];

        let numberOfItemSlots = 0;
        switch (difficulty) {
            case 1: // Easy
                numberOfItemSlots = 1;
                break;
            case 2: // Medium
                numberOfItemSlots = 1 + (Math.random() < 0.5 ? 1 : 0); // 1 or 2 slots
                break;
            case 3: // Hard
                numberOfItemSlots = 2;
                break;
            case 4: // Expert
                numberOfItemSlots = 2 + (Math.random() < 0.5 ? 1 : 0); // 2 or 3 slots
                break;
            default:
                numberOfItemSlots = 1;
                break;
        }

        console.log(`Difficulty ${difficulty}: Attempting to generate items for ${numberOfItemSlots} slot(s).`);

        for (let i = 0; i < numberOfItemSlots; i++) {
            // Base drop chance for this slot (increases with enemy level and difficulty)
            // Adjusted to be a bit higher per slot, as there are multiple chances now.
            const slotDropChance = Math.min(0.85, 0.4 + (enemyLevel * 0.05) + (difficulty * 0.1));

            if (Math.random() < slotDropChance) {
                const itemTypes = ['medicine', 'equipment', 'food'];
                const selectedType = itemTypes[Math.floor(Math.random() * itemTypes.length)];

                let rarityChances;
                switch(difficulty) {
                    case 4: // Expert
                        rarityChances = {
                            common: 0.25,
                            uncommon: 0.35,
                            rare: 0.30,
                            legendary: 0.10
                        };
                        break;
                    case 3: // Hard
                        rarityChances = {
                            common: 0.4,
                            uncommon: 0.35,
                            rare: 0.2,
                            legendary: 0.05
                        };
                        break;
                    case 2: // Medium
                        rarityChances = {
                            common: 0.5,
                            uncommon: 0.35,
                            rare: 0.15,
                            legendary: 0.0 // No legendary drops on medium
                        };
                        break;
                    case 1: // Easy
                    default:
                        rarityChances = {
                            common: 0.7,
                            uncommon: 0.25,
                            rare: 0.05, 
                            legendary: 0.0 // No legendary drops on easy
                        };
                        break;
                }

                const rarityRoll = Math.random();
                let selectedRarity;
                let cumulativeChance = 0;
                for (const [rarity, chance] of Object.entries(rarityChances)) {
                    cumulativeChance += chance;
                    if (rarityRoll <= cumulativeChance) {
                        selectedRarity = rarity;
                        break;
                    }
                }
                
                // Ensure a rarity is selected (fallback to common if logic somehow fails)
                if (!selectedRarity) selectedRarity = 'common';

                allDrops.push({
                    type: selectedType,
                    rarity: selectedRarity,
                    // The id can be more generic here, as the backend will assign the actual item
                    id: `dropped_${selectedType}_${selectedRarity}` 
                });
                console.log(`Slot ${i+1}: Dropped ${selectedRarity} ${selectedType}`);
            } else {
                console.log(`Slot ${i+1}: No item dropped (chance: ${slotDropChance.toFixed(2)}).`);
            }
        }
        
        return allDrops;
    }
}

export class BattleSystem extends Scene {
    constructor() {
        super('BattleSystem');
    }

    init(data) {
        if (!data || !data.pet || !data.enemy) {
            console.error('BattleSystem: Missing required data!');
            this.scene.start('MainMenu');
            return;
        }

        // Store the raw pet data with deep copy to avoid reference issues
        this.petData = JSON.parse(JSON.stringify(data.pet));
        
        // Validate and normalize pet data
        if (!this.petData.stats) {
            this.petData.stats = {};
        } else {
            const petStats = this.petData.stats;
            
            // Convert attack/defense to atk/def if needed
            if (petStats.attack !== undefined && petStats.atk === undefined) {
                petStats.atk = petStats.attack;
                delete petStats.attack;
            }
            if (petStats.defense !== undefined && petStats.def === undefined) {
                petStats.def = petStats.defense;
                delete petStats.defense;
            }
            // Remove speed stat if it exists
            if (petStats.speed !== undefined) {
                delete petStats.speed;
            }
            
            // Use currentHP/SP if they exist, otherwise use stats.hp/sp
            if (this.petData.currentHP === undefined) {
                this.petData.currentHP = petStats.hp;
            }
            if (this.petData.currentSP === undefined) {
                this.petData.currentSP = petStats.sp;
            }
            
            // Apply any active buffs from equipment or items
            if (this.petData.buffs) {
                Object.entries(this.petData.buffs).forEach(([stat, value]) => {
                    if (stat in petStats) {
                        petStats[stat] += value;
                        console.log(`Applied buff to ${stat}: +${value}`);
                    }
                });
            }
            // Apply equipment stat boosts if present
            if (this.petData.equipment) {
                Object.values(this.petData.equipment).forEach(item => {
                    if (item && item.stats) {
                        Object.entries(item.stats).forEach(([stat, value]) => {
                            if (stat in petStats) {
                                petStats[stat] += value;
                                console.log(`Applied equipment boost to ${stat}: +${value}`);
                            }
                        });
                    }
                });
            }
        }

        this.enemyData = data.enemy;
        // Validate and set defaults for enemy data if needed
        if (typeof this.enemyData !== 'object') {
            console.error('Enemy data is not an object:', this.enemyData);
            this.enemyData = { name: 'Wild Monster', key: 'gorgon_idle', stats: {} };
        }
        // Ensure enemy has required properties
        if (!this.enemyData.name) this.enemyData.name = 'Wild Monster';
        if (!this.enemyData.key) this.enemyData.key = 'gorgon_idle';
        if (!this.enemyData.stats) {
            this.enemyData.stats = {};
        } else {
            const stats = this.enemyData.stats;
            if (stats.attack !== undefined && stats.atk === undefined) {
                stats.atk = stats.attack;
                delete stats.attack;
            }
            if (stats.defense !== undefined && stats.def === undefined) {
                stats.def = stats.defense;
                delete stats.defense;
            }
            if (stats.speed !== undefined) {
                delete stats.speed;
            }
            
            // For enemy, set maxhp/maxsp to match their stats.hp/sp
            this.enemyData.maxhp = stats.hp;
            this.enemyData.maxsp = stats.sp;
        }
        this.levelData = data.levelData || { background: 'battle_background' };
        this.battleBackground = this.levelData.background || 'battle_background';
        
        // Store values for battle rewards
        this.goldGained = 0;
        this.expGained = 0;
        this.gemsGained = 0;
        // Setup will continue in create()
    }

    preload() {
        // Normally assets are loaded in the preloader scene,
        // but if we need to load any specific assets for this battle, do it here
    }

    create() {
        const { width, height } = this.scale;
        
        // Set the background
        const backgroundKey = this.textures.exists(this.battleBackground) ? 
            this.battleBackground : 'battle_background';
            
        this.background = this.add.image(width/2, height/2, backgroundKey)
            .setOrigin(0.5)
            .setDepth(0);
            
        // Scale background to fit screen if needed
        this.scaleBackgroundToFit(this.background);
        
        // Create the pet and enemy entities with proper positioning
        this.createCombatants();
        
        // Set up ALL relevant animations for pet and enemy
        this.setupEntityAnimations(this.petEntity, true);
        this.setupEntityAnimations(this.enemyEntity, false);
        
        // Create battle UI elements
        this.createUI();
        
        // Initialize battle logic
        this.battleLogic = new BattleLogic(this.petEntity, this.enemyEntity, this.battleBackground);
        
        // Start the battle
        this.startBattle();
        
        // Let any external systems know the scene is ready
        EventBus.emit('battle-scene-ready', this);
    }
    
    scaleBackgroundToFit(background) {
        const { width, height } = this.scale;
        
        // Ensure background covers the entire screen
        const scaleX = width / background.width;
        const scaleY = height / background.height;
        const scale = Math.max(scaleX, scaleY);
        
        background.setScale(scale);
    }
    
    createCombatants() {
        const { width, height } = this.scale;
        
        // Create a copy of pet data for battle use
        const battlePetData = JSON.parse(JSON.stringify(this.petData));
        
        // IMPORTANT: First set maxhp/maxsp from the pet's base stats
        battlePetData.stats.maxhp = this.petData.stats.hp;
        battlePetData.stats.maxsp = this.petData.stats.sp;
        
        // Initialize entity's hp/sp to the current values, not the max values
        if (this.petData.currentHP !== undefined) {
            battlePetData.stats.hp = this.petData.currentHP;
        }
        
        if (this.petData.currentSP !== undefined) {
            battlePetData.stats.sp = this.petData.currentSP;
        }
        
        // Ensure activeBuffs exists and is properly structured
        if (!battlePetData.activeBuffs) {
            battlePetData.activeBuffs = {
                stats: {
                    hp: 0,
                    sp: 0,
                    atk: 0,
                    def: 0
                },
                expiresAt: null
            };
        } else if (!battlePetData.activeBuffs.stats) {
            battlePetData.activeBuffs.stats = {
                hp: 0,
                sp: 0,
                atk: 0,
                def: 0
            };
        }
        
        // Copy any existing buffs from the pet data
        if (this.petData.activeBuffs && this.petData.activeBuffs.stats) {
            Object.keys(this.petData.activeBuffs.stats).forEach(stat => {
                if (this.petData.activeBuffs.stats[stat]) {
                    battlePetData.activeBuffs.stats[stat] = this.petData.activeBuffs.stats[stat];
                }
            });
            
            // Copy expiration time if it exists
            if (this.petData.activeBuffs.expiresAt) {
                battlePetData.activeBuffs.expiresAt = this.petData.activeBuffs.expiresAt;
            }
        }
        
        console.log('Battle Pet Stats:', {
            hp: battlePetData.stats.hp,
            maxhp: battlePetData.stats.maxhp,
            sp: battlePetData.stats.sp,
            maxsp: battlePetData.stats.maxsp,
            buffs: battlePetData.activeBuffs.stats
        });
        
        // Player pet positioned on left side of screen
        this.petEntity = new Pet(
            this, 
            battlePetData, 
            width * 0.3, 
            height * 0.6
        );
        
        // Create pet sprite and name
        const petSprite = this.petEntity.create(1.5, 2);
        if (petSprite) {
            petSprite.setFlipX(false);
        }
        this.petEntity.createNameDisplay(-80, { fontSize: '20px', color: '#ffffff' }, 3);
        
        // Ensure enemy data has a valid key before creating
        if (!this.enemyData.key) {
            console.warn('Enemy missing sprite key, using default gorgon_idle');
            this.enemyData.key = 'gorgon_idle'; // Set a default key
        }
        
        // Initialize enemy's max values for UI display
        if (!this.enemyData.stats.maxhp) {
            this.enemyData.stats.maxhp = this.enemyData.stats.hp;
        }
        
        if (!this.enemyData.stats.maxsp) {
            this.enemyData.stats.maxsp = this.enemyData.stats.sp;
        }
        
        // Ensure enemy has activeBuffs property
        if (!this.enemyData.activeBuffs) {
            this.enemyData.activeBuffs = {
                stats: {
                    hp: 0,
                    sp: 0,
                    atk: 0,
                    def: 0
                },
                expiresAt: null
            };
        } else if (!this.enemyData.activeBuffs.stats) {
            this.enemyData.activeBuffs.stats = {
                hp: 0,
                sp: 0,
                atk: 0,
                def: 0
            };
        }
        
        console.log('Enemy Stats:', {
            hp: this.enemyData.stats.hp,
            maxhp: this.enemyData.stats.maxhp,
            sp: this.enemyData.stats.sp,
            maxsp: this.enemyData.stats.maxsp,
            buffs: this.enemyData.activeBuffs.stats
        });
        
        // Enemy positioned on right side of screen
        this.enemyEntity = new Enemy(
            this, 
            this.enemyData, 
            width * 0.7, 
            height * 0.6
        );
        
        // Create enemy sprite and name if we have a valid key
        if (this.enemyEntity.data.key) {
            const enemySprite = this.enemyEntity.create(2.0, 2); // Changed scale from 1.5 to 2.0
            if (enemySprite) {
                enemySprite.setFlipX(true);
            }
            this.enemyEntity.createNameDisplay(-80, { fontSize: '20px', color: '#ff5555' }, 3);
            
            if (!enemySprite) {
                console.error('Failed to create enemy sprite with key:', this.enemyEntity.data.key);
            }
        } else {
            console.error('Enemy is missing sprite key:', this.enemyEntity.data);
        }
    }
    
    // New comprehensive animation setup
    setupEntityAnimations(entity, isPet) {
        if (!entity || !entity.data || !entity.data.key) {
            console.warn('Cannot setup animations for entity, missing data or key.', entity);
            return;
        }

        const entityKey = entity.data.key; // For pets: 'dino_rex'. For enemies: 'blue_golem_idle'
        let actions = [];

        if (isPet) {
            // Actions for pets: attack, skill1, hurt, die. Idle is handled in Pet.js create().
            // Play, train, outdoor are for MainMenu.
            // 'hurt' and 'die' animations will only be created if their respective spritesheets are loaded.
            actions = ['attack', 'skill1', 'hurt', 'die'];
        } else {
            // Actions for enemies: idle, attack, hurt, die, walk.
            actions = ['idle', 'attack', 'hurt', 'die', 'walk'];
        }

        actions.forEach(action => {
            let spritesheetKeyToLoad;
            let animationKeyToCreate;

            if (isPet) {
                spritesheetKeyToLoad = `${entityKey}_${action}`; // e.g., "dino_rex_attack"
                animationKeyToCreate = spritesheetKeyToLoad;
            } else { // For Enemies
                const baseEnemyKey = entityKey.endsWith('_idle') ? entityKey.substring(0, entityKey.length - 5) : entityKey;
                if (action === 'idle') {
                    // The entityKey for enemies (e.g., 'gorgon_idle') is ALREADY the idle spritesheet key.
                    spritesheetKeyToLoad = entityKey;
                } else {
                    // For other actions, it's baseKey + '_' + action (e.g., 'gorgon_attack')
                    spritesheetKeyToLoad = `${baseEnemyKey}_${action}`;
                }
                animationKeyToCreate = spritesheetKeyToLoad; // Animation key matches the loaded spritesheet key
            }

            if (this.textures.exists(spritesheetKeyToLoad)) {
                if (!this.anims.exists(animationKeyToCreate)) {
                    try {
                        // Ensure there are frames in the spritesheet
                        const texture = this.textures.get(spritesheetKeyToLoad);
                        const frameCount = texture.frameTotal;
                        if (frameCount <= 0) {
                            console.warn(`Spritesheet ${spritesheetKeyToLoad} has no frames. Cannot create animation ${animationKeyToCreate}.`);
                            return; // Skip this animation
                        }

                        const frameConfig = { start: 0, end: frameCount - 1 };
                        
                        this.anims.create({
                            key: animationKeyToCreate,
                            frames: this.anims.generateFrameNumbers(spritesheetKeyToLoad, frameConfig),
                            frameRate: 10, // Adjust as needed
                            repeat: (action === 'idle' || action === 'walk' && !isPet) ? -1 : 0 // Loop idle/walk for enemies
                        });
                        console.log(`Created animation: ${animationKeyToCreate} for entity ${entityKey} (isPet: ${isPet}) from spritesheet ${spritesheetKeyToLoad}`);
                    } catch (e) {
                        console.error(`Error creating animation ${animationKeyToCreate} from ${spritesheetKeyToLoad}:`, e);
                    }
                }
            } else {
                // Pet idle animations are handled differently (base key in Pet.js), so don't warn for those here.
                // For other missing pet battle animations (hurt, die), it's a content issue if desired.
                // For enemies, if any listed action's spritesheet isn't loaded, it's an issue.
                if (! (isPet && action === 'idle') ) { // Don't warn for pet 'idle' as it's handled by Pet class
                     console.warn(`Spritesheet ${spritesheetKeyToLoad} not loaded or does not exist. Cannot create animation ${animationKeyToCreate}.`);
                }
            }
        });
    }
    
    createUI() {
        this.createStatusBars();
        this.createBattleLog();
        this.createActionMenu();
        this.createResultPopup();

        // Ensure InventoryModal is available if the scene might be re-entered
        // or ensure it's cleaned up properly on shutdown.
        if (this.inventoryModal && this.inventoryModal.scene !== this) {
            this.inventoryModal = null; 
        }
    }

    createStatusBars() {
        const { width, height } = this.scale;
        this.statusGroup = this.add.group();
        // Pet status (above pet)
        const petStats = this.petEntity.data.stats;
        const petHpBuff = this.petEntity.data.activeBuffs.stats.hp ? this.petEntity.data.activeBuffs.stats.hp : 0;
        const petSpBuff = this.petEntity.data.activeBuffs.stats.sp ? this.petEntity.data.activeBuffs.stats.sp : 0;
        const petAtkBuff = this.petEntity.data.activeBuffs.stats.atk ? this.petEntity.data.activeBuffs.stats.atk : 0;
        const petDefBuff = this.petEntity.data.activeBuffs.stats.def ? this.petEntity.data.activeBuffs.stats.def : 0;

        const maxPetHP = petStats.maxhp + petHpBuff || petStats.hp + petHpBuff;
        const maxPetSP = petStats.maxsp + petSpBuff || petStats.sp + petSpBuff;
        const petHpText = `HP: ${petStats.hp + petHpBuff}/${maxPetHP}`;
        const petSpText = `SP: ${petStats.sp + petSpBuff}/${maxPetSP}`;
        const petStatText = `ATK: ${petStats.atk + petAtkBuff}  DEF: ${petStats.def + petDefBuff}`;
        
        // Position stats above pet (at position width * 0.3, height * 0.4)
        this.petStatusBg = this.add.rectangle(width * 0.3, height * 0.4, 200, 90, 0x222222, 0.7)
            .setOrigin(0.5, 0.5)
            .setStrokeStyle(1, 0xaaaaaa);
        this.petNameText = this.add.text(this.petStatusBg.x, this.petStatusBg.y - 30, this.petEntity.data.name, {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5, 0.5);
        this.petHpText = this.add.text(this.petStatusBg.x, this.petStatusBg.y - 10, petHpText, {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ff8080'
        }).setOrigin(0.5, 0.5);
        this.petSpText = this.add.text(this.petStatusBg.x, this.petStatusBg.y + 10, petSpText, {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#80a0ff'
        }).setOrigin(0.5, 0.5);
        this.petStatText = this.add.text(this.petStatusBg.x, this.petStatusBg.y + 30, petStatText, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5, 0.5);
        
        // Enemy status (above enemy)
        const enemyStats = this.enemyEntity.data.stats;
        const enemyHpBuff = this.enemyEntity.data.activeBuffs.stats.hp ? this.enemyEntity.data.activeBuffs.stats.hp : 0;
        const enemySpBuff = this.enemyEntity.data.activeBuffs.stats.sp ? this.enemyEntity.data.activeBuffs.stats.sp : 0;
        const enemyAtkBuff = this.enemyEntity.data.activeBuffs.stats.atk ? this.enemyEntity.data.activeBuffs.stats.atk : 0;
        const enemyDefBuff = this.enemyEntity.data.activeBuffs.stats.def ? this.enemyEntity.data.activeBuffs.stats.def : 0;
        
        const maxEnemyHP = enemyStats.maxhp + enemyHpBuff || enemyStats.hp + enemyHpBuff;
        const maxEnemySP = enemyStats.maxsp + enemySpBuff || enemyStats.sp + enemySpBuff;
        const enemyHpText = `HP: ${enemyStats.hp + enemyHpBuff}/${maxEnemyHP}`;
        const enemySpText = `SP: ${enemyStats.sp + enemySpBuff}/${maxEnemySP}`;
        const enemyStatText = `ATK: ${enemyStats.atk + enemyAtkBuff}  DEF: ${enemyStats.def + enemyDefBuff}`;
        
        // Position stats above enemy (at position width * 0.7, height * 0.4)
        this.enemyStatusBg = this.add.rectangle(width * 0.7, height * 0.4, 200, 90, 0x222222, 0.7)
            .setOrigin(0.5, 0.5)
            .setStrokeStyle(1, 0xaaaaaa);
        this.enemyNameText = this.add.text(this.enemyStatusBg.x, this.enemyStatusBg.y - 30, this.enemyEntity.data.name, {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffffff'
        }).setOrigin(0.5, 0.5);
        this.enemyHpText = this.add.text(this.enemyStatusBg.x, this.enemyStatusBg.y - 10, enemyHpText, {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#ff8080'
        }).setOrigin(0.5, 0.5);
        this.enemySpText = this.add.text(this.enemyStatusBg.x, this.enemyStatusBg.y + 10, enemySpText, {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#80a0ff'
        }).setOrigin(0.5, 0.5);
        this.enemyStatText = this.add.text(this.enemyStatusBg.x, this.enemyStatusBg.y + 30, enemyStatText, {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff'
        }).setOrigin(0.5, 0.5);
        
        // Add all to group for easy management
        this.statusGroup.add(this.petStatusBg);
        this.statusGroup.add(this.petNameText);
        this.statusGroup.add(this.petHpText);
        this.statusGroup.add(this.petSpText);
        this.statusGroup.add(this.petStatText);
        this.statusGroup.add(this.enemyStatusBg);
        this.statusGroup.add(this.enemyNameText);
        this.statusGroup.add(this.enemyHpText);
        this.statusGroup.add(this.enemySpText);
        this.statusGroup.add(this.enemyStatText);
    }

    updateStatusBars() {
        const petStats = this.petEntity.data.stats;
        const petHpBuff = this.petEntity.data.activeBuffs.stats.hp ? this.petEntity.data.activeBuffs.stats.hp : 0;
        const petSpBuff = this.petEntity.data.activeBuffs.stats.sp ? this.petEntity.data.activeBuffs.stats.sp : 0;
        const petAtkBuff = this.petEntity.data.activeBuffs.stats.atk ? this.petEntity.data.activeBuffs.stats.atk : 0;
        const petDefBuff = this.petEntity.data.activeBuffs.stats.def ? this.petEntity.data.activeBuffs.stats.def : 0;

        const maxPetHP = petStats.maxhp || petStats.hp;
        const maxPetSP = petStats.maxsp || petStats.sp;
        
        this.petHpText.setText(`HP: ${petStats.hp + petHpBuff}/${maxPetHP + petHpBuff}`);
        this.petSpText.setText(`SP: ${petStats.sp + petSpBuff}/${maxPetSP + petSpBuff}`);
        this.petStatText.setText(`ATK: ${petStats.atk + petAtkBuff}  DEF: ${petStats.def + petDefBuff}`);
        
        const enemyStats = this.enemyEntity.data.stats;
        const enemyHpBuff = this.enemyEntity.data.activeBuffs.stats.hp ? this.enemyEntity.data.activeBuffs.stats.hp : 0;
        const enemySpBuff = this.enemyEntity.data.activeBuffs.stats.sp ? this.enemyEntity.data.activeBuffs.stats.sp : 0;
        const enemyAtkBuff = this.enemyEntity.data.activeBuffs.stats.atk ? this.enemyEntity.data.activeBuffs.stats.atk : 0;
        const enemyDefBuff = this.enemyEntity.data.activeBuffs.stats.def ? this.enemyEntity.data.activeBuffs.stats.def : 0;
        
        const maxEnemyHP = enemyStats.maxhp || enemyStats.hp;
        const maxEnemySP = enemyStats.maxsp || enemyStats.sp;
        
        this.enemyHpText.setText(`HP: ${enemyStats.hp + enemyHpBuff}/${maxEnemyHP + enemyHpBuff}`);
        this.enemySpText.setText(`SP: ${enemyStats.sp + enemySpBuff}/${maxEnemySP + enemySpBuff}`);
        this.enemyStatText.setText(`ATK: ${enemyStats.atk + enemyAtkBuff}  DEF: ${enemyStats.def + enemyDefBuff}`);
    }

    createBattleLog() {
        const { width, height } = this.scale;
        
        // Move battle log to the middle of the screen, above pet and enemy stats
        // Position it below the top UI elements but above the pet/enemy stats display
        this.battleLogBg = this.add.rectangle(width/2, height * 0.2, width * 0.8, 80, 0x222222, 0.8)
            .setOrigin(0.5)
            .setStrokeStyle(1, 0xaaaaaa);
            
        // Battle log text
        this.battleLogText = this.add.text(width/2, height * 0.2, 'Preparing for battle...', {
            fontSize: '16px',
            color: '#ffff99',
            fontFamily: 'monospace',
            align: 'center',
            wordWrap: { width: width * 0.75 }
        }).setOrigin(0.5);
    }

    updateBattleLog() {
        // Show the last 3-4 messages for better readability
        const messages = this.battleLogic.battleLog.slice(-4);
        this.battleLogText.setText(messages.join('\n'));
    }

    createActionMenu() {
        const { width, height } = this.scale;
        
        // Container for all menu items
        this.actionMenu = this.add.container(width/2, height - 100);
        
        // Background panel
        const menuBg = this.add.rectangle(0, 0, width * 0.8, 80, 0x222222, 0.8)
            .setStrokeStyle(2, 0x555599);
        
        this.actionMenu.add(menuBg);
        
        // Action buttons - Update labels to show SP costs
        const actions = [
            { text: 'Basic Attack -5SP', action: () => this.handlePlayerAction('attack') },
            { text: 'Special Attack -10SP', action: () => this.handlePlayerAction('skill1') },
            { text: 'Defend', action: () => this.handlePlayerAction('defend') },
            { text: 'Items', action: () => this.handlePlayerAction('item') },
            { text: 'Run', action: () => this.handlePlayerAction('run') }
        ];
        
        // Calculate button layout
        const buttonWidth = 120; // Increased width to fit longer text
        const buttonHeight = 40;
        const padding = 10;
        const totalWidth = actions.length * (buttonWidth + padding) - padding;
        let startX = -totalWidth / 2;
        
        this.actionButtons = [];
        
        // Create buttons
        actions.forEach(actionConfig => {
            // Button background
            const button = this.add.rectangle(startX + buttonWidth/2, 0, buttonWidth, buttonHeight, 0x333366)
                .setInteractive({ useHandCursor: true })
                .on('pointerdown', actionConfig.action)
                .on('pointerover', () => button.setFillStyle(0x555599))
                .on('pointerout', () => button.setFillStyle(0x333366));
                
            // Button text - adjust font size to fit longer text
            const text = this.add.text(startX + buttonWidth/2, 0, actionConfig.text, {
                fontSize: '14px', // Smaller font to fit longer text
                color: '#ffffff',
                fontFamily: 'monospace',
                align: 'center',
                wordWrap: { width: buttonWidth - 4 } // Word wrap to keep text inside button
            }).setOrigin(0.5);
            
            // Add to container and button list
            this.actionMenu.add([button, text]);
            this.actionButtons.push({ button, text });
            
            // Move to next button position
            startX += buttonWidth + padding;
        });
        
        // Initially disable the menu until battle starts
        this.setActionMenuEnabled(false);
    }
    
    setActionMenuEnabled(enabled) {
        this.actionButtons.forEach(item => {
            item.button.input.enabled = enabled;
            const alpha = enabled ? 1.0 : 0.5;
            item.button.setAlpha(alpha);
            item.text.setAlpha(alpha);
        });
    }
    
    createResultPopup() {
        const { width, height } = this.scale;
        
        // Create a container for the popup (invisible initially)
        this.resultPopup = this.add.container(width/2, height/2)
            .setAlpha(0)
            .setVisible(false)
            .setDepth(100); // Set a high depth for the container
            
        // Background to cover the full screen
        const popupBg = this.add.rectangle(0, 0, width, height, 0x222244, 0.95) // x,y relative to container center
            .setStrokeStyle(3, 0xaaaaff);
            
        // Result title text - Positioned towards the top
        this.resultTitle = this.add.text(0, -height * 0.35, '', { // Adjusted Y
            fontSize: '36px', // Slightly larger title
            color: '#ffffff',
            fontFamily: 'monospace',
            align: 'center'
        }).setOrigin(0.5);
        
        // Result details text - Positioned in the middle area
        this.resultDetails = this.add.text(0, 0, '', { // Adjusted Y to be centered
            fontSize: '22px', // Slightly larger details
            color: '#ffff99',
            fontFamily: 'monospace',
            align: 'center',
            wordWrap: { width: width * 0.7 } // Wider word wrap for fullscreen
        }).setOrigin(0.5);
        
        // Continue button - Positioned towards the bottom
        const continueBtnY = height * 0.35; // Adjusted Y
        const continueBtn = this.add.rectangle(0, continueBtnY, 200, 60, 0x4444aa) // Slightly larger button
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.handleBattleEnd())
            .on('pointerover', () => continueBtn.setFillStyle(0x6666cc))
            .on('pointerout', () => continueBtn.setFillStyle(0x4444aa));
            
        const continueTxt = this.add.text(0, continueBtnY, 'Continue', {
            fontSize: '24px', // Slightly larger button text
            color: '#ffffff',
            fontFamily: 'monospace'
        }).setOrigin(0.5);
        
        // Add everything to the popup container
        this.resultPopup.add([popupBg, this.resultTitle, this.resultDetails, continueBtn, continueTxt]);
    }
    
    showResultPopup(result, rewards = []) {
        // Stop all input
        this.setActionMenuEnabled(false);
        
        // Set content based on result
        let title = '';
        let details = '';
        
        switch(result) {
            case 'victory':
                title = 'Victory!';
                
                // Format rewards nicely
                const itemRewards = rewards.filter(r => !r.includes('EXP') && !r.includes('Gold'));
                const expGold = rewards.filter(r => r.includes('EXP') || r.includes('Gold'));
                
                let rewardText = '';
                
                // Add experience and gold first
                if (expGold.length > 0) {
                    rewardText += expGold.join('\n') + '\n';
                }
                
                // Add items if any
                if (itemRewards.length > 0) {
                    rewardText += itemRewards.length > 0 ? 
                        '\nItems:\n' + itemRewards.join('\n') : '';
                }
                
                details = rewardText || 'You defeated the enemy!';
                break;
                
            case 'defeat':
                title = 'Defeat!';
                details = 'Your pet was defeated in battle.\nIt has recovered 50% HP.\nBetter luck next time!';
                break;
                
            case 'escape':
                title = 'Escaped!';
                details = 'You managed to escape from the battle.';
                break;
        }
        
        this.resultTitle.setText(title);
        this.resultDetails.setText(details);
        
        // Show popup with animation
        this.resultPopup.setVisible(true);
        this.tweens.add({
            targets: this.resultPopup,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
    }
    
    startBattle() {
        // Initialize battle state
        this.battleLogic.startBattle();
        this.updateBattleLog();
        this.updateStatusBars();
        
        // Begin with the first turn after a short delay
        this.time.delayedCall(1000, () => {
            if (this.battleLogic.currentTurn === 'player') {
                this.startPlayerTurn();
            } else {
                this.executeEnemyTurn();
            }
        });
    }
    
    startPlayerTurn() {
        if (this.battleLogic.battleEnded) return;
        
        this.battleLogic.battleLog.push('Your turn! Choose an action.');
        this.updateBattleLog();
        this.setActionMenuEnabled(true);
    }
    
    handlePlayerAction(actionType) {
        if (this.battleLogic.battleEnded || this.battleLogic.currentTurn !== 'player' || this.battleLogic.actionInProgress) return;
        
        this.battleLogic.actionInProgress = true; // Prevent multiple actions

        // Disable menu during action
        this.setActionMenuEnabled(false);
        let actionSuccess = false; // Declare actionSuccess here
        const petStats = this.petEntity.data.stats;
        switch(actionType) {
            case 'attack':
                if (petStats.sp < 5) {
                    this.battleLogic.battleLog.push('Not enough SP to attack!');
                    this.updateBattleLog();
                    this.time.delayedCall(800, () => {
                        this.setActionMenuEnabled(true);
                        this.battleLogic.actionInProgress = false;
                    });
                    return;
                }
                this.animateAction('attack', 'pet', 'enemy', () => {
                    this.battleLogic.attack(this.petEntity, this.enemyEntity, this.battleLogic.isEnemyDefending);
                    this.afterPlayerAction();
                });
                actionSuccess = true; // This was commented earlier, can be set if needed for other logic
                break;
            case 'skill1':
                if (petStats.sp < 10) {
                    this.battleLogic.battleLog.push('Not enough SP to use Special Attack!');
                    this.updateBattleLog();
                    this.time.delayedCall(800, () => {
                        this.setActionMenuEnabled(true);
                        this.battleLogic.actionInProgress = false;
                    });
                    return;
                }
                // Pass 'skill1' as actionType to animateAction
                this.animateAction('skill1', 'pet', 'enemy', () => { 
                    this.battleLogic.useAbility(this.petEntity, this.enemyEntity, 0, this.battleLogic.isEnemyDefending);
                    this.afterPlayerAction();
                });
                actionSuccess = true; // Similar to attack
                break;
            case 'defend':
                if (petStats.sp < 5) {
                    this.battleLogic.battleLog.push('Not enough SP to defend!');
                    this.updateBattleLog();
                    this.time.delayedCall(800, () => {
                        this.setActionMenuEnabled(true);
                        this.battleLogic.actionInProgress = false;
                    });
                    return;
                }
                actionSuccess = this.battleLogic.defend(this.petEntity); // Now assigns to a declared variable
                this.updateBattleLog();
                this.time.delayedCall(800, () => this.afterPlayerAction());
                break;
            case 'item':
                if (this.battleLogic.itemUsedThisBattle) { // Check itemUsedThisBattle
                    this.battleLogic.battleLog.push('You can only use one item per battle!'); // Updated message
                    this.updateBattleLog();
                    this.time.delayedCall(800, () => {
                        this.setActionMenuEnabled(true);
                        this.battleLogic.actionInProgress = false;
                    });
                    return;
                }

                if (this.inventoryModal && this.inventoryModal.isOpen) {
                    this.inventoryModal.close(); // Close if already open
                }
                
                this.inventoryModal = new InventoryModal(this, {
                    actionType: 'medicine', // Filter for medicine items
                    onItemSelect: async (itemId) => {
                        console.log('Item selected in battle:', itemId);
                        const globalContext = getGlobalContext();
                        if (!globalContext || !globalContext.userData || !globalContext.userData.inventory) {
                            this.battleLogic.battleLog.push('Inventory data not available.');
                            this.updateBattleLog();
                            this.time.delayedCall(800, () => {
                                 this.setActionMenuEnabled(true); // Re-enable menu on error
                                 this.battleLogic.actionInProgress = false;
                            });
                            return;
                        }

                        const inventory = globalContext.userData.inventory;
                        const inventoryItem = inventory.find(entry => entry.item._id === itemId);

                        if (!inventoryItem || !inventoryItem.item) {
                            this.battleLogic.battleLog.push('Selected item not found in inventory!');
                            this.updateBattleLog();
                            this.time.delayedCall(800, () => {
                                this.setActionMenuEnabled(true);
                                this.battleLogic.actionInProgress = false;
                            });
                            return;
                        }

                        const itemToUse = inventoryItem.item;

                        const currentPetStats = this.petEntity.data.stats;
                        const petBuffs = this.petEntity.data.activeBuffs && this.petEntity.data.activeBuffs.stats ? 
                                         this.petEntity.data.activeBuffs.stats : { hp: 0, sp: 0 };
                        
                        const baseMaxHP = currentPetStats.maxhp;
                        const baseMaxSP = currentPetStats.maxsp;
                        const currentHP = currentPetStats.hp;
                        const currentSP = currentPetStats.sp;

                        if (typeof baseMaxHP === 'undefined' || typeof baseMaxSP === 'undefined') {
                            console.error("Critical: baseMaxHP or baseMaxSP is undefined in petEntity.data.stats!", currentPetStats);
                            this.battleLogic.battleLog.push('Error: Pet max stats unavailable.');
                            this.updateBattleLog();
                             this.time.delayedCall(800, () => {
                                this.setActionMenuEnabled(true);
                                this.battleLogic.actionInProgress = false;
                            });
                            return;
                        }

                        const currentHPWithBuffs = currentHP + (petBuffs.hp || 0);
                        const maxHPWithBuffs = baseMaxHP + (petBuffs.hp || 0);
                        const currentSPWithBuffs = currentSP + (petBuffs.sp || 0);
                        const maxSPWithBuffs = baseMaxSP + (petBuffs.sp || 0);

                        console.log(`[BattleSystem] Item Use Check. Item: ${itemToUse.name} (${itemToUse._id})`);
                        console.log(`  Pet Base Stats: HP=${currentHP}/${baseMaxHP}, SP=${currentSP}/${baseMaxSP}`);
                        console.log(`  Pet Buffs: HP=${petBuffs.hp || 0}, SP=${petBuffs.sp || 0}`);
                        console.log(`  Effective Stats: HP=${currentHPWithBuffs}/${maxHPWithBuffs}, SP=${currentSPWithBuffs}/${maxSPWithBuffs}`);
                        console.log(`  Item Effects: health=${itemToUse.effects?.health}, sp=${itemToUse.effects?.sp}`);

                        let blockAPICall = false;
                        let blockReason = "";

                        // Standard usability checks based on item type and pet's current stats (aligning with MainMenu.js)
                        const isHpPotion = itemToUse.name === 'hp-potion';
                        const isSpPotion = itemToUse.name === 'sp-potion';
                        const isMixedOrBestPotion = itemToUse.name === 'mixed-potion' || itemToUse.name === 'best-potion';

                        const hpIsFull = currentHPWithBuffs >= maxHPWithBuffs;
                        const spIsFull = currentSPWithBuffs >= maxSPWithBuffs;

                        console.log(`[BattleSystem] Stat fullness: hpIsFull=${hpIsFull}, spIsFull=${spIsFull}`);
                        console.log(`[BattleSystem] Item type flags: isHpPotion=${isHpPotion}, isSpPotion=${isSpPotion}, isMixedOrBestPotion=${isMixedOrBestPotion}`);

                        if (isHpPotion) {
                            console.log("[BattleSystem] Evaluating 'hp-potion' conditions...");
                            if (hpIsFull) {
                                console.log("[BattleSystem]   HP Potion Blocked: HP is full.");
                                blockAPICall = true;
                                blockReason = `${this.petEntity.data.name} is already at full HP!`;
                            } else {
                                console.log("[BattleSystem]   HP-potion check: No block condition met.");
                            }
                        } else if (isSpPotion) {
                            console.log("[BattleSystem] Evaluating 'sp-potion' conditions...");
                            if (spIsFull) {
                                console.log("[BattleSystem]   SP Potion Blocked: SP is full.");
                                blockAPICall = true;
                                blockReason = `${this.petEntity.data.name} is already at full SP!`;
                            } else {
                                console.log("[BattleSystem]   SP-potion check: No block condition met.");
                            }
                        } else if (isMixedOrBestPotion) {
                            console.log("[BattleSystem] Evaluating 'mixed-potion'/'best-potion' conditions...");
                            if (hpIsFull && spIsFull) {
                                console.log("[BattleSystem]   Mixed/Best Potion Blocked: Both HP & SP are full.");
                                blockAPICall = true;
                                blockReason = `${this.petEntity.data.name} is already at full HP and SP!`;
                            } else {
                                console.log("[BattleSystem]   Mixed/Best-potion check: No block condition met.");
                            }
                        } else {
                            console.log(`[BattleSystem] Item name '${itemToUse.name}' did not match known potion types for these checks.`);
                        }

                        if (blockAPICall) {
                            console.log(`[BattleSystem] Blocking API call for item use: ${blockReason}`);
                            this.battleLogic.battleLog.push(blockReason);
                            this.updateBattleLog();
                            this.time.delayedCall(800, () => {
                                this.setActionMenuEnabled(true);
                                this.battleLogic.actionInProgress = false;
                            });
                            return;
                        }
                        
                        console.log("[BattleSystem] Frontend checks passed. Proceeding with API call for item use.");

                        // Animate item use, then apply effects and consume via backend
                        this.animateAction('medicine', 'pet', null, async () => {
                            try {
                                const token = localStorage.getItem('token');
                                const API_URL = import.meta.env.VITE_API_URL;
                                const petId = this.petEntity.data._id;
                                const globalContext = getGlobalContext(); // Ensure globalContext is defined in this scope

                                if (!token || !petId) {
                                    this.battleLogic.battleLog.push('Authentication or Pet ID missing.');
                                    this.afterPlayerAction(); 
                                    return;
                                }

                                const response = await fetch(`${API_URL}/pets/${petId}/medicine`, {
                                    method: 'PUT',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${token}`
                                    },
                                    body: JSON.stringify({ itemId: itemToUse._id }) 
                                });

                                let responseData;
                                // Check content type before attempting to parse as JSON
                                const contentType = response.headers.get("content-type");
                                if (contentType && contentType.includes("application/json")) {
                                    responseData = await response.json();
                                } else {
                                    const textResponse = await response.text();
                                    console.error(`Server returned non-JSON response (${response.status}):`, textResponse);
                                    this.battleLogic.battleLog.push(`Server error: ${response.status}. Check console for details.`);
                                    // Propagate an error to be caught by the catch block
                                    throw new Error(`Server returned non-JSON response: ${response.status} - ${textResponse.substring(0, 150)}`);
                                }

                                if (response.ok && responseData.success) {
                                    const updatedPetDataFromBackend = responseData.data; 
                                    
                                    const oldCurrentHP = this.petEntity.data.stats.hp;
                                    const oldCurrentSP = this.petEntity.data.stats.sp;

                                    // Update petEntity in battle with new stats from backend
                                    this.petEntity.data.stats.hp = updatedPetDataFromBackend.currentHP; 
                                    this.petEntity.data.stats.sp = updatedPetDataFromBackend.currentSP; 
                                    this.petEntity.data.stats.maxhp = updatedPetDataFromBackend.stats.hp; 
                                    this.petEntity.data.stats.maxsp = updatedPetDataFromBackend.stats.sp; 

                                    console.log(`[BattleSystem] Pet entity updated after item use: HP=${this.petEntity.data.stats.hp}/${this.petEntity.data.stats.maxhp}, SP=${this.petEntity.data.stats.sp}/${this.petEntity.data.stats.maxsp}`);

                                    if (this.petData && this.petData._id === updatedPetDataFromBackend._id) {
                                        this.petData = updatedPetDataFromBackend;
                                    }

                                    if (globalContext) {
                                        await globalContext.fetchInventory();
                                        if (globalContext.userData && globalContext.userData.selectedPet && globalContext.userData.selectedPet._id === petId) {
                                            globalContext.userData.selectedPet = updatedPetDataFromBackend;
                                        }
                                    }
                                    
                                    const actualHealedHP = this.petEntity.data.stats.hp - oldCurrentHP;
                                    const actualRestoredSP = this.petEntity.data.stats.sp - oldCurrentSP;
                                    const petName = this.petEntity.data.name;
                                    const itemNameDisplay = itemToUse.displayName || itemToUse.name;
                                    
                                    let logMessage = `${petName} used ${itemNameDisplay}`;

                                    // Simpler message construction, similar to MainMenu.js style
                                    // Acknowledges all healing that occurred.
                                    if (itemToUse.name === 'best-potion' && 
                                        this.petEntity.data.stats.hp >= (this.petEntity.data.stats.maxhp + (petBuffs.hp || 0)) &&
                                        this.petEntity.data.stats.sp >= (this.petEntity.data.stats.maxsp + (petBuffs.sp || 0)) ) {
                                        logMessage = `${petName} is fully restored with ${itemNameDisplay}!`;
                                    } else if (actualHealedHP > 0 && actualRestoredSP > 0) {
                                        logMessage += `! Restored ${actualHealedHP} HP and ${actualRestoredSP} SP.`;
                                    } else if (actualHealedHP > 0) {
                                        logMessage += `! Restored ${actualHealedHP} HP.`;
                                    } else if (actualRestoredSP > 0) {
                                        logMessage += `! Restored ${actualRestoredSP} SP.`;
                                    } else {
                                        logMessage += `, but no significant effect or already at maximum.`;
                                    }
                                    this.battleLogic.battleLog.push(logMessage);

                                    const updatedPetBuffs = this.petEntity.data.activeBuffs && this.petEntity.data.activeBuffs.stats ? this.petEntity.data.activeBuffs.stats : { hp: 0, sp: 0 };
                                    const currentMaxHPUI = (this.petEntity.data.stats.maxhp || this.petEntity.data.stats.hp) + (updatedPetBuffs.hp || 0);
                                    const currentMaxSPUI = (this.petEntity.data.stats.maxsp || this.petEntity.data.stats.sp) + (updatedPetBuffs.sp || 0);
                                    this.battleLogic.battleLog.push(`${this.petEntity.data.name} HP: ${this.petEntity.data.stats.hp}/${currentMaxHPUI}, SP: ${this.petEntity.data.stats.sp}/${currentMaxSPUI}`);
                                    
                                    this.battleLogic.itemUsedThisBattle = true; // Set itemUsedThisBattle to true
                                } else {
                                    // Use error message from responseData if available
                                    const errorMsg = responseData.error || responseData.message || `Server returned ${response.status}`;
                                    this.battleLogic.battleLog.push(`Failed to use item: ${errorMsg}`);
                                    console.error('[BattleSystem] Failed to use item, server response:', responseData);
                                }
                            } catch (error) {
                                console.error('[BattleSystem] Error using item in battle:', error);
                                // Check if it's our custom error for non-JSON responses
                                if (error.message && error.message.startsWith("Server returned non-JSON response")) {
                                   // Message already pushed to battle log from the 'else' block where the error was thrown
                                } else if (error instanceof SyntaxError) { 
                                    this.battleLogic.battleLog.push('Received invalid response format from server.');
                                } else {
                                    this.battleLogic.battleLog.push('An unexpected error occurred while using the item.');
                                }
                            } finally {
                                this.afterPlayerAction(); 
                            }
                        }, { itemName: itemToUse.name }); 
                    },
                    onClose: () => {
                        this.setActionMenuEnabled(true); 
                        this.battleLogic.actionInProgress = false;
                    }
                });
                this.inventoryModal.show();
                // No explicit actionSuccess = true here, as success is determined by the async callback
                break;
            case 'run':
                this.battleLogic.battleLog.push('Attempting to escape...');
                this.updateBattleLog();
                if (Math.random() < 0.5) {
                    this.battleLogic.battleLog.push('Got away safely!');
                    this.battleLogic.battleEnded = true;
                    this.updateBattleLog();
                    this.time.delayedCall(1200, () => this.showResultPopup('escape'));
                } else {
                    this.battleLogic.battleLog.push('Could not escape!');
                    this.updateBattleLog();
                    this.time.delayedCall(1200, () => this.afterPlayerAction());
                }
                actionSuccess = true; // Assigns to declared variable
                break;
        }
        // The following block was commented out, but declaring actionSuccess is still necessary
        // if (!actionSuccess && actionType !== 'run' && actionType !== 'item' && actionType !== 'attack' && actionType !== 'skill1') {
        // // The conditions for re-enabling menu are tricky here, as attack/skill/item have async callbacks
        // // It's generally handled by the end of their respective sequences or onClose for modals
        //     this.time.delayedCall(500, () => {
        //         if (!this.battleLogic.battleEnded) { // Only re-enable if battle is still ongoing
        //             this.setActionMenuEnabled(true);
        //             this.battleLogic.actionInProgress = false;
        //         }
        //     });
        // }
    }
    
    afterPlayerAction() {
        // Update UI
        this.updateStatusBars();
        this.updateBattleLog();
        
        // Check for battle end
        if (this.battleLogic.checkBattleEnd()) {
            this.handleBattleResult();
            this.battleLogic.actionInProgress = false; // Ensure flag is reset on battle end
            return;
        }
        
        // Switch to enemy turn
        this.battleLogic.nextTurn();
        this.updateBattleLog();
        
        // Execute enemy turn after delay
        this.time.delayedCall(1000, () => this.executeEnemyTurn());
    }
    
    executeEnemyTurn() {
        if (this.battleLogic.battleEnded) {
            this.battleLogic.actionInProgress = false;
            return;
        }
        
        this.battleLogic.battleLog.push(`${this.enemyEntity.data.name}'s turn...`);
        this.updateBattleLog();
        
        this.time.delayedCall(800, () => {
            const enemyPerformedAction = this.battleLogic.enemyAction(); // e.g., 'attack', 'special', 'defend', 'skip'
            
            if (enemyPerformedAction === 'defend' || enemyPerformedAction === 'skip') {
                this.updateBattleLog(); 
                this.time.delayedCall(1000, () => this.afterEnemyTurn());
            } else if (enemyPerformedAction) { // 'attack' or 'special'
                // Determine animation type based on enemyPerformedAction.
                // Assuming 'special' from enemyAction corresponds to a skill1-like animation.
                // If enemy only has one attack animation, map 'special' to 'attack' for animation.
                const animationToPlay = (enemyPerformedAction === 'special' && this.anims.exists(`${this.enemyEntity.data.key}_skill1`)) ? 'skill1' : 'attack';
                this.animateAction(animationToPlay, 'enemy', 'pet', () => {
                    this.afterEnemyTurn();
                });
            } else {
                 // Should not happen if enemyAction always returns a string
                this.afterEnemyTurn();
            }
        });
    }
    
    afterEnemyTurn() {
        // Update UI after enemy action
        this.updateStatusBars();
        this.updateBattleLog();
        
        // Check for battle end
        if (this.battleLogic.checkBattleEnd()) {
            this.handleBattleResult();
            return;
        }
        
        // Switch to player turn
        this.battleLogic.nextTurn();
        this.updateBattleLog();
        
        // Start player turn after delay
        this.time.delayedCall(1000, () => {
            this.battleLogic.actionInProgress = false; // Reset before player turn starts
            this.startPlayerTurn();
        });
    }
    
    // Modified to handle death animations before showing popup
    async handleBattleResult() {
        let petDied = this.petEntity.data.stats.hp <= 0;
        let enemyDied = this.enemyEntity.data.stats.hp <= 0;
        let deathAnimationPromise = Promise.resolve();
        let enemyFadeOutPromise = Promise.resolve(); // Promise specifically for enemy fade-out

        if (petDied) {
            if (this.petEntity.sprite && this.petEntity.playAnimation) {
                // Assuming Pet.js playAnimation correctly handles a 'die' animation key
                this.petEntity.playAnimation('die'); 
                const animDuration = (this.petEntity.sprite.anims.currentAnim?.duration || 1000);
                deathAnimationPromise = new Promise(resolve => this.time.delayedCall(animDuration, resolve));
            }
        } else if (enemyDied) {
            if (this.enemyEntity.sprite) {
                const enemyEntityKey = this.enemyEntity.data.key; // e.g., 'gorgon_idle'
                const baseEnemyKey = enemyEntityKey.endsWith('_idle') ? enemyEntityKey.substring(0, enemyEntityKey.length - 5) : enemyEntityKey;
                const dieAnimKey = `${baseEnemyKey}_die`; // e.g., 'gorgon_die'

                if (this.anims.exists(dieAnimKey)) {
                    console.log(`Playing enemy death animation: ${dieAnimKey}`);
                    this.enemyEntity.sprite.play(dieAnimKey, true); // Play the animation, ignoreIfPlaying = true
                    const animDuration = (this.enemyEntity.sprite.anims.currentAnim?.duration || 1000);
                    
                    // Promise for the death animation itself
                    deathAnimationPromise = new Promise(resolve => this.time.delayedCall(animDuration, resolve));

                    // Chain fade out after death animation for enemy
                    // This promise will be awaited specifically if the enemy died
                    enemyFadeOutPromise = deathAnimationPromise.then(() => {
                        return new Promise(resolveAfterFade => {
                            if (this.enemyEntity.sprite && this.enemyEntity.sprite.active) { // Check if sprite still exists
                                console.log(`Fading out enemy sprite: ${this.enemyEntity.data.name}`);
                                this.tweens.add({
                                    targets: this.enemyEntity.sprite,
                                    alpha: 0,
                                    duration: 500, // Duration of fade out
                                    ease: 'Power2',
                                    onComplete: () => {
                                        if (this.enemyEntity.sprite) {
                                            // this.enemyEntity.sprite.setVisible(false); // Optionally hide more permanently
                                        }
                                        resolveAfterFade(); // Resolve the fade-out promise
                                    }
                                });
                            } else {
                                resolveAfterFade(); // Sprite already gone or inactive
                            }
                        });
                    });

                } else {
                    console.warn(`Death animation ${dieAnimKey} not found for enemy ${this.enemyEntity.data.name}. Fading out directly.`);
                    // Fallback: If 'die' animation doesn't exist, just fade out
                    if (this.enemyEntity.sprite && this.enemyEntity.sprite.active) {
                         enemyFadeOutPromise = new Promise(resolve => {
                            this.tweens.add({
                                targets: this.enemyEntity.sprite,
                                alpha: 0,
                                duration: 500,
                                ease: 'Power2',
                                onComplete: () => {
                                    resolve();
                                }
                            });
                        });
                    } else {
                        enemyFadeOutPromise = Promise.resolve(); // No sprite to fade
                    }
                    deathAnimationPromise = enemyFadeOutPromise; // The 'death animation' is just the fade
                }
            }
        }

        // Wait for the primary death animation (pet or enemy's main anim part)
        await deathAnimationPromise;
        
        // If enemy died, also wait for its fade-out to complete *before* showing victory popup.
        if (enemyDied) {
            await enemyFadeOutPromise;
        }

        // Proceed with calculating rewards and showing popup
        if (petDied) {
            this.showResultPopup('defeat');
        } else if (enemyDied) {
            // Victory: Calculate rewards
            const enemyLevel = this.enemyData.level || 1;
            this.expGained = Math.floor(enemyLevel * 20 + Math.random() * 10);
            this.goldGained = Math.floor(enemyLevel * 20 + Math.random() * enemyLevel * 10); // Increased coin reward

            // Calculate gem drops (rare chance)
            // REMOVED: Gem calculation
            // if (Math.random() < 0.2) { // 20% chance to find a gem
            //     this.gemsGained = Math.ceil(Math.random() * 2); // 1-2 gems
            // }
            this.gemsGained = 0; // Ensure gemsGained is 0
            
            // Add experience and gold to pet data
            if (!this.petEntity.data.experience) this.petEntity.data.experience = 0;
            this.petEntity.data.experience += this.expGained;
            
            // Check for level up
            this.checkPetLevelUp();
            
            // Update the UI to reflect new stats
            this.updateStatusBars();
            
            // Generate item drops based on enemy level and difficulty
            this.battleLogic.battleground = this.levelData || { selectedDifficulty: 1 };
            const itemDrops = this.battleLogic.generateDrops();
            this.itemsGained = itemDrops;
            
            // Clear any existing drops
            this.battleLogic.drops = [];
            
            // Add rewards to the drops list
            this.battleLogic.drops.push(`${this.expGained} EXP`);
            this.battleLogic.drops.push(`${this.goldGained} Coins`);
            
            // Add gems to rewards list if any were gained
            // REMOVED: Adding gems to drops
            // if (this.gemsGained > 0) {
            //     this.battleLogic.drops.push(`${this.gemsGained} Gem${this.gemsGained > 1 ? 's' : ''}`);
            // }
            
            // Add item drops to the rewards list
            if (this.itemsGained && this.itemsGained.length > 0) {
                this.itemsGained.forEach(item => {
                    // Format item names nicely
                    const rarityDisplay = item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1);
                    this.battleLogic.drops.push(`${rarityDisplay} ${item.type}`);
                });
            }
            
            this.showResultPopup('victory', this.battleLogic.drops);
        } else if (this.battleLogic.battleEnded) {
            // Escaped
            this.showResultPopup('escape');
        }
        
        // Update pet's combat stats (original logic)
        this.updatePetStats();
    }
    
    checkPetLevelUp() {
        const pet = this.petEntity.data;
        let leveledUp = false;
        let levelsGained = 0;
        
        // Use the same level up logic as backend
        while (pet.experience >= pet.level * pet.level * 100) {
            const requiredXP = pet.level * pet.level * 100;
            pet.level += 1;
            pet.experience -= requiredXP;
            levelsGained += 1;
            leveledUp = true;
            
            // Increase pet stats (similar to backend logic)
            const atkGain = Math.floor(Math.random() * 5) + 1;
            const defGain = Math.floor(Math.random() * 5) + 1;
            const hpGain = Math.floor(Math.random() * 20) + 10;
            const spGain = Math.floor(Math.random() * 10) + 5;
            
            // Update maximum stats
            pet.stats.maxhp = (pet.stats.maxhp || pet.stats.hp) + hpGain;
            pet.stats.maxsp = (pet.stats.maxsp || pet.stats.sp) + spGain;
            pet.stats.atk += atkGain;
            pet.stats.def += defGain;
            
            // IMPORTANT: After leveling up, we fully restore HP and SP
            // Current battle values are stored in pet.stats.hp/sp
            pet.stats.hp = pet.stats.maxhp;
            pet.stats.sp = pet.stats.maxsp;
            
            console.log(`Level Up! Level ${pet.level} - Gained: HP +${hpGain}, SP +${spGain}, ATK +${atkGain}, DEF +${defGain}`);
            console.log(`New stats - HP: ${pet.stats.hp}/${pet.stats.maxhp}, SP: ${pet.stats.sp}/${pet.stats.maxsp}`);
        }
        
        if (leveledUp) {
            // Add level up message to battle log
            this.battleLogic.battleLog.push(`${pet.name} leveled up to level ${pet.level}!`);
            this.updateBattleLog();
            
            // If levels were gained, also update the popup message
            if (this.battleLogic.drops && levelsGained > 0) {
                this.battleLogic.drops.push(`Level up! +${levelsGained} level${levelsGained > 1 ? 's' : ''}`);
            }
        }
        
        return { leveledUp, levelsGained };
    }
    
    updatePetStats() {
        // Update original pet data with current HP and any stat changes
        if (this.petData.stats) {
            // Get buff values to exclude from persisted data
            const hpBuff = this.petEntity.data.activeBuffs && this.petEntity.data.activeBuffs.stats ? 
                (this.petEntity.data.activeBuffs.stats.hp || 0) : 0;
            const spBuff = this.petEntity.data.activeBuffs && this.petEntity.data.activeBuffs.stats ? 
                (this.petEntity.data.activeBuffs.stats.sp || 0) : 0;
            const atkBuff = this.petEntity.data.activeBuffs && this.petEntity.data.activeBuffs.stats ? 
                (this.petEntity.data.activeBuffs.stats.atk || 0) : 0;
            const defBuff = this.petEntity.data.activeBuffs && this.petEntity.data.activeBuffs.stats ? 
                (this.petEntity.data.activeBuffs.stats.def || 0) : 0;
                
            // Set currentHP and currentSP for backend persistence
            // These are CURRENT values (not max values) WITHOUT buffs
            this.petData.currentHP = this.petEntity.data.stats.hp;
            this.petData.currentSP = this.petEntity.data.stats.sp;
            
            // Set the max HP/SP in stats (without buffs)
            // This is crucial after level-up to persist the new max values
            this.petData.stats.hp = this.petEntity.data.stats.maxhp || this.petEntity.data.stats.hp;
            this.petData.stats.sp = this.petEntity.data.stats.maxsp || this.petEntity.data.stats.sp;
            
            // Set ATK/DEF (these are base + equipment + permanent buffs, excluding temporary battle buffs)
            this.petData.stats.atk = this.petEntity.data.stats.atk;
            this.petData.stats.def = this.petEntity.data.stats.def;
            
            console.log('Pet stats consistency check:');
            console.log(`Current HP: ${this.petData.currentHP}, Max HP: ${this.petData.stats.hp}`);
            console.log(`Current SP: ${this.petData.currentSP}, Max SP: ${this.petData.stats.sp}`);
            console.log(`ATK: ${this.petData.stats.atk}, DEF: ${this.petData.stats.def}`);
        }
        
        // Update experience and level
        if (this.petEntity.data.experience !== undefined) {
            this.petData.experience = this.petEntity.data.experience;
        }
        
        // Update level
        if (this.petEntity.data.level !== undefined) {
            this.petData.level = this.petEntity.data.level;
        }
        
        console.log('Updated pet stats after battle (excluding buffs):', 
            'ATK:', this.petData.stats.atk,
            'DEF:', this.petData.stats.def,
            'currentHP:', this.petData.currentHP, 
            'maxHP:', this.petData.stats.hp,
            'currentSP:', this.petData.currentSP,
            'maxSP:', this.petData.stats.sp,
            'EXP:', this.petData.experience,
            'Level:', this.petData.level);
    }
    
    async updatePetBackend() {
        if (!this.petData || !this.petData._id) return;
        
        const API_URL = import.meta.env.VITE_API_URL;
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error('No token found, cannot update pet stats/attributes on backend');
            return;
        }
        
        // Create proper stats payload with updated stats from level ups
        const statsPayload = {
            currentHP: this.petData.currentHP,
            currentSP: this.petData.currentSP,
            experience: this.petData.experience,
            level: this.petData.level,
            hp: this.petData.stats.hp,
            sp: this.petData.stats.sp,
            atk: this.petData.stats.atk,
            def: this.petData.stats.def
        };

        // Improved logging to help with debugging HP/SP issues
        console.log('Updating pet stats to backend after battle:');
        console.log(`Current HP: ${statsPayload.currentHP} / Max HP: ${statsPayload.hp}`);
        console.log(`Current SP: ${statsPayload.currentSP} / Max SP: ${statsPayload.sp}`);
        console.log(`Level: ${statsPayload.level}, EXP: ${statsPayload.experience}`);
        console.log(`ATK: ${statsPayload.atk}, DEF: ${statsPayload.def}`);

        // Update attributes (decrease stamina)
        const attrPayload = {
            stamina: Math.max(0, this.petData.attributes.stamina - 10),
            happiness: Math.max(0, this.petData.attributes.happiness - 10),
            hunger: Math.min(100, this.petData.attributes.hunger + 10)
        };
        
        // Get reference to global context
        const globalContext = typeof getGlobalContext === 'function' ? getGlobalContext() : null;

        try {
            // Update pet stats (HP/SP)
            const statsResponse = await fetch(`${API_URL}/pets/${this.petData._id}/stats`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(statsPayload)
            });
            
            // Get updated pet data from response
            const statsData = await statsResponse.json();
            if (statsResponse.ok && statsData.success) {
                console.log('Successfully updated pet stats:', statsData.data);
                // Update local petData with fresh data from server, preserving our maxhp/maxsp values
                if (statsData.data) {
                    // Update with the fresh data from server
                    this.petData = statsData.data;
                    
                    // Make sure max values are preserved
                    if (!this.petData.maxhp) {
                        this.petData.maxhp = this.petData.stats.hp;
                    }
                    if (!this.petData.maxsp) {
                        this.petData.maxsp = this.petData.stats.sp;
                    }
                }
            }
            
            // Update pet attributes
            const attrResponse = await fetch(`${API_URL}/pets/${this.petData._id}/attributes`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(attrPayload)
            });
            
            // Get updated pet data from response
            const attrData = await attrResponse.json();
            if (attrResponse.ok && attrData.success && attrData.data && attrData.data.attributes) {
                console.log('Successfully updated pet attributes (raw from server):', attrData.data.attributes);
                const serverAttributes = attrData.data.attributes;

                // Create a new object for updated attributes, starting with a copy of server attributes
                // This preserves any other attributes that might be part of the object.
                const updatedAttributes = { ...serverAttributes };

                // Round specific attributes to the nearest integer and ensure they are numbers
                if (serverAttributes.stamina !== undefined) {
                    updatedAttributes.stamina = Math.round(parseFloat(serverAttributes.stamina));
                }
                if (serverAttributes.happiness !== undefined) {
                    updatedAttributes.happiness = Math.round(parseFloat(serverAttributes.happiness));
                }
                if (serverAttributes.hunger !== undefined) {
                    updatedAttributes.hunger = Math.round(parseFloat(serverAttributes.hunger));
                }

                // Clamp values to their logical min/max (0-100) for safety,
                // even though the payload sent to the server should already handle this.
                if (updatedAttributes.stamina !== undefined) {
                    updatedAttributes.stamina = Math.max(0, Math.min(100, updatedAttributes.stamina));
                }
                if (updatedAttributes.happiness !== undefined) {
                    updatedAttributes.happiness = Math.max(0, Math.min(100, updatedAttributes.happiness));
                }
                if (updatedAttributes.hunger !== undefined) {
                    updatedAttributes.hunger = Math.max(0, Math.min(100, updatedAttributes.hunger));
                }

                this.petData.attributes = updatedAttributes;
                console.log('Locally rounded and bounded pet attributes:', this.petData.attributes);
            } else {
                console.error('Failed to update pet attributes: Response was not OK, or success flag was false, or attribute data was missing.', attrData);
            }
            
            // Track responses for coins and gems to update global context
            let coinsUpdateSuccess = false;
            let coinsNewAmount = 0;
            // REMOVED: Gem tracking variables
            // let gemsUpdateSuccess = false;
            // let gemsNewAmount = 0;
            
            // Update user coins if goldGained > 0
            if (this.goldGained && this.goldGained > 0) {
                const coinsResponse = await fetch(`${API_URL}/users/me/coins`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ delta: this.goldGained })
                });
                
                const coinsData = await coinsResponse.json();
                if (coinsResponse.ok && coinsData.success) {
                    coinsUpdateSuccess = true;
                    coinsNewAmount = coinsData.coins;
                    console.log(`Updated coins: +${this.goldGained} = ${coinsNewAmount}`);
                }
            }
            
            // Update user gems if gemsGained > 0
            // REMOVED: Entire block for updating user gems
            // if (this.gemsGained && this.gemsGained > 0) {
            //     const gemsResponse = await fetch(`${API_URL}/users/me/gems`, {
            //         method: 'PUT',
            //         headers: {
            //             'Content-Type': 'application/json',
            //             'Authorization': `Bearer ${token}`
            //         },
            //         body: JSON.stringify({ delta: this.gemsGained })
            //     });
                
            //     const gemsData = await gemsResponse.json();
            //     if (gemsResponse.ok && gemsData.success) {
            //         gemsUpdateSuccess = true;
            //         gemsNewAmount = gemsData.gems;
            //         console.log(`Updated gems: +${this.gemsGained} = ${gemsNewAmount}`);
            //     }
            // }
            
            // Add item rewards to inventory if any were gained
            if (this.itemsGained && this.itemsGained.length > 0) {
                // Create a payload for the items to add
                const itemsPayload = {
                    items: this.itemsGained.map(item => ({
                        type: item.type,
                        rarity: item.rarity
                    }))
                };
                
                // Send request to add battle reward items to inventory
                try {
                    const itemsResponse = await fetch(`${API_URL}/users/me/battle-rewards`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(itemsPayload)
                    });
                    
                    const itemsData = await itemsResponse.json();
                    if (itemsResponse.ok && itemsData.success) {
                        console.log('Successfully added battle reward items to inventory', itemsData);
                        
                        // Update the UI with the actual items added (which might differ from requested items)
                        if (itemsData.data && itemsData.data.addedItems && itemsData.data.addedItems.length > 0) {
                            // If we're showing the battle results, update the items list
                            if (this.resultPopup && this.resultPopup.visible) {
                                // Filter out the generic item messages
                                this.battleLogic.drops = this.battleLogic.drops.filter(msg => 
                                    !msg.includes('Common') && 
                                    !msg.includes('Uncommon') && 
                                    !msg.includes('Rare') && 
                                    !msg.includes('Legendary'));
                                
                                // Add the actual items received
                                itemsData.data.addedItems.forEach(item => {
                                    const itemName = item.name.replace(/\b\w/g, l => l.toUpperCase());
                                    this.battleLogic.drops.push(`${itemName} (${item.rarity})`);
                                });
                                
                                // Update the result popup text
                                this.updateBattleRewardsDisplay();
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to add battle reward items to inventory:', error);
                }
            }
            
            // Update the global context with all changes
            if (globalContext) {
                // Update pet data with complete fresh data, maintaining separation of current/max values
                globalContext.userData.selectedPet = this.petData;
                
                // Update coins if successfully updated in the backend
                if (coinsUpdateSuccess) {
                    globalContext.updateUserData({ coins: coinsNewAmount });
                } else if (this.goldGained > 0) {
                    // Fallback: manually increment coins if we couldn't get the updated amount
                    globalContext.addCoins(this.goldGained);
                }
                
                // Update gems if successfully updated in the backend
                // REMOVED: Updating gems in globalContext
                // if (gemsUpdateSuccess) {
                //     globalContext.updateUserData({ gems: gemsNewAmount });
                // } else if (this.gemsGained > 0) {
                //     // Use addGems function to update gems in global context
                //     globalContext.addGems(this.gemsGained);
                // }
                
                console.log('Updated global context with battle results');
            }
        } catch (err) {
            console.error('Failed to update pet stats/attributes/coins/gems after battle:', err);
        }
    }
    
    // New method to update the battle rewards display
    updateBattleRewardsDisplay() {
        if (!this.resultPopup || !this.resultPopup.visible) return;
        
        // Format rewards nicely
        const rewards = this.battleLogic.drops;
        const itemRewards = rewards.filter(r => !r.includes('EXP') && !r.includes('Coin')); // REMOVED: && !r.includes('Gem')
        const expGold = rewards.filter(r => r.includes('EXP') || r.includes('Coin')); // REMOVED: || r.includes('Gem')
        
        let rewardText = '';
        
        // Add experience and gold first
        if (expGold.length > 0) {
            rewardText += expGold.join('\n') + '\n';
        }
        
        // Add items if any
        if (itemRewards.length > 0) {
            rewardText += itemRewards.length > 0 ? 
                '\nItems:\n' + itemRewards.join('\n') : '';
        }
        
        // Update the popup text
        this.resultDetails.setText(rewardText || 'You defeated the enemy!');
    }
    
    async handleBattleEnd() {
        // Hide popup with animation
        this.tweens.add({
            targets: this.resultPopup,
            alpha: 0,
            duration: 300,
            onComplete: async () => {
                try {
                    console.log('Battle ending, updating stats...');
                    
                    // Ensure stats are updated before returning to previous scene
                    this.updatePetStats();
                    
                    // Wait for backend updates to complete
                    await this.updatePetBackend();
                    
                    console.log('Pet data after backend update:', this.petData);
                    
                    // Refresh global context, ensuring it's up to date
                    const globalContext = getGlobalContext();
                    if (globalContext) {
                        // Update the global context with the latest pet data
                        globalContext.userData.selectedPet = this.petData;
                        
                        // Force a fresh pet fetch when returning to MainMenu
                        globalContext.userData.shouldRefreshPet = true;
                    }
                    
                    // Return to previous scene with updated data including exp, level, and stat changes
                    this.scene.start('LevelSelector', { 
                        pet: this.petData,
                        levelChange: true, // Flag indicating level may have changed
                        showStatsUpdated: true // Flag to trigger stats display update
                    });
                } catch (error) {
                    console.error("Error during battle end processing:", error);
                    // Still transition to avoid getting stuck
                    this.scene.start('LevelSelector', { pet: this.petData });
                }
            }
        });
    }
    
    animateAction(actionType, sourceType, targetType, onComplete, details = {}) {
        const source = sourceType === 'pet' ? this.petEntity : this.enemyEntity;
        const target = targetType === 'pet' ? this.petEntity : (targetType === 'enemy' ? this.enemyEntity : null);
        
        this.time.delayedCall(200, () => {
            if (source && source.sprite && source.playAnimation) {
                 // actionType here can be 'attack', 'skill1', 'medicine'
                source.playAnimation(actionType, details);
            }
            
            if (target && target.sprite && target.playAnimation && actionType !== 'medicine') { // Don't make target play 'hurt' if source is using medicine on self
                this.time.delayedCall(350, () => { // Delay hurt animation
                    target.playAnimation('hurt');
                });
            }
            
            // Estimate animation duration for callback
            // This is a rough estimate; ideally, use animation complete events
            let maxDuration = 800;
            if (source && source.sprite && source.sprite.anims && source.sprite.anims.currentAnim) {
                maxDuration = Math.max(maxDuration, source.sprite.anims.currentAnim.duration || 800);
            }

            this.time.delayedCall(maxDuration, () => {
                if (onComplete) onComplete();
            });
        });
    }
    
    update() {
        // Add any per-frame updates here if needed
    }

    shutdown() {
        // Clean up the inventory modal if it exists and is part of this scene's display list
        if (this.inventoryModal && this.inventoryModal.scene === this) {
            this.inventoryModal.destroy(); // Assuming InventoryModal has a destroy method
            this.inventoryModal = null;
        }
        // ... other shutdown logic
        console.log('BattleSystem shutdown.');
        EventBus.off('battle-scene-ready', this.onBattleSceneReady, this); // Example: remove listener
        
        // Destroy UI elements
        if (this.statusGroup) this.statusGroup.destroy(true); // true for children
        if (this.battleLogBg) this.battleLogBg.destroy();
        if (this.battleLogText) this.battleLogText.destroy();
        if (this.actionMenu) this.actionMenu.destroy(true); // true for children
        if (this.resultPopup) this.resultPopup.destroy(true); // true for children

        // Destroy entities
        if (this.petEntity) this.petEntity.destroy();
        if (this.enemyEntity) this.enemyEntity.destroy();

        // Nullify references
        this.petData = null;
        this.enemyData = null;
        this.levelData = null;
        this.battleLogic = null;
        this.petEntity = null;
        this.enemyEntity = null;
        this.statusGroup = null;
        this.battleLogBg = null;
        this.battleLogText = null;
        this.actionMenu = null;
        this.actionButtons = [];
        this.resultPopup = null;
        this.resultTitle = null;
        this.resultDetails = null;
        this.inventoryModal = null; // Ensure modal reference is cleared
    }
} 