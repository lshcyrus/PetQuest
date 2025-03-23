const jwt = require('jsonwebtoken');
const config = require('../config/config.js');
const User = require('../models/userModel.js');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;
  
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authorized, no token provided' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET);
    console.log('Token decoded successfully:', decoded);
    
    // Find user by ID
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found with the provided token ID'
      });
    }
    
    // Attach user to request
    req.user = user;
    console.log('User attached to request:', user._id.toString());
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired' 
      });
    }
    
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format in token'
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: `Server error: ${err.message}` 
    });
  }
};