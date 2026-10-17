require('dotenv').config();
// Import and run cron jobs
require('./config/cronJobs'); // ✅ Starts the recurring transaction scheduler

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const HTTP_STATUS = require('./constants/httpStatus');
const ERROR_MESSAGES = require('./constants/errorMessages');
const swaggerDocs = require('./config/swagger'); //  Added Swagger integration
const { protect, admin } = require('./middleware/authMiddleware'); // ✅ Import auth middleware

const app = express();

//  Connect to MongoDB Atlas
connectDB();

//  Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//  Swagger Documentation Route
swaggerDocs(app); //  Added Swagger setup

// Authentication Routes
app.use('/api/auth', require('./routes/authRoutes')); //  Added authentication routes

// ✅ Protected Dashboard Routes (Ensure authentication before accessing)
app.use('/api/dashboard', protect, require('./routes/dashboardRoutes')); // ✅ Protect dashboard routes

// ✅ Register Admin Routes
app.use('/api/admin', require('./routes/adminRoutes')); 
// ✅ Register Admin Routes (Category Spending Limits)
app.use('/api/admin', require('./routes/systemSettingsRoutes')); 
// ✅ Transactions Routes
app.use('/api/transactions', require('./routes/transactionRoutes'));

// ✅ Budget Routes
app.use('/api/budgets', protect, require('./routes/budgetRoutes'));
// ✅ Notifications Routes
app.use('/api/notifications', protect, require('./routes/notificationRoutes'));
// ✅ Goals Routes
app.use('/api/goals', protect, require('./routes/goalRoutes'));
// ✅ Reports Routes
app.use('/api/reports', protect, require('./routes/reportRoutes'));


//  Basic test route
app.get('/', (req, res) => {
    res.status(HTTP_STATUS.OK).json({ message: 'Personal Finance Tracker API' });
});

//  Handle undefined routes 404
app.use((req, res) => {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: 'Route not found' });
});

//  Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(HTTP_STATUS.SERVER_ERROR).json({ message: ERROR_MESSAGES.SERVER.INTERNAL_ERROR });
});

//  Set up the server to listen on the specified port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
