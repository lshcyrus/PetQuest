require('dotenv').config(); // loads environment variables from a .env file into process.env,
// manage environment variables in a Node.js application

module.exports = {
  PORT: process.env.PORT, // The port number on which the server will run
  MONGO_URI: process.env.MONGO_URI, // The URI for connecting to a MongoDB database
  JWT_SECRET: process.env.JWT_SECRET, // secret key used for signing JSON Web Tokens (JWT)
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d', // The expiration time for JWTs or defaulting to '7 days' if not set
  NODE_ENV: process.env.NODE_ENV // environment in which the application is running
};