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
    }

    // Initialize with pet and username
    init(data) {
        console.log('LevelSelector init:', data);
        this.pet = data.pet || {
            key: 'fire_dragon',
            name: 'Ember',
            hp: 80,
            stamina: 50,
            energy: 70,
            level: 1
        };
        this.username = data.username || 'Player';
    }

    // Preload assets
    preload() {
        console.log('LevelSelector preloading assets');
        // Load possible backgrounds
        this.load.image('forest', '../public/assets/forest.png');
        this.load.image('iceland', '../public/assets/iceland.png');
        this.load.image('desert', '../public/assets/desert.png');
        // Load default background for difficulty selection
        this.load.image('background', '../public/assets/background.png');
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
                fontFamily: '"Pixelify Sans", cursive',
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
                    fontFamily: '"Pixelify Sans", cursive',
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

    // Display pet status
    setupPetStatus() {
        const { width, height } = this.scale;
        this.petStatusContainer = this.add.container(width * 0.15, height * 0.2).setDepth(2);

        this.petStatusContainer.add(
            this.add.rectangle(0, 0, 150, 120, 0x000000, 0.7)
                .setStrokeStyle(2, 0xffffff)
        );

        const stats = [
            { name: 'HP', value: this.pet.hp },
            { name: 'Stamina', value: this.pet.stamina },
            { name: 'Energy', value: this.pet.energy },
            { name: 'Level', value: this.pet.level }
        ];

        stats.forEach((stat, index) => {
            const yOffset = index * 25 - 40;
            const label = this.add.text(
                -60,
                yOffset,
                `${stat.name}:`,
                {
                    fontFamily: '"Pixelify Sans", cursive',
                    fontSize: '16px',
                    color: '#ffffff'
                }
            ).setOrigin(0, 0.5);

            const value = this.add.text(
                60,
                yOffset,
                `${stat.value}`,
                {
                    fontFamily: '"Pixelify Sans", cursive',
                    fontSize: '16px',
                    color: '#ffffff'
                }
            ).setOrigin(1, 0.5);

            this.petStatusContainer.add([label, value]);
        });
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
                fontFamily: '"Pixelify Sans", cursive',
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
                fontFamily: '"Pixelify Sans", cursive',
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
                fontFamily: '"Pixelify Sans", cursive',
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
                fontFamily: '"Pixelify Sans", cursive',
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
        if (this.pet.stamina < 10 || this.pet.energy < 10) {
            console.warn('Pet too tired or low energy');
            this.showError('Your pet is too tired or low on energy!');
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
                pet: this.pet,
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
                fontFamily: '"Pixelify Sans", cursive',
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
        if (this.generatedLevel) {
            this.setupLevelInfo();
            this.setupStartButton();
        }
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
    }
}