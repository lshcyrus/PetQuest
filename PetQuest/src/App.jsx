import { useRef, useState, useEffect } from 'react';
import { PhaserGame } from './game/PhaserGame';
import LoginPage from './components/LoginPage';
import GlobalProvider from './provider/globalContext';
import { initOrientationHandling } from './utils/orientationHandler';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState('');
    const [canMoveSprite, setCanMoveSprite] = useState(true);
    const phaserRef = useRef();

    // Initialize orientation handling when the app loads
    useEffect(() => {
        initOrientationHandling();
    }, []);

    // Event emitted from the PhaserGame component
    const currentScene = (scene) => {
        setCanMoveSprite(scene.scene.key !== 'MainMenu');
    }

    const handleLogin = (user) => {
        console.log('Logging in with:', user);
        setIsLoggedIn(true);
        setUsername(user);
    }

    // When username changes, pass it to the Phaser game
    useEffect(() => {
        if (isLoggedIn && phaserRef.current && phaserRef.current.game) {
            // Wait for the game to be ready
            setTimeout(() => {
                const scene = phaserRef.current.scene;
                if (scene && scene.scene.key === 'MainMenu') {
                    // Restart the scene with username data
                    scene.scene.restart({ username });
                }
            }, 100);
        }
    }, [isLoggedIn, username]);

    if (!isLoggedIn) {
        return <LoginPage onLogin={handleLogin} />;
    }

    return (
        <div id="app" className='main-menu-fade-in'>
            <PhaserGame ref={phaserRef} currentActiveScene={currentScene} userData={{ username }} />
        </div>
    )
}

export default App
