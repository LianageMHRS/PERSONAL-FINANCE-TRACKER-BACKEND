const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const httpStatus = require('../constants/httpStatus');

/**
 * @desc   Get Admin Dashboard Data
 * @route  GET /api/dashboard/admin
 * @access Admin (Protected)
 */
exports.getAdminDashboard = async (req, res) => {
    try {
        // ✅ Ensure the user is authenticated and has admin privileges
        if (!req.user || req.user.role !== 'admin') {
            return res.status(httpStatus.FORBIDDEN).json({ error: "Access denied. Admins only." });
        }

        // Fetch all users (excluding passwords)
        const users = await User.find().select('-password').lean();

        // Fetch all transactions
        const transactions = await Transaction.find().lean();

        // Fetch all budgets
        const budgets = await Budget.find().lean();

        // Fetch all goals
        const goals = await Goal.find().lean();

        // Calculate totals
        const totalUsers = users.length;
        const totalTransactions = transactions.length;
        const totalIncome = transactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpenses = transactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const totalBudgets = budgets.length;
        const totalGoals = goals.length;

        // Return response
        res.status(httpStatus.OK).json({
            totalUsers,
            totalTransactions,
            totalIncome,
            totalExpenses,
            totalBudgets,
            totalGoals,
            users,
            transactions,
            budgets,
            goals,
            message: "Admin dashboard data retrieved successfully",
        });

    } catch (error) {
        console.error("Error fetching admin dashboard data:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching admin dashboard data. Please try again later." });
    }
};
/**
 * User Dashboard - Returns profile and relevant information
 */
/**
 * @desc   Get User Dashboard Data (Including Category-Wise Totals)
 * @route  GET /api/dashboard/user
 * @access User (Protected)
 */
exports.getUserDashboard = async (req, res) => {
    try {
        // ✅ Ensure the user is authenticated
        if (!req.user) {
            return res.status(httpStatus.UNAUTHORIZED).json({ error: "Unauthorized. Please log in." });
        }

        const userId = req.user._id;

        // Fetch recent transactions (last 5 transactions)
        const recentTransactions = await Transaction.find({ user: userId })
            .sort({ date: -1 })
            .limit(5)
            .lean();

        // Fetch current month's budget
        const today = new Date();
        const currentMonth = `${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}`;
        const budget = await Budget.findOne({ user: userId, month: currentMonth }).lean();

        // Fetch all goals
        const goals = await Goal.find({ user: userId }).lean();

        // ✅ Calculate total income & expenses
        const totalIncome = recentTransactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpenses = recentTransactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);

        // ✅ Category-wise breakdown for transactions
        const categoryWiseTotals = {};
        recentTransactions.forEach(tx => {
            if (!categoryWiseTotals[tx.category]) {
                categoryWiseTotals[tx.category] = { total: 0, type: tx.type };
            }
            categoryWiseTotals[tx.category].total += tx.amount;
        });

        // ✅ Convert category-wise data to an array for easier handling in frontend
        const categoryWiseSummary = Object.keys(categoryWiseTotals).map(category => ({
            category,
            type: categoryWiseTotals[category].type,
            total: categoryWiseTotals[category].total
        }));

        // ✅ Calculate budget status
        let budgetStatus = null;
        if (budget) {
            const percentSpent = (budget.spent / budget.totalBudget) * 100;
            budgetStatus = {
                totalBudget: budget.totalBudget,
                spent: budget.spent,
                remaining: budget.totalBudget - budget.spent,
                percentSpent: percentSpent.toFixed(2),
                status: percentSpent >= 100 ? 'exceeded' : percentSpent >= 75 ? 'warning' : 'good',
            };
        }

        // ✅ Calculate goal progress
        const goalProgress = goals.map(goal => ({
            name: goal.name,
            targetAmount: goal.targetAmount,
            currentAmount: goal.currentAmount,
            progressPercentage: ((goal.currentAmount / goal.targetAmount) * 100).toFixed(2),
        }));

        // ✅ Return response
        res.status(httpStatus.OK).json({
            recentTransactions,
            totalIncome,
            totalExpenses,
            categoryWiseSummary,  // Added category-wise data
            budgetStatus,
            goalProgress,
            message: "User dashboard data retrieved successfully",
        });

    } catch (error) {
        console.error("Error fetching user dashboard data:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching user dashboard data" });
    }
};
