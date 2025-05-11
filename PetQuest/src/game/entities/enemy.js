// Enemy entity and generator for PetQuest
// Inspired by Pet.js structure and the old EnemyGenerator.js

/**
 * Enemy class representing an opposing entity in battle.
 * @class
 * @extends Phaser.GameObjects.Container
 * @param {Phaser.Scene} scene - The Scene to which this enemy belongs
 * @param {Object} data - Enemy data and configuration
 * @param {string} data.name - Enemy name
 * @param {string} data.key - Sprite key for animations
 * @param {Object} data.stats - Enemy stats (hp, sp, atk, def)
 * @param {number} x - The x position of the enemy
 * @param {number} y - The y position of the enemy
 */
export class Enemy extends Phaser.GameObjects.Container {
    constructor(scene, data, x, y) {
        super(scene, x, y);
        
        this.scene = scene;
        this.data = data || {};
        
        if (!this.data.stats) {
            this.data.stats = {
                hp: 100,
                sp: 30,
                atk: 15,
                def: 10
            };
        } else {
            // For backward compatibility
            if (this.data.stats.health && !this.data.stats.hp) {
                this.data.stats.hp = this.data.stats.health;
            }
            
            // Ensure basic stats exist
            if (!this.data.stats.hp) {
                this.data.stats.hp = 100;
            }
            
            if (!this.data.stats.sp) {
                this.data.stats.sp = 30;
            }
            
            // Convert attack/defense to atk/def if needed
            if (this.data.stats.attack && !this.data.stats.atk) {
                this.data.stats.atk = this.data.stats.attack;
                delete this.data.stats.attack;
            }
            
            if (this.data.stats.defense && !this.data.stats.def) {
                this.data.stats.def = this.data.stats.defense;
                delete this.data.stats.defense;
            }
            
            // Set defaults if missing
            if (!this.data.stats.atk) {
                this.data.stats.atk = 15;
            }
            
            if (!this.data.stats.def) {
                this.data.stats.def = 10;
            }
        }
        
        this.sprite = null;
        this.nameText = null;
    }

    /**
     * Create and display the enemy sprite in the scene
     * @param {number} [scale=1] - Scale factor for the sprite
     * @param {number} [depth=1] - Depth level for the sprite
     * @returns {Phaser.GameObjects.Sprite} The created sprite
     */
    create(scale = 1, depth = 1) {
        if (!this.data.key) return null;
        this.sprite = this.scene.add.sprite(this.x, this.y, this.data.key);
        const animKey = `${this.data.key}_idle`;
        if (!this.scene.anims.exists(animKey)) {
            this.scene.anims.create({
                key: animKey,
                frames: this.scene.anims.generateFrameNumbers(this.data.key, { start: 0, end: 3 }),
                frameRate: 6,
                repeat: -1
            });
        }
        this.sprite.play(animKey);
        this.sprite.setScale(scale);
        this.sprite.setDepth(depth);
        return this.sprite;
    }

    /**
     * Create and display the enemy's name (for UI/debug)
     * @param {number} [offsetY=-50] - Y offset from the enemy
     * @param {Object} [style={}] - Text style configuration
     * @param {number} [depth=1] - Depth level for the text
     * @returns {Phaser.GameObjects.Text} The created text object
     */
    createNameDisplay(offsetY = -50, style = {}, depth = 1) {
        const defaultStyle = {
            fontFamily: 'Silkscreen, cursive',
            fontSize: '24px',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        };
        const mergedStyle = { ...defaultStyle, ...style };
        this.nameText = this.scene.add.text(
            this.x,
            this.y + offsetY,
            this.data.name,
            mergedStyle
        ).setOrigin(0.5).setDepth(depth);
        return this.nameText;
    }

    /**
     * Set or update the enemy's position
     * @param {number} x - New x position
     * @param {number} y - New y position
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        if (this.sprite) {
            this.sprite.setPosition(x, y);
        }
        if (this.nameText) {
            this.nameText.setPosition(x, y - 50);
        }
    }

    /**
     * Get a summary of the enemy for UI or debugging
     */
    getSummary() {
        return {
            name: this.data.name,
            stats: this.data.stats,
            abilities: this.data.abilities,
            biome: this.data.biome
        };
    }

    /**
     * Clean up resources when enemy is removed
     */
    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
        }
        if (this.nameText) {
            this.nameText.destroy();
        }
    }

    /**
     * Play a specific animation or visual effect for the enemy
     * @param {string} action - e.g. 'attack', 'hurt', 'idle', etc.
     */
    playAnimation(action) {
        if (!this.sprite) return;
        const enemyKey = this.data.key;
        const scene = this.scene;
        // Helper to restore idle after anim
        const playIdle = (delay = 600) => {
            scene.time.delayedCall(delay, () => {
                this.sprite.play(`${enemyKey}_idle`);
                this.sprite.clearTint();
            });
        };
        
        // Remove any overlays from previous effects
        if (this._effectOverlay) {
            this._effectOverlay.destroy();
            this._effectOverlay = null;
        }
        if (this._effectText) {
            this._effectText.destroy();
            this._effectText = null;
        }
        
        switch (action) {
            case 'attack': {
                // Attempt to use the attack animation if it exists
                const animKey = `${enemyKey}_attack`;
                const animKeyAtk = `${enemyKey}_atk`; // Alternate format
                
                // Try to find or create the appropriate animation
                if (!scene.anims.exists(animKey) && !scene.anims.exists(animKeyAtk)) {
                    // Check if we have a dedicated attack spritesheet
                    if (scene.textures.exists(animKey)) {
                        console.log(`Creating enemy attack animation from dedicated spritesheet: ${animKey}`);
                        scene.anims.create({
                            key: animKey,
                            frames: scene.anims.generateFrameNumbers(animKey, { start: 0, end: 3 }),
                            frameRate: 10,
                            repeat: 0
                        });
                    } 
                    // Fall back to using frames from idle spritesheet
                    else if (scene.textures.exists(enemyKey)) {
                        console.log(`Creating enemy attack animation from idle spritesheet: ${enemyKey}`);
                        scene.anims.create({
                            key: animKey, 
                            frames: scene.anims.generateFrameNumbers(enemyKey, { start: 0, end: 3 }),
                            frameRate: 10,
                            repeat: 0
                        });
                    }
                }
                
                // Play the animation (try both naming conventions)
                if (scene.anims.exists(animKey)) {
                    this.sprite.play(animKey);
                } else if (scene.anims.exists(animKeyAtk)) {
                    this.sprite.play(animKeyAtk);
                } else {
                    console.warn(`No attack animation found for ${enemyKey}`);
                }
                
                // Add a visual effect for the attack - flash and lunge forward
                const originalX = this.sprite.x;
                const attackMovement = this.sprite.flipX ? -30 : 30; // Movement direction based on flip
                
                // Optional attack effect - glowing outline
                this.sprite.setTint(0xff9900); // Orange glow for attack
                
                // Move forward quickly
                scene.tweens.add({
                    targets: this.sprite,
                    x: originalX + attackMovement,
                    duration: 150,
                    ease: 'Power1',
                    onComplete: () => {
                        // Add attack effect - slashing line
                        const slashX = this.sprite.x + (this.sprite.flipX ? -50 : 50);
                        const slash = scene.add.graphics();
                        slash.lineStyle(3, 0xff0000, 1);
                        slash.beginPath();
                        slash.moveTo(slashX - 20, this.sprite.y - 20);
                        slash.lineTo(slashX + 20, this.sprite.y + 20);
                        slash.moveTo(slashX + 20, this.sprite.y - 20);
                        slash.lineTo(slashX - 20, this.sprite.y + 20);
                        slash.closePath();
                        slash.stroke();
                        this._effectOverlay = slash;
                        
                        // Add a fire effect
                        const fireText = scene.add.text(
                            slashX, 
                            this.sprite.y, 
                            '🔥', 
                            { fontSize: '24px' }
                        ).setOrigin(0.5);
                        
                        // Fade out attack effects and move back
                        scene.tweens.add({
                            targets: [slash, fireText],
                            alpha: 0,
                            duration: 300,
                            delay: 200, 
                            onComplete: () => {
                                if (slash && !slash.destroyed) slash.destroy();
                                if (fireText && !fireText.destroyed) fireText.destroy();
                                
                                // Return to original position
                                scene.tweens.add({
                                    targets: this.sprite,
                                    x: originalX,
                                    duration: 150,
                                    ease: 'Power1'
                                });
                            }
                        });
                    }
                });
                
                // Return to idle animation after the attack completes
                playIdle(1000);
                break;
            }
            case 'hurt': {
                this.sprite.setTint(0xff4444);
                
                // Add a shake effect
                const originalX = this.sprite.x;
                scene.tweens.add({
                    targets: this.sprite,
                    x: originalX + (Math.random() > 0.5 ? 5 : -5), // Small random shake
                    yoyo: true,
                    repeat: 2, // Shake back and forth a couple of times
                    duration: 50, // Quick shake
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        this.sprite.setX(originalX); // Ensure sprite returns to original position
                        playIdle(400);
                    }
                });
                break;
            }
            default:
                this.sprite.play(`${enemyKey}_idle`);
        }
    }
}

/**
 * Predefined enemy types
 */
export const EnemyTypes = {
    EASY: [
        { name: 'Slime', key: 'slime_idle', hp: 50, sp: 20, atk: 10, def: 5 },
        { name: 'Bat', key: 'bat_idle', hp: 40, sp: 25, atk: 12, def: 3 },
        { name: 'Rat', key: 'rat_idle', hp: 45, sp: 15, atk: 8, def: 6 }
    ],
    MEDIUM: [
        { name: 'Goblin', key: 'goblin_idle', hp: 80, sp: 30, atk: 15, def: 10 },
        { name: 'Skeleton', key: 'skeleton_idle', hp: 70, sp: 35, atk: 18, def: 8 },
        { name: 'Wolf', key: 'wolf_idle', hp: 75, sp: 25, atk: 16, def: 12 }
    ],
    HARD: [
        { name: 'Gorgon', key: 'gorgon_idle', hp: 120, sp: 60, atk: 22, def: 18 },
        { name: 'Orc', key: 'orc_idle', hp: 150, sp: 40, atk: 25, def: 15 },
        { name: 'Blue Golem', key: 'blue_golem_idle', hp: 180, sp: 40, atk: 18, def: 25 },
        { name: 'Orange Golem', key: 'orange_golem_idle', hp: 160, sp: 50, atk: 20, def: 22 }
    ],
    BOSS: [
        { name: 'Dragon', key: 'dragon_idle', hp: 300, sp: 100, atk: 35, def: 30 },
        { name: 'Necromancer', key: 'necromancer_idle', hp: 200, sp: 150, atk: 40, def: 15 },
        { name: 'Demon', key: 'demon_idle', hp: 250, sp: 120, atk: 38, def: 25 }
    ]
};

// Base stats for a medium difficulty enemy (Level 2)
const BASE_ENEMY_STATS = {
    hp: 300,
    sp: 120,
    atk: 100,
    def: 60,
    level: 2 // Base level corresponds to medium difficulty
};

/**
 * Generates a random enemy with stats scaled by difficulty.
 * @param {number} [levelDifficulty=1] - Difficulty level (1: Easy, 2: Medium, 3: Hard, 4: Expert)
 * @returns {Object} Enemy data object
 */
export function generateRandomEnemy(levelDifficulty = 1) {
    // Define enemy types and their base sprite keys
    const enemyTypes = [
        { name: 'Gorgon', key: 'gorgon_idle' },
        { name: 'Blue Golem', key: 'blue_golem_idle' },
        { name: 'Orange Golem', key: 'orange_golem_idle' },
        { name: 'Green Dragon', key: 'green_dragon_idle' },
        { name: 'Red Demon', key: 'red_demon_idle' }
    ];
    const selectedType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

    let scaledStats = { ...BASE_ENEMY_STATS }; // Start with a copy of base stats
    let enemyLevel = BASE_ENEMY_STATS.level;

    // Define multipliers for each difficulty
    // Multipliers are relative to the BASE_ENEMY_STATS (which is Medium)
    let hpSpMultiplier = 1.0;
    let atkDefMultiplier = 1.0;

    switch (levelDifficulty) {
        case 1: // Easy
            enemyLevel = 1;
            hpSpMultiplier = 0.75; // Reduced HP/SP
            atkDefMultiplier = 0.75; // Reduced ATK/DEF
            break;
        case 2: // Medium (Base stats are already set for Medium)
            enemyLevel = 2;
            // Multipliers remain 1.0
            break;
        case 3: // Hard
            enemyLevel = 3;
            hpSpMultiplier = 1.5;  // Increased HP/SP
            atkDefMultiplier = 1.25; // Increased ATK/DEF
            break;
        case 4: // Expert
            enemyLevel = 4;
            hpSpMultiplier = 2.0;  // Significantly increased HP/SP
            atkDefMultiplier = 1.5;  // Significantly increased ATK/DEF
            break;
        default: // Default to Medium if difficulty is unrecognized
            enemyLevel = 2;
            console.warn(`Unrecognized difficulty: ${levelDifficulty}. Defaulting to Medium.`);
            break;
    }

    // Apply scaling and round to nearest integer
    scaledStats.hp = Math.round(BASE_ENEMY_STATS.hp * hpSpMultiplier);
    scaledStats.sp = Math.round(BASE_ENEMY_STATS.sp * hpSpMultiplier);
    scaledStats.atk = Math.round(BASE_ENEMY_STATS.atk * atkDefMultiplier);
    scaledStats.def = Math.round(BASE_ENEMY_STATS.def * atkDefMultiplier);
    scaledStats.level = enemyLevel; // Set the enemy's level

    // Ensure stats are not zero or negative after scaling (especially for Easy)
    scaledStats.hp = Math.max(1, scaledStats.hp);
    scaledStats.sp = Math.max(0, scaledStats.sp); // SP can be 0
    scaledStats.atk = Math.max(1, scaledStats.atk);
    scaledStats.def = Math.max(0, scaledStats.def); // DEF can be 0

    console.log(`Generated enemy for difficulty ${levelDifficulty} (Level ${enemyLevel}):`, 
        `HP: ${scaledStats.hp}, SP: ${scaledStats.sp}, ATK: ${scaledStats.atk}, DEF: ${scaledStats.def}`);

    return {
        name: selectedType.name,
        key: selectedType.key,
        stats: scaledStats, // Use the scaled stats
        level: enemyLevel, // Also store level directly for easier access if needed
        // Add other properties as needed (e.g., abilities, drops based on difficulty)
        abilities: ['Basic Attack', 'Special Attack'], // Example abilities
        drops: generateEnemyDrops(levelDifficulty) // Example: generate drops based on difficulty
    };
}

// Helper function to generate drops (can be expanded)
function generateEnemyDrops(difficulty) {
    const drops = [];
    const dropChance = 0.3 + difficulty * 0.1; // Higher difficulty = better drop chance
    if (Math.random() < dropChance) {
        drops.push(difficulty > 2 ? 'Rare Item' : 'Common Item');
    }
    return drops;
} 