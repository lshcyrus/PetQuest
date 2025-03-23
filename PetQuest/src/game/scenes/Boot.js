import { Scene } from 'phaser';
import { getGlobalContext } from '../../utils/contextBridge';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Load essential assets
        this.load.image('first-time-pet-selection', 'assets/pet-selection.png');
        this.load.image('background', 'assets/mainmenu.png');
        this.load.image('forest1', 'assets/forest1.png');
        this.load.image('forest2', 'assets/forest2.png');
        this.load.image('arrow', 'assets/ui/arrow.png');
    }

    create() {
        console.log('Boot scene started');
        
        // Check if this is a first-time user
        this.checkFirstTimeUser();
        
        // Proceed to preloader
        this.scene.start('Preloader');
        
        // Optimize for mobile performance
        this.optimizeForMobile();
    }

    checkFirstTimeUser() {
        // Get global context
        const globalContext = getGlobalContext();
        
        // The isFirstLogin value will be set in the globalContext during initialization
        // based on the hasSelectedPet value from the server
        console.log("Boot: First-time user check - global context available:", !!globalContext);
        
        // Nothing else to do here - the first-time user status is already determined
        // in the GlobalProvider when loading user data from the server
    }

    optimizeForMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Reduce background particle effects or animations if needed
            this.game.config.backgroundColor = '#000000';
            
            // Adjust physics settings for mobile if you're using physics
            if (this.physics && this.physics.world) {
                this.physics.world.setFPS(30); // Lower FPS for better performance
            }
            
        }
    }
}
