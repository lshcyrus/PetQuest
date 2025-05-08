const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    
    // Log error for server
    console.error(err);
    
    // Mongoose duplicate key
    if (err.code === 11000) {
      const message = 'Duplicate field value entered';
      error = { message };
    }
    
    // Mongoose validation error
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(val => val.message);
      error = { message };
    }
    
    res.status(error.statusCode || 500).json({ //Internal Server Error
      success: false,
      error: error.message || 'Server Error'
    });
  };
  
  module.exports = errorHandler;