const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // hashing passwords
const jwt = require('jsonwebtoken'); // creating and verifying JSON Web Tokens
const config = require('../config/config.js'); // Imports configuration settings

const UserSchema = new mongoose.Schema({ // Define the User Schema
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true, // used to remove any leading and trailing whitespace from strings
    minlength: [3, 'Username must be at least 3 characters long']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 
      // ^\w+: Ensures the email starts with one or more word characters
      // ([\.-]?\w+)*: Allows for periods or hyphens followed by more word characters, zero or more times.
      // @\w+: Requires an "@" symbol followed by one or more word characters.
      // (\.\w{2,3})+: Ensures a dot followed by 2 to 3 word characters (like ".com" or ".net").
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Excludes the password field from query results by default for security reasons.
  },
  hasSelectedPet: {
    type: Boolean,
    default: false
  },
  //////////////////////////////////////////////////////////////////////////////
  // changable for futher game development
  currency: {
    coins: {
      type: Number,
      default: 100
    },
    gems: {
      type: Number,
      default: 5
    }
  },
  inventory: [{
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item'
    },
    quantity: {
      type: Number,
      default: 1
    }
  }],
  //////////////////////////////////////////////////////////////////////////////
  createdAt: { // store the date and time
    type: Date,
    default: Date.now
  }
});

// Encrypt password before saving
UserSchema.pre('save', async function(next) { // sets up a pre-save hook on the User schema
// The function inside will run before the document is saved to the database
  if (!this.isModified('password')) { // checks if the password field has been modified. 
  // If not, it calls next() to proceed without making any changes
    next();
  }
  
  const salt = await bcrypt.genSalt(10); // generates a salt using bcrypt with a cost factor of 10
  this.password = await bcrypt.hash(this.password, salt); // hashes the password with the generated salt and assigns the hashed password back to the password field
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE
  });
};

// Match password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);