import { useRef, useState, useEffect } from 'react';
import { PhaserGame } from './game/PhaserGame';
import LoginPage from './components/LoginPage';
import GlobalProvider from './provider/globalContext';
import { initOrientationHandling } from './utils/orientationHandler';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const phaserRef = useRef();

    // Initialize orientation handling when the app loads
    useEffect(() => {
        initOrientationHandling();
    }, []);

    // Event emitted from the PhaserGame component
    const currentScene = () => {
        // Handle scene changes if needed
    }

    const handleLogin = (user) => {
        console.log('Logging in with:', user);
        
        setIsLoggedIn(true);
        localStorage.setItem('username', user);
    }

    return (
        <div id="app" className='main-menu-fade-in'>
            {!isLoggedIn ? (
                <LoginPage onLogin={handleLogin} />
            ) 
            :
            (
                <GlobalProvider>
                    <PhaserGame 
                        ref={phaserRef} 
                        currentActiveScene={currentScene}
                    />
                </GlobalProvider>
            )}
        </div>
    );
}

export default App;
