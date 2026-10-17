const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const successMessages = require('../constants/successMessages');
const errorMessages = require('../constants/errorMessages');
const httpStatus = require('../constants/httpStatus');
require('dotenv').config();

//  Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
        { userId: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
};

//  REGISTER USER (with proper validation & security)
exports.register = async (req, res) => {
    try {
        let { name, email, password, role } = req.body;

        // Standardize Email (convert to lowercase)
        email = email.toLowerCase();

        //  Validation: Check if all fields are provided
        if (!name || !email || !password) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "All fields are required" });
        }

        //  Validation: Email format
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email)) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid email format" });
        }

        //  Validation: Password security (min 8 chars, uppercase, lowercase, number, special char)
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                error: "Password must be at least 8 characters, include uppercase, lowercase, a number, and a special character"
            });
        }

        //  Check if user already exists
        if (await User.findOne({ email })) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: errorMessages.AUTH.EMAIL_EXISTS });
        }

        //  Hash password before saving
       // const salt = await bcrypt.genSalt(10);
        //const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({ name, email, password, role });
        await user.save();

        res.status(httpStatus.CREATED).json({
           message: successMessages.AUTH.REGISTER
        });

    } catch (error) {
        res.status(httpStatus.SERVER_ERROR).json({ error: error.message });
    }
};

//  LOGIN USER (with improved security)
exports.login = async (req, res) => {
    try {
        let { email, password } = req.body;

        // Convert email to lowercase to avoid case sensitivity issues
        email = email.toLowerCase();

        // Validation: Check if email and password are provided
        if (!email || !password) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Email and password are required" });
        }

        // Find user by email
        const user = await User.findOne({ email });

        // If user not found or password is incorrect
        if (!user) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid email or password" });
        }

        // Verify password with bcrypt
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid email or password" });
        }

        // Generate JWT Token
        const token = generateToken(user);

        res.status(httpStatus.OK).json({
            token,
            role: user.role,
            message: successMessages.AUTH.LOGIN
        });

    } catch (error) {
        res.status(httpStatus.SERVER_ERROR).json({ error: error.message });
    }
};

//  LOGOUT (Frontend removes token)
exports.logout = (req, res) => {
    res.status(httpStatus.OK).json({ message: successMessages.AUTH.LOGOUT });
};
