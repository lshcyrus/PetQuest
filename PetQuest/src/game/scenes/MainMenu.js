import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class MainMenu extends Scene {
    logoTween;
    background;
    pet;
    username;

    constructor() {
        super('MainMenu');
    }

    init(data) {
        // Get the username passed from the main app
        this.username = data.username || 'Player';
    }

    create() {
        this.setupBackground();
        this.setupUI();
        this.setupPet();
        
        // Handle window resize
        this.scale.on('resize', this.handleResize, this);
        
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

    setupUI() {
        const { width, height } = this.scale;
        const centerX = width * 0.5;
        
        // Welcome message
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
        .setOrigin(0.5, 0)
        .setDepth(10);
        
        // Start button
        const buttonWidth = Math.min(width * 0.4, 200);
        const buttonHeight = 60;
        const buttonX = width * 0.85;
        const buttonY = height * 0.85;
        
        const buttonBg = this.add.rectangle(
            buttonX,    
            buttonY,
            buttonWidth,
            buttonHeight,
            0x000000,
            0  // Transparent
        )
        .setInteractive({ useHandCursor: true })
        .setDepth(10);
        
        const buttonText = this.add.text(
            buttonX,
            buttonY,
            'START GAME',
            {
                fontFamily: '"Pixelify Sans", cursive',
                fontSize: this.getResponsiveFontSize(3, 'rem'),
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 8
            }
        )
        .setOrigin(0.5)
        .setDepth(11);
        
        // Button text animation
        this.tweens.add({
            targets: buttonText,
            scale: 1.1,
            yoyo: true,
            repeat: -1,
            duration: 1000,
            ease: 'Sine.easeInOut'
        });
        
        buttonBg.on('pointerdown', () => {
            // Add click animation
            this.tweens.add({
                targets: buttonText,
                scale: 0.9,
                duration: 100,
                yoyo: true,
                onComplete: () => this.changeScene()
            });
        });
        
        // Store UI elements for resizing
        this.ui = { welcomeText, buttonBg, buttonText };
    }

    setupPet() {
        const { width, height } = this.scale;
        const centerX = width * 0.5;
        
        this.pet = this.add.sprite(centerX, height * 0.8, 'fire_dragon');
        
        // Create idle animation
        this.pet.anims.create({
            key: 'idle',
            frames: this.anims.generateFrameNumbers('fire_dragon', { start: 0, end: 3 }),
            frameRate: 5,
            repeat: -1
        });

        // Play idle animation
        this.pet.anims.play('idle');
        
        // Set initial scale for the pet
        this.scalePet();
        
        // Set depth to appear above background
        this.pet.setDepth(1);
    }

    handleResize(gameSize) {
        const { width, height } = gameSize;
        const centerX = width * 0.5;
        
        // Reposition and scale background
        this.background.setPosition(centerX, height * 0.5);
        this.scaleToFit(this.background);

        // Reposition and scale pet
        this.pet.setPosition(centerX, height * 0.8);
        this.scalePet();
        
        // Update UI positions
        if (this.ui) {
            // Update welcome text
            this.ui.welcomeText.setPosition(centerX, height * 0.05);
            this.ui.welcomeText.setStyle({
                fontSize: this.getResponsiveFontSize(4, 'em')
            });
            
            // Calculate responsive button position and size
            const buttonWidth = Math.min(width * 0.4, 200);
            const buttonHeight = 60;
            const buttonX = width * 0.85;
            const buttonY = height * 0.85;
            
            // Update button background
            this.ui.buttonBg.setPosition(buttonX, buttonY);
            this.ui.buttonBg.displayWidth = buttonWidth;
            this.ui.buttonBg.displayHeight = buttonHeight;
            
            // Update button text
            this.ui.buttonText.setPosition(buttonX, buttonY);
            this.ui.buttonText.setStyle({
                fontSize: this.getResponsiveFontSize(3, 'rem'),
                strokeThickness: Math.min(8, Math.max(4, width / 100)) // Responsive stroke thickness
            });
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
            this.scene.start('Game', { level: 1 });
        });
    }

    // Add this new helper method to calculate responsive font sizes
    getResponsiveFontSize(baseSize, unit = 'px') {
        const { width, height } = this.scale;
        const baseWidth = 1280; // Base design width
        const scaleFactor = Math.min(width / baseWidth, 1.5); // Limit scaling to 150%
        const minScale = 0.5; // Minimum scale factor to ensure text isn't too small
        
        const finalScale = Math.max(scaleFactor, minScale);
        return `${baseSize * finalScale}${unit}`;
    }
}
