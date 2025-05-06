const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide an item name'],
    unique: true,
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Please specify the item type'],
    enum: ['food', 'toy', 'medicine', 'equipment', 'cosmetic']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description']
  },
  effects: {
    hunger: {
      type: Number,
      default: 0
    },
    happiness: {
      type: Number,
      default: 0
    },
    health: {
      type: Number,
      default: 0
    },
    stamina: {
      type: Number,
      default: 0
    },
    experience: {
      type: Number,
      default: 0
    },
    sp: {
      type: Number,
      default: 0
    }
  },
  price: {
    coins: {
      type: Number,
      default: 0
    },
    gems: {
      type: Number,
      default: 0
    }
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Item', ItemSchema);