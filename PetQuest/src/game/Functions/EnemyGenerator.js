// src/utils/EnemyGenerator.js

// Generates random enemies based on difficulty per Section 5.3
export class EnemyGenerator {
    // Generate a random enemy scaled to difficulty (1 to 4)
    static generateRandomEnemy(difficulty) {
        // Define enemy types with base stats and skill preferences
        const enemyTypes = [
            {
                type: 'Balanced',
                skillPreference: ['damage', 'heal'],
                baseStats: { hp: 50, attack: 5, defense: 3 }
            },
            {
                type: 'Aggressive',
                skillPreference: ['damage', 'debuff'],
                baseStats: { hp: 40, attack: 7, defense: 2 }
            },
            {
                type: 'Defensive',
                skillPreference: ['heal', 'buff'],
                baseStats: { hp: 60, attack: 3, defense: 5 }
            }
        ];

        // Randomly select type
        const typeData = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

        // Calculate stats with difficulty scaling (Section 5.3)
        const baseHp = typeData.baseStats.hp + (difficulty - 1) * 30; // e.g., D1: 50, D2: 80
        const baseAttack = typeData.baseStats.attack + (difficulty - 1) * 3; // e.g., D1: 5, D2: 8
        const baseDefense = typeData.baseStats.defense + (difficulty - 1) * 2; // e.g., D1: 3, D2: 5

        // Apply ±10% variation
        const variation = () => 0.9 + Math.random() * 0.2; // 0.9 to 1.1
        const hp = Math.round(baseHp * variation());
        const attack = Math.round(baseAttack * variation());
        const defense = Math.round(baseDefense * variation());

        // Define possible skills
        const skillPool = [
            {
                name: 'Strike',
                type: 'damage',
                damage: 10 + difficulty * 5, // e.g., D1: 15, D2: 20
                cooldown: 2
            },
            {
                name: 'Heal',
                type: 'heal',
                amount: 10 + difficulty * 3, // e.g., D1: 13, D2: 16
                cooldown: 3
            },
            {
                name: 'Power Up',
                type: 'buff',
                effect: 'attack',
                multiplier: 1.2 + difficulty * 0.1, // e.g., D1: 1.3, D2: 1.4
                cooldown: 3
            },
            {
                name: 'Poison',
                type: 'debuff',
                effect: 'attack',
                multiplier: 0.8 - difficulty * 0.05, // e.g., D1: 0.75, D2: 0.7
                cooldown: 2
            }
        ];

        // Select 1-2 skills, prioritizing preferences
        const preferredSkills = skillPool.filter(skill => typeData.skillPreference.includes(skill.type));
        const numSkills = Math.random() > 0.5 ? 2 : 1;
        const skills = [];
        const availableSkills = [...preferredSkills, ...skillPool];

        for (let i = 0; i < numSkills && availableSkills.length > 0; i++) {
            const skillIndex = Math.floor(Math.random() * availableSkills.length);
            const skill = { ...availableSkills[skillIndex], currentCooldown: 0 };
            skills.push(skill);
            availableSkills.splice(skillIndex, 1);
        }

        // Return enemy object
        return {
            hp,
            attack,
            defense,
            type: typeData.type,
            skills
        };
    }
}