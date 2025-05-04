import { Scene } from 'phaser';
import Phaser from 'phaser';
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
        const isFirstLogin = globalContext ? !globalContext.userData.hasSelectedPet : true;
        
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
                fontFamily: '"Silkscreen", cursive',
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
        this.load.image('battle_background', 'backgrounds/battle_background.png');

        // New pets
        this.load.spritesheet('badger', 'Pet_Badger/badger_idle.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('dino_rex', 'Pet_Dino Rex/dino_rex_idle.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('dino_tri', 'Pet_Dino Tri/dino_tri_idle.png', { frameWidth: 384, frameHeight: 128 });
        this.load.spritesheet('frogger', 'Pet_Frogger/frogger_idle.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('pengu', 'Pet_Pengu/pengu_idle.png', { frameWidth: 128, frameHeight: 128 });

        this.load.spritesheet('fire_dragon', 'fire_dragon/fire_dragon.png', { frameWidth: 640, frameHeight: 400 });
        this.load.spritesheet('ice_dragon', 'ice_dragon/ice_dragon.png', { frameWidth: 512, frameHeight: 512 });
        this.load.spritesheet('enemy_dragon', 'enemy_dragon/enemy_dragon.png', { frameWidth: 512, frameHeight: 512 });

        this.load.image('pet_feed', 'UI/pet_feed.png');
        this.load.image('pet_play', 'UI/pet_play.png');
        this.load.image('pet_train', 'UI/pet_train.png');
        this.load.image('pet_addHealth', 'UI/pet_addHealth.png');
        this.load.image('pet_outdoor', 'UI/pet_outdoor.png');

        WebFontLoader.load({
            google: {
                families: ['Silkscreen:400,500,600,700', 'Caveat:400,500,600,700', 'Jersey 10: 400,500,600,700']
            },
            active: () => {
                this.fontsLoaded = true;
            }
        });
    }

    create() {
        console.log("Preloader create method started");
        
        // Create pet animations
        this.createPetAnimations();
        
        // Get global context to check if user has selected a pet
        const globalContext = getGlobalContext();
        
        // Check if user has selected a pet and if the pet data is valid
        let isFirstLogin = true;
        
        if (globalContext) {
            console.log("User data from global context:", globalContext.userData);
            
            if (globalContext.userData.hasSelectedPet && globalContext.userData.selectedPet) {
                const pet = globalContext.userData.selectedPet;
                console.log("Selected pet data:", pet);
                
                // Check if pet has the required key field for rendering
                if (!pet.key) {
                    console.warn("Pet is missing key field, adding default value");
                    // Add default key to ensure it can be rendered
                    pet.key = "fire_dragon";
                    globalContext.updateUserData({
                        selectedPet: pet
                    });
                }
                
                isFirstLogin = false;
            } else {
                console.log("User has not selected a pet yet");
                isFirstLogin = true;
            }
        } else {
            console.warn("Global context not available");
        }
        
        console.log("Is first login:", isFirstLogin);
        
        // Fade out the current scene
        this.cameras.main.fadeOut(400, 0, 0, 0);
        
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            // Start appropriate scene based on pet selection status
            if (isFirstLogin) {
                console.log('Starting FirstLogin scene');
                this.scene.start('FirstLogin');
            } else {
                console.log('Starting MainMenu scene');
                this.scene.start('MainMenu');
            }
            
            // Let the React component know the scene is changing
            EventBus.emit('scene-changing', isFirstLogin ? 'FirstLogin' : 'MainMenu');
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
        
        // Create animations for enemy dragon
        if (!this.anims.exists('enemy_dragon_idle')) {
            this.anims.create({
                key: 'enemy_dragon_idle',
                frames: this.anims.generateFrameNumbers('enemy_dragon', { start: 0, end: 3 }),
                frameRate: 6,
                repeat: -1
            });
        }
    }
}
