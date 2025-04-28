import { Scene } from 'phaser';
import { EventBus } from '../EventBus';

export class Quests extends Scene
{
    constructor()
    {
        super('Quests');
    }

    create()
    {
        // Setup background
        this.setupBackground();
        
        // Setup header
        this.setupHeader();
        
        // Setup quest list
        this.setupQuestList();
        
        // Setup back button
        this.setupBackButton();
        
        // Handle responsive layout
        this.scale.on('resize', this.onResize, this);
        const isPortrait = this.scale.height > this.scale.width;
        if (isPortrait) {
            this.setupPortraitLayout();
        } else {
            this.setupLandscapeLayout();
        }
        
        EventBus.emit('current-scene-ready', this);
    }

    setupBackground() {
        const { width, height } = this.scale;
        const centerX = width * 0.5;
        const centerY = height * 0.5;

        this.background = this.add.image(centerX, centerY, 'background');
        this.scaleToFit(this.background);
        this.background.setDepth(0);
    }

    setupHeader() {
        const { width, height } = this.scale;
        
        // Title text
        this.headerText = this.add.text(
            width / 2,
            height * 0.1,
            'Available Quests',
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: this.getResponsiveFontSize(4, 'em'),
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 5
            }
        ).setOrigin(0.5);
    }

    setupQuestList() {
        const { width, height } = this.scale;
        
        // Create a container for quests
        this.questContainer = this.add.container(width / 2, height * 0.5);
        
        // Example quests (replace with actual quest data)
        const quests = [
            {
                title: 'Forest Adventure',
                description: 'Explore the mysterious forest and collect rare items',
                reward: '100 coins',
                level: 1
            },
            {
                title: 'Mountain Expedition',
                description: 'Climb the treacherous mountains to find hidden treasures',
                reward: '200 coins',
                level: 2
            },
            {
                title: 'Ocean Discovery',
                description: 'Dive into the deep ocean to uncover ancient secrets',
                reward: '300 coins',
                level: 3
            }
        ];

        // Create quest cards
        quests.forEach((quest, index) => {
            const cardY = (index - 1) * 150; // Space between cards
            
            // Card background
            const cardBg = this.add.rectangle(0, cardY, width * 0.8, 120, 0x000000, 0.7)
                .setStrokeStyle(2, 0xffffff)
                .setOrigin(0.5);
            
            // Quest title
            const titleText = this.add.text(-width * 0.35, cardY - 40, quest.title, {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '24px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0, 0.5);
            
            // Quest description
            const descText = this.add.text(-width * 0.35, cardY, quest.description, {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '16px',
                color: '#cccccc',
                wordWrap: { width: width * 0.6 }
            }).setOrigin(0, 0.5);
            
            // Quest reward
            const rewardText = this.add.text(-width * 0.35, cardY + 40, `Reward: ${quest.reward}`, {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#ffd700'
            }).setOrigin(0, 0.5);
            
            // Level requirement
            const levelText = this.add.text(width * 0.35, cardY - 40, `Level ${quest.level}`, {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '20px',
                color: '#4a9e2f'
            }).setOrigin(1, 0.5);
            
            // Add all elements to container
            this.questContainer.add([cardBg, titleText, descText, rewardText, levelText]);
            
            // Make card interactive
            cardBg.setInteractive({ useHandCursor: true })
                .on('pointerover', () => {
                    cardBg.setFillStyle(0x333333, 0.7);
                    this.tweens.add({
                        targets: cardBg,
                        scaleX: 1.02,
                        scaleY: 1.02,
                        duration: 200
                    });
                })
                .on('pointerout', () => {
                    cardBg.setFillStyle(0x000000, 0.7);
                    this.tweens.add({
                        targets: cardBg,
                        scaleX: 1,
                        scaleY: 1,
                        duration: 200
                    });
                })
                .on('pointerdown', () => {
                    this.startQuest(quest);
                });
        });
    }

    setupBackButton() {
        const { width, height } = this.scale;
        
        // Create back button container
        this.backButtonContainer = this.add.container(width * 0.1, height * 0.1);
        
        // Create back button
        const buttonWidth = 150;
        const buttonHeight = 50;
        
        // Button background
        const buttonBg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x4a9e2f)
            .setStrokeStyle(2, 0xffffff)
            .setOrigin(0.5);
            
        // Button text
        const buttonText = this.add.text(0, 0, 'BACK', {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        
        // Add elements to container
        this.backButtonContainer.add([buttonBg, buttonText]);
        
        // Make button interactive
        buttonBg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => buttonBg.setFillStyle(0x5abe3b))
            .on('pointerout', () => buttonBg.setFillStyle(0x4a9e2f))
            .on('pointerdown', () => {
                buttonBg.setFillStyle(0x377f20);
                this.scene.start('MainMenu');
            });
    }

    setupPortraitLayout() {
        const { width, height } = this.scale;
        
        // Adjust header position
        this.headerText.setPosition(width / 2, height * 0.1);
        
        // Adjust quest container position
        this.questContainer.setPosition(width / 2, height * 0.5);
        
        // Adjust back button position
        if (this.backButtonContainer) {
            this.backButtonContainer.setPosition(width * 0.1, height * 0.1);
        }
    }

    setupLandscapeLayout() {
        const { width, height } = this.scale;
        
        // Adjust header position
        this.headerText.setPosition(width / 2, height * 0.15);
        
        // Adjust quest container position
        this.questContainer.setPosition(width / 2, height * 0.5);
        
        // Adjust back button position
        if (this.backButtonContainer) {
            this.backButtonContainer.setPosition(width * 0.1, height * 0.15);
        }
    }

    onResize(gameSize) {
        const { width, height } = gameSize;
        
        // Reposition and rescale background
        if (this.background) {
            this.scaleToFit(this.background);
        }
        
        // Adjust UI for orientation
        const isPortrait = height > width;
        if (isPortrait) {
            this.setupPortraitLayout();
        } else {
            this.setupLandscapeLayout();
        }
    }

    scaleToFit(gameObject) {
        const { width, height } = this.scale;
        const scaleX = width / gameObject.width;
        const scaleY = height / gameObject.height;
        const scale = Math.max(scaleX, scaleY);
        gameObject.setScale(scale).setScrollFactor(0);
    }

    getResponsiveFontSize(baseSize, unit = 'px') {
        const { width, height } = this.scale;
        const baseWidth = 1280;
        const scaleFactor = Math.min(width / baseWidth, 1.5);
        const minScale = 0.5;
        const finalScale = Math.max(scaleFactor, minScale);
        return `${baseSize * finalScale}${unit}`;
    }

    startQuest(quest) {
        // Transition to the appropriate level scene
        this.scene.start('LevelTransition', {
            level: quest.level,
            nextScene: 'Game'
        });
    }
}

