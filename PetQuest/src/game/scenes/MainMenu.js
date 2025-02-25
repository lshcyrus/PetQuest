import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class MainMenu extends Scene {
    logoTween;
    background;
    pet;

    constructor() {
        super('MainMenu');
    }

    create() {
        this.setupBackground();
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
        const centerY = height * 0.5;

        // Reposition and scale background
        this.background.setPosition(centerX, centerY);
        this.scaleToFit(this.background);

        // Reposition and scale pet
        this.pet.setPosition(centerX, height * 0.8);
        this.scalePet();
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
        const baseScale = Math.min(width, height) * 0.0011; // Adjust this multiplier as needed
        this.pet.setScale(baseScale);
    }

    changeScene ()
    {
        if (this.logoTween)
        {
            this.logoTween.stop();
            this.logoTween = null;
        }

        this.scene.start('Game');
    }

    moveLogo (reactCallback)
    {
        if (this.logoTween)
        {
            if (this.logoTween.isPlaying())
            {
                this.logoTween.pause();
            }
            else
            {
                this.logoTween.play();
            }
        }
        else
        {
            this.logoTween = this.tweens.add({
                targets: this.logo,
                x: { value: 750, duration: 3000, ease: 'Back.easeInOut' },
                y: { value: 80, duration: 1500, ease: 'Sine.easeOut' },
                yoyo: true,
                repeat: -1,
                onUpdate: () => {
                    if (reactCallback)
                    {
                        reactCallback({
                            x: Math.floor(this.logo.x),
                            y: Math.floor(this.logo.y)
                        });
                    }
                }
            });
        }
    }
}
