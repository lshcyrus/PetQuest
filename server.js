const app = require('./app'); // imports the main application
const config = require('backend/config/config.js'); // imports configuration settings
const connectDB = require('backend/config/db.js'); // imports a function to connect to the database

// Connect to database
connectDB();

const PORT = config.PORT || 5000; //sets the port number for the server to listen on; 
// uses the port number from the configuration file (config.PORT) if available, otherwise defaults to 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`); //starts the server and listens on the specified port
});

