const mongoose = require("mongoose");

const petSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    name: {
        type: String,
        required: [true, "Please enter pet name"],
        trim: true
    },
    // Make species optional with a default value
    species: {
        type: String,
        required: false,
        default: "dragon",
        enum: ["dog", "cat", "dragon", "phoenix", "unicorn"]
    },
    key: {
        type: String,
        default: "fire_dragon" // Default pet type key for frontend rendering
    },
    level: {
        type: Number,
        default: 1
    },
    experience: {
        type: Number,
        default: 0
    },

    attributes: {
        health: {
            type: Number,
            default: 100
        },
        happiness: {
            type: Number,
            default: 100
        },
        hunger: {
            type: Number,
            default: 100
        },
        cleanliness: {
            type: Number,
            default: 100    
        },
        energy: {
            type: Number,
            default: 100
        }
    },

    skills: {
        strength: {
            type: Number,
            default: 10
        },
        agility: {
            type: Number,
            default: 10 
        },
        intelligence: {
            type: Number,
            default: 10
        }
    },

    lastFed: {
        type: Date,
        default: Date.now
    },

    lastInteraction: {
        type: Date,
        default: Date.now
    },

    completedQuests: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quest"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Method to update pet stats based on time passed, making the game more realistic (works when player is offline)
petSchema.methods.updateStats = function() {
    const now = new Date();
    const hoursSinceLastFed = (now - this.lastFed) / (1000 * 60 * 60);
    const hoursSinceLastInteraction = (now - this.lastInteraction) / (1000 * 60 * 60);
    
    // Decrease hunger and happiness over time
    this.attributes.hunger = Math.max(0, this.attributes.hunger - (hoursSinceLastFed * 5));
    this.attributes.happiness = Math.max(0, this.attributes.happiness - (hoursSinceLastInteraction * 3));
    
    // Update health based on hunger and happiness
    if (this.attributes.hunger < 20 || this.attributes.happiness < 20) {
      this.attributes.health = Math.max(0, this.attributes.health - 5);
    }
    
    // Update energy recovery
    this.attributes.energy = Math.min(100, this.attributes.energy + (hoursSinceLastInteraction * 15));
    
    // Update timestamps
    this.lastFed = now;
    this.lastInteraction = now;
    
    return this.save();
};

module.exports = mongoose.model("Pet", petSchema);