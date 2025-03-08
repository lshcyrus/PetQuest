import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { isMobileDevice, setupTouchControls, createTouchButton } from '../../utils/touchUtils';

export class LevelTransition extends Scene {
    constructor() {
        super('LevelTransition');
    }

    // init() method is called when the scene is created
    init(data) {
        console.log('Game level:', data);

        // Get the level passed from the previous scene
        this.level = data.level || 1;
    }

    create() {
        // Get the full size of the game canvas
        const { width, height } = this.scale;
        const centerX = width * 0.5;
        const centerY = height * 0.5;

        // Set background color
        this.cameras.main.setBackgroundColor(0x000000);

        // Add background image based on level
        let backgroundKey;
        switch (this.level) {
            case 1:
                backgroundKey = 'forest1';
                break;
            case 2:
                backgroundKey = 'forest2';
                break;
            default:
                backgroundKey = 'forest1';
        }
        
        // Add the background image and scale it properly
        this.background = this.add.image(centerX, centerY, backgroundKey)
            .setOrigin(0.5)
            .setDepth(0);
        
        // Scale the background to cover the screen
        this.scaleBackgroundToFit(this.background);

        // Add text at the center of the screen - much larger size
        this.add.text(centerX, centerY, `Level ${this.level}`, {
            fontFamily: '"Pixelify Sans", cursive',
            fontSize: '96px',  // Significantly larger size
            color: '#ffffff',
            stroke: '#000000', 
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);
        
        // Check for and increase size of any status text
        if (this.statusText) {
            this.statusText.setFontSize('48px');
        }
        
        // Check for and increase size of any score/level text
        if (this.scoreText) {
            this.scoreText.setFontSize('36px');
        }

        // Add resize handler to maintain proper scaling when window size changes
        this.scale.on('resize', this.onResize, this);

        EventBus.emit('current-scene-ready', this);

        // Optimize UI for mobile
        this.setupResponsiveUI();

        // Set up responsive UI including mobile touch controls
        if (isMobileDevice()) {
            this.setupMobileUI();
        }
    }

    // Helper method to scale background image properly (like CSS background-size: cover)
    scaleBackgroundToFit(image) {
        const { width, height } = this.scale;
        
        // Get image dimensions
        const imageWidth = image.width;
        const imageHeight = image.height;
        
        // Calculate scale factors
        const scaleX = width / imageWidth;
        const scaleY = height / imageHeight;
        
        // Use the larger scale factor to ensure the image covers the entire screen
        const scale = Math.max(scaleX, scaleY);
        
        // Apply the scale
        image.setScale(scale);
        
        // Center the image
        image.setPosition(width / 2, height / 2);
    }

    // Handle resize events
    onResize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;
        
        // Reposition and rescale background
        if (this.background) {
            this.scaleBackgroundToFit(this.background);
        }
        
        // Reposition any other UI elements...
        // ...
    }

    changeScene() {
        this.scene.start('GameOver');
    }

    // Clean up when scene is shutdown
    shutdown() {
        // Remove the resize listener to prevent memory leaks
        this.scale.off('resize', this.onResize, this);

        // Clean up touch controls
        if (this.touchControlsCleanup) {
            this.touchControlsCleanup();
        }
    }

    setupResponsiveUI() {
        // Detect if we're on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Get screen dimensions and orientation
            const { width, height } = this.scale;
            const isPortrait = height > width;
            
            // Adjust UI elements for mobile
            if (this.titleText) {
                // Make text bigger on mobile for readability
                this.titleText.setFontSize(Math.max(28, width / 15));
            }
            
            // Add mobile-specific controls if needed
            if (isPortrait) {
                // Adjustments specific to portrait mode
                this.setupPortraitLayout();
            } else {
                // Adjustments specific to landscape mode
                this.setupLandscapeLayout();
            }
            
            // Add mobile touch controls if needed
            this.setupTouchControls();
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
            
        touchArea.on('pointerdown', (pointer) => {
            // Handle touch input
        });
    }

    setupMobileUI() {
        const { width, height } = this.scale;
        
        // Create a back button using our touch utility
        this.backButton = createTouchButton(
            this,
            100,
            50,
            'Back',
            { fontSize: '20px' },
            () => {
                this.scene.start('MainMenu');
            }
        );
        
        // Add touch controls for game interactions
        this.touchControlsCleanup = setupTouchControls(this, {
            onTap: (pointer) => {
                console.log('Tapped at', pointer.x, pointer.y);
                // Handle tap interaction
            },
            onSwipe: (direction, data) => {
                console.log('Swiped', direction);
                // Handle swipe interactions - for example, character movement
                switch (direction) {
                    case 'left':
                        // Move character left
                        break;
                    case 'right':
                        // Move character right
                        break;
                    // etc.
                }
            }
        });
    }
}
