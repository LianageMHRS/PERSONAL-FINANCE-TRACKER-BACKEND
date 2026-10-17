const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['budget_alert', 'transaction_alert', 'goal_alert'],
        required: true
    },
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'info'
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'relatedModel',
        default: null
    }, 
    relatedModel: {
        type: String,
        enum: ['Budget', 'Transaction', 'Goal'],
        default: null
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '30d'  // Auto-delete after 30 days
    }
}, { timestamps: true });

// Index for faster queries
notificationSchema.index({ user: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
