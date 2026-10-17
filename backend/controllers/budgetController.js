const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const { createNotification } = require('./notificationController'); // Import the notification controller
const { convertCurrency } = require("../services/currencyService");
const httpStatus = require('../constants/httpStatus');

/**
 * Create a new budget
 */
exports.createBudget = async (req, res) => {
    try {
        let { month, totalBudget, categoryBudgets, currency } = req.body;
        const allowedCurrencies = ['USD', 'EUR', 'LKR', 'GBP', 'INR'];
        if (!currency) {
            currency = 'USD'; // ✅ Default to USD if currency is not provided
        } else if (!allowedCurrencies.includes(currency)) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                error: "Invalid currency. Allowed currencies: USD, EUR, LKR, GBP, INR." 
            });
        }
        // ✅ Fix: Ensure month is in "Month YYYY" format
        const formattedMonth = new Date(month).toLocaleString('default', { month: 'long' }) + ' ' + new Date(month).getFullYear();

        // ✅ Fix: Prevent duplicate budgets with same format
        const existingBudget = await Budget.findOne({ user: req.user._id.toString(), month: formattedMonth });
        if (existingBudget) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Budget for this month already exists." });
        }

        // ✅ Fix: Validate category budgets
        if (!Array.isArray(categoryBudgets) || categoryBudgets.length === 0) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Category budgets are required." });
        }

        // ✅ Fix: Validate that sum of category budgets does not exceed total budget
        const categoryTotal = categoryBudgets.reduce((sum, category) => sum + category.amount, 0);
        if (categoryTotal > totalBudget) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                error: "Sum of category budgets exceeds total budget.",
                categoryTotal,
                totalBudget
            });
        }

        const budget = new Budget({
            user: req.user._id.toString(),
            month: formattedMonth, // ✅ Store correct month format
            totalBudget,
            currency,
            categoryBudgets
        });

        await budget.save();
        res.status(httpStatus.CREATED).json({ message: "Budget created successfully", budget });

    } catch (error) {
        console.error("❌ Error creating budget:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error creating budget" });
    }
};

/**
 * Get budgets for the logged-in user
 */
exports.getBudgets = async (req, res) => {
    try {
        const budgets = await Budget.find({ user: req.user._id });
        res.status(httpStatus.OK).json(budgets);

    } catch (error) {
        console.error("Error fetching budgets:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching budgets" });
    }
};

/**
 * Get a specific budget by ID
 */
exports.getBudgetById = async (req, res) => {
    try {
        const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });

        if (!budget) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "Budget not found" });
        }

        res.status(httpStatus.OK).json(budget);
    } catch (error) {
        console.error("Error fetching budget:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching budget" });
    }
};

/**
 * Update a budget
 */
exports.updateBudget = async (req, res) => {
    try {
        const { totalBudget, categoryBudgets, currency } = req.body;
        const budget = await Budget.findOne({ _id: req.params.id, user: req.user._id });

        if (!budget) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "Budget not found" });
        }
       // ✅ If the user changes currency, we need to convert all values
       if (currency && currency !== budget.currency) {
        try {
            console.log(`🔄 Converting budget from ${budget.currency} to ${currency}...`);

            // Convert total budget
            const convertedTotalBudget = await convertCurrency(budget.totalBudget, budget.currency, currency);

            // Convert total spent
            const convertedSpent = await convertCurrency(budget.spent, budget.currency, currency);

            // Convert category budgets
            const convertedCategoryBudgets = await Promise.all(
                budget.categoryBudgets.map(async (category) => {
                    const convertedAmount = await convertCurrency(category.amount, budget.currency, currency);
                    const convertedSpent = await convertCurrency(category.spent, budget.currency, currency);
                    return {
                        ...category.toObject(),
                        amount: convertedAmount,
                        spent: convertedSpent
                    };
                })
            );

            // ✅ Apply changes
            budget.currency = currency;
            budget.totalBudget = convertedTotalBudget;
            budget.spent = convertedSpent;
            budget.categoryBudgets = convertedCategoryBudgets;

        // ✅ Convert Past Transactions to New Currency
        const transactions = await Transaction.find({ 
            user: budget.user, 
            date: { 
                $gte: new Date(`${budget.month} 1`), 
                $lt: new Date(`${budget.month} 31`) 
            } 
        });

        await Promise.all(transactions.map(async (transaction) => {
            try {
                transaction.amount = await convertCurrency(transaction.amount, transaction.currency, budget.currency);
                transaction.currency = budget.currency;
                await transaction.save();
            } catch (error) {
                console.error(`❌ Error converting transaction ${transaction._id} currency:`, error.message);
            }
        }));

        console.log(`✅ All past transactions updated to ${currency}.`);

    } catch (error) {
        console.error("❌ Error converting budget currency:", error.message);
        return res.status(httpStatus.SERVER_ERROR).json({ error: "Error converting budget currency." });
    }
}


        if (totalBudget && categoryBudgets) {
            // Validate that the sum of category budgets doesn't exceed total budget
            const categoryTotal = categoryBudgets.reduce((sum, category) => sum + category.amount, 0);
            if (categoryTotal > totalBudget) {
                return res.status(httpStatus.BAD_REQUEST).json({ 
                    error: "Sum of category budgets exceeds total budget.",
                    categoryTotal,
                    totalBudget
                });
            }
        }

        budget.totalBudget = totalBudget || budget.totalBudget;
        budget.categoryBudgets = categoryBudgets || budget.categoryBudgets;

        // Reset alert flags if budget amounts are updated
        if (totalBudget || categoryBudgets) {
            budget.alerts = { warning: false, critical: false };
            
            // Recalculate recommendations based on new budget amounts
            await updateBudgetRecommendations(budget);
        }

        await budget.save();
        res.status(httpStatus.OK).json({ message: "Budget updated successfully", budget });

    } catch (error) {
        console.error("Error updating budget:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error updating budget" });
    }
};

/**
 * Delete a budget
 */
exports.deleteBudget = async (req, res) => {
    try {
        const budget = await Budget.findOneAndDelete({ _id: req.params.id, user: req.user._id });

        if (!budget) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "Budget not found" });
        }

        res.status(httpStatus.OK).json({ message: "Budget deleted successfully" });

    } catch (error) {
        console.error("Error deleting budget:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error deleting budget" });
    }
};

/**
 * Update budget spent amounts based on a new transaction
 * @param {Object} transaction - The transaction that was created or updated
 */
exports.updateBudgetSpent = async (transaction) => {
    try {
        // Skip if this is an income transaction
        if (transaction.type === 'income') {
            console.log("💰 Income transaction detected. No budget update required.");
            return;
        }

        // ✅ Fix: Ensure correct month format "Month YYYY"
        const txDate = new Date(transaction.date);
        if (isNaN(txDate)) {
            console.log("❌ Invalid transaction date:", transaction.date);
            return;
        }

        const month = txDate.toLocaleString('default', { month: 'long' }) + ' ' + txDate.getFullYear();
        console.log(`🔍 Looking for budget: ${month} for user: ${transaction.user}`);

        // ✅ Fix: Convert user ID to string for consistency
        const budget = await Budget.findOne({ user: transaction.user.toString(), month });

        if (!budget) {
            console.log(`❌ No budget found for ${month}. Check if the budget exists.`);
            return;
        }

        console.log(`✅ Found budget for ${month}: ${budget._id}`);
        let adjustedAmount = transaction.amount;
        if (transaction.currency !== budget.currency) {
            try {
                adjustedAmount = await convertCurrency(transaction.amount, transaction.currency, budget.currency);
            } catch (error) {
                console.error("Error converting currency for budget:", error.message);
            }
        }

        // ✅ Find the category in the budget that matches the transaction
        const categoryBudget = budget.categoryBudgets.find(
            cat => cat.category.toLowerCase() === transaction.category.toLowerCase()
        );

        if (!categoryBudget) {
            console.log(`⚠️ Category "${transaction.category}" not found in budget for ${month}.`);
            return;
        }

        // ✅ Update category spent amount
        categoryBudget.spent += adjustedAmount;
        console.log(`📊 Updated category "${transaction.category}": New spent = ${categoryBudget.spent}`);

       // ✅ IMPORTANT: Explicitly recalculate total spent from all category budgets
       budget.spent += adjustedAmount; // Use converted amount
       console.log(`📈 Recalculated total budget spent: ${budget.spent}`);

        // ✅ Check and update alert statuses
        updateBudgetAlerts(budget);

        // ✅ Update budget recommendations
        await updateBudgetRecommendations(budget);

        // ✅ Save the updated budget
        await budget.save();
        console.log(`✅ Budget for ${month} updated successfully.`);

    } catch (error) {
        console.error("❌ Error updating budget spent amounts:", error);
    }
};


/**
 * Update budget alerts based on spent amounts
 * @param {Object} budget - The budget object to check
 */
async function updateBudgetAlerts(budget) {
    // ✅ Ensure budget calculations are in the selected currency
    let adjustedSpent = budget.spent;

    // ✅ Loop through all category budgets and ensure amounts are in the same currency as the budget
    for (const category of budget.categoryBudgets) {
        let adjustedCategorySpent = category.spent;

        if (category.currency !== budget.currency) {
            try {
                adjustedCategorySpent = await convertCurrency(category.spent, category.currency, budget.currency);
            } catch (error) {
                console.error(`❌ Error converting category "${category.category}" currency:`, error.message);
                continue; // Skip if conversion fails
            }
        }

        category.spent = adjustedCategorySpent; // Update category with the converted value
    }
    const percentSpent = (adjustedSpent / budget.totalBudget) * 100;

    // Store previous alert states to avoid duplicate notifications
    const wasWarning = budget.alerts.warning;
    const wasCritical = budget.alerts.critical;

    // ✅ Update budget-wide alert flags
    budget.alerts.warning = percentSpent >= 75 && percentSpent < 100;
    budget.alerts.critical = percentSpent >= 100;

    // ✅ Trigger notifications only if the state changed
    if (!wasWarning && budget.alerts.warning) {
        budget.alerts.notifications.push({
            type: "warning",
            message: `⚠️ Budget Warning: You've spent 75% of your total budget!`,
            createdAt: new Date()
        });

        // 🔔 Send a notification to the user
        await createNotification(
            budget.user,
            "budget_alert",
            "Budget Warning",
            "You have spent over 75% of your budget! Be cautious.",
            "warning",
            budget._id,
            "Budget"
        );
    }

    if (!wasCritical && budget.alerts.critical) {
        budget.alerts.notifications.push({
            type: "critical",
            message: `🚨 Critical Alert: Budget exceeded 100%!`,
            createdAt: new Date()
        });

        // 🔔 Send a notification to the user
        await createNotification(
            budget.user,
            "budget_alert",
            "Budget Exceeded",
            "You have exceeded your budget limit! Consider adjusting your spending.",
            "critical",
            budget._id,
            "Budget"
        );
    }

    // ✅ Check & send category-specific alerts
    budget.categoryBudgets.forEach(async (category) => {
        const categoryPercentSpent = (category.spent / category.amount) * 100;

        if (categoryPercentSpent >= 100) {
            budget.alerts.notifications.push({
                type: "category",
                message: `📢 Category "${category.category}" has exceeded its budget.`,
                category: category.category,
                createdAt: new Date()
            });

            // 🔔 Send a category-specific notification
            await createNotification(
                budget.user,
                "budget_alert",
                "Category Budget Exceeded",
                `The "${category.category}" category has exceeded its budget.`,
                "critical",
                budget._id,
                "Budget"
            );
        }
    });

    // ✅ Save the updated budget
    await budget.save();
}

/**
 * Update budget recommendations based on spending patterns
 * @param {Object} budget - The budget object to analyze
 */
async function updateBudgetRecommendations(budget) {
    try {
        // Get historical data for this user (last 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const transactions = await Transaction.find({
            user: budget.user,
            date: { $gte: threeMonthsAgo },
            type: 'expense'
        });

        // Calculate averages by category
        const categorySums = {};
        const categoryCounts = {};
        const convertedTransactions = []; // ✅ Store converted transactions
        
        for (const transaction of transactions) {
            let convertedAmount = transaction.amount;

            // ✅ Convert only if transaction currency differs from the budget currency
            if (transaction.currency !== budget.currency) {
                try {
                    convertedAmount = await convertCurrency(transaction.amount, transaction.currency, budget.currency);
                } catch (error) {
                    console.error(`❌ Error converting transaction "${transaction._id}" for recommendations:`, error.message);
                    continue;
                }
            }

            // ✅ Store converted transactions correctly
            convertedTransactions.push({ ...transaction._doc, amount: convertedAmount });
        }
        
        // ✅ Use converted transactions
        convertedTransactions.forEach(transaction => {
            if (!categorySums[transaction.category]) {
                categorySums[transaction.category] = 0;
                categoryCounts[transaction.category] = 0;
            }
            categorySums[transaction.category] += transaction.amount; // ✅ Fixed
            categoryCounts[transaction.category]++;
        });
        
        const categoryAverages = {};
        for (const category in categorySums) {
            categoryAverages[category] = categorySums[category] / (categoryCounts[category] || 1);
        }
        
        // Generate recommendations for each category
        for (const category of budget.categoryBudgets) {
            const avg = categoryAverages[category.category] || 0;
            const currentBudget = category.amount;
            const currentSpent = category.spent;

            let previousAdjustment = category.recommendedAdjustment;

            // If consistently overspending, suggest an increase
            if (avg > currentBudget || currentSpent > currentBudget) {
                const recommendedIncrease = Math.max(avg - currentBudget, currentSpent - currentBudget);
                category.recommendedAdjustment = recommendedIncrease > 0 ? Math.ceil(recommendedIncrease) : 0;

                // 🔔 Notify if recommendation changed
                if (previousAdjustment !== category.recommendedAdjustment) {
                    await createNotification(
                        budget.user,
                        "budget_alert",
                        "Budget Recommendation: Increase Needed",
                        `Your "${category.category}" category is consistently overspent. Consider increasing your budget.`,
                        "warning",
                        budget._id,
                        "Budget"
                    );
                }
            } 
            // If consistently underspending, suggest a decrease
            else if (avg < currentBudget * 0.7 && currentSpent < currentBudget * 0.7) {
                const recommendedDecrease = currentBudget - Math.max(avg, currentSpent);
                category.recommendedAdjustment = recommendedDecrease > 0 ? -Math.floor(recommendedDecrease) : 0;

                // 🔔 Notify if recommendation changed
                if (previousAdjustment !== category.recommendedAdjustment) {
                    await createNotification(
                        budget.user,
                        "budget_alert",
                        "Budget Recommendation: Decrease Suggested",
                        `You are significantly underspending in "${category.category}". Consider lowering your budget allocation.`,
                        "info",
                        budget._id,
                        "Budget"
                    );
                }
            } else {
                category.recommendedAdjustment = 0;
            }
        }

        // ✅ Fix total spent calculation
        const totalSpent = convertedTransactions.reduce((sum, txn) => sum + txn.amount, 0);
        const totalSpentAverage = totalSpent / 3; // ✅ Ensuring proper average calculation over 3 months

        let previousIncrease = budget.recommendations.suggestedIncrease;
        let previousDecrease = budget.recommendations.suggestedDecrease;

        if (totalSpentAverage > budget.totalBudget || budget.spent > budget.totalBudget) {
            budget.recommendations.suggestedIncrease = Math.ceil(Math.max(totalSpentAverage - budget.totalBudget, budget.spent - budget.totalBudget));
            budget.recommendations.suggestedDecrease = 0;

            // 🔔 Notify if increase is suggested
            if (previousIncrease !== budget.recommendations.suggestedIncrease) {
                await createNotification(
                    budget.user,
                    "budget_alert",
                    "Overall Budget Recommendation",
                    "Your total spending is higher than your budget. Consider increasing your budget limit.",
                    "warning",
                    budget._id,
                    "Budget"
                );
            }
        } else if (totalSpentAverage < budget.totalBudget * 0.7 && budget.spent < budget.totalBudget * 0.7) {
            budget.recommendations.suggestedDecrease = Math.floor(budget.totalBudget - Math.max(totalSpentAverage, budget.spent));
            budget.recommendations.suggestedIncrease = 0;

            // 🔔 Notify if decrease is suggested
            if (previousDecrease !== budget.recommendations.suggestedDecrease) {
                await createNotification(
                    budget.user,
                    "budget_alert",
                    "Budget Adjustment Recommendation",
                    "Your spending is significantly lower than your budget. You may want to decrease your budget limit.",
                    "info",
                    budget._id,
                    "Budget"
                );
            }
        } else {
            budget.recommendations.suggestedIncrease = 0;
            budget.recommendations.suggestedDecrease = 0;
        }

        // ✅ Save updated budget recommendations
        await budget.save();
    } catch (error) {
        console.error("❌ Error generating budget recommendations:", error);
    }
}

/**
 * Get budget status and alerts for the current month
 */
exports.getBudgetStatus = async (req, res) => {
    try {
        // Get current month in format "Month YYYY"
        const today = new Date();
        const currentMonth = `${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}`;

        // Find the budget for the current month
        const budget = await Budget.findOne({ 
            user: req.user._id, 
            month: currentMonth 
        });

        if (!budget) {
            return res.status(httpStatus.NOT_FOUND).json({ 
                error: "No budget found for current month",
                currentMonth
            });
        }

        // ✅ Keep the budget's selected currency
        const budgetCurrency = budget.currency;

        // ✅ Ensure transactions align with the budget currency
        let adjustedTotalSpent = 0;
        let adjustedCategorySpent = {}; // Track spending per category

        // ✅ Fetch transactions for the current month
        const transactions = await Transaction.find({
            user: req.user._id,
            date: { 
                $gte: new Date(`${budget.month} 1`), 
                $lt: new Date(`${budget.month} 31`) 
            }
        });

        // ✅ Reset category spent to avoid duplication
        budget.categoryBudgets.forEach(category => {
            adjustedCategorySpent[category.category] = 0;
        });

        // ✅ Process transactions once
        for (const transaction of transactions) {
            let convertedAmount = transaction.amount;

            if (transaction.currency !== budgetCurrency) {
                try {
                    convertedAmount = await convertCurrency(transaction.amount, transaction.currency, budgetCurrency);
                } catch (error) {
                    console.error(`❌ Error converting transaction ${transaction._id} currency:`, error.message);
                }
            }

            adjustedTotalSpent += convertedAmount;

            // ✅ Track category-wise spending
            if (adjustedCategorySpent.hasOwnProperty(transaction.category)) {
                adjustedCategorySpent[transaction.category] += convertedAmount;
            }
        }

        // ✅ Ensure category-wise spent matches total spent
        const categoryStatus = budget.categoryBudgets.map(category => {
            const categorySpent = adjustedCategorySpent[category.category] || 0;

            const percentCategorySpent = (categorySpent / category.amount) * 100;
            return {
                category: category.category,
                budgeted: category.amount,
                spent: categorySpent,
                remaining: category.amount - categorySpent,
                percentSpent: percentCategorySpent.toFixed(1),
                status: percentCategorySpent >= 100 ? 'exceeded' : 
                        percentCategorySpent >= 75 ? 'warning' : 'good',
                recommendation: category.recommendedAdjustment
            };
        });

        // ✅ Final budget status calculation
        const percentSpent = (adjustedTotalSpent / budget.totalBudget) * 100;

        res.status(httpStatus.OK).json({
            month: budget.month,
            currency: budgetCurrency,
            totalBudget: budget.totalBudget,
            totalSpent: adjustedTotalSpent.toFixed(2), // Ensure correct decimal rounding
            remaining: (budget.totalBudget - adjustedTotalSpent).toFixed(2),
            percentSpent: percentSpent.toFixed(1),
            status: percentSpent >= 100 ? 'exceeded' : 
                   percentSpent >= 75 ? 'warning' : 'good',
            alerts: budget.alerts,
            recommendations: budget.recommendations,
            categories: categoryStatus
        });

    } catch (error) {
        console.error("Error fetching budget status:", error);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ error: "Error fetching budget status" });
    }
};

/**
 * Get spending trends and budget performance
 */
exports.getBudgetTrends = async (req, res) => {
    try {
        // ✅ Get the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        // ✅ Find all budgets in the last 6 months
        const budgets = await Budget.find({ 
            user: req.user._id,
            createdAt: { $gte: sixMonthsAgo }
        }).sort({ month: 1 });
        
        if (budgets.length === 0) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "No budget history found" });
        }

        // ✅ Use the most recent budget currency as the reference currency
        const referenceCurrency = budgets[budgets.length - 1].currency;

        let totalBudgeted = 0;
        let totalSpent = 0;

        // ✅ Process budgets to get trends
        const trends = await Promise.all(budgets.map(async (budget) => {
            let adjustedBudgeted = budget.totalBudget;
            let adjustedSpent = budget.spent;

            // ✅ Convert budgeted & spent to reference currency if needed
            if (budget.currency !== referenceCurrency) {
                try {
                    adjustedBudgeted = await convertCurrency(budget.totalBudget, budget.currency, referenceCurrency);
                    adjustedSpent = await convertCurrency(budget.spent, budget.currency, referenceCurrency);
                } catch (error) {
                    console.error(`❌ Error converting budget ${budget._id}:`, error.message);
                    adjustedBudgeted = budget.totalBudget;
                    adjustedSpent = budget.spent;
                }
            }

            totalBudgeted += adjustedBudgeted;
            totalSpent += adjustedSpent;

            const percentSpent = (adjustedSpent / adjustedBudgeted) * 100;

            // ✅ Get top spending categories (convert if needed)
            const topCategories = await Promise.all(budget.categoryBudgets.map(async (cat) => {
                let adjustedCategorySpent = cat.spent;
                if (budget.currency !== referenceCurrency) {
                    try {
                        adjustedCategorySpent = await convertCurrency(cat.spent, budget.currency, referenceCurrency);
                    } catch (error) {
                        console.error(`❌ Error converting category ${cat.category}:`, error.message);
                        adjustedCategorySpent = cat.spent;
                    }
                }

                return {
                    category: cat.category,
                    spent: adjustedCategorySpent,
                    percentOfTotal: ((adjustedCategorySpent / adjustedSpent) * 100).toFixed(1)
                };
            }));

            // ✅ Sort and pick top 3 categories
            const sortedCategories = topCategories.sort((a, b) => b.spent - a.spent).slice(0, 3);

            return {
                month: budget.month,
                budgeted: adjustedBudgeted,
                spent: adjustedSpent,
                percentSpent: percentSpent.toFixed(1),
                status: percentSpent >= 100 ? 'exceeded' : percentSpent >= 75 ? 'warning' : 'good',
                topSpendingCategories: sortedCategories
            };
        }));

        // ✅ Calculate overall trends
        const averagePercentSpent = ((totalSpent / totalBudgeted) * 100).toFixed(1);

        // ✅ Identify category spending patterns
        const categorySpending = {};
        await Promise.all(budgets.map(async (budget) => {
            await Promise.all(budget.categoryBudgets.map(async (cat) => {
                let adjustedCategorySpent = cat.spent;
                if (budget.currency !== referenceCurrency) {
                    try {
                        adjustedCategorySpent = await convertCurrency(cat.spent, budget.currency, referenceCurrency);
                    } catch (error) {
                        console.error(`❌ Error converting category ${cat.category}:`, error.message);
                        adjustedCategorySpent = cat.spent;
                    }
                }

                if (!categorySpending[cat.category]) {
                    categorySpending[cat.category] = { totalSpent: 0, count: 0 };
                }
                categorySpending[cat.category].totalSpent += adjustedCategorySpent;
                categorySpending[cat.category].count++;
            }));
        }));

        // ✅ Calculate average spending per category
        const categoryAverages = {};
        for (const [category, data] of Object.entries(categorySpending)) {
            categoryAverages[category] = data.totalSpent / data.count;
        }

        // ✅ Get top spending categories
        const topCategories = Object.entries(categoryAverages)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([category, average]) => ({
                category,
                averageMonthlySpend: Math.round(average),
                percentOfTotal: ((average * categorySpending[category].count / totalSpent) * 100).toFixed(1)
            }));

        // ✅ Return trends in the user's selected currency
        res.status(httpStatus.OK).json({
            currency: referenceCurrency, // ✅ Show selected currency
            trends,
            overview: {
                totalBudgeted,
                totalSpent,
                averagePercentSpent,
                budgetSuccessRate: ((budgets.filter(b => (b.spent / b.totalBudget) <= 1).length / budgets.length) * 100).toFixed(1),
                topSpendingCategories: topCategories
            }
        });

    } catch (error) {
        console.error("❌ Error fetching budget trends:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching budget trends" });
    }
};
