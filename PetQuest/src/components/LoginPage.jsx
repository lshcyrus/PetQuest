import { useState } from 'react';
import '../styles/LoginPage.css';
import { useGlobalContext } from '../provider/globalContext';

const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    
    // Access the global context
    const { updateUsername } = useGlobalContext();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            setError('Please enter both username and password');
            return;
        }

        if (isRegister) {
            // Registration logic here
            // For now, we'll just simulate registration
            console.log('Registering new user:', username);
        }

        setIsLoggingIn(true);
        const loginBox = document.querySelector('.login-box');
        loginBox.classList.add('fade-out');

        // Update username in the global context
        updateUsername(username);

        setTimeout(() => {
            onLogin(username);
        }, 500);
    };

    const toggleMode = () => {
        setIsRegister(!isRegister);
        setError('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="login-container">
            <div className="logo">
                <img src="/assets/logo.png" alt="PetQuest" />
            </div>

            <div className={`login-box ${isLoggingIn ? 'fade-out' : ''}`}>
                <div className="login-panel">
                    <div className="login-panel-background"></div>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <input
                                className='username-input'
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <input
                                className='password-input'
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        {/* {isRegister && (
                            <div className="form-group">
                                <input
                                    type="password"
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        )} */}
                        {error && <div className="error-message">{error}</div>}
                        <button type="submit" className="login-button">
                            {isRegister ? 'Register' : 'Login'}
                        </button>
                        <div className="toggle-mode">
                            <button
                                type="button"
                                className="toggle-button"
                                onClick={toggleMode}
                            >
                                {isRegister ? 'Login instead' : 'Register'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;