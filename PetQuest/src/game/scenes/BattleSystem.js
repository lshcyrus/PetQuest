import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { Pet } from '../entities/Pet';
import { Enemy } from '../entities/enemy';
import { getGlobalContext } from '../../utils/contextBridge';

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
        this.itemUsedThisTurn = false;
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
        return this.battleLog;
    }

    nextTurn() {
        if (this.checkBattleEnd()) return false;

        if (this.currentTurn === 'player') {
            this.currentTurn = 'enemy';
            this.isPlayerDefending = false;
            this.itemUsedThisTurn = false;
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

    useItem(item) {
        if (this.itemUsedThisTurn) {
            this.battleLog.push("You've already used an item this turn!");
            return false;
        }
        
        if (item && item.type === 'heal') {
            const healAmount = item.value || 20;
            
            // Apply HP buff to max HP calculation
            const hpBuff = this.playerPet.data.activeBuffs && this.playerPet.data.activeBuffs.stats ? 
                (this.playerPet.data.activeBuffs.stats.hp || 0) : 0;
                
            // Use maxhp from stats, plus any buffs
            const maxHp = (this.playerPet.data.stats.maxhp || this.playerPet.data.stats.hp) + hpBuff;
            
            this.playerPet.data.stats.hp += healAmount;
            if (this.playerPet.data.stats.hp > maxHp) {
                this.playerPet.data.stats.hp = maxHp;
            }
            
            this.battleLog.push(`You used ${item.name} and restored ${healAmount} HP!`);
            this.battleLog.push(`${this.playerPet.data.name} now has ${this.playerPet.data.stats.hp}/${maxHp} HP.`);
            this.itemUsedThisTurn = true;
            return true;
        }
        
        return false;
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
        // Generate random drops based on enemy level and difficulty
        const enemyLevel = this.enemy.data.level || 1;
        const difficulty = this.battleground.selectedDifficulty || 1;
        const drops = [];
        
        // Base drop chance (increases with enemy level and difficulty)
        const dropChance = Math.min(0.7, 0.3 + (enemyLevel * 0.05) + (difficulty * 0.1));
        
        // Determine if we get any item drops
        if (Math.random() < dropChance) {
            // Item types available as drops
            const itemTypes = ['medicine', 'equipment', 'food'];
            const selectedType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
            
            // Determine item rarity based on difficulty
            // Higher difficulty = better chance for rare items
            let rarityChances;
            
            switch(difficulty) {
                case 3: // Hard difficulty
                    rarityChances = {
                        common: 0.4,
                        uncommon: 0.35,
                        rare: 0.2,
                        legendary: 0.05
                    };
                    break;
                case 2: // Medium difficulty
                    rarityChances = {
                        common: 0.5,
                        uncommon: 0.35,
                        rare: 0.15,
                        legendary: 0.0 // No legendary drops on medium
                    };
                    break;
                case 1: // Easy difficulty
                default:
                    rarityChances = {
                        common: 0.7,
                        uncommon: 0.25,
                        rare: 0.05, 
                        legendary: 0.0 // No legendary drops on easy
                    };
                    break;
            }
            
            // Determine the rarity of the drop
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
            
            // Add the item drop to the list with type and rarity
            // The actual item will be determined by the backend
            drops.push({
                type: selectedType,
                rarity: selectedRarity,
                id: `${selectedType}_${selectedRarity}_drop`
            });
        }
        
        return drops;
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
        
        // Set up attack animations for pet and enemy
        this.setupAttackAnimations();
        
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
            const enemySprite = this.enemyEntity.create(1.5, 2);
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
    
    // Ensure attack animations exist for both pet and enemy
    setupAttackAnimations() {
        // Set up pet attack animation if not already present
        if (this.petEntity && this.petEntity.data.key) {
            const petKey = this.petEntity.data.key;
            const petAttackKey = `${petKey}_atk`;
            
            if (!this.anims.exists(petAttackKey) && this.textures.exists(petKey)) {
                console.log(`Creating attack animation for pet: ${petAttackKey}`);
                try {
                    this.anims.create({
                        key: petAttackKey,
                        frames: this.anims.generateFrameNumbers(petKey, { start: 4, end: 7 }),
                        frameRate: 10,
                        repeat: 0
                    });
                } catch (error) {
                    console.warn(`Failed to create pet attack animation: ${error.message}`);
                }
            }
        }
        
        // Set up enemy attack animation if not already present
        if (this.enemyEntity && this.enemyEntity.data.key) {
            const enemyKey = this.enemyEntity.data.key;
            const enemyAttackKey = `${enemyKey}_atk`;
            
            if (!this.anims.exists(enemyAttackKey) && this.textures.exists(enemyKey)) {
                console.log(`Creating attack animation for enemy: ${enemyAttackKey}`);
                try {
                    this.anims.create({
                        key: enemyAttackKey,
                        frames: this.anims.generateFrameNumbers(enemyKey, { start: 4, end: 7 }),
                        frameRate: 10,
                        repeat: 0
                    });
                } catch (error) {
                    console.warn(`Failed to create enemy attack animation: ${error.message}`);
                }
            }
        }
    }
    
    createUI() {
        this.createStatusBars();
        this.createBattleLog();
        this.createActionMenu();
        this.createResultPopup();
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
            .setVisible(false);
            
        // Background with border
        const popupBg = this.add.rectangle(0, 0, width * 0.6, height * 0.4, 0x222244, 0.95)
            .setStrokeStyle(3, 0xaaaaff);
            
        // Result title text
        this.resultTitle = this.add.text(0, -height * 0.12, '', {
            fontSize: '32px',
            color: '#ffffff',
            fontFamily: 'monospace',
            align: 'center'
        }).setOrigin(0.5);
        
        // Result details text
        this.resultDetails = this.add.text(0, -height * 0.02, '', {
            fontSize: '20px',
            color: '#ffff99',
            fontFamily: 'monospace',
            align: 'center',
            wordWrap: { width: width * 0.5 }
        }).setOrigin(0.5);
        
        // Continue button
        const continueBtn = this.add.rectangle(0, height * 0.1, 150, 50, 0x4444aa)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.handleBattleEnd())
            .on('pointerover', () => continueBtn.setFillStyle(0x6666cc))
            .on('pointerout', () => continueBtn.setFillStyle(0x4444aa));
            
        const continueTxt = this.add.text(0, height * 0.1, 'Continue', {
            fontSize: '20px',
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
        if (this.battleLogic.battleEnded || this.battleLogic.currentTurn !== 'player') return;
        // Disable menu during action
        this.setActionMenuEnabled(false);
        let actionSuccess = false;
        let animationAction = '';
        let animationTarget = 'enemy';
        const petStats = this.petEntity.data.stats;
        switch(actionType) {
            case 'attack':
                if (petStats.sp < 5) {
                    this.battleLogic.battleLog.push('Not enough SP to attack!');
                    this.updateBattleLog();
                    this.time.delayedCall(800, () => this.setActionMenuEnabled(true));
                    return;
                }
                animationAction = 'attack';
                this.animateAction(animationAction, 'pet', 'enemy', () => {
                    this.battleLogic.attack(this.petEntity, this.enemyEntity, this.battleLogic.isEnemyDefending);
                    this.afterPlayerAction();
                });
                actionSuccess = true;
                break;
            case 'skill1':
                if (petStats.sp < 10) {
                    this.battleLogic.battleLog.push('Not enough SP to use Special Attack!');
                    this.updateBattleLog();
                    this.time.delayedCall(800, () => this.setActionMenuEnabled(true));
                    return;
                }
                animationAction = 'attack';
                this.animateAction(animationAction, 'pet', 'enemy', () => {
                    actionSuccess = this.battleLogic.useAbility(this.petEntity, this.enemyEntity, 0, this.battleLogic.isEnemyDefending);
                    this.afterPlayerAction();
                });
                break;
            case 'defend':
                if (petStats.sp < 5) {
                    this.battleLogic.battleLog.push('Not enough SP to defend!');
                    this.updateBattleLog();
                    this.time.delayedCall(800, () => this.setActionMenuEnabled(true));
                    return;
                }
                actionSuccess = this.battleLogic.defend(this.petEntity);
                this.updateBattleLog();
                this.time.delayedCall(800, () => this.afterPlayerAction());
                break;
            case 'item':
                if (this.battleLogic.itemUsedThisTurn) {
                    this.battleLogic.battleLog.push('You can only use one item per turn!');
                    this.updateBattleLog();
                    this.time.delayedCall(800, () => this.setActionMenuEnabled(true));
                    return;
                }
                // For simplicity, use a fixed healing potion
                const healPotion = { type: 'heal', name: 'Health Potion', value: 30 };
                this.animateAction('medicine', 'pet', null, () => {
                    actionSuccess = this.battleLogic.useItem(healPotion);
                    this.afterPlayerAction();
                });
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
                actionSuccess = true;
                break;
        }
        if (!actionSuccess && actionType !== 'run') {
            this.time.delayedCall(500, () => this.setActionMenuEnabled(true));
        }
    }
    
    afterPlayerAction() {
        // Update UI
        this.updateStatusBars();
        this.updateBattleLog();
        
        // Check for battle end
        if (this.battleLogic.checkBattleEnd()) {
            this.handleBattleResult();
            return;
        }
        
        // Switch to enemy turn
        this.battleLogic.nextTurn();
        this.updateBattleLog();
        
        // Execute enemy turn after delay
        this.time.delayedCall(1000, () => this.executeEnemyTurn());
    }
    
    executeEnemyTurn() {
        if (this.battleLogic.battleEnded) return;
        
        // Add turn indicator to battle log
        this.battleLogic.battleLog.push(`${this.enemyEntity.data.name}'s turn...`);
        this.updateBattleLog();
        
        // Short delay before enemy acts
        this.time.delayedCall(800, () => {
            // Get enemy action and animate
            const enemyAction = this.battleLogic.enemyAction();
            
            if (enemyAction === 'defend') {
                // No animation for defend, just update the UI
                this.updateBattleLog();
                this.time.delayedCall(1000, () => this.afterEnemyTurn());
            } else {
                // Attack or skill animation
                this.animateAction('attack', 'enemy', 'pet', () => {
                    this.afterEnemyTurn();
                });
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
        this.time.delayedCall(1000, () => this.startPlayerTurn());
    }
    
    handleBattleResult() {
        // Calculate battle rewards and experience
        
        // Determine result and show appropriate popup
        if (this.petEntity.data.stats.hp <= 0) {
            // Defeat: Pet is injured, restore some HP (50%)
            this.petEntity.data.stats.hp = Math.max(1, Math.floor(this.petEntity.data.stats.hp * 0.5));
            this.showResultPopup('defeat');
        } else if (this.enemyEntity.data.stats.hp <= 0) {
            // Victory: Calculate rewards
            const enemyLevel = this.enemyData.level || 1;
            this.expGained = Math.floor(enemyLevel * 20 + Math.random() * 10);
            this.goldGained = Math.floor(enemyLevel * 10 + Math.random() * enemyLevel * 5);
            
            // Calculate gem drops (rare chance)
            if (Math.random() < 0.2) { // 20% chance to find a gem
                this.gemsGained = Math.ceil(Math.random() * 2); // 1-2 gems
            }
            
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
            if (this.gemsGained > 0) {
                this.battleLogic.drops.push(`${this.gemsGained} Gem${this.gemsGained > 1 ? 's' : ''}`);
            }
            
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
            // Escaped: No penalties, minor rewards
            this.showResultPopup('escape');
        }
        
        // Update pet's combat stats
        this.updatePetStats();
    }
    
    // New function to check for level up
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
            if (attrResponse.ok && attrData.success && attrData.data) {
                console.log('Successfully updated pet attributes:', attrData.data);
                // Update attributes in our local pet data
                this.petData.attributes = attrData.data.attributes;
            }
            
            // Track responses for coins and gems to update global context
            let coinsUpdateSuccess = false;
            let coinsNewAmount = 0;
            let gemsUpdateSuccess = false;
            let gemsNewAmount = 0;
            
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
            if (this.gemsGained && this.gemsGained > 0) {
                const gemsResponse = await fetch(`${API_URL}/users/me/gems`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ delta: this.gemsGained })
                });
                
                const gemsData = await gemsResponse.json();
                if (gemsResponse.ok && gemsData.success) {
                    gemsUpdateSuccess = true;
                    gemsNewAmount = gemsData.gems;
                    console.log(`Updated gems: +${this.gemsGained} = ${gemsNewAmount}`);
                }
            }
            
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
                if (gemsUpdateSuccess) {
                    globalContext.updateUserData({ gems: gemsNewAmount });
                } else if (this.gemsGained > 0) {
                    // Use addGems function to update gems in global context
                    globalContext.addGems(this.gemsGained);
                }
                
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
        const itemRewards = rewards.filter(r => !r.includes('EXP') && !r.includes('Coin') && !r.includes('Gem'));
        const expGold = rewards.filter(r => r.includes('EXP') || r.includes('Coin') || r.includes('Gem'));
        
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
    
    animateAction(actionType, sourceType, targetType, onComplete) {
        // Get entities based on types
        const source = sourceType === 'pet' ? this.petEntity : this.enemyEntity;
        const target = targetType === 'pet' ? this.petEntity : this.enemyEntity;
        
        // Initial short delay for timing
        this.time.delayedCall(200, () => {
            // Play source animation
            if (source && source.sprite) {
                if (actionType === 'attack') {
                    // Use specific attack animations based on entity key
                    const sourceKey = source.data.key;
                    const attackKey = `${sourceKey}_atk`;
                    
                    // Check if the attack animation exists, if not fall back to generic attack
                    if (this.anims.exists(attackKey)) {
                        console.log(`Playing attack animation: ${attackKey}`);
                        source.sprite.play(attackKey);
                    } else {
                        console.log(`Animation ${attackKey} not found, using fallback`);
                        source.playAnimation(actionType);
                    }
                } else {
                    source.playAnimation(actionType);
                }
            }
            
            // If we have a target, play hurt animation after a short delay
            if (target && target.sprite) {
                this.time.delayedCall(350, () => {
                    target.playAnimation('hurt');
                });
            }
            
            // Allow time for animations to complete
            this.time.delayedCall(800, () => {
                if (onComplete) onComplete();
            });
        });
    }
    
    update() {
        // Add any per-frame updates here if needed
    }
} 