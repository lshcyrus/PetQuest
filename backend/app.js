const express = require('express'); // Imports the Express framework for building web applications
const cors = require('cors'); // Imports the CORS (Cross-Origin Resource Sharing) middleware to enable cross-origin requests
const helmet = require('helmet'); // help secure the app by setting various HTTP headers
const morgan = require('morgan'); // HTTP request logger middleware
const routes = require('./routes'); // application's route handlers
const errorHandler = require('./middleware/errorHandler'); // custom error handling middleware

const app = express(); // Initializes an Express application instance

// Middleware
app.use(express.json()); // Parses incoming JSON requests and puts the parsed data
app.use(cors()); // Enables CORS for all routes
app.use(helmet()); // Adds security-related HTTP headers to the responses
app.use(morgan('dev')); // Logs HTTP requests to the console in the 'dev' format

// Routes
app.use('/api', routes); // Mounts the route handlers on the /api path

// Error handler
app.use(errorHandler); // Uses the custom error handling middleware to handle errors in the application

module.exports = app; // Exports the Express application instance for use in other parts of the application