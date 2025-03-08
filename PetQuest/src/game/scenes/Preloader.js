import { Scene } from 'phaser';
import WebFontLoader from 'webfontloader';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    init() {
        // Get the game canvas dimensions
        const { width, height } = this.scale;

        // Add background image and make it fill the screen
        const background = this.add.image(width / 2, height / 2, 'background');
        
        // Scale the background to cover the screen
        this.scaleToFit(background);

        // Make it responsive to window resizing
        this.scale.on('resize', (gameSize) => {
            background.setPosition(gameSize.width / 2, gameSize.height / 2);
            this.scaleToFit(background);
        });

        // Progress bar code
        const barWidth = Math.min(468, width * 0.8); // Responsive bar width
        const barHeight = 32;
        
        this.add.rectangle(width / 2, height / 2, barWidth, barHeight)
            .setStrokeStyle(1, 0xffffff);

        const bar = this.add.rectangle(
            (width / 2) - (barWidth / 2), 
            height / 2, 
            4, 
            barHeight - 4, 
            0xffffff
        );

        this.load.on('progress', (progress) => {
            bar.width = 4 + ((barWidth - 8) * progress);
        });
    }

    // Add this new method to handle background scaling
    scaleToFit(gameObject) {
        const { width, height } = this.scale;
        const scaleX = width / gameObject.width;
        const scaleY = height / gameObject.height;
        const scale = Math.max(scaleX, scaleY);
        
        gameObject.setScale(scale);
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.image('logo', 'logo.png');

        this.load.spritesheet('fire_dragon', 'fire_dragon/fire_dragon.png', { frameWidth: 640, frameHeight: 400 });


        WebFontLoader.load({
            google: {
                families: ['Pixelify Sans:400,500,600,700', 'Caveat:400,500,600,700']
            },
            active: () => {
                this.fontsLoaded = true;
            }
        });
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('MainMenu');
    }
}
