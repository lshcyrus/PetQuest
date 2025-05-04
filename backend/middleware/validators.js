// sets up validation middleware using express-validator for various routes 
const { body, validationResult } = require('express-validator'); 

exports.validateRegister = [
  body('username').trim().isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters long'),
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

exports.validateLogin = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').exists().withMessage('Password is required')
];

exports.validatePetCreation = [
  body('name').trim().isLength({ min: 1 })
    .withMessage('Pet name is required'),
  body('key').optional() // Make key optional, it has a default in the schema
    .isString()
    .withMessage('Invalid pet key format')
];

exports.validatePetRename = [
  body('name').trim().isLength({ min: 1, max: 20 })
    .withMessage('Pet name must be between 1 and 20 characters')
];

// Defines a middleware function to handle validation results
exports.validateResults = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }
  
  next();
};