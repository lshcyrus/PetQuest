export class EnemyGenerator {
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
        const enemyList = baseEnemies[biome] || baseEnemies.forest; // Fallback to forest
        const enemy = enemyList[Math.floor(Math.random() * enemyList.length)];

        // Determine number of abilities
        let numAbilities;
        switch (difficulty) {
            case 1: numAbilities = 1; break; // Easy
            case 2: numAbilities = Math.random() < 0.5 ? 1 : 2; break; // Medium
            case 3: numAbilities = 2; break; // Hard
            case 4: numAbilities = Math.random() < 0.5 ? 2 : 3; break; // Expert
            default: numAbilities = 1;
        }

        // Select abilities
        const biomeAbilities = abilitiesByBiome[biome] || abilitiesByBiome.forest;
        const neutralAbilities = abilitiesByBiome.neutral;
        const selectedAbilities = [];
        const usedTypes = new Set();

        // Prioritize biome-specific abilities (80% chance)
        for (let i = 0; i < numAbilities; i++) {
            let abilityPool = Math.random() < 0.8 ? biomeAbilities : neutralAbilities;
            // Filter out already used types for variety (except Expert)
            let available = abilityPool.filter(a => difficulty === 4 || !usedTypes.has(a.type));
            if (available.length === 0) available = abilityPool; // Fallback
            if (available.length === 0) break; // No more abilities

            const ability = available[Math.floor(Math.random() * available.length)];
            selectedAbilities.push(ability.id);
            usedTypes.add(ability.type);
        }

        // Apply stat multiplier
        const multiplier = 1 + (difficulty - 1) * 0.5;
        let hp = enemy.hp;
        if (selectedAbilities.includes('quick_heal')) {
            hp *= 1.1; // +10% HP for healers
        }

        return {
            name: enemy.name,
            hp: Math.round(hp * multiplier),
            attack: Math.round(enemy.attack * multiplier),
            defense: Math.round(enemy.defense * multiplier),
            speed: Math.round(enemy.speed * multiplier),
            abilities: selectedAbilities
        };
    }
}