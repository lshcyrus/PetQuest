/*
    This is the first scene that the user will see when they first login
    It will ask for user's choice of pet
*/

import { Scene } from 'phaser';
import Phaser from 'phaser';
import { EventBus } from '../EventBus';
import { getGlobalContext } from '../../utils/contextBridge';
import { isMobileDevice, createTouchButton } from '../../utils/touchUtils';

export class FirstLogin extends Scene {
    constructor() {
        super('FirstLogin');
        this.selectedPetIndex = 0;
        this.pets = [
            {
                key: 'fire_dragon',
                name: 'Ember',
                description: 'A fiery dragon with a brave heart. Strong against ice enemies but weak to water.',
                stats: {
                    health: 80,
                    attack: 90,
                    defense: 60,
                    speed: 70
                }
            },
            {
                key: 'ice_dragon',
                name: 'Frosty',
                description: 'A frosty dragon with a cool demeanor. Strong against nature enemies but weak to fire.',
                stats: {
                    health: 100,
                    attack: 60,
                    defense: 90,
                    speed: 50
                }
            },
            // {
            //     key: 'nature_fox',
            //     name: 'Leafy',
            //     description: 'A swift forest fox with keen senses. Strong against water enemies but weak to fire.',
            //     stats: {
            //         health: 70,
            //         attack: 75,
            //         defense: 65,
            //         speed: 90
            //     }
            // }
        ];
    }

    init(data) {
        // Get username from previous scene or context
        const globalContext = getGlobalContext();
        if (globalContext) {
            this.username = globalContext.userData.username || 'Player';
        } else {
            this.username = data.username || 'Player';
        }
    }

    preload() {
        // Preload pet spritesheets if not already loaded
        if (!this.textures.exists('fire_dragon')) {
            this.load.spritesheet('fire_dragon', 'assets/fire_dragon/fire_dragon.png', { frameWidth: 640, frameHeight: 400 });
        }

        if (!this.textures.exists('ice_dragon')) {
            this.load.spritesheet('ice_dragon', 'assets/ice_dragon/ice_dragon.png', { frameWidth: 512, frameHeight: 512 });
        }
        
        // if (!this.textures.exists('nature_fox')) {
        //     this.load.spritesheet('nature_fox', 'assets/nature_fox/nature_fox.png', { frameWidth: 640, frameHeight: 400 });
        // }

        // Always ensure we have the arrow image (used for navigation)
        if (!this.textures.exists('arrow')) {
            this.load.image('arrow', 'assets/ui/arrow.png');
        }
    }

    create() {
        // Setup background with fade in
        this.cameras.main.fadeIn(800, 0, 0, 0);
        this.setupBackground();
        
        // Welcome message
        this.setupHeader();
        
        // Create animations for all pets
        this.createPetAnimations();
        
        // Create pet selection area
        this.setupPetSelection();
        
        // Create pet description and stats panel
        this.setupInfoPanel();
        
        // Create confirmation button
        this.setupConfirmButton();
        
        // Update UI with the first pet
        this.updatePetInfo();
        
        // Handle screen orientation and responsive layout
        this.scale.on('resize', this.onResize, this);
        const isPortrait = this.scale.height > this.scale.width;
        if (isPortrait) {
            this.setupPortraitLayout();
        } else {
            this.setupLandscapeLayout();
        }
        
        // Add mobile-specific optimizations if needed
        if (isMobileDevice()) {
            this.setupMobileUI();
        }
        
        // Let the React component know this scene is ready
        EventBus.emit('current-scene-ready', this);
    }

    createPetAnimations() {
        // Create animations for each pet type
        this.pets.forEach(pet => {
            // Only create the animation if it doesn't already exist
            if (!this.anims.exists(`${pet.key}_idle`)) {
                this.anims.create({
                    key: `${pet.key}_idle`,
                    frames: this.anims.generateFrameNumbers(pet.key, { start: 0, end: 3 }),
                    frameRate: 6,
                    repeat: -1
                });
            }
        });
    }

    setupBackground() {
        const { width, height } = this.scale;
        
        // Use a background image that fits the pet selection theme
        this.background = this.add.image(width / 2, height / 2, 'first-time-pet-selection');
        this.scaleToFit(this.background);
        
        // Add a semi-transparent overlay for better text readability
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
            .setOrigin(0.5)
            .setDepth(0);
    }

    setupHeader() {
        const { width } = this.scale;
        
        // Welcome header
        this.headerText = this.add.text(width / 2, 80, `Welcome, ${this.username}!`, {
            fontFamily: '"Pixelify Sans", cursive',
            fontSize: '48px',
            color: '#ffffff', 
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);
        
        // Selection prompt
        this.promptText = this.add.text(width / 2, 140, 'Choose your pet companion:', {
            fontFamily: '"Pixelify Sans", cursive',
            fontSize: '32px',
            color: '#ffffff',
            stroke: '#000000', 
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);
    }

    setupPetSelection() {
        const { width, height } = this.scale;
        
        // Container for pets
        this.petContainer = this.add.container(width / 2, height * 0.4);
        
        // Create pet sprites
        this.petSprites = [];
         
        // Add navigation arrows - using clear visual style for better UX
        const arrowOffset = 250;
        
        // Left arrow
        this.leftArrow = this.add.image(width / 2 - arrowOffset, height * 0.4, 'arrow')
            .setScale(1.25)
            .setAngle(-45)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.navigatePets(-1));
        
        // Right arrow
        this.rightArrow = this.add.image(width / 2 + arrowOffset, height * 0.4, 'arrow')
            .setScale(1.25)
            .setAngle(45)
            .setFlipX(true)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.navigatePets(1));
            
        // Create pet sprites and animations
        this.pets.forEach((pet, index) => {
            const sprite = this.add.sprite(0, 0, pet.key);
            
            // Play the animation - we already created all animations in createPetAnimations()
            sprite.play(`${pet.key}_idle`);
            
            // Scale appropriately
            const scale = 0.5;
            sprite.setScale(scale);
            
            // Hide all except the first one
            sprite.setVisible(index === this.selectedPetIndex);
            
            // Add to container
            this.petContainer.add(sprite);
            this.petSprites.push(sprite);
        });
        
        // Add pet name below the sprite
        this.petName = this.add.text(width / 2, height * 0.55, '', {
            fontFamily: '"Pixelify Sans", cursive',
            fontSize: '36px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center'
        }).setOrigin(0.5);

        // Add indicator for navigation
        this.pageIndicator = this.add.text(width / 2, height * 0.59, '', {
            fontFamily: '"Pixelify Sans", cursive',
            fontSize: '24px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        this.updatePageIndicator();
    }

    updatePageIndicator() {
        // Create dots for each pet, highlighting the current one
        let dots = '';
        for (let i = 0; i < this.pets.length; i++) {
            dots += i === this.selectedPetIndex ? '● ' : '○ ';
        }
        this.pageIndicator.setText(dots.trim());
    }

    setupInfoPanel() {
        const { width, height } = this.scale;
        
        // Create panel background
        const panelWidth = width * 0.8;
        const panelHeight = height * 0.25;
        const panelX = width / 2;
        const panelY = height * 0.75;
        
        // Panel background
        this.infoPanel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x000000, 0.7)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0xffffff);
        
        // Description text
        this.descriptionText = this.add.text(
            width / 2, 
            height * 0.68, 
            '', 
            {
                fontFamily: '"Pixelify Sans", cursive',
                fontSize: '20px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: panelWidth - 40 }
            }
        ).setOrigin(0.5);
        
        // Stats container
        this.statsContainer = this.add.container(width / 2, height * 0.78);
        
        // Stats panel background for landscape mode
        this.statsPanel = this.add.rectangle(0, 0, 300, 180, 0x000000, 0.7)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0xffffff);
        this.statsContainer.add(this.statsPanel);
        
        // Stats title
        const statsTitle = this.add.text(0, -75, 'PET STATS', {
            fontFamily: '"Pixelify Sans", cursive',
            fontSize: '22px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.statsContainer.add(statsTitle);
        
        // Create stat bars
        const statNames = ['Health', 'Attack', 'Defense', 'Speed'];
        this.statBars = {};
        
        statNames.forEach((stat, index) => {
            const yOffset = index * 30;
            const x = -30;
            const y = yOffset - 40;
            
            // Label
            const label = this.add.text(x - 100, y, stat, {
                fontFamily: '"Pixelify Sans", cursive',
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(0, 0.5);
            
            // Bar background
            const barBg = this.add.rectangle(x, y, 140, 15, 0x333333)
                .setOrigin(0, 0.5);
                
            // Bar fill
            const barFill = this.add.rectangle(x, y, 0, 15, this.getStatColor(stat))
                .setOrigin(0, 0.5);
                
            // Value text
            const valueText = this.add.text(x + 150, y, '', {
                fontFamily: '"Pixelify Sans", cursive',
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(0, 0.5);
                
            // Add to container
            this.statsContainer.add([label, barBg, barFill, valueText]);
            
            // Store reference to update later
            this.statBars[stat.toLowerCase()] = {
                fill: barFill,
                text: valueText
            };
        });
    }

    setupConfirmButton() {
        const { width, height } = this.scale;
        
        // Create confirm button
        this.confirmButton = this.add.container(width / 2, height * 0.88);
        
        // Button background
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonBg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x4a9e2f)
            .setStrokeStyle(3, 0xffffff)
            .setOrigin(0.5);
            
        // Button text
        const buttonText = this.add.text(0, 0, 'CONFIRM', {
            fontFamily: '"Pixelify Sans", cursive',
            fontSize: '28px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Add to container
        this.confirmButton.add([buttonBg, buttonText]);
        
        // Make interactive
        this.confirmButton.setSize(buttonWidth, buttonHeight)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => buttonBg.setFillStyle(0x5abe3b))
            .on('pointerout', () => buttonBg.setFillStyle(0x4a9e2f))
            .on('pointerdown', () => {
                buttonBg.setFillStyle(0x377f20);
                this.confirmPetSelection();
            });
            
        // Add visual feedback with pulsing animation
        this.tweens.add({
            targets: this.confirmButton,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
    
    navigatePets(direction) {
        // Play button click sound if available
        if (this.sound.get('click')) {
            this.sound.play('click');
        }
        
        // Hide current pet
        this.petSprites[this.selectedPetIndex].setVisible(false);
        
        // Update index with wrapping
        this.selectedPetIndex = (this.selectedPetIndex + direction + this.pets.length) % this.pets.length;
        
        // Show new pet
        this.petSprites[this.selectedPetIndex].setVisible(true);
        
        // Update info
        this.updatePetInfo();
        
        // Update pagination dots
        this.updatePageIndicator();
    }
    
    updatePetInfo() {
        const currentPet = this.pets[this.selectedPetIndex];
        
        // Update pet name
        this.petName.setText(currentPet.name);
        
        // Update description
        this.descriptionText.setText(currentPet.description);
        
        // Update stats
        const stats = currentPet.stats;
        
        // Animate stats bars
        for (const [statName, value] of Object.entries(stats)) {
            const bar = this.statBars[statName];
            if (bar) {
                // Animate the bar fill
                this.tweens.add({
                    targets: bar.fill,
                    width: value * 1.4, // Scale to fit the 140px bar
                    duration: 400,
                    ease: 'Power2'
                });
                
                // Update text value
                bar.text.setText(`${value}`);
            }
        }
    }
    
    confirmPetSelection() {
        const selectedPet = this.pets[this.selectedPetIndex];
        
        // Get global context
        const globalContext = getGlobalContext();
        if (globalContext) {
            // Save selected pet to global context
            globalContext.selectPet(selectedPet);
            
            // Set first-time flag to false
            globalContext.isFirstLogin = false;
            
            // Save to localStorage for persistence
            localStorage.setItem('petquest_selected_pet', JSON.stringify(selectedPet));
            localStorage.setItem('petquest_has_selected_pet', 'true');
            
            console.log(`Selected pet: ${selectedPet.name}`);
        }
        
        // Transition to next scene with fade
        this.cameras.main.fadeOut(800, 0, 0, 0);
        
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Go to the main menu
            this.scene.start('MainMenu', { firstLogin: true });
        });
    }
    
    getStatColor(stat) {
        // Different colors for different stats
        switch(stat.toLowerCase()) {
            case 'health': return 0xff5555;
            case 'attack': return 0xff9900;
            case 'defense': return 0x3399ff;
            case 'speed': return 0x55ff55;
            default: return 0xffffff;
        }
    }
    
    scaleToFit(gameObject) {
        const { width, height } = this.scale;
        const scaleX = width / gameObject.width;
        const scaleY = height / gameObject.height;
        const scale = Math.max(scaleX, scaleY);
        gameObject.setScale(scale).setScrollFactor(0);
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
            // Adjust description text word wrap for portrait
            this.descriptionText.setWordWrapWidth(width * 0.8);
        } else {
            this.setupLandscapeLayout();
            // Adjust description text word wrap for landscape
            this.descriptionText.setWordWrapWidth(width * 0.5);
        }
        
        // Update current pet info to adjust stat bars
        this.updatePetInfo();
    }
    
    setupPortraitLayout() {
        const { width, height } = this.scale;
        
        // Header at the top
        this.headerText.setPosition(width / 2, 60);
        this.promptText.setPosition(width / 2, 110);
        
        // Pet in the center
        this.petContainer.setPosition(width / 2, height * 0.35);
        this.petName.setPosition(width / 2, height * 0.5);
        this.pageIndicator.setPosition(width / 2, height * 0.54);
        
        // Navigation arrows
        this.leftArrow.setPosition(width / 2 - 180, height * 0.35);
        this.rightArrow.setPosition(width / 2 + 180, height * 0.35);
        
        // Description at the bottom
        this.infoPanel.setSize(width * 0.9, height * 0.2);
        this.infoPanel.setPosition(width / 2, height * 0.72);
        this.descriptionText.setPosition(width / 2, height * 0.68);
        
        // Stats stay below description in portrait mode
        this.statsContainer.setPosition(width / 2, height * 0.75);
        
        // Confirm button at bottom right
        this.confirmButton.setPosition(width * 0.75, height * 0.87);
    }
    
    setupLandscapeLayout() {
        const { width, height } = this.scale;
        
        // Header at the top
        this.headerText.setPosition(width / 2, height * 0.1);
        this.promptText.setPosition(width / 2, height * 0.17);
        
        // Pet in the center
        this.petContainer.setPosition(width / 2, height * 0.45);
        this.petName.setPosition(width / 2, height * 0.65);
        this.pageIndicator.setPosition(width / 2, height * 0.7);
        
        // Navigation arrows
        this.leftArrow.setPosition(width / 2 - 250, height * 0.45);
        this.rightArrow.setPosition(width / 2 + 250, height * 0.45);
        
        // Stats on the left side
        this.statsContainer.setPosition(width * 0.1, height * 0.5);
        
        // Description at the bottom
        this.infoPanel.setSize(width * 0.6, height * 0.2);
        this.infoPanel.setPosition(width / 2, height * 0.85);
        this.descriptionText.setPosition(width / 2, height * 0.85);
        
        // Confirm button at bottom right
        this.confirmButton.setPosition(width * 0.9, height * 0.9);
    }
    
    setupMobileUI() {
        // Add swipe support
        this.input.on('pointerdown', this.startSwipe, this);
        this.input.on('pointerup', this.endSwipe, this);
        
        // Add skip button
        this.skipButton = createTouchButton(
            this,
            this.scale.width - 80,
            40,
            'Skip',
            { fontSize: '18px' },
            () => this.confirmPetSelection()
        );
    }
    
    startSwipe(pointer) {
        this.swipeStartX = pointer.x;
    }
    
    endSwipe(pointer) {
        const swipeThreshold = 50;
        const swipeDistance = pointer.x - this.swipeStartX;
        
        if (Math.abs(swipeDistance) > swipeThreshold) {
            // Determine direction (negative = right, positive = left)
            const direction = swipeDistance > 0 ? -1 : 1;
            this.navigatePets(direction);
        }
    }
}
