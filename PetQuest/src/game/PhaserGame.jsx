import PropTypes from 'prop-types';
import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from 'react';
import StartGame from '../game/main';
import { EventBus } from '../game/EventBus';
import { useGlobalContext } from '../provider/globalContext';
import { isMobileDevice } from '../utils/touchUtils';

export const PhaserGame = forwardRef(function PhaserGame({ currentActiveScene }, ref) {
    const game = useRef();
    const containerRef = useRef();
    const [isFullscreen, setIsFullscreen] = useState(false);

    const { userData } = useGlobalContext();
    
    // Log userData for debugging
    useEffect(() => {
        console.log('PhaserGame initialized with userData:', userData);
    }, [userData]);

    // toggleFullscreen function
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            const gameContainer = document.getElementById('game-container');
            if (gameContainer && gameContainer.requestFullscreen) {
                gameContainer.requestFullscreen()
                    .then(() => setIsFullscreen(true))
                    .catch(err => console.error('Fullscreen error:', err));
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen()
                    .then(() => setIsFullscreen(false))
                    .catch(err => console.error('Exit fullscreen error:', err));
            }
        }
    };

    // Create the game inside a useLayoutEffect hook to avoid the game being created outside the DOM
    useLayoutEffect(() => {
        if (game.current === undefined) {
            game.current = StartGame("game-container");

            if (ref !== null) {
                ref.current = { game: game.current, scene: null };
            }
        }

        return () => {
            if (game.current) {
                game.current.destroy(true);
                game.current = undefined;
            }
        }
    }, [ref]);

    // Add fullscreen detection
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        // Auto-fullscreen on mobile with first interaction
        if (isMobileDevice()) {
            const handleFirstInteraction = () => {
                toggleFullscreen();
                document.removeEventListener('click', handleFirstInteraction);
                document.removeEventListener('touchstart', handleFirstInteraction);
            };

            document.addEventListener('click', handleFirstInteraction);
            document.addEventListener('touchstart', handleFirstInteraction);
        }

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    useEffect(() => {

        EventBus.on('current-scene-ready', (currentScene) => {

            if (currentActiveScene instanceof Function) {
                currentActiveScene(currentScene);
            }
            ref.current.scene = currentScene;

        });

        return () => {

            EventBus.removeListener('current-scene-ready');

        }

    }, [currentActiveScene, ref])

    return (
        <div className="game-wrapper">
            <div id="game-container" ref={containerRef}></div>
        </div>
    );

});

// Props definitions
PhaserGame.propTypes = {
    currentActiveScene: PropTypes.func
}
