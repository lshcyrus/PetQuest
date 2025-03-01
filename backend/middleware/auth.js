const jwt = require('jsonwebtoken');
const config = require('backend/config/config.js');
const User = require('backend/models/userModel.js');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;
  
  if ( //Checks if the Authorization header exists and starts with "Bearer". 
  // If so, it extracts the token from the header
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
      error: 'Not authorized to access this route' 
    });
  }
  
  try {
    // Verifies the token using the secret key
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // Finds the user by the ID decoded from the token and attaches the user to the request object
    req.user = await User.findById(decoded.id);
    
    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false, 
      error: 'Not authorized to access this route' 
    });
  }
};