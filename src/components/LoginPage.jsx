import { useState } from 'react';
import PropTypes from 'prop-types';
import '../styles/LoginPage.css';
import { useGlobalContext } from '../provider/globalContext';

const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    
    // Access the global context
    const { updateUsername } = useGlobalContext();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please enter both username and password');
            return;
        }

        if (isRegister) {
            if (!email) {
                setError('Email is required for registration');
                return;
            }
            
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }

            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username,
                        email,
                        password
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Registration failed');
                }

                // If registration is successful, we'll use the token and log in the user
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    handleLoginSuccess();
                }
            } catch (err) {
                setError(err.message || 'Registration failed');
                return;
            }
        } else {
            // Login logic
            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: username, // Using username field for email during login
                        password
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Login failed');
                }

                if (data.token) {
                    localStorage.setItem('token', data.token);
                    handleLoginSuccess();
                }
            } catch (err) {
                setError(err.message || 'Login failed');
                return;
            }
        }
    };

    const handleLoginSuccess = () => {
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
                        
                        {isRegister && (
                            <div className="form-group">
                                <input
                                    className='email-input'
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        )}
                        
                        <div className="form-group">
                            <input
                                className='password-input'
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        
                        {isRegister && (
                            <div className="form-group">
                                <input
                                    className='confirm-password-input'
                                    type="password"
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        )}
                        
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

LoginPage.propTypes = {
    onLogin: PropTypes.func.isRequired
};

export default LoginPage; 