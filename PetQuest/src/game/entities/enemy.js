// Enemy entity and generator for PetQuest
// Inspired by Pet.js structure and the old EnemyGenerator.js

export class Enemy {
    /**
     * Create a new Enemy
     * @param {Object} scene - The Phaser scene this enemy belongs to
     * @param {Object} data - Enemy data (name, stats, abilities, biome, key, etc.)
     * @param {string} data.name - Enemy name
     * @param {string} [data.key] - Sprite key for the enemy's images
     * @param {Object} data.stats - Enemy stats (hp, attack, defense, speed)
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
        this.data.stats = data.stats || { hp: 50, attack: 10, defense: 10, speed: 10 };
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
        switch (action) {
            case 'attack': {
                const animKey = `${enemyKey}_attack`;
                if (!scene.anims.exists(animKey)) {
                    scene.anims.create({
                        key: animKey,
                        frames: scene.anims.generateFrameNumbers(enemyKey, { start: 4, end: 7 }),
                        frameRate: 10,
                        repeat: 0
                    });
                }
                this.sprite.play(animKey);
                playIdle(800);
                break;
            }
            case 'hurt': {
                this.sprite.setTint(0xff4444);
                playIdle(400);
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
                { name: 'Gloom Owl', key: 'gloom_owl', hp: 50, attack: 10, defense: 5, speed: 8 },
                { name: 'Shadow Bat', key: 'shadow_bat', hp: 40, attack: 12, defense: 3, speed: 10 },
                { name: 'Fierce Wolfling', key: 'fierce_wolfling', hp: 60, attack: 11, defense: 6, speed: 7 }
            ],
            iceland: [
                { name: 'Polar Yeti', key: 'polar_yeti', hp: 80, attack: 15, defense: 10, speed: 5 },
                { name: 'Ice Wraith', key: 'ice_wraith', hp: 60, attack: 13, defense: 7, speed: 7 },
                { name: 'Frost Drake', key: 'frost_drake', hp: 70, attack: 14, defense: 8, speed: 6 }
            ],
            desert: [
                { name: 'Sand Viper', key: 'sand_viper', hp: 45, attack: 13, defense: 4, speed: 9 },
                { name: 'Scorpion King', key: 'scorpion_king', hp: 65, attack: 12, defense: 9, speed: 6 },
                { name: 'Dust Wraith', key: 'dust_wraith', hp: 55, attack: 11, defense: 6, speed: 8 }
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
        if (selectedAbilities.includes('quick_heal')) {
            hp *= 1.1;
        }

        const stats = {
            hp: Math.round(hp * multiplier),
            attack: Math.round(base.attack * multiplier),
            defense: Math.round(base.defense * multiplier),
            speed: Math.round(base.speed * multiplier)
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