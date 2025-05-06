// Script to seed potion items into the database
const mongoose = require('mongoose');
require('dotenv').config();

// Import Item model
const Item = require('./models/itemModel');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define potion items
const potionItems = [
  {
    name: 'hp-potion',
    displayName: 'HP Potion',
    description: 'A potion that increases HP by 50',
    type: 'medicine',
    effects: {
      health: 50,
      sp: 0
    },
    rarity: 'common',
    price: {
      coins: 100,
      gems: 0
    },
    image: 'hp-potion.png'
  },
  {
    name: 'sp-potion',
    displayName: 'SP Potion',
    description: 'A potion that increases SP by 30',
    type: 'medicine',
    effects: {
      health: 0,
      sp: 30
    },
    rarity: 'common',
    price: {
      coins: 100,
      gems: 0
    },
    image: 'sp-potion.png'
  },
  {
    name: 'mixed-potion',
    displayName: 'Mixed Potion',
    description: 'A potion that increases both HP and SP by 40',
    type: 'medicine',
    effects: {
      health: 40,
      sp: 40
    },
    rarity: 'uncommon',
    price: {
      coins: 200,
      gems: 0
    },
    image: 'mixed-potion.png'
  },
  {
    name: 'best-potion',
    displayName: 'Best Potion',
    description: 'A potion that fully recovers HP and SP',
    type: 'medicine',
    effects: {
      health: 5000, // Special value handled in the controller to fully heal
      sp: 1000      // Special value handled in the controller to fully restore SP
    },
    rarity: 'rare',
    price: {
      coins: 500,
      gems: 0
    },
    image: 'best-potion.png'
  }
];

const toyItems = [
  {
    name: 'chess',
    displayName: 'Chess',
    description: 'Play chess with your pet',
    type: 'toy',
    effects: {
      happiness: 10
    },
    rarity: 'common',
    price: {
      coins: 100,
      gems: 0
    },
    image: 'chess.png'
  },
  {
    name: 'feather',
    displayName: 'Feather',
    description: 'A feather that your pet can play with',
    type: 'toy',
    effects: {
      happiness: 10
    },
    rarity: 'common',
    price: {
      coins: 100,
      gems: 0
    },
    image: 'feather.png'
  },
  {
    name: 'cup',
    displayName: 'Cup',
    description: 'A cup that your pet can play with',
    type: 'toy',
    effects: {
      happiness: 10
    },
    rarity: 'uncommon',
    price: {
      coins: 200,
      gems: 0
    },
    image: 'cup.png'
  }
]

// Insert potion items into database
const seedItems = async () => {
  try {
    // First check what medicine items exist
    const existingItems = await Item.find({ type: 'medicine' });
    console.log('Existing medicine items:', existingItems.length);
    existingItems.forEach(item => console.log(`- ${item.name}: ${item._id}`));
    
    const existingToyItems = await Item.find({ type: 'toy' });
    console.log('Existing toy items:', existingToyItems.length);
    existingToyItems.forEach(item => console.log(`- ${item.name}: ${item._id}`));
    
    // Delete all medicine items
    await Item.deleteMany({ type: 'medicine' });
    console.log('Cleared all existing medicine items');

    // Delete all toy items
    await Item.deleteMany({ type: 'toy' });
    console.log('Cleared all existing toy items');
    
    // Insert new items
    const result = await Item.insertMany(potionItems);
    const result2 = await Item.insertMany(toyItems);
    console.log(`✅ Added ${result.length} potion items to database`);
    console.log(`✅ Added ${result2.length} toy items to database`);
    
    // List all items to verify
    const allItems = await Item.find();
    console.log(`Total items in database: ${allItems.length}`);
    allItems.forEach(item => console.log(`- ${item.name}: ${item.type} - Price: ${JSON.stringify(item.price)}`));
    
    mongoose.disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error seeding items:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

// Run the seed function
seedItems(); 