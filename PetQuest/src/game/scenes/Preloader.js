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


        this.load.image('pet_feed', 'UI/pet_feed.png');
        this.load.image('pet_play', 'UI/pet_play.png');
        this.load.image('pet_train', 'UI/pet_train.png');
        this.load.image('pet_addHealth', 'UI/pet_addHealth.png');
        this.load.image('pet_outdoor', 'UI/pet_outdoor.png');
        this.load.image('inventory_btn', 'UI/inventory.png');
        this.load.image('shop_btn', 'UI/shop.png');

        // Load potion images
        this.load.image('hp-potion', 'items/medicine/hp-potion.png');
        this.load.image('sp-potion', 'items/medicine/sp-potion.png');
        this.load.image('mixed-potion', 'items/medicine/mixed-potion.png');
        this.load.image('best-potion', 'items/medicine/best-potion.png');
        
        // Load toy images
        this.load.image('feather', 'items/toy/feather.png');
        this.load.image('cup', 'items/toy/cup.png');
        this.load.image('chess', 'items/toy/chess.png');

        // Load equipment images
        this.load.image('sword', 'items/equipment/sword.png');
        this.load.image('magic wand', 'items/equipment/magic-wand.png');
        this.load.image('the sword of light', 'items/equipment/the-sword-of-light.png');
        this.load.image('demons blade', 'items/equipment/demons-blade.png');
        
        // Load food images
        this.load.image('cake', 'items/food/cake.png');
        this.load.image('donut', 'items/food/donut.png');
        this.load.image('fish', 'items/food/fish.png');
        this.load.image('idiot sandwich', 'items/food/sandwich.png');
        this.load.image('strawberry', 'items/food/strawberry.png');

        // Load play, train, outdoor spritesheets for each pet with correct frame sizes
        const petActionSheets = [
            // dino_rex
            { key: 'dino_rex_play', path: 'Pet_Dino Rex/dino_rex_play.png', frameWidth: 384, frameHeight: 128 },
            { key: 'dino_rex_train', path: 'Pet_Dino Rex/dino_rex_train.png', frameWidth: 384, frameHeight: 128 },
            { key: 'dino_rex_outdoor', path: 'Pet_Dino Rex/dino_rex_outdoor.png', frameWidth: 384, frameHeight: 128 },
            // badger
            { key: 'badger_play', path: 'Pet_Badger/badger_play.png', frameWidth: 384, frameHeight: 128 },
            { key: 'badger_train', path: 'Pet_Badger/badger_train.png', frameWidth: 384, frameHeight: 128 },
            { key: 'badger_outdoor', path: 'Pet_Badger/badger_outdoor.png', frameWidth: 384, frameHeight: 128 },
            // dino_tri 
            { key: 'dino_tri_play', path: 'Pet_Dino Tri/dino_tri_play.png', frameWidth: 384, frameHeight: 128 },
            { key: 'dino_tri_train', path: 'Pet_Dino Tri/dino_tri_train.png', frameWidth: 384, frameHeight: 128 },
            { key: 'dino_tri_outdoor', path: 'Pet_Dino Tri/dino_tri_outdoor.png', frameWidth: 384, frameHeight: 128 },
            // frogger
            { key: 'frogger_play', path: 'Pet_Frogger/frogger_play.png', frameWidth: 384, frameHeight: 128 },
            { key: 'frogger_train', path: 'Pet_Frogger/frogger_train.png', frameWidth: 384, frameHeight: 128 },
            { key: 'frogger_outdoor', path: 'Pet_Frogger/frogger_outdoor.png', frameWidth: 384, frameHeight: 128 },
            // pengu
            { key: 'pengu_play', path: 'Pet_Pengu/pengu_play.png', frameWidth: 384, frameHeight: 128 },
            { key: 'pengu_train', path: 'Pet_Pengu/pengu_train.png', frameWidth: 384, frameHeight: 128 },
            { key: 'pengu_outdoor', path: 'Pet_Pengu/pengu_outdoor.png', frameWidth: 384, frameHeight: 128 },
        ];
        petActionSheets.forEach(sheet => {
            this.load.spritesheet(sheet.key, sheet.path, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
        });

        // Load pet attack animations
        console.log('Loading pet attack animations');
        const petAttacks = [
            { key: 'dino_rex_attack', path: 'Pet_Dino Rex/dino_rex_attack.png', frameWidth: 384, frameHeight: 128 },
            { key: 'badger_attack', path: 'Pet_Badger/badger_attack.png', frameWidth: 384, frameHeight: 128 },
            // Special case for Dino Tri which has split attack files
            { key: 'dino_tri_attack_A', path: 'Pet_Dino Tri/dino_tri_attack_A.png', frameWidth: 384, frameHeight: 128 },
            { key: 'dino_tri_attack_B', path: 'Pet_Dino Tri/dino_tri_attack_B.png', frameWidth: 384, frameHeight: 128 },
            { key: 'frogger_attack', path: 'Pet_Frogger/frogger_attack.png', frameWidth: 384, frameHeight: 128 },
            { key: 'pengu_attack', path: 'Pet_Pengu/pengu_attack.png', frameWidth: 384, frameHeight: 128 }
        ];
        
        petAttacks.forEach(attack => {
            this.load.spritesheet(attack.key, attack.path, { frameWidth: attack.frameWidth, frameHeight: attack.frameHeight });
        });

        // --- ENEMY SPRITES ---
        // Gorgon - Note the proper spelling is Gorgan for the files but gorgon for the keys
        console.log('Loading Gorgon sprites');
        this.load.spritesheet('gorgon_idle', 'Enemy_Gorgon/Gorgan_idle.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('gorgon_walk', 'Enemy_Gorgon/Gorgan_walk.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('gorgon_attack', 'Enemy_Gorgon/Gorgan_attack.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('gorgon_hurt', 'Enemy_Gorgon/Gorgan_hurt.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('gorgon_die', 'Enemy_Gorgon/Gorgan_die.png', { frameWidth: 128, frameHeight: 128 });
        
        // Fix for Blue Golem sprites - adjusted dimensions based on file structure
        console.log('Loading Blue Golem sprites with adjusted dimensions');
        this.load.spritesheet('blue_golem_idle', 'Enemy_Blue Golem/Blue Golem_idle.png', { frameWidth: 90, frameHeight: 64 });
        this.load.spritesheet('blue_golem_walk', 'Enemy_Blue Golem/Blue Golem_walk.png', { frameWidth: 90, frameHeight: 64 });
        this.load.spritesheet('blue_golem_attack', 'Enemy_Blue Golem/Blue Golem_attack.png', { frameWidth: 90, frameHeight: 64 });
        this.load.spritesheet('blue_golem_hurt', 'Enemy_Blue Golem/Blue Golem_hurt.png', { frameWidth: 90, frameHeight: 64 });
        this.load.spritesheet('blue_golem_die', 'Enemy_Blue Golem/Blue Golem_die.png', { frameWidth: 90, frameHeight: 64 });
        
        // Fix for Orange Golem sprites - adjusted dimensions based on file structure
        console.log('Loading Orange Golem sprites with adjusted dimensions');
        this.load.spritesheet('orange_golem_idle', 'Enemy_Orange Golem/Orange Golem_idle.png', { frameWidth: 90, frameHeight: 64 });
        this.load.spritesheet('orange_golem_walk', 'Enemy_Orange Golem/Orange Golem_walk.png', { frameWidth: 90, frameHeight: 64 });
        this.load.spritesheet('orange_golem_attack', 'Enemy_Orange Golem/Orange Golem_attack.png', { frameWidth: 90, frameHeight: 64 });
        this.load.spritesheet('orange_golem_hurt', 'Enemy_Orange Golem/Orange Golem_hurt.png', { frameWidth: 90, frameHeight: 64 });
        this.load.spritesheet('orange_golem_die', 'Enemy_Orange Golem/Orange Golem_die.png', { frameWidth: 90, frameHeight: 64 });

        // Add error handling for sprite loading
        this.load.on('filecomplete', (key, type, data) => {
            if (type === 'spritesheet') {
                if (key.includes('attack') || key.includes('_atk')) {
                    console.log(`Successfully loaded attack spritesheet: ${key}`);
                } else if (key.includes('golem') || key.includes('gorgon')) {
                    console.log(`Successfully loaded enemy spritesheet: ${key}`);
                }
            }
        });
        
        this.load.on('loaderror', (file) => {
            console.error(`Error loading file: ${file.key} (${file.url})`);
            
            // If an attack animation fails to load, provide a message to help debug
            if (file.key.includes('attack') || file.key.includes('_atk')) {
                console.warn(`Attack animation failed to load: ${file.key}. Check that the file exists and path is correct.`);
            }
        });

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

    
}
