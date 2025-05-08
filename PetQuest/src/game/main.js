import { Boot } from './scenes/Boot';
import { LevelTransition } from './scenes/LevelTransition';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';
import { FirstLogin } from './scenes/FirstLogin';
import { Quests } from './scenes/Quests';
import Phaser from 'phaser';
import { Preloader } from './scenes/Preloader';
import { initOrientationHandling } from '../utils/orientationHandler';
import { LevelSelector } from './scenes/LevelSelector';
import { BattleSystem } from './scenes/BattleSystem';
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#000000',
    scale: {
        // RESIZE will adjust to whatever size the container is
        mode: Phaser.Scale.RESIZE,
        // Fill the entire screen (not FIT which maintains aspect ratio)
        width: '100%',
        height: '100%',
        // Center the canvas
        autoCenter: Phaser.Scale.CENTER_BOTH,
        // For fullscreen support
        fullscreenTarget: 'game-container',
        // Allow expanding to fullscreen
        expandParent: true,
    },
    // Other settings:
    input: {
        activePointers: 3, // Support multi-touch
        smoothFactor: 0.2, // Smooth touch movement
    },
    dom: {
        createContainer: true // Enable DOM element support
    },
    render: {
        antialias: true,
        roundPixels: true,
        powerPreference: 'high-performance'
    },
    scene: [
        Boot,
        Preloader,
        FirstLogin,
        MainMenu,
        Quests,
        LevelTransition,
        LevelSelector,
        BattleSystem,
        GameOver
    ]
};

const StartGame = (parent) => {
    // Initialize the game
    const game = new Phaser.Game({ ...config, parent });
    
    // Make game available globally for orientation handler
    window.game = game;
    
    // Initialize orientation handling with game instance
    initOrientationHandling();
    
    // Handle browser fullscreen changes
    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            game.scale.startFullscreen();
        }
    };
    
    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', toggleFullscreen);
    
    // Auto fullscreen on mobile
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        document.body.classList.add('mobile');
        
        // Try to go fullscreen on first user interaction
        const tryFullscreen = () => {
            const gameContainer = document.getElementById('game-container');
            if (gameContainer && gameContainer.requestFullscreen) {
                gameContainer.requestFullscreen().catch(err => {
                    console.log('Fullscreen request failed:', err);
                });
            }
            document.removeEventListener('touchstart', tryFullscreen);
            document.removeEventListener('click', tryFullscreen);
        };
        
        document.addEventListener('touchstart', tryFullscreen);
        document.addEventListener('click', tryFullscreen);
    }
    
    return game;
}

export default StartGame;
