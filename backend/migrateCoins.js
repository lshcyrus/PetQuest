// Migration script to update user coin structure
const mongoose = require('mongoose');
require('dotenv').config();

// Import User model
const User = require('./models/userModel');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Migrate user currency structure
const migrateCoins = async () => {
  try {
    // Find all users that have the old currency structure
    const users = await User.find({
      'currency.coins': { $exists: true }
    });
    
    console.log(`Found ${users.length} users with old currency structure`);
    
    // Update each user
    for (const user of users) {
      // Check if they have the old currency structure
      if (user.currency && user.currency.coins !== undefined) {
        // Transfer coins from currency.coins to top-level coins
        const oldCoins = user.currency.coins || 0;
        
        // Set the new coins field
        user.coins = oldCoins;
        
        // Save the user with the updated structure
        await user.save();
        console.log(`Updated user ${user.username}: ${oldCoins} coins`);
      }
    }
    
    console.log('Migration complete!');
    mongoose.disconnect();
  } catch (error) {
    console.error('Error during migration:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

// Run the migration
migrateCoins(); 