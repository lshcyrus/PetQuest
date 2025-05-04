import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { getGlobalContext } from '../../utils/contextBridge';
import { EnemyGenerator } from '../Functions/EnemyGenerator';

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
        // Use pet data from context primarily, fallback to data passed in init
        this.petData = globalContext?.userData?.selectedPet || data.pet || {
            key: 'fire_dragon',
            name: 'Ember',
            stats: { hp: 80, stamina: 100 }, // Ensure stats object exists in fallback
            level: 1,
            experience: 0
        };
        console.log('Initialized with Pet Data:', this.petData);
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
                enemyNames: ['Fierce Wolfling', 'Shadow Bat', 'Gloom Owl'],
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
                enemyNames: ['Polar Yeti', 'Ice Wraith', 'Frost Drake'],
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
                enemyNames: ['Sand Viper', 'Scorpion King', 'Dust Wraith'],
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

        // Select one enemy name
        const enemyName = biome.enemyNames[Math.floor(Math.random() * biome.enemyNames.length)];

        // Generate rewards, scaled by difficulty
        const rewards = this.generateLevelRewards(difficulty);
        // Coins: 50 + 50 * difficulty
        const coins = 50 + 50 * difficulty;
        rewards.push(`${coins} Coins`);

        // Generate unique ID
        const id = `level_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Generate enemy
        this.enemy = EnemyGenerator.generateRandomEnemy(difficulty, biome.background);

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
       
        // Reward count based on difficulty (1-3)
        const rewardCount = Math.min(3, Math.ceil(difficulty / 2));
       
        // Common rewards
        const commonRewards = [
          "Health Potion",
          "Attack Boost",
          "Defense Boost",
          "Gold Coins",
          "Pet Treat"
        ];
       
        // Uncommon rewards (difficulty >= 3)
        const uncommonRewards = [
          "Ability Scroll",
          "Stat Enhancement",
          "Rare Pet Food",
          "Crafting Material"
        ];
       
        // Rare rewards (difficulty >= 5)
        const rareRewards = [
          "Legendary Equipment",
          "Pet Evolution Stone",
          "Powerful Ability",
          "Stat Multiplier"
        ];
       
        for (let i = 0; i < rewardCount; i++) {
          // Determine reward rareness
          let reward;
          const rareness = Math.random();
         
          if (difficulty >= 4 && rareness > 0.7) {
            // 30% chance for rare reward in high difficulty
            reward = rareRewards[Math.floor(Math.random() * rareRewards.length)];
          } else if (difficulty >= 3 && rareness > 0.4) {
            // 30% chance for uncommon reward in medium difficulty
            reward = uncommonRewards[Math.floor(Math.random() * uncommonRewards.length)];
          } else {
            // Common reward
            reward = commonRewards[Math.floor(Math.random() * commonRewards.length)];
          }
         
          rewards.push(reward);
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

        const petHp = petStats.hp !== undefined ? petStats.hp : 'N/A';
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

        statsToDisplay.forEach((stat, index) => {
            const yOffset = -panelHeight / 2 + 30 + index * 30; // Position from top

            const label = this.add.text(
                labelX,
                yOffset,
                `${stat.name}:`,
                textStyle
            ).setOrigin(0, 0.5);

            const value = this.add.text(
                valueX,
                yOffset,
                `${stat.value}`,
                textStyle
            ).setOrigin(1, 0.5);

            this.petStatusContainer.add([label, value]);
            this.petStatusElements.push(label, value); // Add for cleanup
        });

        // Experience Text and Bar
        const expYOffset = -panelHeight / 2 + 30 + statsToDisplay.length * 30; // Below last stat
        const expText = this.add.text(labelX, expYOffset, `EXP: ${petExp}/${nextLevelXP}`, {
            ...textStyle,
            fontSize: '14px',
            color: '#88ffff',
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
                // Pass necessary data back if needed, though MainMenu re-fetches context
                this.scene.start('MainMenu', { username: this.username }); 
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

        // Save level to context
        const globalContext = getGlobalContext();
        if (globalContext) {
            globalContext.selectLevel({
                id: this.generatedLevel.id,
                name: this.generatedLevel.name,
                difficulty: this.selectedDifficulty
            });
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
        this.petData = null; // Clear pet data reference
        this.generatedLevel = null;
        this.enemy = null;
    }
}