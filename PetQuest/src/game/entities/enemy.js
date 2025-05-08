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
                if (!scene.anims.exists(animKey)) {
                    scene.anims.create({
                        key: animKey,
                        frames: scene.anims.generateFrameNumbers(enemyKey, { start: 4, end: 7 }),
                        frameRate: 10,
                        repeat: 0
                    });
                }
                
                // Play the attack animation
                this.sprite.play(animKey);
                
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
                        
                        // Move back after delay
                        scene.time.delayedCall(100, () => {
                            scene.tweens.add({
                                targets: this.sprite,
                                x: originalX,
                                duration: 150,
                                ease: 'Power1',
                                onComplete: () => {
                                    // Fade out the slash effect
                                    if (slash) {
                                        scene.tweens.add({
                                            targets: slash,
                                            alpha: 0,
                                            duration: 200,
                                            onComplete: () => {
                                                if (slash && !slash.destroyed) {
                                                    slash.destroy();
                                                }
                                            }
                                        });
                                    }
                                    // Return to idle
                                    playIdle(300);
                                }
                            });
                        });
                    }
                });
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

/**
 * Generate a random enemy based on difficulty level
 * @param {number} levelDifficulty - Difficulty level (1-10)
 * @returns {Object} Enemy data object
 */
export function generateRandomEnemy(levelDifficulty = 1) {
    // Clamp difficulty between 1 and 10
    const difficulty = Math.max(1, Math.min(10, levelDifficulty));
    
    // Determine enemy tier based on difficulty
    let tier;
    if (difficulty <= 3) {
        tier = 'EASY';
    } else if (difficulty <= 6) {
        tier = 'MEDIUM';
    } else if (difficulty <= 9) {
        tier = 'HARD';
    } else {
        tier = 'BOSS';
    }
    
    // Get random enemy from tier
    const enemyList = EnemyTypes[tier];
    const baseEnemy = enemyList[Math.floor(Math.random() * enemyList.length)];
    
    // Scale stats based on difficulty
    const scaleFactor = 1 + (difficulty - 1) * 0.1; // 10% increase per level
    const finalHp = Math.floor(baseEnemy.hp * scaleFactor);
    const finalSp = Math.floor(baseEnemy.sp * scaleFactor);
    const finalAtk = Math.floor(baseEnemy.atk * scaleFactor);
    const finalDef = Math.floor(baseEnemy.def * scaleFactor);
    
    // Create enemy data object
    return {
        name: baseEnemy.name,
        key: baseEnemy.key,
        level: difficulty,
        stats: {
            hp: finalHp,
            sp: finalSp,
            atk: finalAtk,
            def: finalDef
        }
    };
} 