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
    species: {
        type: String,
        required: true,
        enum: ["dog", "cat", "dragon"]
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
            default: 0
        },
        agility: {
            type: Number,
            default: 0  
        },
        intelligence: {
            type: Number,
            default: 0
        }
    },

    lastFed: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Pet = mongoose.model("Pet", petSchema);

module.exports = Pet;
