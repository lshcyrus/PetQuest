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
     * @param {Object} data.stats - The pet's stats (hp, sp, atk, def)
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
        
        // Default stats if none provided
        if (!this.data.stats) {
            this.data.stats = {
                hp: 50,
                sp: 25,
                atk: 15,
                def: 10
            };
        }
        
        // For backward compatibility - ensure both hp and maxhp are set
        if (this.data.stats.health !== undefined && this.data.stats.hp === undefined) {
            this.data.stats.hp = this.data.stats.health;
        }
        
        // If hp doesn't exist, set default
        if (this.data.stats.hp === undefined) {
            this.data.stats.hp = 50;
        }
        
        // Ensure SP stat exists
        if (this.data.stats.sp === undefined) {
            this.data.stats.sp = 25;
        }
        
        // Ensure ATK and DEF exist
        if (this.data.stats.atk === undefined) {
            this.data.stats.atk = this.data.stats.attack || 15;
        }
        
        if (this.data.stats.def === undefined) {
            this.data.stats.def = this.data.stats.defense || 10;
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
     * @param {object} [details={}] - Optional details for the animation, e.g., { itemName: 'hp-potion' }
     */
    playAnimation(action, details = {}) {
        if (!this.sprite) return;
        const petKey = this.data.key;
        const scene = this.scene;
        
        // Helper to restore idle after anim, ensuring tint is cleared
        const playIdle = (delay = 600) => {
            scene.time.delayedCall(delay, () => {
                if (this.sprite && this.sprite.active) { // Check if sprite still exists and is active
                    const idleAnimKey = `${petKey}_idle`; 
                    if (scene.anims.exists(idleAnimKey)) {
                        this.sprite.play(idleAnimKey);
                    }
                    this.sprite.clearTint();
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
                const itemName = details.itemName || 'hp-potion'; // Default to hp-potion if no name provided
                let tintColor = 0x88ff88; // Default green for HP Potion
                let effectTextStr = '+HP';
                let textColor = '#88ff88';

                switch (itemName) {
                    case 'sp-potion':
                        tintColor = 0x88ccff; // Light blue
                        effectTextStr = '+SP';
                        textColor = '#88ccff';
                        break;
                    case 'mixed-potion':
                        tintColor = 0xcc88ff; // Purple
                        effectTextStr = '+HP,SP';
                        textColor = '#cc88ff';
                        break;
                    case 'best-potion':
                        tintColor = 0xff8888; // Red
                        effectTextStr = 'Fully Recovered!';
                        textColor = '#ff8888';
                        break;
                    case 'hp-potion':
                    default:
                        // Already set by defaults
                        break;
                }

                // Medicine icon drops
                const medIcon = scene.add.image(this.sprite.x, this.sprite.y - this.sprite.displayHeight/2, 'pet_addHealth')
                    .setDisplaySize(32, 32)
                    .setDepth(this.sprite.depth + 1);
                this._effectOverlay = medIcon;

                scene.tweens.add({
                    targets: medIcon,
                    y: this.sprite.y,
                    duration: 400,
                    onComplete: () => {
                        if (this.sprite) { // Check if sprite still exists
                           this.sprite.setTint(tintColor);
                        }
                        
                        // Effect text
                        const effectText = scene.add.text(
                            this.sprite.x, 
                            this.sprite.y - this.sprite.displayHeight / 2 - 24, 
                            effectTextStr, 
                            {
                                fontFamily: '"Silkscreen", cursive', // Ensure consistent font
                                fontSize: '24px', 
                                color: textColor, 
                                stroke: '#000000', // Keep stroke for readability
                                strokeThickness: 3
                            }
                        ).setOrigin(0.5).setDepth(this.sprite.depth + 2);
                        this._effectText = effectText;

                        scene.tweens.add({
                            targets: effectText,
                            y: effectText.y - 30,
                            alpha: 0,
                            duration: 800, // Slightly longer for "Fully Recovered!"
                            onComplete: () => { if (effectText) effectText.destroy(); }
                        });
                        if (medIcon) medIcon.destroy();
                    }
                });
                playIdle(1000); // Adjusted delay to ensure text is visible
                break;
            }
            case 'attack': { 
                if (this.sprite) {
                    const animKey = `${petKey}_attack`; // Use direct spritesheet key
                    let animationPlayed = false;
                    if (scene.anims.exists(animKey)) {
                        this.sprite.play(animKey);
                        animationPlayed = true;
                        console.log(`Playing pet animation: ${animKey}`);
                    } else {
                        // Fallback if specific attack animation is not defined
                        console.warn(`Animation ${animKey} not found for pet ${petKey}. Using generic tween.`);
                        // Simple tween as fallback
                        const originalX = this.sprite.x;
                        const attackMovement = this.sprite.flipX ? -20 : 20;
                        scene.tweens.add({
                            targets: this.sprite,
                            x: originalX + attackMovement,
                            yoyo: true,
                            duration: 150,
                            ease: 'Power1'
                        });
                    }
                    
                    // Optional: Keep visual effects like tint or slash, adjust timing if needed
                    this.sprite.setTint(0x00aaff); // Example tint

                    const attackDuration = animationPlayed ? (this.sprite.anims.currentAnim.duration || 1000) : 400;
                    playIdle(attackDuration);
                }
                break;
            }
            case 'skill1': {
                if (this.sprite) {
                    const animKey = `${petKey}_skill1`; // Use direct spritesheet key for skill1
                    let animationPlayed = false;
                    if (scene.anims.exists(animKey)) {
                        this.sprite.play(animKey);
                        animationPlayed = true;
                        console.log(`Playing pet animation: ${animKey}`);
                    } else {
                        // Fallback to default attack animation if skill1 is not found
                        const attackAnimKey = `${petKey}_attack`;
                        console.warn(`Animation ${animKey} not found for ${petKey}, trying ${attackAnimKey}.`);
                        if (scene.anims.exists(attackAnimKey)) {
                            this.sprite.play(attackAnimKey);
                            animationPlayed = true;
                        } else {
                            console.warn(`Animation ${attackAnimKey} also not found for ${petKey}. Using generic tween.`);
                             const originalX = this.sprite.x;
                            const attackMovement = this.sprite.flipX ? -20 : 20;
                            scene.tweens.add({
                                targets: this.sprite,
                                x: originalX + attackMovement,
                                yoyo: true,
                                duration: 150,
                                ease: 'Power1'
                            });
                        }
                    }
                     // Optional: Add distinct visual effects for skill
                    this.sprite.setTint(0xffaa00); // Example different tint for skill

                    const skillDuration = animationPlayed ? (this.sprite.anims.currentAnim.duration || 1200) : 500;
                    playIdle(skillDuration);
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
            case 'die': {
                if (this.sprite) {
                    const animKey = `${petKey}_die`; // Assuming a _die animation exists/will be created
                    if (scene.anims.exists(animKey)) {
                        this.sprite.play(animKey);
                        console.log(`Playing pet animation: ${animKey}`);
                        // Optional: listen for animation complete to then fully destroy or hide
                        this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                            // this.sprite.setVisible(false); // Or destroy after animation
                        });
                    } else {
                        console.warn(`Animation ${animKey} not found for ${petKey}. Fading out.`);
                        scene.tweens.add({ targets: this.sprite, alpha: 0, duration: 500 });
                    }
                    // No playIdle, pet is defeated. Tint is cleared by playIdle helper, so clear manually if needed.
                    // this.sprite.clearTint(); 
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