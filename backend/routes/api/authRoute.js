const express = require('express'); // express is for building web applications
const router = express.Router(); // creates a new router object to handle routes
const { 
  register, // handle user registration
  login, // handles user authentication
  getMe, // retrieve the current user's information
  logout // handles user logout
} = require('backend/controllers/authController.js');
const { protect } = require('backend/middleware/auth.js'); // protect routes that require authentication
const { 
  validateRegister, // validate the data provided during user registration
  validateLogin, // validate the data provided during user login
  validateResults // handle the results of the validation process
} = require('backend/middleware/validators.js');

// POST route for user registration
router.post('/register', validateRegister, validateResults, register);
// first two is validate the registration data.
// last one is handles the registration logic

// POST route for user login
router.post('/login', validateLogin, validateResults, login);
// first two is validate the login data.
// last one is handles the login logic

// GET route to fetch the current user's information
router.get('/me', protect, getMe);
// protect : checks if the user is authenticated
// getMe : retrieves the user's data

// GET route for logging out the user
router.get('/logout', protect, logout);
// protect : ensures the user is authenticated before allowing them to log out.
// logout : handles the logout process

module.exports = router; // exports the router object