import { Scene } from 'phaser';
import WebFontLoader from 'webfontloader';
import { getGlobalContext } from '../../utils/contextBridge';
import { EventBus } from '../EventBus';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    init() {
        // Check if this is a first-time login before showing any background
        const globalContext = getGlobalContext();
        const isFirstLogin = globalContext?.isFirstLogin || !localStorage.getItem('petquest_has_selected_pet');
        
        // Get the game canvas dimensions
        const { width, height } = this.scale;

        // Choose appropriate background based on where we're heading
        const bgKey = isFirstLogin ? 'first-time-pet-selection' : 'background';
        
        // Add background image and make it fill the screen
        this.background = this.add.image(width / 2, height / 2, bgKey);
        this.scaleToFit(this.background);
        
        // Add a semitransparent overlay for better visibility of UI elements
        this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
            .setOrigin(0.5);

        // Make it responsive to window resizing
        this.scale.on('resize', (gameSize) => {
            this.background.setPosition(gameSize.width / 2, gameSize.height / 2);
            this.overlay.setPosition(gameSize.width / 2, gameSize.height / 2);
            this.overlay.setSize(gameSize.width, gameSize.height);
            this.scaleToFit(this.background);
        });

        // Progress bar code
        const barWidth = Math.min(468, width * 0.8); // Responsive bar width
        const barHeight = 32;
        
        // Progress bar background
        this.add.rectangle(width / 2, height / 2, barWidth, barHeight)
            .setStrokeStyle(1, 0xffffff);

        // Progress bar fill
        this.progressBar = this.add.rectangle(
            (width / 2) - (barWidth / 2), 
            height / 2, 
            4, 
            barHeight - 4, 
            0xffffff
        ).setOrigin(0, 0.5);
        
        this.progressBarWidth = barWidth - 8;

        // Loading text
        this.loadingText = this.add.text(
            width / 2,
            height / 2 + barHeight + 20,
            'Loading...',
            {
                fontFamily: '"Pixelify Sans", cursive',
                fontSize: '24px',
                color: '#ffffff'
            }
        ).setOrigin(0.5);

        this.load.on('progress', (progress) => {
            this.progressBar.width = 4 + (this.progressBarWidth * progress);
        });
    }

    scaleToFit(gameObject) {
        const { width, height } = this.scale;
        const scaleX = width / gameObject.width;
        const scaleY = height / gameObject.height;
        const scale = Math.max(scaleX, scaleY);
        
        gameObject.setScale(scale);
    }

    preload() {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.image('logo', 'logo.png');

        this.load.spritesheet('fire_dragon', 'fire_dragon/fire_dragon.png', { frameWidth: 640, frameHeight: 400 });

        this.load.spritesheet('ice_dragon', 'ice_dragon/ice_dragon.png', { frameWidth: 512, frameHeight: 512 });

        WebFontLoader.load({
            google: {
                families: ['Pixelify Sans:400,500,600,700', 'Caveat:400,500,600,700', 'Jersey 10: 400,500,600,700']
            },
            active: () => {
                this.fontsLoaded = true;
            }
        });
    }

    create() {
        console.log("Preloader create method started");

        // IMPORTANT: Force first login for development testing
        localStorage.removeItem('petquest_has_selected_pet');
        localStorage.removeItem('petquest_selected_pet');
        
        // Update global context immediately
        const globalContext = getGlobalContext();
        if (globalContext) {
            globalContext.isFirstLogin = true;
            console.log("Forcing first login experience");
        }
        
        // Create pet animations
        this.createPetAnimations();
        
        // Fade out the current scene
        this.cameras.main.fadeOut(400, 0, 0, 0);
        
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Start FirstLogin scene
            console.log('Directly starting FirstLogin scene');
            this.scene.start('FirstLogin');
            
            // Let the React component know the scene is changing
            EventBus.emit('scene-changing', 'FirstLogin');
        });
    }

    createPetAnimations() {
        // Create animations for fire dragon
        if (!this.anims.exists('fire_dragon_idle')) {
            this.anims.create({
                key: 'fire_dragon_idle',
                frames: this.anims.generateFrameNumbers('fire_dragon', { start: 0, end: 3 }),
                frameRate: 6,
                repeat: -1
            });
        }
        
        // Create animations for ice dragon
        if (!this.anims.exists('ice_dragon_idle')) {
            this.anims.create({
                key: 'ice_dragon_idle',
                frames: this.anims.generateFrameNumbers('ice_dragon', { start: 0, end: 3 }),
                frameRate: 6,
                repeat: -1
            });
        }
    }
}
