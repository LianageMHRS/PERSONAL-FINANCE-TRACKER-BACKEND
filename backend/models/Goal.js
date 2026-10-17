const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    targetAmount: { 
        type: Number, 
        required: true 
    },
    currentAmount: { 
        type: Number, 
        default: 0 
    },
    currency: {
        type: String,
        required: true,
        enum: ['USD', 'EUR', 'LKR', 'GBP', 'INR']
        
    },
    deadline: { 
        type: Date 
    },
    autoAllocate: { 
        type: Boolean, 
        default: false 
    },
    allocationPercentage: { 
        type: Number, 
        default: 0 
    },
    reminderSent: { 
        type: Boolean, 
        default: false 
    } // Track reminder status
}, { timestamps: true });

module.exports = mongoose.model("Goal", goalSchema);

