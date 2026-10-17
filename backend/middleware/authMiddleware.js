const jwt = require('jsonwebtoken');
const User = require('../models/User');
const httpStatus = require('../constants/httpStatus');
const errorMessages = require('../constants/errorMessages');

/**
 * Middleware to protect routes by requiring a valid JWT token
 */

exports.protect = async (req, res, next) => {
    let token;
    // Check if Authorization header contains "Bearer token"
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(httpStatus.UNAUTHORIZED).json({ error: errorMessages.AUTH.INVALID_TOKEN });
    }
    // Verify the token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.userId) {
            return res.status(httpStatus.UNAUTHORIZED).json({ error: errorMessages.AUTH.INVALID_TOKEN });
        }
        req.user = await User.findById(decoded.userId).select('-password');
        // If user does not exist (perhaps deleted), return an unauthorized error
        if (!req.user) {
            return res.status(httpStatus.UNAUTHORIZED).json({ error: errorMessages.AUTH.INVALID_TOKEN });
        }

        // Proceed to the next middleware
        next();
    } catch (error) {
        res.status(httpStatus.UNAUTHORIZED).json({ error: errorMessages.AUTH.INVALID_TOKEN }); // Handle invalid token or verification failure
    }
};

/**
 * Middleware to restrict access to admin-only routes
 *///(!req.user || req.user.role !== 'admin')

exports.admin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(httpStatus.FORBIDDEN).json({ error: errorMessages.AUTH.UNAUTHORIZED });
    }
    next();
};
