const User = require('../models/User');
const httpStatus = require('../constants/httpStatus');
const errorMessages = require('../constants/errorMessages');

/**
 * Get all regular users (Admin only)
 */
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('-password'); // Exclude password
        res.status(httpStatus.OK).json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching users" });
    }
};

/**
 * Get user by ID (Admin only)
 */
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password'); // Exclude password

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "User not found" });
        }
        
        res.status(httpStatus.OK).json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching user" });
    }
};

/**
 * Update user details (Admin only) - Cannot update other admins
 */
exports.updateUser = async (req, res) => {
    try {
        const { name, email, role } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "User not found" });
        }

        // Prevent admin from updating other admins
        if (user.role === 'admin') {
            return res.status(httpStatus.FORBIDDEN).json({ error: "Cannot update other admins" });
        }

        // Validate new email format if provided
        if (email) {
            const emailRegex = /^\S+@\S+\.\S+$/;
            if (!emailRegex.test(email)) {
                return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid email format" });
            }
        }

        // Ensure the role can only be changed to "user" or "admin"
        if (role && !["user", "admin"].includes(role)) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid role assignment" });
        }

        // Update user fields
        user.name = name || user.name;
        user.email = email || user.email;
        user.role = role || user.role;

        await user.save();
        res.status(httpStatus.OK).json({ message: "User updated successfully" });

    } catch (error) {
        console.error("Error updating user:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error updating user" });
    }
};

/**
 * Delete a user (Admin only) - Cannot delete other admins
 */
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "User not found" });
        }

        // Prevent admin from deleting other admins
        if (user.role === 'admin') {
            return res.status(httpStatus.FORBIDDEN).json({ error: "Cannot delete other admins" });
        }

        await user.deleteOne();
        res.status(httpStatus.OK).json({ message: "User deleted successfully" });

    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error deleting user" });
    }
};

/**
 * Get Admin Profile (Admin only)
 */
exports.getAdminProfile = async (req, res) => {
    try {
        // Ensure the user is an admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(httpStatus.FORBIDDEN).json({ error: "Access denied. Admins only." });
        }

        // Retrieve admin details (excluding password)
        const admin = await User.findById(req.user._id).select('-password');

        if (!admin) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "Admin not found. Please log in again." });
        }

        res.status(httpStatus.OK).json({
            admin,
            message: "Admin profile retrieved successfully"
        });

    } catch (error) {
        console.error("Error fetching admin profile:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching admin profile" });
    }
};
