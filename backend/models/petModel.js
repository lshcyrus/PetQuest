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
    key: {
        type: String,
        default: "badger" // Default pet type key for frontend rendering
    },
    level: {
        type: Number,
        default: 1
    },
    experience: {
        type: Number,
        default: 0
    },
    // New stats field for frontend rendering
    stats: {
        hp: { type: Number, required: true, default: 500 },
        sp: { type: Number, required: true, default: 100 },
        atk: { type: Number, required: true, default: 100 },
        def: { type: Number, required: true, default: 100 }
    },
    // Current HP and SP values
    currentHP: { 
        type: Number,
        default: function() { return this.stats.hp; } // Default to max HP
    },
    currentSP: { 
        type: Number,
        default: function() { return this.stats.sp; } // Default to max SP
    },
    // Active temporary buffs from outdoor activity 
    activeBuffs: {
        stats: {
            hp: { type: Number },
            sp: { type: Number },
            atk: { type: Number },
            def: { type: Number }
        },
        expiresAt: { type: Date }
    },
    // Old attributes, remove health
    attributes: {
        happiness: {
            type: Number,
            default: 100
        },
        hunger: {
            type: Number,
            default: 50
        },
        cleanliness: {
            type: Number,
            default: 50    
        },
        stamina: {
            type: Number,
            default: 100
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
    
    // Update stamina recovery
    this.attributes.stamina = Math.min(100, this.attributes.stamina + (hoursSinceLastInteraction * 15));
    
    // Update timestamps
    this.lastFed = now;
    this.lastInteraction = now;
    
    return this.save();
};

module.exports = mongoose.model("Pet", petSchema);