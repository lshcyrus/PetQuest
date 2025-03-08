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
        
        // Store the next scene to transition to (default to same level if not specified)
        this.nextScene = data.nextScene || 'GameOver';
        
        // Configure timing (in milliseconds)
        this.displayDuration = data.displayDuration || 2000; // How long to show the level info
        this.fadeInDuration = data.fadeInDuration || 800;
        this.fadeOutDuration = data.fadeOutDuration || 800;
    }

    create() {
        // Get the full size of the game canvas
        const { width, height } = this.scale;
        const centerX = width * 0.5;
        const centerY = height * 0.5;

        // Set background color
        this.cameras.main.setBackgroundColor(0x000000);
        
        // Start with black screen (fully faded out)
        this.cameras.main.fadeIn(this.fadeInDuration);

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

        // Add level text with animation
        const levelText = this.add.text(centerX, centerY, `Level ${this.level}`, {
            fontFamily: '"Pixelify Sans", cursive',
            fontSize: '96px',  // Large size
            color: '#ffffff',
            stroke: '#000000', 
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setAlpha(0);

        // Animate the text to fade in and scale up
        this.tweens.add({
            targets: levelText,
            alpha: 1,
            scale: 1.2,
            ease: 'Power1',
            duration: 500,
            yoyo: true,
            hold: 500,
            repeat: 0
        });
        
        // Add resize handler to maintain proper scaling when window size changes
        this.scale.on('resize', this.onResize, this);

        EventBus.emit('current-scene-ready', this);

        // Set a timer to transition to the next scene
        this.transitionTimer = this.time.delayedCall(this.displayDuration, () => {
            this.transitionToNextScene();
        });

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
    }

    // Transition to the next scene with fade out effect
    transitionToNextScene() {
        // Check if we've already started transitioning to prevent double calls
        if (this.isTransitioning) return;
        this.isTransitioning = true;
        
        // Start the fade out animation
        this.cameras.main.fadeOut(this.fadeOutDuration, 0, 0, 0);
        
        // Once fade out is complete, go to the next scene
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Cancel any pending timers
            if (this.transitionTimer) this.transitionTimer.remove();
            
            // Start the next scene with any necessary data
            this.scene.start(this.nextScene, { level: this.level });
        });
    }

    // Legacy method - now routes to the proper transition method
    changeScene() {
        this.transitionToNextScene();
    }

    // Clean up when scene is shutdown
    shutdown() {
        // Cancel pending timer if scene is shut down early
        if (this.transitionTimer) {
            this.transitionTimer.remove();
        }
        
        // Remove the resize listener to prevent memory leaks
        this.scale.off('resize', this.onResize, this);

        // Clean up touch controls
        if (this.touchControlsCleanup) {
            this.touchControlsCleanup();
        }
    }

    // The rest of your existing methods (setupResponsiveUI, etc.)
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
    }

    setupLandscapeLayout() {
        const { width, height } = this.scale;
        
        // Example: Default landscape layout
        if (this.titleText) {
            this.titleText.setPosition(width / 2, height * 0.2);
        }
    }

    setupTouchControls() {
        const { width, height } = this.scale;
        
        // Add touch controls here if needed
        const touchArea = this.add.rectangle(width/2, height/2, width, height)
            .setOrigin(0.5)
            .setInteractive()
            .setAlpha(0.001);
            
        touchArea.on('pointerdown', () => {
            // Skip to next scene when tapping screen
            this.transitionToNextScene();
        });
    }

    setupMobileUI() {
        const { width, height } = this.scale;
        
        // Create a skip button using our touch utility
        this.skipButton = createTouchButton(
            this,
            width - 100,
            50,
            'Skip',
            { fontSize: '20px' },
            () => {
                this.transitionToNextScene();
            }
        );
        
        // Add touch controls for game interactions
        this.touchControlsCleanup = setupTouchControls(this, {
            onTap: () => {
                // Skip to next scene when tapping
                this.transitionToNextScene();
            }
        });
    }
}
