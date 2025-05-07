/**
 * Pet class representing a pet in the game
 * Encapsulates pet data, behavior, and animations
 */
export class Pet {
    /**
     * Create a new Pet
     * @param {Object} scene - The Phaser scene this pet belongs to
     * @param {Object} data - Pet data including name, key, stats, etc.
     * @param {string} data.name - The name of the pet
     * @param {string} data.key - The sprite key for the pet's images
     * @param {Object} data.stats - The pet's stats (hp, maxhp, sp, maxsp, atk, def)
     * @param {string} [data._id] - The pet's database ID (if available)
     * @param {number} [x=0] - The x position to place the pet
     * @param {number} [y=0] - The y position to place the pet
     */
    constructor(scene, data, x = 0, y = 0) {
        this.scene = scene;
        this.data = data;
        this.sprite = null;
        this.nameText = null;
        this.x = x;
        this.y = y;
        
        // Default stats if not provided
        this.data.stats = data.stats || {
            hp: 50,
            maxhp: 50,
            sp: 25,
            maxsp: 25,
            atk: 50,
            def: 50
        };
        
        // For backward compatibility - ensure both hp and maxhp are set
        if (this.data.stats.health && !this.data.stats.maxhp) {
            this.data.stats.maxhp = this.data.stats.health;
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
            this.data.stats.atk = 50;
        }
        if (!this.data.stats.def) {
            this.data.stats.def = 50;
        }
        
        // Remove speed stat if it exists
        if (this.data.stats.speed) {
            delete this.data.stats.speed;
        }
    }
    
    /**
     * Create and display the pet sprite in the scene
     * @param {number} [scale=1] - Scale factor for the sprite
     * @param {number} [depth=1] - Depth level for the sprite
     * @returns {Phaser.GameObjects.Sprite} The created sprite
     */
    create(scale = 1, depth = 1) {
        // Create pet sprite
        this.sprite = this.scene.add.sprite(this.x, this.y, this.data.key);
        
        // Create animation key for this pet
        const animKey = `${this.data.key}_idle`;
        
        // Create animation if it doesn't exist
        if (!this.scene.anims.exists(animKey)) {
            this.scene.anims.create({
                key: animKey,
                frames: this.scene.anims.generateFrameNumbers(this.data.key, { start: 0, end: 3 }),
                frameRate: 6,
                repeat: -1
            });
        }
        
        // Play the animation
        this.sprite.play(animKey);
        
        // Set scale and depth
        this.sprite.setScale(scale);
        this.sprite.setDepth(depth);
        
        return this.sprite;
    }
    
    /**
     * Create and display the pet's name
     * @param {number} [offsetY=-50] - Y offset from the pet
     * @param {Object} [style={}] - Text style configuration
     * @param {number} [depth=1] - Depth level for the text
     * @returns {Phaser.GameObjects.Text} The created text object
     */
    createNameDisplay(offsetY = -50, style = {}, depth = 1) {
        const defaultStyle = {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '28px',
            color: '#ffffff',
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
     * Create an interactive name display with a rename button
     * @param {number} [offsetY=-50] - Y offset from the pet
     * @param {Function} [onRename=null] - Callback when rename is triggered
     * @returns {Phaser.GameObjects.Container} Container with name
     */
    createInteractiveNameDisplay(offsetY = -50, onRename = null) {
        // Create container for pet name
        this.nameContainer = this.scene.add.container(this.x, this.y + offsetY);
        this.nameContainer.setDepth(1);

        // Add pet name text (interactive)
        this.nameText = this.scene.add.text(0, 0, this.data.name, {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '28px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5)
          .setInteractive({ useHandCursor: true });

        // Add rename functionality if provided
        if (onRename) {
            this.nameText.on('pointerdown', onRename);
        }

        // Add hover color effect
        this.nameText.on('pointerover', () => {
            this.nameText.setColor('#ffe066'); // Highlight color (yellow)
        });
        this.nameText.on('pointerout', () => {
            this.nameText.setColor('#ffffff'); // Default color
        });

        // Add to container
        this.nameContainer.add([this.nameText]);

        return this.nameContainer;
    }
    
    /**
     * Set or update the pet's position
     * @param {number} x - New x position
     * @param {number} y - New y position
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        
        if (this.sprite) {
            this.sprite.setPosition(x, y);
        }
        
        if (this.nameText && !this.nameContainer) {
            this.nameText.setPosition(x, y - 50);
        }
        
        if (this.nameContainer) {
            this.nameContainer.setPosition(x, y - 50);
        }
    }
    
    /**
     * Set the pet's name
     * @param {string} name - New name for the pet
     */
    setName(name) {
        this.data.name = name;
        
        if (this.nameText) {
            this.nameText.setText(name);
        }
    }
    
    /**
     * Get pet data in a format ready for API submission
     * @returns {Object} Pet data for API
     */
    getApiData() {
        return {
            name: this.data.name,
            key: this.data.key,
            species: "dragon" // Default species for backward compatibility
        };
    }
    
    /**
     * Update pet data from API response
     * @param {Object} apiData - Data returned from API
     */
    updateFromApi(apiData) {
        if (apiData._id) this.data._id = apiData._id;
        if (apiData.name) this.data.name = apiData.name;
        if (apiData.key) this.data.key = apiData.key;
        
        // Update name display if it exists
        if (this.nameText) {
            this.nameText.setText(this.data.name);
        }
    }
    
    /**
     * Clean up resources when pet is removed
     */
    destroy() {
        if (this.sprite) {
            this.sprite.destroy();
        }
        
        if (this.nameText && !this.nameContainer) {
            this.nameText.destroy();
        }
        
        if (this.nameContainer) {
            this.nameContainer.destroy();
        }
    }
    
    /**
     * Play a specific animation or visual effect for the pet
     * @param {string} action - One of: 'play', 'train', 'outdoor', 'feed', 'medicine', 'attack', 'hurt'
     */
    playAnimation(action) {
        if (!this.sprite) return;
        const petKey = this.data.key;
        const scene = this.scene;
        
        // Helper to restore idle after anim, ensuring tint is cleared
        const playIdle = (delay = 600) => {
            scene.time.delayedCall(delay, () => {
                if (this.sprite) { // Check if sprite still exists
                    // Ensure the idle animation key matches the one created in Pet.create()
                    const idleAnimKey = `${petKey}_idle`; 
                    this.sprite.play(idleAnimKey);
                    this.sprite.clearTint(); // Important: clear tint when returning to idle
                }
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

        // Clear any persistent tint before starting a new animation (except for hurt itself)
        if (action !== 'hurt' && this.sprite) {
            this.sprite.clearTint();
        }

        switch (action) {
            case 'play': {
                const animKey = `${petKey}_play`;
                if (!scene.anims.exists(animKey)) {
                    scene.anims.create({
                        key: animKey,
                        frames: scene.anims.generateFrameNumbers(animKey, { start: 0, end: 8 }),
                        frameRate: 10,
                        duration: 3000,
                        repeat: -1
                    });
                }
                this.sprite.play(animKey);
                playIdle(3000);
                break;
            }
            case 'train': {
                const animKey = `${petKey}_train`;
                if (!scene.anims.exists(animKey)) {
                    scene.anims.create({
                        key: animKey,
                        frames: scene.anims.generateFrameNumbers(animKey, { start: 0, end: 8 }),
                        frameRate: 10,
                        duration: 3000,
                        repeat: -1
                    });
                }
                this.sprite.play(animKey);
                playIdle(3000);
                break;
            }
            case 'outdoor': {
                const animKey = `${petKey}_outdoor`;
                if (!scene.anims.exists(animKey)) {
                    scene.anims.create({
                        key: animKey,
                        frames: scene.anims.generateFrameNumbers(animKey, { start: 0, end: 8 }),
                        frameRate: 20, // Faster framerate
                        duration: 3000,
                        repeat: -1
                    });
                }
                this.sprite.play(animKey);
                playIdle(3000);
                break;
            }
            case 'feed': {
                // Animate food icon moving to mouth, bounce, and heart effect
                const food = scene.add.image(this.sprite.x, this.sprite.y - this.sprite.displayHeight/2, 'pet_feed')
                    .setDisplaySize(32, 32)
                    .setDepth(this.sprite.depth + 1);
                this._effectOverlay = food;
                scene.tweens.add({
                    targets: food,
                    y: this.sprite.y,
                    duration: 400,
                    onComplete: () => {
                        // Bounce effect
                        scene.tweens.add({
                            targets: this.sprite,
                            scale: this.sprite.scale * 1.08,
                            yoyo: true,
                            duration: 120,
                            onComplete: () => {
                                // Heart effect
                                const heart = scene.add.text(this.sprite.x, this.sprite.y - this.sprite.displayHeight/2 - 24, '❤', {
                                    fontSize: '32px', color: '#ff88cc', stroke: '#000', strokeThickness: 3
                                }).setOrigin(0.5).setDepth(this.sprite.depth + 2);
                                this._effectText = heart;
                                scene.tweens.add({
                                    targets: heart,
                                    y: heart.y - 30,
                                    alpha: 0,
                                    duration: 600,
                                    onComplete: () => { heart.destroy(); }
                                });
                                food.destroy();
                            }
                        });
                    }
                });
                playIdle(900);
                break;
            }
            case 'medicine': {
                // Medicine icon drops, pet tints, +HP text
                const med = scene.add.image(this.sprite.x, this.sprite.y - this.sprite.displayHeight/2, 'pet_addHealth')
                    .setDisplaySize(32, 32)
                    .setDepth(this.sprite.depth + 1);
                this._effectOverlay = med;
                scene.tweens.add({
                    targets: med,
                    y: this.sprite.y,
                    duration: 400,
                    onComplete: () => {
                        this.sprite.setTint(0x88ff88);
                        // +HP text
                        const hpText = scene.add.text(this.sprite.x, this.sprite.y - this.sprite.displayHeight/2 - 24, '+HP', {
                            fontSize: '24px', color: '#88ff88', stroke: '#000', strokeThickness: 3
                        }).setOrigin(0.5).setDepth(this.sprite.depth + 2);
                        this._effectText = hpText;
                        scene.tweens.add({
                            targets: hpText,
                            y: hpText.y - 30,
                            alpha: 0,
                            duration: 600,
                            onComplete: () => { hpText.destroy(); }
                        });
                        med.destroy();
                    }
                });
                playIdle(900);
                break;
            }
            case 'attack': { 
                if (this.sprite) {
                    // Try to use the specific attack animation if it exists
                    const attackAnimKey = `${petKey}_atk`;
                    let usingCustomAnim = false;
                    
                    if (scene.anims.exists(attackAnimKey)) {
                        this.sprite.play(attackAnimKey);
                        usingCustomAnim = true;
                    } else {
                        console.log(`No custom attack animation found for ${petKey}, using fallback animation`);
                    }
                    
                    const originalX = this.sprite.x;
                    const attackMovement = this.sprite.flipX ? -30 : 30; // Movement direction based on flip
                    
                    // Optional attack effect - glowing outline
                    this.sprite.setTint(0x00aaff); // Blue glow for pet attack
                    
                    // Move forward quickly
                    scene.tweens.add({
                        targets: this.sprite,
                        x: originalX + attackMovement,
                        duration: 150,
                        ease: 'Power1',
                        onComplete: () => {
                            // Add attack effect - slashing line with pet-themed colors
                            const slashX = this.sprite.x + (this.sprite.flipX ? -50 : 50);
                            const slash = scene.add.graphics();
                            slash.lineStyle(3, 0x00ffff, 1); // Cyan color for pet
                            slash.beginPath();
                            slash.moveTo(slashX - 20, this.sprite.y - 20);
                            slash.lineTo(slashX + 20, this.sprite.y + 20);
                            slash.moveTo(slashX + 20, this.sprite.y - 20);
                            slash.lineTo(slashX - 20, this.sprite.y + 20);
                            slash.closePath();
                            slash.stroke();
                            this._effectOverlay = slash;
                            
                            // Add a sparkle effect at the slash point
                            const sparkleText = scene.add.text(
                                slashX, 
                                this.sprite.y, 
                                '✦', 
                                {
                                    fontSize: '32px',
                                    color: '#00ffff'
                                }
                            ).setOrigin(0.5);
                            this._effectText = sparkleText;
                            
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
                                                targets: [slash, sparkleText],
                                                alpha: 0,
                                                duration: 200,
                                                onComplete: () => {
                                                    if (slash && !slash.destroyed) {
                                                        slash.destroy();
                                                    }
                                                    if (sparkleText && !sparkleText.destroyed) {
                                                        sparkleText.destroy();
                                                    }
                                                }
                                            });
                                        }
                                        // Return to idle
                                        playIdle(50);
                                    }
                                });
                            });
                        }
                    });
                } else {
                    playIdle(50); // Fallback if no sprite
                }
                break;
            }
            case 'hurt': { 
                if (this.sprite) {
                    this.sprite.setTint(0xff6666); // Red tint for hurt
                    const originalX = this.sprite.x;
                    // Quick shake effect
                    scene.tweens.add({
                        targets: this.sprite,
                        x: originalX + (Math.random() > 0.5 ? 6 : -6), // Small random shake
                        yoyo: true,
                        repeat: 2, // Shake back and forth a couple of times
                        duration: 60, // Quick shake
                        ease: 'Sine.easeInOut',
                        onComplete: () => {
                            this.sprite.setX(originalX); // Ensure sprite returns to original position
                            // Tint will be cleared by playIdle
                            playIdle(300); // Delay before idle to show hurt effect, playIdle will clear tint
                        }
                    });
                } else {
                    playIdle(300); // Fallback if no sprite
                }
                break;
            }
            default:
                // Fallback to idle
                const idleAnimKey = `${petKey}_idle`;
                this.sprite.play(idleAnimKey);
        }
    }
} 