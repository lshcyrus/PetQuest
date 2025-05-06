// Enemy entity and generator for PetQuest
// Inspired by Pet.js structure and the old EnemyGenerator.js

export class Enemy {
    /**
     * Create a new Enemy
     * @param {Object} data - Enemy data (name, stats, abilities, etc.)
     * @param {string} data.name - Enemy name
     * @param {Object} data.stats - Enemy stats (hp, attack, defense, speed)
     * @param {string[]} data.abilities - List of ability IDs
     * @param {string} [data.biome] - Biome type
     */
    constructor(data) {
        this.name = data.name;
        this.stats = data.stats;
        this.abilities = data.abilities || [];
        this.biome = data.biome || 'neutral';
    }

    /**
     * Get a summary of the enemy for UI or debugging
     */
    getSummary() {
        return {
            name: this.name,
            stats: this.stats,
            abilities: this.abilities,
            biome: this.biome
        };
    }

    // Add more methods as needed for battle logic, animations, etc.
}

export class EnemyFactory {
    /**
     * Generate a random enemy based on difficulty and biome
     * @param {number} difficulty - 1 (Easy) to 4 (Expert)
     * @param {string} biome - 'forest', 'iceland', 'desert', or 'neutral'
     * @returns {Enemy}
     */
    static generateRandomEnemy(difficulty, biome = 'neutral') {
        // Base enemy stats by biome
        const baseEnemies = {
            forest: [
                { name: 'Gloom Owl', hp: 50, attack: 10, defense: 5, speed: 8 },
                { name: 'Shadow Bat', hp: 40, attack: 12, defense: 3, speed: 10 },
                { name: 'Fierce Wolfling', hp: 60, attack: 11, defense: 6, speed: 7 }
            ],
            iceland: [
                { name: 'Polar Yeti', hp: 80, attack: 15, defense: 10, speed: 5 },
                { name: 'Ice Wraith', hp: 60, attack: 13, defense: 7, speed: 7 },
                { name: 'Frost Drake', hp: 70, attack: 14, defense: 8, speed: 6 }
            ],
            desert: [
                { name: 'Sand Viper', hp: 45, attack: 13, defense: 4, speed: 9 },
                { name: 'Scorpion King', hp: 65, attack: 12, defense: 9, speed: 6 },
                { name: 'Dust Wraith', hp: 55, attack: 11, defense: 6, speed: 8 }
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

        return new Enemy({
            name: base.name,
            stats,
            abilities: selectedAbilities,
            biome
        });
    }
} 