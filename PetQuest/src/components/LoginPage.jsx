import { useState } from 'react';
import PropTypes from 'prop-types';
import '../styles/LoginPage.css';

const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isRegister, setIsRegister] = useState(false);
    
    const API_URL = import.meta.env.VITE_API_URL;
    

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isRegister && showEmailModal) {
            if (!username || !password || !email) {
                setError('Please enter both username, password, and email');
                return;
            }
        } else if (!isRegister) {
            if (!email || !password) {
                setError('Please enter both email and password');
                return;
            }
        }

        if (isRegister) {
            setShowEmailModal(true);
            return;
        }

        try {
            setIsLoggingIn(true);
            
            // Login logic
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });
            
            const loginData = await response.json();
            
            if (!response.ok) {
                throw new Error(loginData.error || loginData.message || 'Login failed. Please check your credentials.');
            }
            
            // Store token in localStorage
            if (loginData.token) {
                localStorage.setItem('token', loginData.token);
            }
            
            // Get username from response
            let username = '';
            
            // The API now returns { success: true, token, data: { username, ... } }
            if (loginData.data && loginData.data.username) {
                username = loginData.data.username;
            } else {
                // Fallback if username not in expected location
                username = email.split('@')[0];
            }
            
            // Store username for the App component
            localStorage.setItem('username', username);
            
            const loginBox = document.querySelector('.login-box');
            loginBox.classList.add('fade-out');
            
            setTimeout(() => {
                onLogin(username);
            }, 500);
            
        } catch (err) {
            setError(err.message || 'An error occurred');
            setIsLoggingIn(false);
        }
    };

    const handleRegistration = async () => {
        if (!email || !email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        try {
            setIsLoggingIn(true);
            
            // Registration logic
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password, email }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || data.message || 'Registration failed');
            }
            
            console.log('Registration successful');
            
            // Store token in localStorage
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
            
            // Get username from response or use the one from form
            const registeredUsername = (data.data && data.data.username) ? data.data.username : username;
            
            // Store username for the App component
            localStorage.setItem('username', registeredUsername);
            
            // Add fade-out animations
            const emailModal = document.querySelector('.email-modal-overlay');
            emailModal.classList.add('fade-out');
            const loginBox = document.querySelector('.login-box');
            loginBox.classList.add('fade-out');
            
            setTimeout(() => {
                onLogin(registeredUsername);
            }, 500);
            
        } catch (err) {
            setError(err.message || 'An error occurred');
            setIsLoggingIn(false);
            setShowEmailModal(false);
        }
    };

    const toggleMode = () => {
        setIsRegister(!isRegister);
        setError('');
        setPassword('');
        setShowEmailModal(false);
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
                            {
                                isRegister ? (
                                    <input
                                        className='username-input'
                                        type="text"
                                        placeholder="Username"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                    />
                                ) : (
                                    <input
                                        className='username-input'
                                        style={{ fontSize: '20px' }}
                                        type="text"
                                        placeholder="Email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                )
                            }
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

            {showEmailModal && (
                <div 
                    className="email-modal-overlay" 
                    onClick={(e) => {
                        // Close modal when clicking on the overlay background, not the modal itself
                        if (e.target.className === "email-modal-overlay") {
                            setShowEmailModal(false);
                            setError('');
                        }
                    }}
                >
                    <div className="email-modal">
                        <h2>Registration</h2>
                        <p>Please provide your email address to complete registration</p>
                        <div className="form-group">
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleRegistration();
                                    }
                                }}
                                autoFocus
                            />
                        </div>
                        {error && <div className="error-message">{error}</div>}
                        <div className="modal-buttons">
                            <button 
                                type="button" 
                                className="cancel-button"
                                onClick={() => {
                                    setShowEmailModal(false);
                                    setError('');
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="submit-button"
                                onClick={handleRegistration}
                            >
                                Complete Registration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

LoginPage.propTypes = {
    onLogin: PropTypes.func.isRequired
};

export default LoginPage;