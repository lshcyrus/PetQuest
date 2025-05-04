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
     * @param {Object} data.stats - The pet's stats (health, attack, defense, speed)
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
            health: 50,
            attack: 50,
            defense: 50,
            speed: 50
        };
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
} 