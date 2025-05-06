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
                key: 'badger',
                name: 'Badger',
                description: 'A badger with a sharp sense of smell.',
                stats: {
                    hp: 500,
                    sp: 100,    
                    atk: 120,
                    def: 100
                }
            },
            {
                key: 'dino_rex',
                name: 'Dino Rex',
                description: 'A dinosaur that is a bit more aggressive.',
                stats: {
                    hp: 550,
                    sp: 50,    
                    atk: 180,
                    def: 160
                }
            },
            {
                key: 'dino_tri',
                name: 'Dino Tri',
                description: 'A dinosaur that is acutally cuter than the other ones.',
                stats: {
                    hp: 550,
                    sp: 80,    
                    atk: 120,
                    def: 200
                }
            },
            {
                key: 'frogger',
                name: 'Frogger',
                description: 'A frog that can jump high.',
                stats: {
                    hp: 400,
                    sp: 100,    
                    atk: 250,
                    def: 100
                }
            },
            {
                key: 'pengu',
                name: 'Pengu',
                description: 'A penguin that can swim in the water.',
                stats: {
                    hp: 500,
                    sp: 100,    
                    atk: 160,
                    def: 90
                }
            }
        ];
    }

    init() {
        // Get username from context
        const globalContext = getGlobalContext();
        if (globalContext) {
            this.username = globalContext.userData.username || 'Player';
        }
    }

    preload() {
        // Preload pet spritesheets if not already loaded
        this.load.spritesheet('badger', 'assets/Pet_Badger/badger_idle.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('dino_rex', 'assets/Pet_Dino Rex/dino_rex_idle.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('dino_tri', 'assets/Pet_Dino Tri/dino_tri_idle.png', { frameWidth: 384, frameHeight: 128 });
        this.load.spritesheet('frogger', 'assets/Pet_Frogger/frogger_idle.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('pengu', 'assets/Pet_Pengu/pengu_idle.png', { frameWidth: 128, frameHeight: 128 });

        // Load the GIF background
        this.load.image('pet-selection-bg', 'assets/backgrounds/pet-selection.gif');

        this.load.image('arrow-left', 'assets/UI/arrow-left.png');
        this.load.image('arrow-right', 'assets/UI/arrow-right.png');
        
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
            
            
            if (!this.anims.exists(`${pet.key}_idle`)) {
                this.anims.create({
                    key: `${pet.key}_idle`,
                    frames: this.anims.generateFrameNumbers(pet.key, { start: 0, end: 4 }),
                    frameRate: 6,
                    repeat: -1
                });
            }
        });
    }

    setupBackground() {
        const { width, height } = this.scale;
        
        // Use the loaded GIF as the background image
        this.background = this.add.image(width / 2, height / 2, 'pet-selection-bg');
        this.scaleToFit(this.background);
        
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
            .setOrigin(0.5)
            .setDepth(0);
    }

    setupHeader() {
        const { width } = this.scale;
        
        // Welcome header
        this.headerText = this.add.text(width / 2, 80, `Welcome, ${this.username}!`, {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '48px',
            color: '#ffffff', 
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5);
        
        // Selection prompt
        this.promptText = this.add.text(width / 2, 140, 'Choose your pet companion:', {
            fontFamily: '"Silkscreen", cursive',
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
        this.petContainer = this.add.container(width / 2, height * 0.3);
        
        // Create pet sprites
        this.petSprites = [];
         
        // Add navigation arrows
        const arrowOffset = 300;
        
        // Left arrow
        this.leftArrow = this.add.image(width / 2 - arrowOffset, height * 0.4, 'arrow-left')
            .setScale(3)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.navigatePets(-1));
        
        // Right arrow
        this.rightArrow = this.add.image(width / 2 + arrowOffset, height * 0.4, 'arrow-right')
            .setScale(3)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.navigatePets(1));
            
        // Create pet sprites and animations
        this.pets.forEach((pet, index) => {
            const sprite = this.add.sprite(0, 0, pet.key);  
            
            // Play the animation
            sprite.play(`${pet.key}_idle`);
            
            const scale = 1.2;
            sprite.setScale(scale);
            
            // Hide all except the first one
            sprite.setVisible(index === this.selectedPetIndex);
            
            // Add to container
            this.petContainer.add(sprite);
            this.petSprites.push(sprite);
        });
        
        // Add pet name below the sprite
        this.petName = this.add.text(width / 2, height * 0.55, '', {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '36px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 5,
            align: 'center'
        }).setOrigin(0.5);

        // Add indicator for navigation
        this.pageIndicator = this.add.text(width / 2, height * 0.59, '', {
            fontFamily: '"Silkscreen", cursive',
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
        
        // Create panel background (no border, no semi-transparent background)
        const panelWidth = width * 0.8;
        const panelHeight = height * 0.25;
        const panelX = width / 2;
        const panelY = height * 0.75;
        // Remove background and border for infoPanel
        this.infoPanel = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x000000, 0)
            .setOrigin(0.5);
        
        // Description text
        this.descriptionText = this.add.text(
            width / 2, 
            height * 0.68, 
            '', 
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '20px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: panelWidth - 40 }
            }
        ).setOrigin(0.5);
        
        // Add name input label
        this.nameLabel = this.add.text(
            width / 2 - 150,
            height * 0.64,
            'Name your pet:',
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '22px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0, 0.5);
        
        // Create custom name input field
        // Use DOM Element since Phaser doesn't have native input fields
        try {
            this.nameInput = this.add.dom(width / 2 + 50, height * 0.64, 'input')
                .setOrigin(0, 0.5)
                .setScale(1)
                .setInteractive();
                
            // Style the input field
            const inputElement = this.nameInput.node;
            inputElement.style.width = '200px';
            inputElement.style.height = '36px';
            inputElement.style.fontSize = '20px';
            inputElement.style.padding = '4px 10px';
            inputElement.style.borderRadius = '8px';
            inputElement.style.border = '2px solid #4a9e2f';
            inputElement.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
            inputElement.style.color = 'white';
            inputElement.style.outline = 'none';
            inputElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
            inputElement.maxLength = 20; // Limit name length
            inputElement.placeholder = this.pets[this.selectedPetIndex].name; // Set placeholder to default name
        } catch (error) {
            console.error('Error creating DOM input element:', error);
            // Fallback: Use Phaser text as input
            this.createFallbackInput(width / 2 + 50, height * 0.64);
        }
        
        // Stats container
        this.statsContainer = this.add.container(width / 2, height * 0.78);
        
        // Stats panel background for landscape mode (no border, no semi-transparent background)
        this.statsPanel = this.add.rectangle(0, 0, 300, 180, 0x000000, 0)
            .setOrigin(0.5);
        this.statsContainer.add(this.statsPanel);
        
        // Stats title
        const statsTitle = this.add.text(0, -75, 'PET STATS', {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '22px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.statsContainer.add(statsTitle);
        
        // Create stat bars for hp, sp, atk, def
        const statNames = [
            { key: 'hp', label: 'HP' },
            { key: 'sp', label: 'SP' },
            { key: 'atk', label: 'ATK' },
            { key: 'def', label: 'DEF' }
        ];
        this.statBars = {};
        
        statNames.forEach((stat, index) => {
            const yOffset = index * 30;
            const x = -30;
            const y = yOffset - 40;
            // Label
            const label = this.add.text(x - 100, y, stat.label, {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(0, 0.5);
            // Bar background
            const barBg = this.add.rectangle(x, y, 140, 15, 0x333333)
                .setOrigin(0, 0.5);
            // Bar fill
            const barFill = this.add.rectangle(x, y, 0, 15, this.getStatColor(stat.key))
                .setOrigin(0, 0.5);
            // Value text
            const valueText = this.add.text(x + 150, y, '', {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '16px',
                color: '#ffffff'
            }).setOrigin(0, 0.5);
            // Add to container
            this.statsContainer.add([label, barBg, barFill, valueText]);
            // Store reference to update later
            this.statBars[stat.key] = {
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
            fontFamily: '"Silkscreen", cursive',
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
        // Set default name in the input field if it's empty
        const inputElement = this.nameInput.node;
        if (!inputElement.value) {
            inputElement.value = '';
        }
        inputElement.placeholder = currentPet.name;
        // Update description
        this.descriptionText.setText(currentPet.description);
        // Update stats
        const stats = currentPet.stats;
        // Define stat maximums for bar ratio
        const statMax = { hp: 5000, sp: 1000, atk: 400, def: 400 };
        // Animate stats bars
        for (const statKey of ['hp', 'sp', 'atk', 'def']) {
            const value = stats[statKey];
            const bar = this.statBars[statKey];
            if (bar) {
                // Calculate bar width based on max
                const max = statMax[statKey] || 100;
                const width = Math.max(0, Math.min(1, value / max)) * 140;
                this.tweens.add({
                    targets: bar.fill,
                    width: width,
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
        // Get custom name from input field
        const customName = this.nameInput.node.value.trim();
        // Validate name - if empty, use default pet name
        const petName = customName || selectedPet.name;
        // Get global context
        const globalContext = getGlobalContext();
        if (globalContext) {
            // Always send a deep copy of the default stats for the selected pet
            const statsCopy = JSON.parse(JSON.stringify(selectedPet.stats));
            this.createAndSelectPet({ ...selectedPet, stats: statsCopy }, petName, globalContext);
        }
        // Transition to next scene with fade
        this.cameras.main.fadeOut(800, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Go to the main menu
            this.scene.start('MainMenu', { firstLogin: true });
        });
    }

    async createAndSelectPet(petData, customName, globalContext) {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.log('No token found, cannot create pet');
                return;
            }

            const API_URL = import.meta.env.VITE_API_URL;
            
            console.log('Sending pet data to server:', { 
                name: customName, 
                key: petData.key 
            });
            
            // Create a new pet on the server with the selected name, key, and stats
            const response = await fetch(`${API_URL}/pets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: customName,
                    key: petData.key, // Send the key to the backend
                    stats: petData.stats, // Send the full stats object
                    currentHP: petData.stats.hp, // Initialize currentHP to max HP
                    currentSP: petData.stats.sp  // Initialize currentSP to max SP
                })
            });
            
            const responseData = await response.json();
            
            if (!response.ok) {
                console.error('Failed to create pet. Status:', response.status);
                console.error('Response data:', responseData);
                
                // If the user already has a pet, we can try to get it
                if (responseData.error === 'You already have a pet') {
                    console.log('User already has a pet, fetching existing pets');
                    
                    // Get user's pets
                    const petsResponse = await fetch(`${API_URL}/pets`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    const petsData = await petsResponse.json();
                    
                    if (petsResponse.ok && petsData.success && petsData.data && petsData.data.length > 0) {
                        console.log('Found existing pets:', petsData.data);
                        // Use the first pet
                        let existingPet = petsData.data[0];
                        // Do NOT overwrite backend stats with frontend stats
                        existingPet.key = existingPet.key || petData.key; // Use existing key or fallback to selected one
                        // Update the global context with the existing pet
                        globalContext.updateUserData({
                            selectedPet: existingPet,
                            hasSelectedPet: true,
                            isFirstLogin: false
                        });
                        console.log('Updated global context with existing pet:', existingPet);
                        return;
                    } else {
                        console.error('Failed to fetch existing pets:', petsData);
                    }
                }
                
                return;
            }
            
            console.log('Pet created successfully:', responseData.data);
            
            // Get the created pet data from the server response
            let createdPet;
            if (responseData.data.pet) {
                createdPet = responseData.data.pet;
                console.log('Pet data from server (nested):', createdPet);
            } else if (responseData.data) {
                createdPet = responseData.data;
                console.log('Pet data from server (direct):', createdPet);
            } else {
                console.error('No pet data found in response:', responseData);
                return;
            }
            
            // Add the frontend data to the backend pet for rendering
            if (createdPet) {
                // Do NOT overwrite backend stats with frontend stats
                // The key is already included in the pet data from the server
                globalContext.updateUserData({
                    selectedPet: createdPet,
                    hasSelectedPet: true,
                    isFirstLogin: false
                });
                console.log('Updated global context with pet:', createdPet);
            }
            
        } catch (error) {
            console.error('Error creating pet:', error.message);
            console.error('Error stack:', error.stack);
        }
    }
    
    getStatColor(stat) {
        // Different colors for different stats
        switch(stat.toLowerCase()) {
            case 'hp': return 0x55ff55;
            case 'sp': return 0x3399ff;
            case 'atk': return 0xff5555;
            case 'def': return 0xff9900;
            
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
        this.petContainer.setPosition(width / 2, height * 0.3);
        this.petName.setPosition(width / 2, height * 0.4);
        this.pageIndicator.setPosition(width / 2, height * 0.5);
        
        // Navigation arrows
        this.leftArrow.setPosition(width / 2 - 180, height * 0.35);
        this.rightArrow.setPosition(width / 2 + 180, height * 0.35);
        
        // Name input
        this.nameLabel.setPosition(width / 2 - 150, height * 0.65);
        this.nameInput.setPosition(width / 2 + 50, height * 0.65);
        
        // Description at the bottom
        this.infoPanel.setSize(width * 0.9, height * 0.25);
        this.infoPanel.setPosition(width / 2, height * 0.75);
        this.descriptionText.setPosition(width / 2, height * 0.7);
        
        // Stats stay below description in portrait mode
        this.statsContainer.setPosition(width / 2, height * 0.8);
        
        // Confirm button at bottom right
        this.confirmButton.setPosition(width * 0.75, height * 0.92);
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
        
        // Name input - position above description
        this.nameLabel.setPosition(width / 2 - 200, height * 0.74);
        this.nameInput.setPosition(width / 2 + 30, height * 0.74);
        
        // Stats on the left side
        this.statsContainer.setPosition(width * 0.1, height * 0.5);
        
        // Description at the bottom
        this.infoPanel.setSize(width * 0.6, height * 0.25);
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

    createFallbackInput(x, y) {
        // Create a background rectangle for the input field
        const inputBg = this.add.rectangle(x, y, 200, 36, 0x000000, 0.85)
            .setOrigin(0, 0.5)
            .setStrokeStyle(2, 0x4a9e2f)
            .setDepth(2);
        // Create text for the input
        const currentPet = this.pets[this.selectedPetIndex];
        this.nameInput = this.add.text(x + 10, y, '', {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '20px',
            color: '#ffffff',
            fixedWidth: 180,
            backgroundColor: 'rgba(0,0,0,0)',
            padding: { left: 8, right: 8, top: 4, bottom: 4 }
        }).setOrigin(0, 0.5).setDepth(3);
        this.nameInput.setText('');
        this.nameInput.node = {
            value: '',
            style: {},
            placeholder: currentPet.name
        };
        // Show placeholder visually
        this.nameInput.setText(currentPet.name);
        this.nameInput.setAlpha(0.5);
        // Make interactive to allow "typing"
        inputBg.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.showVirtualKeyboard());
        this.nameInput.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.showVirtualKeyboard());
    }
    
    showVirtualKeyboard() {
        const { width, height } = this.scale;
        // Create overlay
        const overlay = this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.7)
            .setOrigin(0)
            .setDepth(100)
            .setInteractive();
        // Create dialog
        const dialog = this.add.rectangle(width / 2, height / 2, 400, 180, 0x333333)
            .setStrokeStyle(2, 0xffffff)
            .setDepth(101);
        // Title
        const title = this.add.text(width / 2, height / 2 - 60, 'Enter Pet Name', {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '24px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5)
          .setDepth(101);
        // Input field
        const inputBg = this.add.rectangle(width / 2, height / 2, 300, 40, 0x000000)
            .setStrokeStyle(2, 0x4a9e2f)
            .setDepth(101);
        let inputText = this.add.text(width / 2, height / 2, this.nameInput.node.value || this.nameInput.node.placeholder, {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '20px',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5)
          .setDepth(101);
        inputText.setAlpha(this.nameInput.node.value ? 1 : 0.5);
        // Buttons
        const okButton = this.add.rectangle(width / 2 + 80, height / 2 + 60, 120, 40, 0x008800)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .setDepth(101);
        const okText = this.add.text(width / 2 + 80, height / 2 + 60, 'OK', {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5)
          .setDepth(101);
        const cancelButton = this.add.rectangle(width / 2 - 80, height / 2 + 60, 120, 40, 0x880000)
            .setStrokeStyle(2, 0xffffff)
            .setInteractive({ useHandCursor: true })
            .setDepth(101);
        const cancelText = this.add.text(width / 2 - 80, height / 2 + 60, 'CANCEL', {
            fontFamily: '"Silkscreen", cursive',
            fontSize: '20px',
            color: '#ffffff'
        }).setOrigin(0.5)
          .setDepth(101);
        // Simple input: use prompt for now, but update the fallback visually
        const newName = prompt('Enter your pet name:', this.nameInput.node.value || this.nameInput.node.placeholder);
        if (newName && newName.trim()) {
            // Update the value
            this.nameInput.node.value = newName.trim().substring(0, 20);
            this.nameInput.setText(this.nameInput.node.value);
            this.nameInput.setAlpha(1);
        } else {
            // If empty, show placeholder
            this.nameInput.setText(this.nameInput.node.placeholder);
            this.nameInput.setAlpha(0.5);
        }
        // Remove dialog immediately since we used prompt
        overlay.destroy();
        dialog.destroy();
        title.destroy();
        inputBg.destroy();
        inputText.destroy();
        okButton.destroy();
        okText.destroy();
        cancelButton.destroy();
        cancelText.destroy();
    }
}
