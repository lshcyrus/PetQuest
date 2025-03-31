import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import Phaser from 'phaser';
import { getGlobalContext } from '../../utils/contextBridge';

export class MainMenu extends Scene {
    logoTween;
    background;
    pet;
    username;

    constructor() {
        super('MainMenu');
    }

    init(data) {
        // Get context data
        const globalContext = getGlobalContext();
        if (globalContext) {
            this.username = globalContext.userData.username || 'Player';
            this.petData = globalContext.userData.selectedPet;
            
            // Log which pet is being loaded
            if (this.petData) {
                console.log(`Loading pet in MainMenu: ${this.petData.name}`);
            } else {
                console.warn('No pet data found in MainMenu');
            }
        } else {
            // Fallback if context is not available
            this.username = data.username || 'Player';
        }
    }

    create() {
        this.setupBackground();
        this.setupUI();
        this.setupPet();
        
        // Check initial orientation and setup UI accordingly
        const width = this.scale.width;
        const height = this.scale.height;
        const isPortrait = height > width;
        
        // Apply appropriate layout based on orientation
        if (isPortrait) {
            this.setupPortraitLayout();
        } else {
            this.setupLandscapeLayout();
        }
        
        EventBus.emit('current-scene-ready', this);
    }

    // method for setting up the background
    setupBackground() {
        const { width, height } = this.scale;
        const centerX = width * 0.5;
        const centerY = height * 0.5;
        
        this.background = this.add.image(centerX, centerY, 'background');
        this.scaleToFit(this.background);
        this.background.setDepth(0);
    }

    // method for setting up the user interface for the main menu
    setupUI() {
        const { width, height } = this.scale;
        const centerX = width * 0.5;
        
        // Welcome message - set to much larger size
        const welcomeText = this.add.text(
            centerX, 
            height * 0.05, 
            `Welcome back, ${this.username}!`, 
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: this.getResponsiveFontSize(4, 'em'),
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 5
            }
        )
        welcomeText.setOrigin(0.5, 0);
        
        // Create a button for starting the game
        const buttonWidth = Math.min(width * 0.4, 200);
        const buttonHeight = 60;
        const buttonX = centerX;
        const buttonY = height * 0.6;
        
        // Draw button
        const button = this.add.graphics();
        button.fillRoundedRect(
            buttonX - buttonWidth/2, 
            buttonY - buttonHeight/2, 
            buttonWidth, 
            buttonHeight, 
            16
        );
        button.strokeRoundedRect(
            buttonX - buttonWidth/2, 
            buttonY - buttonHeight/2, 
            buttonWidth, 
            buttonHeight, 
            16
        );
        button.setInteractive(new Phaser.Geom.Rectangle(
            buttonX - buttonWidth/2,
            buttonY - buttonHeight/2,
            buttonWidth,
            buttonHeight
        ), Phaser.Geom.Rectangle.Contains);
        
        // Button text - much larger size
        const buttonText = this.add.text(
            buttonX,
            buttonY,
            'START GAME',
            {
                fontFamily: '"Silkscreen", cursive',
                fontSize: this.getResponsiveFontSize(3, 'rem'),
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: Math.min(8, Math.max(4, width / 100))
            }
        )
        buttonText.setOrigin(0.5);
        
        // Button text animation
        this.tweens.add({
            targets: buttonText,
            scale: 1.1,
            yoyo: true,
            repeat: -1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });
        
        button.on('pointerdown', () => {
            // Add click animation
            this.tweens.add({
                targets: buttonText,
                scale: 0.9,
                duration: 100,
                yoyo: true,
                onComplete: () => this.changeScene()
            });
        });
        
        // Store UI elements
        this.ui = { welcomeText, button, buttonText };
    }

    // method for setting up the pet sprite
    setupPet() {
        const { width, height } = this.scale;
        const centerX = width * 0.5;
        
        let petKey = 'fire_dragon'; // Default pet
        
        // Get pet key from server data if available
        if (this.petData && this.petData.key) {
            console.log('Pet data from server:', this.petData);
            petKey = this.petData.key;
        }
        
        console.log('Using pet key:', petKey);
        
        // Create pet sprite with the correct key
        this.pet = this.add.sprite(centerX, height * 0.8, petKey);
        
        // Create pet-specific idle animation key
        const animKey = `${petKey}_idle`;
        
        // Check if the animation exists already
        if (!this.anims.exists(animKey)) {
            // Create idle animation for this specific pet
            this.anims.create({
                key: animKey,
                frames: this.anims.generateFrameNumbers(petKey, { start: 0, end: 3 }),
                frameRate: 6,
                repeat: -1
            });
        }

        // Play the correct pet animation
        this.pet.play(animKey);
        
        // Set initial scale for the pet
        this.scalePet();
        
        // Set depth to appear above background
        this.pet.setDepth(1);
        
        // Add pet name display if we have pet data
        if (this.petData) {
            // Create a container for pet name and rename button
            this.petNameContainer = this.add.container(centerX, height * 0.7);
            this.petNameContainer.setDepth(1);
            
            // Add pet name text
            this.petNameText = this.add.text(0, 0, this.petData.name, {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '28px',
                color: '#ffffff',
                stroke: '#000000', 
                strokeThickness: 4,
                align: 'center'
            }).setOrigin(0.5);
            
            // Add rename button
            const renameButton = this.add.text(80, 0, '✏️', {
                fontSize: '24px'
            }).setOrigin(0.5)
              .setInteractive({ useHandCursor: true })
              .on('pointerdown', () => this.showRenameDialog());
            
            // Add to container
            this.petNameContainer.add([this.petNameText, renameButton]);
        }
    }

    // Scale background to fit screen
    scaleToFit(gameObject) {
        const { width, height } = this.scale;
        const scaleX = width / gameObject.width;
        const scaleY = height / gameObject.height;
        const scale = Math.max(scaleX, scaleY);
        gameObject.setScale(scale).setScrollFactor(0);
    }

    // Scale pet based on screen size
    scalePet() {
        const { width, height } = this.scale;
        const baseScale = Math.min(width, height) * 0.00095;
        this.pet.setScale(baseScale);
    }

    changeScene() {
        // Add scene transition effect
        this.cameras.main.fadeOut(500, 0, 0, 0);
        
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Start the game scene with level data
            // this.scene.start('LevelTransition', { 
            //     level: 1,
            //     nextScene: 'GameOver',
            //     });
            this.scene.start('Quests');
        });
    }

    // Helper method to calculate responsive font sizes
    getResponsiveFontSize(baseSize, unit = 'px') {
        const { width } = this.scale;
        const baseWidth = 1280; // Base design width
        const scaleFactor = Math.min(width / baseWidth, 1.5); // Limit scaling to 150%
        const minScale = 0.5; // Minimum scale factor to ensure text isn't too small
        
        const finalScale = Math.max(scaleFactor, minScale);
        return `${baseSize * finalScale}${unit}`;
    }

    // Example of updating context from a Phaser scene
    collectCoins(amount) {
        const globalContext = getGlobalContext();
        if (globalContext) {
            globalContext.addCoins(amount);
            console.log(`Added ${amount} coins. Total: ${globalContext.userData.coins}`);
        }
    }

    setupPortraitLayout() {
        const { width, height } = this.scale;
        
        // Example: Reposition elements for portrait orientation
        if (this.titleText) {
            this.titleText.setPosition(width / 2, height * 0.15);
        }
        
        // Other UI adjustments...
    }

    setupLandscapeLayout() {
        const { width, height } = this.scale;
        
        // Example: Default landscape layout
        if (this.titleText) {
            this.titleText.setPosition(width / 2, height * 0.2);
        }
        
        // Other UI adjustments...
    }

    setupTouchControls() {
        const { width, height } = this.scale;
        
        // Add touch controls here if needed
        // For example, virtual joystick for movement
        // You might want to use plugins like rexvirtualjoystickplugin
        
        // Example: Add a touch area for basic interaction
        const touchArea = this.add.rectangle(width/2, height/2, width, height)
            .setOrigin(0.5)
            .setInteractive()
            .setAlpha(0.001);
            
        touchArea.on('pointerdown', () => {
            // Handle touch input
        });
    }

    // Show dialog to rename pet
    showRenameDialog() {
        const { width, height } = this.scale;
        
        // Try to create the DOM input element
        try {
            // Create a semi-transparent background
            const overlay = this.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.7)
                .setOrigin(0)
                .setDepth(10)
                .setInteractive(); // Block interactions below
                
            // Create dialog box
            const dialogWidth = Math.min(width * 0.8, 400);
            const dialogHeight = 200;
            const dialogX = width / 2;
            const dialogY = height / 2;
            
            const dialog = this.add.rectangle(dialogX, dialogY, dialogWidth, dialogHeight, 0x333333)
                .setStrokeStyle(2, 0xffffff)
                .setDepth(11);
                
            // Add title
            const title = this.add.text(dialogX, dialogY - 70, 'Rename Your Pet', {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '24px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5)
              .setDepth(11);
              
            // Add input field
            const input = this.add.dom(dialogX, dialogY, 'input')
                .setOrigin(0.5)
                .setDepth(11);
                
            // Style input
            const inputElement = input.node;
            inputElement.style.width = '250px';
            inputElement.style.height = '36px';
            inputElement.style.fontSize = '20px';
            inputElement.style.padding = '4px 10px';
            inputElement.style.borderRadius = '5px';
            inputElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            inputElement.style.color = 'white';
            inputElement.style.border = '2px solid #4a9e2f';
            inputElement.maxLength = 20;
            inputElement.value = this.petData.name;
            inputElement.focus();
            
            // Add buttons
            const buttonY = dialogY + 50;
            
            // Cancel button
            const cancelButton = this.add.rectangle(dialogX - 70, buttonY, 120, 40, 0x880000)
                .setStrokeStyle(2, 0xffffff)
                .setInteractive({ useHandCursor: true })
                .setDepth(11);
                
            const cancelText = this.add.text(dialogX - 70, buttonY, 'CANCEL', {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0.5)
              .setDepth(11);
              
            // Close dialog when cancel is clicked
            cancelButton.on('pointerdown', () => {
                overlay.destroy();
                dialog.destroy();
                title.destroy();
                input.destroy();
                cancelButton.destroy();
                cancelText.destroy();
                confirmButton.destroy();
                confirmText.destroy();
            });
            
            // Confirm button
            const confirmButton = this.add.rectangle(dialogX + 70, buttonY, 120, 40, 0x008800)
                .setStrokeStyle(2, 0xffffff)
                .setInteractive({ useHandCursor: true })
                .setDepth(11);
                
            const confirmText = this.add.text(dialogX + 70, buttonY, 'SAVE', {
                fontFamily: '"Silkscreen", cursive',
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0.5)
              .setDepth(11);
              
            // Handle rename when confirm is clicked
            confirmButton.on('pointerdown', async () => {
                const newName = inputElement.value.trim();
                
                if (newName && newName !== this.petData.name) {
                    await this.renamePet(newName);
                }
                
                // Close dialog
                overlay.destroy();
                dialog.destroy();
                title.destroy();
                input.destroy();
                cancelButton.destroy();
                cancelText.destroy();
                confirmButton.destroy();
                confirmText.destroy();
            });
        } catch (error) {
            console.error('Error creating DOM input for rename dialog:', error);
            // Fallback to simple prompt
            this.showFallbackRenameDialog();
        }
    }
    
    // Fallback rename dialog using browser prompt
    showFallbackRenameDialog() {
        const newName = prompt('Enter new name for your pet:', this.petData.name);
        if (newName && newName.trim() && newName.trim() !== this.petData.name) {
            this.renamePet(newName.trim());
        }
    }
    
    // Send request to rename pet
    async renamePet(newName) {
        try {
            const token = localStorage.getItem('token');
            if (!token || !this.petData || !this.petData._id) {
                console.error('Cannot rename pet: missing token or pet ID');
                return;
            }
            
            const API_URL = import.meta.env.VITE_API_URL;
            
            // Send rename request to server
            const response = await fetch(`${API_URL}/pets/${this.petData._id}/rename`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newName })
            });
            
            const responseData = await response.json();
            
            if (response.ok && responseData.success) {
                console.log('Pet renamed successfully:', responseData.data);
                
                // Update pet name in UI
                this.petData.name = newName;
                this.petNameText.setText(newName);
                
                // Update global context
                const globalContext = getGlobalContext();
                if (globalContext && globalContext.userData.selectedPet) {
                    globalContext.userData.selectedPet.name = newName;
                }
            } else {
                console.error('Failed to rename pet:', responseData.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error renaming pet:', error.message);
        }
    }
}
