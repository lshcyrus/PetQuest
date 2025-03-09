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
        
        // Check localStorage for pet selection status
        const hasSelectedPet = localStorage.getItem('petquest_has_selected_pet');
        
        if (!hasSelectedPet && globalContext) {
            // This is a first-time user - flag for pet selection
            globalContext.isFirstLogin = true;
            console.log('First-time user detected - will route to pet selection');
        } else if (globalContext) {
            // User has already selected a pet
            globalContext.isFirstLogin = false;
            
            try {
                // Try to restore the selected pet from localStorage
                const savedPet = JSON.parse(localStorage.getItem('petquest_selected_pet'));
                if (savedPet) {
                    globalContext.userData.pet = savedPet;
                    console.log('Restored previously selected pet:', savedPet.name);
                }
            } catch (e) {
                console.error('Error restoring saved pet data:', e);
                // If data is corrupted, reset to first login
                globalContext.isFirstLogin = true;
            }
        }
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
