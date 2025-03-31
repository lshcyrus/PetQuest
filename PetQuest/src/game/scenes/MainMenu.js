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
                fontFamily: '"Pixelify Sans", cursive',
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
                fontFamily: '"Pixelify Sans", cursive',
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
            this.petNameText = this.add.text(centerX, height * 0.7, this.petData.name, {
                fontFamily: '"Pixelify Sans", cursive',
                fontSize: '28px',
                color: '#ffffff',
                stroke: '#000000', 
                strokeThickness: 4,
                align: 'center'
            }).setOrigin(0.5).setDepth(1);
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
}
