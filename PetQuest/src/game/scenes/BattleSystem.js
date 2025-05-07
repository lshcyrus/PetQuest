import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { Pet } from '../entities/Pet';
import { Enemy } from '../entities/enemy';

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
        // Check SP cost (5 for normal attack)
        if (attacker.data.stats.sp < 5) {
            this.battleLog.push(`${attacker.data.name} does not have enough SP to attack!`);
            return false;
        }
        attacker.data.stats.sp -= 5;
        const attackerName = attacker.data.name;
        const defenderName = defender.data.name;
        
        // Get stats with fallbacks
        const attackStat = attacker.data.stats.atk || 10;
        const defenseStat = defender.data.stats.def || 5;

        let baseDamage = Math.max(1, attackStat - Math.floor(defenseStat / 2));
        const damageVariation = Math.random() * 0.2 + 0.9; // 90% to 110% damage
        let finalDamage = Math.floor(baseDamage * damageVariation);

        if (isDefenderDefending) {
            finalDamage = Math.floor(finalDamage * 0.5);
            this.battleLog.push(`${defenderName} is defending and takes reduced damage!`);
        }

        defender.data.stats.hp -= finalDamage;
        if (defender.data.stats.hp < 0) defender.data.stats.hp = 0;

        this.battleLog.push(`${attackerName} attacks ${defenderName} for ${finalDamage} damage!`);
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
            const attackStat = attacker.data.stats.atk || 10;
            const defenseStat = defender.data.stats.def || 5;
            let baseDamage = Math.max(2, Math.floor(attackStat * 1.5) - defenseStat);
            let finalDamage = Math.floor(baseDamage * (Math.random() * 0.2 + 0.9));

            if (isDefenderDefending) {
                finalDamage = Math.floor(finalDamage * 0.5);
                this.battleLog.push(`${defenderName} is defending and takes reduced damage!`);
            }
            
            defender.data.stats.hp -= finalDamage;
            if (defender.data.stats.hp < 0) defender.data.stats.hp = 0;
            
            this.battleLog.push(`${attackerName} uses Skill 1 on ${defenderName} for ${finalDamage} damage!`);
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
            const maxHp = attacker.data.stats.maxhp || 100;
            let healAmount = Math.floor(maxHp * 0.25);
            
            attacker.data.stats.hp += healAmount;
            if (attacker.data.stats.hp > maxHp) {
                attacker.data.stats.hp = maxHp;
            }
            
            this.battleLog.push(`${attacker.data.name} uses Skill 2 and heals for ${healAmount} HP!`);
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
            // Use maxhp consistently
            const maxHp = this.playerPet.data.stats.maxhp || 100;
            
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
            if (this.useAbility(enemy, this.playerPet, 0, this.isPlayerDefending)) return 'skill';
        }
        if (enemy.data.stats.sp >= 5 && Math.random() < 0.7) {
            if (this.attack(enemy, this.playerPet, this.isPlayerDefending)) return 'attack';
        }
        if (enemy.data.stats.sp >= 5) {
            if (this.defend(enemy)) return 'defend';
        }
        // If not enough SP for any action, skip turn
        this.battleLog.push(`${enemy.data.name} is too exhausted to act!`);
        return 'skip';
    }

    generateDrops() {
        const drops = [];
        const possibleDrops = ['Health Potion', 'Attack Boost', 'Defense Boost', 'Gold Coin', 'Rare Gem'];
        const dropCount = Math.floor(Math.random() * 3) + 1; // 1-3 drops
        
        for (let i = 0; i < dropCount; i++) {
            drops.push(possibleDrops[Math.floor(Math.random() * possibleDrops.length)]);
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
            this.petData.stats = { maxhp: 100, hp: 100, maxsp: 50, sp: 50, atk: 50, def: 50 };
        } else {
            // Ensure stats has required properties
            const petStats = this.petData.stats;
            // For backward compatibility: convert health to maxhp if it exists
            if (petStats.health !== undefined && petStats.maxhp === undefined) {
                petStats.maxhp = petStats.health;
            } else if (petStats.maxhp === undefined) {
                petStats.maxhp = 100;
            }
            // Set current hp if missing (undefined only)
            if (petStats.hp === undefined) {
                petStats.hp = petStats.maxhp;
            }
            // Ensure hp doesn't exceed maxhp
            if (petStats.hp > petStats.maxhp) {
                petStats.hp = petStats.maxhp;
            }
            // Add SP stats
            if (petStats.maxsp === undefined) {
                petStats.maxsp = 50;
            }
            if (petStats.sp === undefined) {
                petStats.sp = petStats.maxsp;
            }
            // Ensure sp doesn't exceed maxsp
            if (petStats.sp > petStats.maxsp) {
                petStats.sp = petStats.maxsp;
            }
            // Convert attack/defense to atk/def if needed
            if (petStats.attack !== undefined && petStats.atk === undefined) {
                petStats.atk = petStats.attack;
                delete petStats.attack;
            }
            if (petStats.defense !== undefined && petStats.def === undefined) {
                petStats.def = petStats.defense;
                delete petStats.defense;
            }
            // Set other stats if missing
            if (petStats.atk === undefined) petStats.atk = 50;
            if (petStats.def === undefined) petStats.def = 50;
            // Remove speed stat if it exists
            if (petStats.speed !== undefined) {
                delete petStats.speed;
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
            this.enemyData = { 
                name: 'Wild Monster',
                key: 'gorgon_idle',
                stats: { maxhp: 100, hp: 100, maxsp: 50, sp: 50, atk: 10, def: 5 }
            };
        }
        
        // Ensure enemy has required properties
        if (!this.enemyData.name) this.enemyData.name = 'Wild Monster';
        if (!this.enemyData.key) this.enemyData.key = 'gorgon_idle';
        if (!this.enemyData.stats) {
            this.enemyData.stats = { maxhp: 100, hp: 100, maxsp: 50, sp: 50, atk: 10, def: 5 };
        } else {
            // Ensure stats has required properties
            const stats = this.enemyData.stats;
            if (stats.maxhp === undefined) stats.maxhp = 100;
            if (stats.hp === undefined) stats.hp = stats.maxhp;
            if (stats.maxsp === undefined) stats.maxsp = 50;
            if (stats.sp === undefined) stats.sp = stats.maxsp;
            if (stats.attack !== undefined && stats.atk === undefined) {
                stats.atk = stats.attack;
                delete stats.attack;
            }
            if (stats.defense !== undefined && stats.def === undefined) {
                stats.def = stats.defense;
                delete stats.defense;
            }
            if (stats.atk === undefined) stats.atk = 10;
            if (stats.def === undefined) stats.def = 5;
            if (stats.speed !== undefined) {
                delete stats.speed;
            }
        }
        
        this.levelData = data.levelData || { background: 'battle_background' };
        
        // Determine the battle background based on level data
        this.battleBackground = this.levelData.background || 'battle_background';
        
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
        
        // Player pet positioned on left side of screen
        this.petEntity = new Pet(
            this, 
            this.petData, 
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
        // Create a group for all status bar elements
        this.statusGroup = this.add.group();
        // Pet status (left side)
        const petStats = this.petEntity.data.stats;
        const petMaxHp = petStats.maxhp || 100;
        const petMaxSp = petStats.maxsp || 50;
        const petHpText = `HP: ${petStats.hp}/${petMaxHp}`;
        const petSpText = `SP: ${petStats.sp}/${petMaxSp}`;
        const petStatText = `ATK: ${petStats.atk}  DEF: ${petStats.def}`;
        // Status background panel
        this.petStatusBg = this.add.rectangle(30, height - 80, 200, 90, 0x222222, 0.7)
            .setOrigin(0, 0.5)
            .setStrokeStyle(1, 0xaaaaaa);
        // HP bar background
        this.petHpBarBg = this.add.rectangle(40, height - 100, 180, 16, 0x333333)
            .setOrigin(0, 0.5);
        // HP bar fill
        this.petHpBar = this.add.rectangle(40, height - 100, 180 * (petStats.hp / petMaxHp), 16, 0x00ff00)
            .setOrigin(0, 0.5);
        // HP text
        this.petHpText = this.add.text(130, height - 100, petHpText, {
            fontSize: '14px', color: '#ffffff', fontFamily: 'monospace'
        }).setOrigin(0.5);
        // SP bar background
        this.petSpBarBg = this.add.rectangle(40, height - 80, 180, 12, 0x333366)
            .setOrigin(0, 0.5);
        // SP bar fill
        this.petSpBar = this.add.rectangle(40, height - 80, 180 * (petStats.sp / petMaxSp), 12, 0x3399ff)
            .setOrigin(0, 0.5);
        // SP text
        this.petSpText = this.add.text(130, height - 80, petSpText, {
            fontSize: '13px', color: '#99ccff', fontFamily: 'monospace'
        }).setOrigin(0.5);
        // ATK/DEF text
        this.petStatText = this.add.text(130, height - 60, petStatText, {
            fontSize: '13px', color: '#ffff99', fontFamily: 'monospace'
        }).setOrigin(0.5);
        // Enemy status (right side)
        const enemyStats = this.enemyEntity.data.stats;
        const enemyMaxHp = enemyStats.maxhp || 100;
        const enemyMaxSp = enemyStats.maxsp || 50;
        const enemyHpText = `HP: ${enemyStats.hp}/${enemyMaxHp}`;
        const enemySpText = `SP: ${enemyStats.sp}/${enemyMaxSp}`;
        const enemyStatText = `ATK: ${enemyStats.atk}  DEF: ${enemyStats.def}`;
        // Enemy status background
        this.enemyStatusBg = this.add.rectangle(width - 30, 80, 200, 90, 0x222222, 0.7)
            .setOrigin(1, 0.5)
            .setStrokeStyle(1, 0xaaaaaa);
        // Enemy HP bar background
        this.enemyHpBarBg = this.add.rectangle(width - 40, 60, 180, 16, 0x333333)
            .setOrigin(1, 0.5);
        // Enemy HP bar fill
        this.enemyHpBar = this.add.rectangle(width - 40, 60, 180 * (enemyStats.hp / enemyMaxHp), 16, 0xff3333)
            .setOrigin(1, 0.5);
        // Enemy HP text
        this.enemyHpText = this.add.text(width - 130, 60, enemyHpText, {
            fontSize: '14px', color: '#ffffff', fontFamily: 'monospace'
        }).setOrigin(0.5);
        // Enemy SP bar background
        this.enemySpBarBg = this.add.rectangle(width - 40, 80, 180, 12, 0x333366)
            .setOrigin(1, 0.5);
        // Enemy SP bar fill
        this.enemySpBar = this.add.rectangle(width - 40, 80, 180 * (enemyStats.sp / enemyMaxSp), 12, 0x3399ff)
            .setOrigin(1, 0.5);
        // Enemy SP text
        this.enemySpText = this.add.text(width - 130, 80, enemySpText, {
            fontSize: '13px', color: '#99ccff', fontFamily: 'monospace'
        }).setOrigin(0.5);
        // ATK/DEF text
        this.enemyStatText = this.add.text(width - 130, 100, enemyStatText, {
            fontSize: '13px', color: '#ffff99', fontFamily: 'monospace'
        }).setOrigin(0.5);
        // Add all elements to the status group
        this.statusGroup.add(this.petStatusBg);
        this.statusGroup.add(this.petHpBarBg);
        this.statusGroup.add(this.petHpBar);
        this.statusGroup.add(this.petHpText);
        this.statusGroup.add(this.petSpBarBg);
        this.statusGroup.add(this.petSpBar);
        this.statusGroup.add(this.petSpText);
        this.statusGroup.add(this.petStatText);
        this.statusGroup.add(this.enemyStatusBg);
        this.statusGroup.add(this.enemyHpBarBg);
        this.statusGroup.add(this.enemyHpBar);
        this.statusGroup.add(this.enemyHpText);
        this.statusGroup.add(this.enemySpBarBg);
        this.statusGroup.add(this.enemySpBar);
        this.statusGroup.add(this.enemySpText);
        this.statusGroup.add(this.enemyStatText);
    }

    updateStatusBars() {
        // Update pet HP/SP
        const petStats = this.petEntity.data.stats;
        const petMaxHp = petStats.maxhp || 100;
        const petMaxSp = petStats.maxsp || 50;
        const petHpRatio = Math.max(0, petStats.hp / petMaxHp);
        const petSpRatio = Math.max(0, petStats.sp / petMaxSp);
        this.petHpBar.width = 180 * petHpRatio;
        this.petHpText.setText(`HP: ${petStats.hp}/${petMaxHp}`);
        this.petSpBar.width = 180 * petSpRatio;
        this.petSpText.setText(`SP: ${petStats.sp}/${petMaxSp}`);
        this.petStatText.setText(`ATK: ${petStats.atk}  DEF: ${petStats.def}`);
        // Update enemy HP/SP
        const enemyStats = this.enemyEntity.data.stats;
        const enemyMaxHp = enemyStats.maxhp || 100;
        const enemyMaxSp = enemyStats.maxsp || 50;
        const enemyHpRatio = Math.max(0, enemyStats.hp / enemyMaxHp);
        const enemySpRatio = Math.max(0, enemyStats.sp / enemyMaxSp);
        this.enemyHpBar.width = 180 * enemyHpRatio;
        this.enemyHpText.setText(`HP: ${enemyStats.hp}/${enemyMaxHp}`);
        this.enemySpBar.width = 180 * enemySpRatio;
        this.enemySpText.setText(`SP: ${enemyStats.sp}/${enemyMaxSp}`);
        this.enemyStatText.setText(`ATK: ${enemyStats.atk}  DEF: ${enemyStats.def}`);
    }

    createBattleLog() {
        const { width, height } = this.scale;
        
        // Battle log background
        this.battleLogBg = this.add.rectangle(width/2, height * 0.1, width * 0.8, 80, 0x222222, 0.8)
            .setOrigin(0.5)
            .setStrokeStyle(1, 0xaaaaaa);
            
        // Battle log text
        this.battleLogText = this.add.text(width/2, height * 0.1, 'Preparing for battle...', {
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
        
        // Action buttons
        const actions = [
            { text: 'Attack', action: () => this.handlePlayerAction('attack') },
            { text: 'Skill 1', action: () => this.handlePlayerAction('skill1') },
            { text: 'Skill 2', action: () => this.handlePlayerAction('skill2') },
            { text: 'Defend', action: () => this.handlePlayerAction('defend') },
            { text: 'Item', action: () => this.handlePlayerAction('item') },
            { text: 'Run', action: () => this.handlePlayerAction('run') }
        ];
        
        // Calculate button layout
        const buttonWidth = 100;
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
                
            // Button text
            const text = this.add.text(startX + buttonWidth/2, 0, actionConfig.text, {
                fontSize: '16px', 
                color: '#ffffff',
                fontFamily: 'monospace'
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
            case 'skill2':
                if (petStats.sp < 10) {
                    this.battleLogic.battleLog.push('Not enough SP to heal!');
                    this.updateBattleLog();
                    this.time.delayedCall(800, () => this.setActionMenuEnabled(true));
                    return;
                }
                animationAction = 'medicine';
                this.animateAction(animationAction, 'pet', null, () => {
                    actionSuccess = this.battleLogic.useAbility(this.petEntity, this.enemyEntity, 1, this.battleLogic.isEnemyDefending);
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
        let expGained = 0;
        let goldGained = 0;
        
        // Determine result and show appropriate popup
        if (this.petEntity.data.stats.hp <= 0) {
            // Defeat: Pet is injured, restore some HP (50%)
            const maxHp = this.petEntity.data.stats.maxhp || 100;
            this.petEntity.data.stats.hp = Math.floor(maxHp * 0.5);
            this.showResultPopup('defeat');
        } else if (this.enemyEntity.data.stats.hp <= 0) {
            // Victory: Calculate rewards
            const enemyLevel = this.enemyData.level || 1;
            expGained = Math.floor(enemyLevel * 20 + Math.random() * 10);
            goldGained = Math.floor(enemyLevel * 10 + Math.random() * enemyLevel * 5);
            
            // Add experience and gold to pet data
            if (!this.petEntity.data.experience) this.petEntity.data.experience = 0;
            this.petEntity.data.experience += expGained;
            
            if (!this.petEntity.data.gold) this.petEntity.data.gold = 0;
            this.petEntity.data.gold += goldGained;
            
            // Add rewards to the drops list
            this.battleLogic.drops.push(`${expGained} EXP`);
            this.battleLogic.drops.push(`${goldGained} Gold`);
            
            this.showResultPopup('victory', this.battleLogic.drops);
        } else if (this.battleLogic.battleEnded) {
            // Escaped: No penalties, minor rewards
            this.showResultPopup('escape');
        }
        
        // Update pet's combat stats
        this.updatePetStats();
    }
    
    updatePetStats() {
        // Return the pet to normal state for non-combat
        // HP should be preserved, but we should update any combat-only stats
        
        // Update original pet data with current HP and any stat changes
        if (this.petData.stats) {
            // Keep current HP level
            this.petData.stats.hp = this.petEntity.data.stats.hp;
            
            // Keep current SP level
            if (this.petEntity.data.stats.sp !== undefined) {
                this.petData.stats.sp = this.petEntity.data.stats.sp;
            }
            
            // Keep track of any stat changes (for buffs/debuffs that persist after battle)
            if (this.petEntity.data.stats.atk !== this.petData.stats.atk) {
                this.petData.stats.atk = this.petEntity.data.stats.atk;
            }
            if (this.petEntity.data.stats.def !== this.petData.stats.def) {
                this.petData.stats.def = this.petEntity.data.stats.def;
            }
            
            // Update maxhp if it was changed
            if (this.petEntity.data.stats.maxhp && this.petEntity.data.stats.maxhp !== this.petData.stats.maxhp) {
                this.petData.stats.maxhp = this.petEntity.data.stats.maxhp;
            }
            
            // Update maxsp if it was changed
            if (this.petEntity.data.stats.maxsp && this.petEntity.data.stats.maxsp !== this.petData.stats.maxsp) {
                this.petData.stats.maxsp = this.petEntity.data.stats.maxsp;
            }
            
            // For backward compatibility, also update health property if it exists
            if (this.petData.stats.health) {
                this.petData.stats.health = this.petEntity.data.stats.maxhp;
            }
        }
        
        // Copy any new properties added during battle
        if (this.petEntity.data.experience) this.petData.experience = this.petEntity.data.experience;
        if (this.petEntity.data.gold) this.petData.gold = this.petEntity.data.gold;
        
        console.log('Updated pet stats after battle:', this.petData.stats);
    }
    
    handleBattleEnd() {
        // Hide popup with animation
        this.tweens.add({
            targets: this.resultPopup,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                // Ensure stats are updated before returning to previous scene
                this.updatePetStats();
                
                // Return to previous scene (e.g., level selection) with updated pet data
                this.scene.start('LevelSelector', { pet: this.petData });
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