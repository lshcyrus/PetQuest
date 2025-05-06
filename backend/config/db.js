const mongoose = require('mongoose'); // Imports the Mongoose library
const config = require('./config'); // Imports configuration settings

const connectDB = async () => { // asynchronous function that attempts to connect to the MongoDB database 
// using the URI from the configuration settings
  try {
    await mongoose.connect(config.MONGO_URI); // Tries to establish a connection to the MongoDB
    console.log('MongoDB connected');
  } catch (err) { 
    console.error('MongoDB connection error:', err.message); // Logs an error message if the connection fails
    process.exit(1); // Exits the process with a failure code
  }
};

module.exports = connectDB; // Exports the connectDB function so it can be used in other parts of the application