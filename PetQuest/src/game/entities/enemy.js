// Enemy entity and generator for PetQuest
// Inspired by Pet.js structure and the old EnemyGenerator.js

export class Enemy {
    /**
     * Create a new Enemy
     * @param {Object} scene - The Phaser scene this enemy belongs to
     * @param {Object} data - Enemy data (name, stats, abilities, biome, key, etc.)
     * @param {string} data.name - Enemy name
     * @param {string} [data.key] - Sprite key for the enemy's images
     * @param {Object} data.stats - Enemy stats (hp, maxhp, sp, maxsp, atk, def)
     * @param {string[]} data.abilities - List of ability IDs
     * @param {string} [data.biome] - Biome type
     * @param {number} [x=0] - X position
     * @param {number} [y=0] - Y position
     */
    constructor(scene, data, x = 0, y = 0) {
        this.scene = scene;
        this.data = data;
        this.x = x;
        this.y = y;
        this.sprite = null;
        this.nameText = null;
        
        // Default stats if not provided
        this.data.stats = data.stats || { 
            hp: 50, 
            maxhp: 50, 
            sp: 25, 
            maxsp: 25, 
            atk: 10, 
            def: 10 
        };
        
        // Ensure both hp and maxhp are set consistently
        if (!this.data.stats.maxhp && this.data.stats.hp) {
            this.data.stats.maxhp = this.data.stats.hp;
        }
        
        if (!this.data.stats.hp && this.data.stats.maxhp) {
            this.data.stats.hp = this.data.stats.maxhp;
        }
        
        // If neither exists, set default values
        if (!this.data.stats.hp && !this.data.stats.maxhp) {
            this.data.stats.hp = 50;
            this.data.stats.maxhp = 50;
        }
        
        // Ensure SP stats exist
        if (!this.data.stats.sp) {
            this.data.stats.sp = 25;
        }
        if (!this.data.stats.maxsp) {
            this.data.stats.maxsp = 25;
        }
        
        // Convert old attack/defense to atk/def if needed
        if (this.data.stats.attack && !this.data.stats.atk) {
            this.data.stats.atk = this.data.stats.attack;
            delete this.data.stats.attack;
        }
        
        if (this.data.stats.defense && !this.data.stats.def) {
            this.data.stats.def = this.data.stats.defense;
            delete this.data.stats.defense;
        }
        
        // Set default atk/def if missing
        if (!this.data.stats.atk) {
            this.data.stats.atk = 10;
        }
        if (!this.data.stats.def) {
            this.data.stats.def = 10;
        }
        
        // Remove speed stat if it exists
        if (this.data.stats.speed) {
            delete this.data.stats.speed;
        }
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

export class EnemyFactory {
    /**
     * Generate a random enemy based on difficulty and biome
     * @param {number} difficulty - 1 (Easy) to 4 (Expert)
     * @param {string} biome - 'forest', 'iceland', 'desert', or 'neutral'
     * @param {Object} [scene] - Phaser scene (optional, for sprite creation)
     * @param {number} [x=0] - X position (optional)
     * @param {number} [y=0] - Y position (optional)
     * @returns {Enemy}
     */
    static generateRandomEnemy(difficulty, biome = 'neutral', scene = null, x = 0, y = 0) {
        // Base enemy stats by biome, now with sprite keys
        const baseEnemies = {
            forest: [
                { name: 'Gorgon', key: 'gorgon_idle', hp: 120, maxhp: 120, sp: 60, maxsp: 60, atk: 22, def: 18 }
            ],
            iceland: [
                { name: 'Blue Golem', key: 'blue_golem_idle', hp: 180, maxhp: 180, sp: 40, maxsp: 40, atk: 18, def: 25 }
            ],
            desert: [
                { name: 'Orange Golem', key: 'orange_golem_idle', hp: 160, maxhp: 160, sp: 50, maxsp: 50, atk: 20, def: 22 }
            ]
        };

        // Ability pool by biome
        const abilitiesByBiome = {
            forest: [
                { id: 'vine_thrash', type: 'offensive' },
                { id: 'bark_armor', type: 'defensive' },
                { id: 'entangle', type: 'status' }
            ],
            iceland: [
                { id: 'frost_blast', type: 'offensive' },
                { id: 'glacial_shield', type: 'defensive' },
                { id: 'blizzard', type: 'status' }
            ],
            desert: [
                { id: 'flame_strike', type: 'offensive' },
                { id: 'ember_aura', type: 'defensive' },
                { id: 'scorch', type: 'status' }
            ],
            neutral: [
                { id: 'thunder_strike', type: 'offensive' },
                { id: 'quick_heal', type: 'support' },
                { id: 'agility_boost', type: 'status' }
            ]
        };

        // Select enemy based on biome
        const enemyList = baseEnemies[biome] || baseEnemies.forest;
        const base = enemyList[Math.floor(Math.random() * enemyList.length)];

        // Determine number of abilities
        let numAbilities;
        switch (difficulty) {
            case 1: numAbilities = 1; break;
            case 2: numAbilities = Math.random() < 0.5 ? 1 : 2; break;
            case 3: numAbilities = 2; break;
            case 4: numAbilities = Math.random() < 0.5 ? 2 : 3; break;
            default: numAbilities = 1;
        }

        // Select abilities
        const biomeAbilities = abilitiesByBiome[biome] || abilitiesByBiome.forest;
        const neutralAbilities = abilitiesByBiome.neutral;
        const selectedAbilities = [];
        const usedTypes = new Set();

        for (let i = 0; i < numAbilities; i++) {
            let abilityPool = Math.random() < 0.8 ? biomeAbilities : neutralAbilities;
            let available = abilityPool.filter(a => difficulty === 4 || !usedTypes.has(a.type));
            if (available.length === 0) available = abilityPool;
            if (available.length === 0) break;
            const ability = available[Math.floor(Math.random() * available.length)];
            selectedAbilities.push(ability.id);
            usedTypes.add(ability.type);
        }

        // Stat multiplier
        const multiplier = 1 + (difficulty - 1) * 0.5;
        let hp = base.hp;
        let sp = base.sp;
        if (selectedAbilities.includes('quick_heal')) {
            hp *= 1.1;
            sp *= 1.2;
        }

        // Calculate final stats
        const finalHp = Math.round(hp * multiplier);
        const finalSp = Math.round(sp * multiplier);
        
        const stats = {
            hp: finalHp,
            maxhp: finalHp,
            sp: finalSp,
            maxsp: finalSp,
            atk: Math.round(base.atk * multiplier),
            def: Math.round(base.def * multiplier)
        };

        return new Enemy(
            scene,
            {
                name: base.name,
                key: base.key,
                stats,
                abilities: selectedAbilities,
                biome
            },
            x,
            y
        );
    }
} 