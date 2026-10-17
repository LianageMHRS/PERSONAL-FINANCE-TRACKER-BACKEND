const SystemSettings = require("../models/SystemSettings.js");
const httpStatus = require("../constants/httpStatus.js");

/**
 * @desc   Create or Update Spending Limit for a Category
 * @route  POST /api/admin/category-limit
 * @access Admin (Protected)
 */
exports.setCategoryLimit = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(httpStatus.FORBIDDEN).json({ error: "Access denied. Admins only." });
    }

    const { category, spendingLimit } = req.body;

    // ✅ Validate input
    if (!category || typeof category !== "string") {
      return res.status(httpStatus.BAD_REQUEST).json({ error: "Category is required and must be a string." });
    }

    if (!spendingLimit || typeof spendingLimit !== "number" || spendingLimit <= 0) {
      return res.status(httpStatus.BAD_REQUEST).json({ error: "Spending limit must be a positive number." });
    }

    // ✅ Convert category to lowercase for consistency
    const categoryName = category.trim().toLowerCase();

    // ✅ Find and update or create new category limit
    const updatedSetting = await SystemSettings.findOneAndUpdate(
      { category: categoryName },
      { spendingLimit },
      { new: true, upsert: true } // Create if not found
    );

    res.status(httpStatus.OK).json({
      message: `Spending limit for '${category}' updated successfully`,
      setting: updatedSetting,
    });

  } catch (error) {
    console.error("Error updating category limit:", error);
    res.status(httpStatus.SERVER_ERROR).json({ error: "Error updating category limit. Please try again later." });
  }
};

/**
 * @desc   Get All Category Limits
 * @route  GET /api/admin/category-limits
 * @access Admin (Protected)
 */
exports.getCategoryLimits = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(httpStatus.FORBIDDEN).json({ error: "Access denied. Admins only." });
    }

    const categoryLimits = await SystemSettings.find().lean();

    res.status(httpStatus.OK).json({ categoryLimits });

  } catch (error) {
    console.error("Error fetching category limits:", error);
    res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching category limits." });
  }
};