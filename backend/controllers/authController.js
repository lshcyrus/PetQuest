const User = require('../models/userModel.js');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    
    // Create user
    const user = await User.create({
      username,
      email,
      password
    });
    
    // Create token
    sendTokenResponse(user, 201, res); // 201 status code indicates that the resource was successfully created
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    // Check if username/email and password are provided
    if ((!email && !username) || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a username or email and password'
      });
    }
    // Find user by email or username
    let user;
    if (email) {
      user = await User.findOne({ email }).select('+password');
    } else if (username) {
      user = await User.findOne({ username }).select('+password');
    }
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    // Create token
    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: {} // here to clear the data
  });
};

// Helper function to get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  try {
    // Create token
    const token = user.getSignedJwtToken();
    
    // Send back user data without password
    const userData = {
      _id: user._id,
      username: user.username,
      email: user.email,
      hasSelectedPet: user.hasSelectedPet || false,
      createdAt: user.createdAt
    };
    
    console.log('Login successful for user:', userData.username);
    
    res.status(statusCode).json({
      success: true,
      token,
      data: userData
    });
  } catch (error) {
    console.error('Error in sendTokenResponse:', error);
    res.status(500).json({
      success: false,
      error: 'Error generating authentication token'
    });
  }
};