import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { getGlobalContext } from '../../utils/contextBridge';
import { generateRandomEnemy } from '../entities/enemy';

// Define available items based on items in the database
const ALL_AVAILABLE_ITEMS = {
    common: [
        "HP Potion", "SP Potion", // medicine
        "Chess", "Feather",       // toy
        "Sword",                  // equipment
        "Cake"                    // food
    ],
    uncommon: [
        "Mixed Potion",           // medicine
        "Cup",                    // toy
        "Magic Wand",             // equipment
        "Donut", "Fish"           // food
    ],
    rare: [
        "Best Potion",            // medicine
        "The Sword of Light",     // equipment
        "Strawberry"              // food
    ],
    legendary: [
        "Demons Blade",           // equipment
        "Idiot Sandwich"          // food
    ]
};

// LevelSelector scene: Player selects difficulty, then a random level is generated
export class LevelSelector extends Scene {
    constructor() {
        super('LevelSelector');
        // Track selected difficulty and generated level
        this.selectedDifficulty = null;
        this.generatedLevel = null;
        this.enemy = null;
        this.petStatusElements = []; // To store elements for easy cleanup
    }

    // Initialize with pet and username
    init(data) {
        console.log('LevelSelector init:', data);
        // Fetch initial data from context if available, fallback to data or defaults
        const globalContext = getGlobalContext();
        this.username = (globalContext?.userData?.username) || data.username || 'Player';
        
        // First, check if we're returning from battle with updated data
        if (data && data.pet && data.pet._id) {
            console.log('Returning from battle with updated pet data');
            this.petData = data.pet;
            
            // Check if we have level changes that need to be highlighted
            this.showLevelChanges = data.levelChange === true;
            this.showStatsUpdated = data.showStatsUpdated === true;
            
            // Update the global context with the latest pet data
            if (globalContext) {
                globalContext.userData.selectedPet = data.pet;
                console.log('Updated global context with fresh pet data from battle');
            }
        } 
        // Otherwise use pet data from context primarily, fallback to data passed in init
        else {
            this.petData = globalContext?.userData?.selectedPet || data.pet || {
                key: 'fire_dragon',
                name: 'Ember',
                stats: { hp: 80, stamina: 100 }, // Ensure stats object exists in fallback
                level: 1,
                experience: 0
            };
            this.showLevelChanges = false;
            this.showStatsUpdated = false;
        }
        
        console.log('Initialized with Pet Data:', {
            name: this.petData.name,
            stats: this.petData.stats,
            currentHP: this.petData.currentHP,
            currentSP: this.petData.currentSP,
            exp: this.petData.experience,
            level: this.petData.level
        });
    }

    // Preload assets
    preload() {
        console.log('LevelSelector preloading assets');
        // Load possible backgrounds
        this.load.image('forest', '/assets/forest.png');
        this.load.image('iceland', '/assets/iceland.png');
        this.load.image('desert', '/assets/desert.png');
        // Load default background for difficulty selection
        this.load.image('background', '/assets/background.png');
    }

    // Create scene elements
    create() {
        console.log('LevelSelector create started');
        try {
            // Fade in
            this.cameras.main.fadeIn(800, 0, 0, 0);

            // Set up initial background
            this.setupBackground();

            // Show difficulty selection by default
            this.setupDifficultySelection();

            // Set up pet status (persistent)
            this.setupPetStatus();

            // Add Return to Menu button
            this.setupReturnButton();

            // Handle responsive layout
            const { width, height } = this.scale;
            const isPortrait = height > width;
            if (isPortrait) {
                this.setupPortraitLayout();
            } else {
                this.setupLandscapeLayout();
            }

            // Notify listeners
            EventBus.emit('current-scene-ready', this);
            console.log('LevelSelector create completed');
        } catch (error) {
            console.error('LevelSelector create failed:', error);
        }

        // Add resize handler
        this.scale.on('resize', this.onResize, this);

        // Add shutdown handler for cleanup
        this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
    }

    // Generate a random level based on difficulty (adapted from Section 5.4)
    generateRandomLevel(difficulty) {
        // Define biomes
        const biomes = [
            {
                namePrefix: ['Mystic', 'Twilight', 'Emerald'],
                nameSuffix: ['Forest', 'Grove', 'Woods'],
                background: 'forest',
                enemyName: 'Gorgon',
                enemyKey: 'gorgon_idle',
                descriptions: [
                    'A dense forest with glowing mushrooms.',
                    'A misty woodland hiding ancient secrets.',
                    'A lush grove teeming with wild creatures.'
                ]
            },
            {
                namePrefix: ['Frosty', 'Glacial', 'Arctic'],
                nameSuffix: ['Tundra', 'Glacier', 'Fjord'],
                background: 'iceland',
                enemyName: 'Blue Golem',
                enemyKey: 'blue_golem_idle',
                descriptions: [
                    'A frozen tundra swept by icy winds.',
                    'A glacial expanse with shimmering ice.',
                    'An arctic fjord hiding cold dangers.'
                ]
            },
            {
                namePrefix: ['Scorching', 'Mirage', 'Dune'],
                nameSuffix: ['Desert', 'Dunes', 'Wastes'],
                background: 'desert',
                enemyName: 'Orange Golem',
                enemyKey: 'orange_golem_idle',
                descriptions: [
                    'A scorching desert with deadly sands.',
                    'A shimmering wasteland full of illusions.',
                    'A barren expanse hiding fierce predators.'
                ]
            }
        ];

        // Randomly select biome
        const biome = biomes[Math.floor(Math.random() * biomes.length)];

        // Generate name
        const prefix = biome.namePrefix[Math.floor(Math.random() * biome.namePrefix.length)];
        const suffix = biome.nameSuffix[Math.floor(Math.random() * biome.nameSuffix.length)];
        const name = `${prefix} ${suffix}`;

        // Generate description
        const description = biome.descriptions[Math.floor(Math.random() * biome.descriptions.length)];

        // Use the specific enemy for this biome
        const enemyName = biome.enemyName;

        // Generate rewards, scaled by difficulty
        const rewards = this.generateLevelRewards(difficulty);
        // Coins: 50 + 50 * difficulty
        const coins = 50 + 50 * difficulty;
        rewards.push(`${coins} Coins`);

        // Generate unique ID
        const id = `level_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Generate enemy using the new function
        const enemyData = generateRandomEnemy(difficulty);
        
        // Override the enemy key to match the biome if needed
        enemyData.key = biome.enemyKey;
        enemyData.name = biome.enemyName;
        
        this.enemy = enemyData;

        return {
            id,
            name,
            description,
            maxDifficulty: difficulty,
            enemies: [enemyName],
            rewards,
            background: biome.background
        };
    }

    generateLevelRewards(difficulty) {
        const rewards = [];
        // Reward count based on difficulty (1-3 item rewards)
        const rewardCount = Math.min(3, Math.ceil(difficulty / 2));
    
        const getItemFromPool = (pool) => {
            // Ensure pool is an array and has items
            if (Array.isArray(pool) && pool.length > 0) {
                return pool[Math.floor(Math.random() * pool.length)];
            }
            return null;
        };
    
        for (let i = 0; i < rewardCount; i++) {
            let reward = null;
            const rareness = Math.random(); // Random roll for each reward item
    
            let targetPool;
    
            // Determine target reward pool based on difficulty and rareness
            if (difficulty >= 4) { // Expert difficulty
                if (rareness < 0.10) targetPool = ALL_AVAILABLE_ITEMS.legendary;      // 10% chance for Legendary
                else if (rareness < 0.40) targetPool = ALL_AVAILABLE_ITEMS.rare;      // 30% chance for Rare (0.10 to 0.39)
                else if (rareness < 0.70) targetPool = ALL_AVAILABLE_ITEMS.uncommon;  // 30% chance for Uncommon (0.40 to 0.69)
                else targetPool = ALL_AVAILABLE_ITEMS.common;                        // 30% chance for Common (0.70 to 0.99)
            } else if (difficulty === 3) { // Hard difficulty
                if (rareness < 0.20) targetPool = ALL_AVAILABLE_ITEMS.rare;           // 20% chance for Rare
                else if (rareness < 0.50) targetPool = ALL_AVAILABLE_ITEMS.uncommon;   // 30% chance for Uncommon (0.20 to 0.49)
                else targetPool = ALL_AVAILABLE_ITEMS.common;                        // 50% chance for Common (0.50 to 0.99)
            } else if (difficulty === 2) { // Medium difficulty
                if (rareness < 0.30) targetPool = ALL_AVAILABLE_ITEMS.uncommon;       // 30% chance for Uncommon
                else targetPool = ALL_AVAILABLE_ITEMS.common;                        // 70% chance for Common (0.30 to 0.99)
            } else { // Difficulty 1 (Easy) or default
                targetPool = ALL_AVAILABLE_ITEMS.common;                             // 100% chance for Common
            }
            
            reward = getItemFromPool(targetPool);
    
            // Fallback mechanism if the chosen targetPool was empty or failed to yield an item
            if (!reward) {
                const fallbackOrder = [
                    ALL_AVAILABLE_ITEMS.common, 
                    ALL_AVAILABLE_ITEMS.uncommon, 
                    ALL_AVAILABLE_ITEMS.rare, 
                    ALL_AVAILABLE_ITEMS.legendary
                ];
                for (const pool of fallbackOrder) {
                    // Skip if this pool was the original target and already failed
                    if (pool === targetPool && getItemFromPool(pool) === null) continue; 
                    
                    reward = getItemFromPool(pool);
                    if (reward) break; // Found a reward from a fallback pool
                }
            }
    
            if (reward) {
                rewards.push(reward);
            } else {
                // This warning indicates all item pools (common, uncommon, rare, legendary) might be empty.
                console.warn(`Could not generate ANY reward item for slot ${i + 1} at difficulty ${difficulty}. Check ALL_AVAILABLE_ITEMS definitions.`);
            }
        }
        return rewards;
    }
    

    // Set up background
    setupBackground() {
        const { width, height } = this.scale;
        const centerX = width * 0.5;
        const centerY = height * 0.5;

        // Use level background if generated, else default
        const texture = this.generatedLevel ? this.generatedLevel.background : 'background';
        this.background = this.add.image(centerX, centerY, texture);
        this.scaleToFit(this.background);
        this.background.setDepth(0);

        // Add overlay
        this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.5).setDepth(1);
    }

    // Show difficulty selection
    setupDifficultySelection() {
        const { width, height } = this.scale;

        // Header
        this.headerText = this.add.text(
            width / 2,
            height * 0.2,
            `Select Difficulty, ${this.username}!`,
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '36px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(2);

        // Difficulty buttons
        this.difficultyButtons = [];
        const buttons = [
            { text: 'Easy', difficulty: 1 },
            { text: 'Medium', difficulty: 2 },
            { text: 'Hard', difficulty: 3 },
            { text: 'Expert', difficulty: 4 },
            { text: 'Confirm', difficulty: null }
        ];

        buttons.forEach((btn, index) => {
            const buttonY = height * 0.35 + index * 60;
            const isConfirm = btn.text === 'Confirm';
            const button = this.add.text(
                width / 2,
                buttonY,
                btn.text,
                {
                    fontFamily: '"Silkscreen", cursive',
                    fontSize: '24px',
                    color: '#ffffff',
                    backgroundColor: isConfirm ? (this.confirmEnabled ? '#5abe3b' : '#333333') : 
                        (this.selectedDifficulty === btn.difficulty ? '#5abe3b' : '#333333'),
                    padding: { x: 20, y: 10 }
                }
            ).setOrigin(0.5).setInteractive().setDepth(2);

            // Set interactivity
            if (isConfirm) {
                this.confirmButton = button;
                if (!this.confirmEnabled) {
                    button.disableInteractive();
                }
            }

            // Event handlers
            button.on('pointerover', () => {
                if (isConfirm) {
                    if (this.confirmEnabled) {
                        button.setStyle({ backgroundColor: '#5abe3b' });
                    }
                } else if (this.selectedDifficulty !== btn.difficulty) {
                    button.setStyle({ backgroundColor: '#5abe3b' });
                }
            });

            button.on('pointerout', () => {
                if (isConfirm) {
                    button.setStyle({ backgroundColor: '#333333' });
                } else if (this.selectedDifficulty !== btn.difficulty) {
                    button.setStyle({ backgroundColor: '#333333' });
                }
            });

            button.on('pointerdown', () => {
                console.log(`Clicked ${btn.text} button`);
                if (isConfirm) {
                    if (this.confirmEnabled) {
                        this.confirmDifficulty(this.selectedDifficulty);
                    }
                } else {
                    this.selectedDifficulty = btn.difficulty;
                    this.confirmEnabled = true;
                    console.log(`confrim enabled ${btn.text} button`);
                    this.updateDifficultyButtons();
                    if (this.confirmButton) {
                        this.confirmButton.setInteractive({ useHandCursor: true });
                    }
                }
            });

            if (!isConfirm) {
                this.difficultyButtons.push(button);
            }
        });
    }

    // Update difficulty buttons highlight
    updateDifficultyButtons() {
        this.difficultyButtons.forEach((button, index) => {
            button.setStyle({
                backgroundColor: this.selectedDifficulty === index + 1 ? '#5abe3b' : '#333333'
            });
        });
    }

    // Handle difficulty selection
    confirmDifficulty(difficulty) {
        console.log('Selected difficulty:', difficulty);

        // Generate random level
        this.generatedLevel = this.generateRandomLevel(difficulty);

        // Clear difficulty buttons
        this.difficultyButtons.forEach(button => button.destroy());
        this.difficultyButtons = [];
        if (this.headerText) {
            this.headerText.destroy();
        }
        if (this.confirmButton) {
            this.confirmButton.destroy();
        }

        // Update background
        this.setupBackground();

        // Show level details and controls
        this.setupLevelInfo();
        this.setupStartButton();
    }

    // Display pet status (Refactored)
    setupPetStatus() {
        // Clear previous elements if any
        this.petStatusElements.forEach(el => el.destroy());
        this.petStatusElements = [];
        if (this.petStatusContainer) this.petStatusContainer.destroy();

        // Fetch latest pet data from context
        const globalContext = getGlobalContext();
        // Use context data if available, otherwise use the data from init
        const currentPetData = globalContext?.userData?.selectedPet || this.petData;

        // --- Debugging Start ---
        console.log("currentPetData in setupPetStatus:", JSON.stringify(currentPetData, null, 2));
        // --- Debugging End ---

        if (!currentPetData) {
            console.warn("No pet data available for status display.");
            return;
        }
        console.log("Setting up pet status with:", currentPetData);

        const { width, height } = this.scale;
        // Use consistent positioning logic (adjust as needed for layout)
        const containerX = width * 0.15;
        const containerY = height * 0.2;
        this.petStatusContainer = this.add.container(containerX, containerY).setDepth(2);

        const panelWidth = 160; // Increased width slightly
        const panelHeight = 180; // Increased height for EXP bar

        const backgroundRect = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x000000, 0.7)
            .setStrokeStyle(2, 0xffffff)
            .setOrigin(0.5); // Center the background
        this.petStatusContainer.add(backgroundRect);
        this.petStatusElements.push(backgroundRect); // Add for cleanup

        // Use stats from the currentPetData.stats object, provide defaults if stats or specific stat is missing
        const petStats = currentPetData.stats || {};
        const petAttr = currentPetData.attributes || {};

        // Get current HP (prioritize currentHP, fallback to stats.hp)
        const currentHP = currentPetData.currentHP !== undefined ? currentPetData.currentHP : petStats.hp;
        // Get max HP (use stats.hp as the max health)
        const maxHP = petStats.hp !== undefined ? petStats.hp : 100;
        
        // Format HP display as current/max
        const petHp = `${currentHP}/${maxHP}`;
        
        const petStamina = (petAttr.stamina !== undefined && petAttr.stamina !== null) ? petAttr.stamina : 'N/A';
        const petLevel = currentPetData.level !== undefined ? currentPetData.level : 'N/A';
        const petExp = currentPetData.experience !== undefined ? currentPetData.experience : 0;
        const nextLevelXP = (petLevel !== 'N/A' ? petLevel * petLevel * 100 : 100);

        const statsToDisplay = [
            { name: 'HP', value: petHp },
            { name: 'Stamina', value: petStamina }, // Use the checked value
            { name: 'Level', value: petLevel },
        ];

        const textStyle = {
            fontFamily: '"Silkscreen", cursive', // Changed font
            fontSize: '16px',
            color: '#ffffff'
        };
        const labelX = -panelWidth / 2 + 15; // Padding from left edge
        const valueX = panelWidth / 2 - 15; // Padding from right edge

        let levelText;
        
        statsToDisplay.forEach((stat, index) => {
            const yOffset = -panelHeight / 2 + 30 + index * 30; // Position from top
            
            // Apply highlighting for level if showLevelChanges is true
            const isLevelStat = stat.name === 'Level';
            const highlightColor = isLevelStat && this.showLevelChanges ? '#ffff00' : '#ffffff';

            const label = this.add.text(
                labelX,
                yOffset,
                `${stat.name}:`,
                {
                    ...textStyle,
                    color: highlightColor
                }
            ).setOrigin(0, 0.5);

            const value = this.add.text(
                valueX,
                yOffset,
                `${stat.value}`,
                {
                    ...textStyle,
                    color: highlightColor
                }
            ).setOrigin(1, 0.5);
            
            if (isLevelStat) {
                levelText = value;
            }

            this.petStatusContainer.add([label, value]);
            this.petStatusElements.push(label, value); // Add for cleanup
        });

        // Experience Text and Bar
        const expYOffset = -panelHeight / 2 + 30 + statsToDisplay.length * 30; // Below last stat
        const expText = this.add.text(labelX, expYOffset, `EXP: ${petExp}/${nextLevelXP}`, {
            ...textStyle,
            fontSize: '14px',
            color: this.showLevelChanges ? '#ffff00' : '#88ffff',
        }).setOrigin(0, 0.5);

        const barWidth = panelWidth - 30; // Bar width with padding
        const barYOffset = expYOffset + 20; // Below EXP text

        const expBarBg = this.add.rectangle(labelX, barYOffset, barWidth, 10, 0x333366).setOrigin(0, 0.5);
        const fillWidth = Math.max(0, Math.min(1, petExp / nextLevelXP)) * barWidth;
        const expBarFill = this.add.rectangle(labelX, barYOffset, fillWidth, 10, 0x44e0ff).setOrigin(0, 0.5);

        this.petStatusContainer.add([expText, expBarBg, expBarFill]);
        this.petStatusElements.push(expText, expBarBg, expBarFill); // Add for cleanup

        // Initial positioning based on orientation
        this.updatePetStatusPosition();
        
        // Add level up notification animation if applicable
        if (this.showLevelChanges && levelText) {
            // Flash level text animation
            this.tweens.add({
                targets: levelText,
                scaleX: 1.3,
                scaleY: 1.3,
                duration: 500,
                yoyo: true,
                repeat: 2,
                ease: 'Sine.easeInOut'
            });
            
            // Also add a floating "LEVEL UP!" text
            const levelUpText = this.add.text(
                0, 
                -panelHeight / 2 - 20,
                'LEVEL UP!',
                {
                    fontFamily: '"Silkscreen", cursive',
                    fontSize: '20px',
                    color: '#ffff00',
                    stroke: '#000000',
                    strokeThickness: 4
                }
            ).setOrigin(0.5);
            
            this.petStatusContainer.add(levelUpText);
            this.petStatusElements.push(levelUpText);
            
            // Animate the level up text
            this.tweens.add({
                targets: levelUpText,
                y: '-=30',
                alpha: { from: 1, to: 0 },
                duration: 3000,
                ease: 'Cubic.easeOut'
            });
        }
    }

    // Helper to update pet status position on resize/layout change
    updatePetStatusPosition() {
        if (!this.petStatusContainer) return;
        const { width, height } = this.scale;
        const isPortrait = height > width;
        const containerX = isPortrait ? width * 0.5 : width * 0.15; // Center in portrait, left in landscape
        const containerY = isPortrait ? height * 0.15 : height * 0.3; // Adjust Y pos
        this.petStatusContainer.setPosition(containerX, containerY);
    }

    // Show generated level details
    setupLevelInfo() {
        const { width, height } = this.scale;

        // Add QUEST title at the top
        this.questTitle = this.add.text(
            width / 2,
            height * 0.22,
            "QUEST",
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '42px',
                color: '#ffcc00',
                stroke: '#000000',
                strokeThickness: 6,
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(2);
        
        // Add glow effect to the QUEST title
        this.tweens.add({
            targets: this.questTitle,
            alpha: 0.8,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Header with level name
        this.levelHeader = this.add.text(
            width / 2,
            height * 0.3,
            this.generatedLevel.name,
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '32px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5).setDepth(2);

        // Info panel
        this.infoPanel = this.add.rectangle(
            width / 2,
            height * 0.55,
            width * 0.6,
            height * 0.3,
            0x000000,
            0.7
        ).setStrokeStyle(2, 0xffffff).setDepth(2);

        // Description and details
        this.descriptionText = this.add.text(
            width / 2,
            height * 0.45,
            this.generatedLevel.description,
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: width * 0.55 }
            }
        ).setOrigin(0.5).setDepth(2);

        this.detailsText = this.add.text(
            width / 2,
            height * 0.55,
            `Difficulty: ${this.selectedDifficulty}\n` +
            `Enemy: ${this.generatedLevel.enemies[0]}\n` +
            `Rewards: ${this.generatedLevel.rewards.join(', ')}`,
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '16px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: width * 0.55 }
            }
        ).setOrigin(0.5).setDepth(2);
    }

    // Create Start button
    setupStartButton() {
        const { width, height } = this.scale;
        this.startButton = this.add.container(width * 0.85, height * 0.85).setDepth(2);

        const buttonWidth = 120;
        const buttonHeight = 50;

        const buttonBg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x4a9e2f)
            .setStrokeStyle(3, 0xffffff);

        const buttonText = this.add.text(
            0,
            0,
            'START',
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '24px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);

        this.startButton.add([buttonBg, buttonText]);
        this.startButton.setSize(buttonWidth, buttonHeight);
        this.startButton.setInteractive();

        this.startButton.on('pointerover', () => {
            buttonBg.setFillStyle(0x5abe3b);
        });
        this.startButton.on('pointerout', () => {
            buttonBg.setFillStyle(0x4a9e2f);
        });
        this.startButton.on('pointerdown', () => {
            buttonBg.setFillStyle(0x377f20);
            this.startLevel();
        });

        this.tweens.add({
            targets: this.startButton,
            scale: 1.05,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    // Add Return to Menu button
    setupReturnButton() {
        const { width, height } = this.scale;
        const buttonX = width * 0.1; // Position top-left
        const buttonY = height * 0.1;

        this.returnButton = this.add.text(
            buttonX,
            buttonY,
            '< Back to Menu',
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '20px',
                color: '#ffffff',
                backgroundColor: '#555555',
                padding: { x: 15, y: 8 },
                stroke: '#000000',
                strokeThickness: 2
            }
        ).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(3); // Ensure it's above overlay

        this.returnButton.on('pointerover', () => {
            this.returnButton.setStyle({ backgroundColor: '#777777' });
        });

        this.returnButton.on('pointerout', () => {
            this.returnButton.setStyle({ backgroundColor: '#555555' });
        });

        this.returnButton.on('pointerdown', () => {
            this.returnButton.setStyle({ backgroundColor: '#333333' });
            // Add fade out and transition
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                // Check if MainMenu scene exists and wake it instead of starting it
                if (this.scene.get('MainMenu').scene.isActive() || this.scene.get('MainMenu').scene.isSleeping()) {
                    // Wake the MainMenu scene which will refresh pet data
                    this.scene.wake('MainMenu');
                    this.scene.stop('LevelSelector');
                } else {
                    // Otherwise start MainMenu normally
                    this.scene.start('MainMenu', { username: this.username });
                }
            });
        });
        this.petStatusElements.push(this.returnButton); // Add for cleanup
    }

    // Reset to difficulty selection
    resetToDifficultySelection() {
        // Clear level display
        if (this.levelHeader) {
            this.levelHeader.destroy();
        }
        if (this.infoPanel) {
            this.infoPanel.destroy();
        }
        if (this.descriptionText) {
            this.descriptionText.destroy();
        }
        if (this.detailsText) {
            this.detailsText.destroy();
        }
        if (this.startButton) {
            this.startButton.destroy();
        }

        // Reset state
        this.generatedLevel = null;
        this.selectedDifficulty = null;
        this.enemy = null;

        // Restore default background
        this.setupBackground();

        // Show difficulty selection
        this.setupDifficultySelection();
    }

    // Start the level
    startLevel() {
        console.log('Starting level:', this.generatedLevel.name);

        // Validate pet
        if (this.petData.stats.stamina < 10) {
            console.warn('Pet too tired');
            this.showError('Your pet is too tired!');
            return;
        }

        // Transition to BattleSystem
        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('BattleSystem', {
                pet: this.petData,
                levelData: {
                    ...this.generatedLevel,
                    selectedDifficulty: this.selectedDifficulty
                },
                enemy: this.enemy
            });
        });
    }

    // Show error message
    showError(message) {
        const { width, height } = this.scale;
        if (this.errorText) {
            this.errorText.destroy();
        }
        this.errorText = this.add.text(
            width / 2,
            height / 0.8,
            message,
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '24px',
                color: '#ff0000',
                stroke: '#ffffff',
                strokeThickness: 2,
                align: 'center'
            }
        ).setOrigin(0.5).setDepth(3);

        this.time.delayedCall(2000, () => {
            if (this.errorText) {
                this.errorText.destroy();
            }
        });
    }

    // Scale background
    scaleToFit(gameObject) {
        const { width, height } = this.scale;
        const scaleX = width / gameObject.width;
        const scaleY = height / gameObject.height;
        const scale = Math.max(scaleX, scaleY);
        gameObject.setScale(scale).setScrollFactor(0);
    }

    // Handle resize
    onResize(gameSize) {
        const { width, height } = gameSize;
        const isPortrait = height > width;
        if (isPortrait) {
            this.setupPortraitLayout();
        } else {
            this.setupLandscapeLayout();
        }
        this.updatePetStatusPosition(); // Update pet status position
    }

    // Portrait layout
    setupPortraitLayout() {
        const { width, height } = this.scale;
        if (this.headerText) {
            this.headerText.setPosition(width / 2, height * 0.2);
        }
        if (this.difficultyButtons.length > 0) {
            this.difficultyButtons.forEach((button, index) => {
                button.setPosition(width / 2, height * 0.35 + index * 60);
            });
        }
        if (this.confirmButton) {
            this.confirmButton.setPosition(width / 2, height * 0.35 + 4 * 60);
        }
        if (this.questTitle) {
            this.questTitle.setPosition(width / 2, height * 0.22);
        }
        if (this.levelHeader) {
            this.levelHeader.setPosition(width / 2, height * 0.3);
        }
        if (this.infoPanel) {
            this.infoPanel.setPosition(width / 2, height * 0.55);
            this.infoPanel.setSize(width * 0.8, height * 0.3);
        }
        if (this.descriptionText) {
            this.descriptionText.setPosition(width / 2, height * 0.45);
        }
        if (this.detailsText) {
            this.detailsText.setPosition(width / 2, height * 0.55);
        }
        if (this.petStatusContainer) {
            this.petStatusContainer.setPosition(width * 0.15, height * 0.15);
        }
        if (this.startButton) {
            this.startButton.setPosition(width * 0.85, height * 0.85);
        }
        if (this.returnButton) {
            this.returnButton.setPosition(width * 0.5, height * 0.05);
        }
    }

    // Landscape layout
    setupLandscapeLayout() {
        const { width, height } = this.scale;
        if (this.headerText) {
            this.headerText.setPosition(width / 2, height * 0.25);
        }
        if (this.difficultyButtons.length > 0) {
            this.difficultyButtons.forEach((button, index) => {
                button.setPosition(width / 2, height * 0.4 + index * 60);
            });
        }
        if (this.confirmButton) {
            this.confirmButton.setPosition(width / 2, height * 0.4 + 4 * 60);
        }
        if (this.questTitle) {
            this.questTitle.setPosition(width / 2, height * 0.25);
        }
        if (this.levelHeader) {
            this.levelHeader.setPosition(width / 2, height * 0.35);
        }
        if (this.infoPanel) {
            this.infoPanel.setPosition(width / 2, height * 0.6);
            this.infoPanel.setSize(width * 0.6, height * 0.25);
        }
        if (this.descriptionText) {
            this.descriptionText.setPosition(width / 2, height * 0.5);
        }
        if (this.detailsText) {
            this.detailsText.setPosition(width / 2, height * 0.6);
        }
        if (this.petStatusContainer) {
            this.petStatusContainer.setPosition(width * 0.1, height * 0.3);
        }
        if (this.startButton) {
            this.startButton.setPosition(width * 0.85, height * 0.85);
        }
        if (this.returnButton) {
            this.returnButton.setPosition(width * 0.1, height * 0.1);
        }
    }

    // Scene shutdown cleanup
    shutdown() {
        console.log('LevelSelector shutdown: Cleaning up resources.');
        // Remove event listeners
        this.scale.off('resize', this.onResize, this);
        this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);

        // Destroy UI elements created in this scene
        this.petStatusElements.forEach(el => {
            if (el && el.scene) el.destroy(); // Check if element exists and belongs to scene
        });
        this.petStatusElements = [];

        if (this.petStatusContainer && this.petStatusContainer.scene) this.petStatusContainer.destroy();
        if (this.headerText && this.headerText.scene) this.headerText.destroy();
        if (this.confirmButton && this.confirmButton.scene) this.confirmButton.destroy();
        this.difficultyButtons.forEach(button => {
            if (button && button.scene) button.destroy();
        });
        this.difficultyButtons = [];
        if (this.levelHeader && this.levelHeader.scene) this.levelHeader.destroy();
        if (this.infoPanel && this.infoPanel.scene) this.infoPanel.destroy();
        if (this.descriptionText && this.descriptionText.scene) this.descriptionText.destroy();
        if (this.detailsText && this.detailsText.scene) this.detailsText.destroy();
        if (this.startButton && this.startButton.scene) this.startButton.destroy();
        if (this.returnButton && this.returnButton.scene) this.returnButton.destroy(); // Ensure return button is destroyed
        if (this.errorText && this.errorText.scene) this.errorText.destroy();
        if (this.questTitle && this.questTitle.scene) this.questTitle.destroy(); // Clean up the new QUEST title

        // Nullify references
        this.petStatusContainer = null;
        this.headerText = null;
        this.confirmButton = null;
        this.levelHeader = null;
        this.infoPanel = null;
        this.descriptionText = null;
        this.detailsText = null;
        this.startButton = null;
        this.returnButton = null;
        this.errorText = null;
        this.questTitle = null; // Nullify the questTitle reference
        this.petData = null; // Clear pet data reference
        this.generatedLevel = null;
        this.enemy = null;
    }
}