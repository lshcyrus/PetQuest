import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

        this.load.image('background', 'assets/mainmenu.png');
        this.load.image('forest1', 'assets/forest1.png');
        this.load.image('forest2', 'assets/forest2.png');
    }

    create ()
    {
        this.scene.start('Preloader');
        
        // Optimize for mobile performance
        this.optimizeForMobile();
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
