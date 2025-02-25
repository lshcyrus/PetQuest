import { useState } from 'react';
import '../styles/LoginPage.css';

const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [isRegister, setIsRegister] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            setError('Please enter both username and password');
            return;
        }

        if (isRegister) {
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
            // Add your registration logic here
            // For now, we'll just simulate registration
            console.log('Registering new user:', username);
        }

        setIsLoggingIn(true);
        const loginBox = document.querySelector('.login-box');
        loginBox.classList.add('fade-out');

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
                <img src="/assets/logo.png" alt="pixel-fonts" border="0" />
            </div>

            <div className={`login-box ${isLoggingIn ? 'fade-out' : ''}`}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    {isRegister && (
                        <div className="form-group">
                            <input
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
                            {isRegister ? 'Already have an account? Login here' : 'New user? Register here'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;