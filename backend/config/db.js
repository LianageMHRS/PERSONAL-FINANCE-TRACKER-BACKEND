const mongoose = require('mongoose');
require('dotenv').config();
const ERROR_MESSAGES = require('../constants/errorMessages');

const connectDB = async () => {
    try {
        // Connect to MongoDB Atlas using the URI from .env file
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ ${ERROR_MESSAGES.DATABASE.CONNECTION_ERROR}: ${error.message}`);
        process.exit(1); // Exit process if connection fails
    }
};

// Handle MongoDB connection errors
mongoose.connection.on('error', (error) => {
    console.error(`❌ ${ERROR_MESSAGES.DATABASE.CONNECTION_ERROR}: ${error.message}`);
});

// Handle when MongoDB is disconnected
mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
});

// Handle application shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🛑 MongoDB connection closed');
    process.exit(0);
});

module.exports = connectDB;
