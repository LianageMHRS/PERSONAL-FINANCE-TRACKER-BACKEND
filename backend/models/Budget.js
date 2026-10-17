const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    month: { 
        type: String, 
        required: true 
    },
    totalBudget: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    categoryBudgets: [
        {
            category: { type: String, required: true },
            amount: { type: Number, required: true, min: 0 },
            spent: { type: Number, default: 0, min: 0 },
            recommendedAdjustment: { type: Number, default: 0 } // Positive for increase, negative for decrease
        }
    ],
    spent: { type: Number, default: 0, min: 0 }, // Tracks total spending for the month
    currency: {
        type: String,
        required: true,
        enum: ['USD', 'EUR', 'LKR', 'GBP', 'INR']
      
    },
    alerts: {
        warning: { type: Boolean, default: false }, // 75% spent alert
        critical: { type: Boolean, default: false }, // 100% spent alert
        notifications: [{ // History of alert notifications
            type: { type: String, enum: ['warning', 'critical', 'category'] },
            message: { type: String },
            category: { type: String },
            createdAt: { type: Date, default: Date.now }
        }]
    },
    recommendations: {
        suggestedIncrease: { type: Number, default: 0 }, // If overspending
        suggestedDecrease: { type: Number, default: 0 }, // If underspending
        reason: { type: String, default: '' }
    },
    history: [{ // Track budget changes over time
        totalBudget: { type: Number },
        spent: { type: Number },
        date: { type: Date, default: Date.now },
        note: { type: String }
    }]
}, { timestamps: true });

// Create compound index for user and month to ensure uniqueness
budgetSchema.index({ user: 1, month: 1 }, { unique: true });

// Pre-save middleware to update history when budget is modified
budgetSchema.pre('save', function(next) {
    // If this is an update (not a new document) and totalBudget or spent has changed
    if (!this.isNew && (this.isModified('totalBudget') || this.isModified('spent'))) {
        this.history.push({
            totalBudget: this.totalBudget,
            spent: this.spent,
            date: new Date(),
            note: this.isModified('totalBudget') ? 'Budget amount updated' : 'Spending updated'
        });
    }
    next();
});

module.exports = mongoose.model('Budget', budgetSchema);