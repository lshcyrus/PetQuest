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
        
        // Check if this is a first-time login - if localStorage doesn't have pet selection
        const hasSelectedPet = localStorage.getItem('petquest_has_selected_pet');
        
        // Clear pet selection for testing (remove in production)
        localStorage.removeItem('petquest_has_selected_pet');
        localStorage.removeItem('petquest_selected_pet');
        
        setIsLoggedIn(true);
        setUsername(user);
    }

    return (
        <div id="app" className='main-menu-fade-in'>
            {!isLoggedIn ? (
                <LoginPage onLogin={handleLogin} />
            ) : (
                <PhaserGame 
                    ref={phaserRef} 
                    currentActiveScene={currentScene} 
                    userData={{ username }} 
                />
            )}
        </div>
    );
}

export default App;
