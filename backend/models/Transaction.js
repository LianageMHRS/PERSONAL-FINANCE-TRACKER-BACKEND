const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['income', 'expense'],
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true,
        enum: ['USD', 'EUR', 'LKR', 'GBP', 'INR'] // Supported currencies
       
    },
    category: {
        type: String,
        enum: ['Food', 'Transport', 'Rent', 'Salary', 'Entertainment', 'Health', 'Bonus', 'Investment', 'Other'],
        required: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    date: {
        type: Date,
        default: Date.now
    },
    recurring: {
        isRecurring: { type: Boolean, default: false },
        frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], default: null },
        nextOccurrence: { type: Date }, // When should the next transaction be created
        endDate: { type: Date, default: null } // Optional end date
    }
}, { timestamps: true });

/**
 * Middleware to auto-update `nextOccurrence` for recurring transactions
 */
transactionSchema.pre('save', function (next) {
    if (this.recurring.isRecurring) {
        let nextOccurrence = new Date(this.date || Date.now());

        if (this.recurring.frequency === 'daily') nextOccurrence.setDate(nextOccurrence.getDate() + 1);
        if (this.recurring.frequency === 'weekly') nextOccurrence.setDate(nextOccurrence.getDate() + 7);
        if (this.recurring.frequency === 'monthly') nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
        if (this.recurring.frequency === 'yearly') nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);

        // ✅ Prevent transactions from continuing past the `endDate`
        if (this.recurring.endDate && nextOccurrence > this.recurring.endDate) {
            this.recurring.isRecurring = false; // Stop recurrence
            this.recurring.nextOccurrence = null;
        } else {
            this.recurring.nextOccurrence = nextOccurrence;
        }
    }
    next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
