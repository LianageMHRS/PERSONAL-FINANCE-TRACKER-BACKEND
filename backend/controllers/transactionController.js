const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Goal = require("../models/Goal");
const SystemSettings = require('../models/SystemSettings');
const { updateBudgetSpent } = require('./budgetController');
const { updateGoalProgress } = require("../controllers/goalController");
const { createNotification } = require('./notificationController'); // Import notification function
const { convertCurrency } = require("../services/currencyService");
const httpStatus = require('../constants/httpStatus');

/**
 * Create a new transaction (income/expense)
 */
exports.createTransaction = async (req, res) => {
    try {
        let { type, amount, category, tags, date, recurring, currency } = req.body;

        // ✅ Required field validation
        if (!type || !amount || !category) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Missing required fields." });
        }

        // ✅ Validate `type`
        if (!["income", "expense"].includes(type)) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid transaction type. Must be 'income' or 'expense'." });
        }

        // ✅ Validate `amount`
        if (typeof amount !== "number" || amount <= 0) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid amount. Must be a positive number." });
        }

        // ✅ Validate `category`
        const allowedCategories = ["Food", "Transport", "Rent", "Salary", "Entertainment", "Health",'Salary', 'Bonus', 'Investment', "Other"];
        if (!allowedCategories.includes(category)) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid category." });
        }
          // ✅ Normalize category name
          const categoryName = category.trim().toLowerCase();

          // ✅ Check if the category has a spending limit (For Expenses Only)
          if (type === "expense") {
              const categorySetting = await SystemSettings.findOne({ category: categoryName });
  
              if (categorySetting && amount > categorySetting.spendingLimit) {
                  return res.status(httpStatus.BAD_REQUEST).json({
                      error: `Transaction exceeds the spending limit of ${categorySetting.spendingLimit} for category '${category}'.`
                  });
              }
          }
         // ✅ Validate `currency`
         const allowedCurrencies = ['USD', 'EUR', 'LKR', 'GBP', 'INR'];
        
         // Ensure currency is set and validated
         currency = currency ? currency.toUpperCase() : 'USD';
         if (!allowedCurrencies.includes(currency)) {
             return res.status(httpStatus.BAD_REQUEST).json({ 
                 error: "Invalid currency. Supported currencies are: USD, EUR, LKR, GBP, INR." 
             });
         }
        // ✅ Validate & format `tags`
        let formattedTags = [];
        if (tags) {
            if (!Array.isArray(tags)) {
                return res.status(httpStatus.BAD_REQUEST).json({ error: "Tags must be an array." });
            }
            formattedTags = [...new Set(tags.map(tag => tag.trim().toLowerCase()))];

             // ✅ Prevent duplicate tags across multiple transactions
        const existingTags = await Transaction.distinct("tags", { user: req.user._id });
        formattedTags = formattedTags.filter(tag => !existingTags.includes(tag));

        }

        // ✅ Validate `date`
        if (date && isNaN(new Date(date).getTime())) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid date format." });
        }

        // ✅ Validate & Handle `recurring` transactions
        let nextOccurrence = null;
        if (recurring) {
            if (typeof recurring !== "object") {
                return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid recurring format. Must be an object." });
            }

            if (recurring.isRecurring) {
                if (!["daily", "weekly", "monthly", "yearly"].includes(recurring.frequency)) {
                    return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid recurring frequency." });
                }

                nextOccurrence = new Date(date || Date.now());

                if (recurring.frequency === 'daily') nextOccurrence.setDate(nextOccurrence.getDate() + 1);
                if (recurring.frequency === 'weekly') nextOccurrence.setDate(nextOccurrence.getDate() + 7);
                if (recurring.frequency === 'monthly') nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
                if (recurring.frequency === 'yearly') nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);

                // ✅ Prevent nextOccurrence from exceeding `endDate`
                if (recurring.endDate && nextOccurrence > new Date(recurring.endDate)) {
                    recurring.isRecurring = false;
                    nextOccurrence = null;
                }
            } else {
                // ✅ If not recurring, remove `frequency` & `endDate`
                recurring = { isRecurring: false, frequency: null, endDate: null };
            }
        }
         // ✅ Fetch goals from database for the user
        

        // ✅ Create transaction
        const transaction = new Transaction({
            user: req.user._id,
            type,
            amount,
            category,
            currency,
            tags: formattedTags,
            date: date || new Date(),
            recurring: { ...recurring, nextOccurrence }
        });

        await transaction.save();
        // ✅ For expenses, convert to budget currency (USD) if needed for budget tracking
        if (type === 'expense') {
            let budgetAmount = amount;
            const budgetCurrency = currency;
            
            console.log("🔄 Calling updateBudgetSpent...");
            // Create a temporary transaction object with the converted amount for budget tracking
            const budgetTransaction = {
                ...transaction.toObject(),
                amount: budgetAmount,
                currency: budgetCurrency,
            };
            await updateBudgetSpent(budgetTransaction);
        }
         // 🔔 Notify if transaction exceeds 50% of total budget
        const budget = await Budget.findOne({ user: req.user._id, month: transaction.date.toLocaleString('default', { month: 'long' }) + ' ' + transaction.date.getFullYear() });
        if (budget && transaction.type === 'expense') {
            let comparisonAmount = transaction.amount;
            
            // Convert transaction amount to USD for budget comparison if needed
            if (transaction.currency !== budget.currency) {
                try {
                    comparisonAmount = await convertCurrency(transaction.amount, transaction.currency, 'USD');
                } catch (error) {
                    console.error("Error converting currency for budget notification:", error.message);
                    // Continue with original amount if conversion fails
                }
            }
            
            if (comparisonAmount >= budget.totalBudget * 0.5) {
                await createNotification(
                    req.user._id,
                    "transaction_alert",
                    "High Expense Alert",
                    `Your transaction of ${transaction.amount} ${transaction.currency} (approx. $${comparisonAmount.toFixed(2)} USD) in ${category} is more than 50% of your total budget.`,
                    "warning",
                    transaction._id,
                    "Transaction"
                );
            }
        }

         // ✅ 🔹 Process **auto-allocation to savings goals** for income transactions
        if (type === "income") {
            await updateGoalProgress({
                user: req.user._id,
                type,
                amount,
                currency,
                _id: transaction._id,
                category
            });

            
        }

 
        res.status(httpStatus.CREATED).json({ message: "Transaction added successfully", transaction });

    } catch (error) {
        console.error("Error creating transaction:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error creating transaction" });
    }
};



/**
 * Get all transactions for the logged-in user
 */
exports.getTransactions = async (req, res) => {
    try {
        let { category, startDate, endDate, tags, sortBy, targetCurrency } = req.query;
        let filters = { user: req.user._id };

        // Apply filters
        if (category) filters.category = category;
        if (tags) filters.tags = { $in: tags.split(",") }; // Filter transactions by tags
        if (startDate || endDate) {
            filters.date = {};
            if (startDate) filters.date.$gte = new Date(startDate);
            if (endDate) filters.date.$lte = new Date(endDate);
        }

        // Sorting options
        let sortOptions = {};
        if (sortBy === 'amount') sortOptions.amount = -1;
        if (sortBy === 'date') sortOptions.date = -1;

        // Fetch transactions
        const transactions = await Transaction.find(filters).sort(sortOptions);
         // If a target currency is specified, convert all amounts to that currency
         if (targetCurrency) {
            const allowedCurrencies = ['USD', 'EUR', 'LKR', 'GBP', 'INR'];
            if (!allowedCurrencies.includes(targetCurrency)) {
                return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid target currency. Supported currencies are: USD, EUR, LKR, GBP, INR." });
            }

            // Create a deep copy of transactions with converted amounts
            const convertedTransactions = await Promise.all(transactions.map(async (transaction) => {
                const txObject = transaction.toObject();
                
                // Only convert if the currencies are different
                if (transaction.currency !== targetCurrency) {
                    try {
                        txObject.originalAmount = transaction.amount;
                        txObject.originalCurrency = transaction.currency;
                        txObject.amount = await convertCurrency(transaction.amount, transaction.currency, targetCurrency);
                        txObject.currency = targetCurrency;
                    } catch (error) {
                        console.error(`Error converting currency for transaction ${transaction._id}:`, error.message);
                        // Keep original values if conversion fails
                    }
                }
                
                return txObject;
            }));
            
            return res.status(httpStatus.OK).json(convertedTransactions);
        }
        res.status(httpStatus.OK).json(transactions);

    } catch (error) {
        console.error("Error fetching transactions:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching transactions" });
    }
};


/**
 * Get a single transaction by ID
 */
exports.getTransactionById = async (req, res) => {
    try {
        const { targetCurrency } = req.query;
        const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });

        if (!transaction) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "Transaction not found" });
        }
        // If a target currency is specified, convert the amount
        if (targetCurrency) {
            const allowedCurrencies = ['USD', 'EUR', 'LKR', 'GBP', 'INR'];
            if (!allowedCurrencies.includes(targetCurrency)) {
                return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid target currency. Supported currencies are: USD, EUR, LKR, GBP, INR." });
            }

            // Only convert if the currencies are different
            if (transaction.currency !== targetCurrency) {
                try {
                    const txObject = transaction.toObject();
                    txObject.originalAmount = transaction.amount;
                    txObject.originalCurrency = transaction.currency;
                    txObject.amount = await convertCurrency(transaction.amount, transaction.currency, targetCurrency);
                    txObject.currency = targetCurrency;
                    
                    return res.status(httpStatus.OK).json(txObject);
                } catch (error) {
                    console.error(`Error converting currency for transaction ${transaction._id}:`, error.message);
                    // Fall back to returning the original transaction
                }
            }
        }


        res.status(httpStatus.OK).json(transaction);
    } catch (error) {
        console.error("Error fetching transaction:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching transaction" });
    }
};

/**
 * Update an existing transaction
 */
/**
 * Update an existing transaction
 */
exports.updateTransaction = async (req, res) => {
    try {
        const { type, amount, category, tags, date, recurring, currency } = req.body;

        // ✅ Find the existing transaction
        const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });

        if (!transaction) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "Transaction not found" });
        }

        // ✅ Store old values for budget adjustment
        const oldType = transaction.type;
        const oldAmount = transaction.amount;
        const oldCategory = transaction.category;
        const oldDate = transaction.date;
        const oldCurrency = transaction.currency;

        // ✅ Validate `type`
        if (type && !["income", "expense"].includes(type)) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid transaction type." });
        }

        // ✅ Validate `amount`
        if (amount !== undefined && (typeof amount !== "number" || amount <= 0)) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid amount." });
        }
        // ✅ Validate `currency`
        const allowedCurrencies = ['USD', 'EUR', 'LKR', 'GBP', 'INR'];
        if (currency && !allowedCurrencies.includes(currency)) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid currency. Supported currencies are: USD, EUR, LKR, GBP, INR." });
        }

        // ✅ Validate `category`
        const allowedCategories = ["Food", "Transport", "Rent", "Salary", "Entertainment", "Health",'Salary', 'Bonus', 'Investment', "Other"];
        if (category && !allowedCategories.includes(category)) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid category." });
        }

        // ✅ Validate & format `tags`
        let formattedTags = transaction.tags;
        if (tags) {
            if (!Array.isArray(tags)) {
                return res.status(httpStatus.BAD_REQUEST).json({ error: "Tags must be an array." });
            }
            formattedTags = [...new Set(tags.map(tag => tag.trim().toLowerCase()))]; // Remove duplicates

            // ✅ Prevent duplicate tags across multiple transactions
            const existingTags = await Transaction.distinct("tags", { user: req.user._id });
            formattedTags = formattedTags.filter(tag => !existingTags.includes(tag));
        }

        // ✅ Validate `date`
        if (date && isNaN(new Date(date).getTime())) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid date format." });
        }

        // ✅ Handle recurring transactions properly
        let nextOccurrence = transaction.nextOccurrence;
        if (recurring) {
            if (typeof recurring !== "object") {
                return res.status(httpStatus.BAD_REQUEST).json({ error: "Recurring must be an object." });
            }

            if (recurring.isRecurring) {
                // ✅ Validate frequency properly
                if (!["daily", "weekly", "monthly", "yearly"].includes(recurring.frequency)) {
                    return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid recurring frequency." });
                }

                // ✅ Calculate next occurrence only if it's enabled
                nextOccurrence = new Date(date || transaction.date);
                if (recurring.frequency === 'daily') nextOccurrence.setDate(nextOccurrence.getDate() + 1);
                if (recurring.frequency === 'weekly') nextOccurrence.setDate(nextOccurrence.getDate() + 7);
                if (recurring.frequency === 'monthly') nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
                if (recurring.frequency === 'yearly') nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);

                // ✅ Ensure transactions do not continue past `endDate`
                if (recurring.endDate && nextOccurrence > new Date(recurring.endDate)) {
                    recurring.isRecurring = false;
                    nextOccurrence = null;
                }
            } else {
                // ✅ If `isRecurring` is false, remove `frequency` and `endDate`
                recurring.frequency = null;
                recurring.endDate = null;
                nextOccurrence = null;
            }
        }
        // ✅ Handle Goal Adjustments (Reversing & Reallocating)
        if (oldType === "income") {
            console.log(`🔄 Reversing old goal allocation for modified transaction (Category: ${oldCategory})`);
            
            const goals = await Goal.find({ user: transaction.user, autoAllocate: true });

            for (let goal of goals) {
                let oldAllocationAmount = (goal.allocationPercentage / 100) * oldAmount;
                // ✅ Convert only if the goal's currency is different
                if (goal.currency !== oldCurrency) {
                    try {
                        oldAllocationAmount = await convertCurrency(oldAllocationAmount, oldCurrency, goal.currency);
                    } catch (error) {
                        console.error("Error converting currency for goal reversal:", error.message);
                        continue;
                    }
                }
                
                // ✅ Deduct old allocated amount from goal
                goal.currentAmount = Math.max(0, goal.currentAmount - oldAllocationAmount);
                
                console.log(`✅ Goal "${goal.name}" reversed: -$${oldAllocationAmount}`);
            }
        }

        // ✅ Update the transaction fields
        transaction.type = type || transaction.type;
        transaction.amount = amount !== undefined ? amount : transaction.amount;
        transaction.category = category || transaction.category;
        transaction.currency = currency || transaction.currency;
        transaction.tags = formattedTags;
        transaction.date = date ? new Date(date) : transaction.date;
        if (recurring) {
            transaction.recurring = recurring;
            transaction.recurring.nextOccurrence = nextOccurrence;
        }

        await transaction.save();
      // ✅ Reallocate to savings goals if still an income transaction
      if (transaction.type === "income") {
        // Use updateGoalProgress instead of direct allocation
        await updateGoalProgress(transaction);
    }

        // ✅ Handle budget adjustments if necessary
        if (
            (oldType === 'expense' || type === 'expense') &&
            (oldType !== type || 
             oldAmount !== amount ||
             oldCurrency !== transaction.currency ||
             oldCategory !== category ||
             (date && new Date(oldDate).getMonth() !== new Date(date).getMonth()))
        ) {
            // If changing from expense to income, remove from old budget
            if (oldType === 'expense' && type === 'income') {
                await adjustBudgetForDeletedExpense(transaction, oldAmount, oldCurrency);
            } 
            // If changing from income to expense, add to new budget
            else if (oldType === 'income' && type === 'expense') {
                await updateBudgetSpent(transaction);
            }
            // If expense amount, currency or category changed, or moving between months
            else if (oldType === 'expense' && type === 'expense') {
                await adjustBudgetForModifiedExpense(transaction, oldAmount, oldCategory, oldDate, oldCurrency);
            }
        }

        res.status(httpStatus.OK).json({ message: "Transaction updated successfully", transaction });

    } catch (error) {
        console.error("Error updating transaction:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error updating transaction" });
    }
};
/**
 * Delete a transaction
 */
exports.deleteTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findOne({ _id: req.params.id, user: req.user._id });

        if (!transaction) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "Transaction not found" });
        }

        // If it's an expense, adjust the budget accordingly
        if (transaction.type === 'expense') {
            await adjustBudgetForDeletedExpense(transaction, transaction.amount, transaction.currency);
        }
         // ✅ If it's an income transaction, reverse savings allocation
         if (transaction.type === 'income') {
            console.log(`🔄 Reversing savings allocation for deleted income transaction (Category: ${transaction.category})`);
            
            const goals = await Goal.find({ user: transaction.user, autoAllocate: true });

            for (let goal of goals) {
                let allocationAmount = (goal.allocationPercentage / 100) * transaction.amount;
                // ✅ Convert only if Goal Currency ≠ Transaction Currency
                if (goal.currency !== transaction.currency) {
                    try {
                        allocationAmount = await convertCurrency(allocationAmount, transaction.currency, goal.currency);
                    } catch (error) {
                        console.error("Error converting currency for goal reversal:", error.message);
                        continue;
                    }
                }


                // ✅ Deduct allocated amount from goal
                goal.currentAmount = Math.max(0, goal.currentAmount - allocationAmount);

                await goal.save();
                console.log(`✅ Goal "${goal.name}" adjusted: -$${allocationAmount}`);
            }
        }

        // Delete the transaction
        await Transaction.deleteOne({ _id: req.params.id, user: req.user._id });
      

        res.status(httpStatus.OK).json({ message: "Transaction deleted successfully" });
    } catch (error) {
        console.error("Error deleting transaction:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error deleting transaction" });
    }
};
/**
 * Adjust budget after an expense is deleted
 */
async function adjustBudgetForDeletedExpense(transaction) {
    try {
        // Extract transaction date and get month in format "Month YYYY"
        const txDate = new Date(transaction.date);
        const month = `${txDate.toLocaleString('default', { month: 'long' })} ${txDate.getFullYear()}`;

        // Find the budget for this month and user
        const budget = await Budget.findOne({ 
            user: transaction.user, 
            month: month 
        });

        if (!budget) {
            console.log(`No budget found for ${month}`);
            return;
        }
        // Convert expense amount to the budget's currency if needed
        let adjustedAmount = transaction.amount;
        if (transaction.currency !== budget.currency) {
            try {
                adjustedAmount = await convertCurrency(transaction.amount, transaction.currency, budget.currency);
            } catch (error) {
                console.error("Error converting currency for budget adjustment:", error.message);
                 // ⚠️ Instead of exiting, proceed with the original transaction amount
                 adjustedAmount = transaction.amount;
            }
        }

        // Find the category in the budget that matches the transaction
        const categoryBudget = budget.categoryBudgets.find(
            cat => cat.category.toLowerCase() === transaction.category.toLowerCase()
        );

        // Update category spent amount if category exists in budget
        if (categoryBudget) {
            categoryBudget.spent = Math.max(0, categoryBudget.spent - adjustedAmount);
        }

        // Update total spent amount for the budget
        budget.spent = Math.max(0, budget.spent - adjustedAmount);
         // ✅ Ensure `alerts` exists before updating
        if (!budget.alerts) {
            budget.alerts = { warning: false, critical: false };
        }

        // Recalculate alerts and recommendations
        if (budget.alerts.warning || budget.alerts.critical) {
            const percentSpent = (budget.spent / budget.totalBudget) * 100;
            budget.alerts.warning = percentSpent >= 75 && percentSpent < 100;
            budget.alerts.critical = percentSpent >= 100;
        }

        await budget.save();
        console.log(`Budget for ${month} adjusted after transaction deletion`);

    } catch (error) {
        console.error("Error adjusting budget after transaction deletion:", error);
    }
}

/**
 * Adjust budget after an expense is modified
 */
async function adjustBudgetForModifiedExpense(transaction, oldAmount, oldCategory, oldDate, oldCurrency) {
    try {
        // First, remove the transaction from the old budget
        const oldTxDate = new Date(oldDate);
        const oldMonth = `${oldTxDate.toLocaleString('default', { month: 'long' })} ${oldTxDate.getFullYear()}`;

        const newTxDate = new Date(transaction.date);
        const newMonth = `${newTxDate.toLocaleString('default', { month: 'long' })} ${newTxDate.getFullYear()}`;

        // If month hasn't changed, it's a simpler update
        if (oldMonth === newMonth) {
            const budget = await Budget.findOne({ 
                user: transaction.user, 
                month: newMonth 
            });

            if (!budget) {
                console.log(`No budget found for ${newMonth}`);
                return;
            }
             // Convert oldAmount if currency has changed
             let convertedOldAmount = oldAmount;
             let convertedNewAmount = transaction.amount;
             if (oldCurrency !== transaction.currency) {
                try {
                    convertedOldAmount = await convertCurrency(oldAmount, oldCurrency, transaction.currency);
                    convertedNewAmount = await convertCurrency(transaction.amount, transaction.currency, transaction.currency);
                } catch (error) {
                    console.error("Error converting currency for budget adjustment:", error.message);
                    convertedOldAmount = oldAmount; // Proceed with original if conversion fails
                }
            }
 

            // If category has changed, update both categories
            if (oldCategory !== transaction.category) {
                // Update old category
                const oldCategoryBudget = budget.categoryBudgets.find(
                    cat => cat.category.toLowerCase() === oldCategory.toLowerCase()
                );
                if (oldCategoryBudget) {
                    oldCategoryBudget.spent = Math.max(0, oldCategoryBudget.spent - convertedOldAmount);
                }

                // Update new category
                const newCategoryBudget = budget.categoryBudgets.find(
                    cat => cat.category.toLowerCase() === transaction.category.toLowerCase()
                );
                if (newCategoryBudget) {
                    newCategoryBudget.spent += convertedNewAmount;
                }
            } 
            // If only amount has changed
            else {
                const categoryBudget = budget.categoryBudgets.find(
                    cat => cat.category.toLowerCase() === transaction.category.toLowerCase()
                );
                if (categoryBudget) {
                    categoryBudget.spent = Math.max(0, categoryBudget.spent - convertedOldAmount + convertedNewAmount);
                }
            }

            // Update total budget spent
            budget.spent = Math.max(0, budget.spent - convertedOldAmount + convertedNewAmount);

            // Recalculate alerts
            const percentSpent = (budget.spent / budget.totalBudget) * 100;
            budget.alerts.warning = percentSpent >= 75 && percentSpent < 100;
            budget.alerts.critical = percentSpent >= 100;

            await budget.save();
        } 
        // If month has changed, need to update two different budgets
        else {
            // Remove from old month's budget
            const oldBudget = await Budget.findOne({ 
                user: transaction.user, 
                month: oldMonth 
            });

            if (oldBudget) {
                let convertedOldAmount = oldAmount;

                // Convert oldAmount if needed
                if (oldCurrency !== oldBudget.currency) {
                    try {
                        convertedOldAmount = await convertCurrency(oldAmount, oldCurrency, oldBudget.currency);
                    } catch (error) {
                        console.error("Error converting currency for old budget adjustment:", error.message);
                        convertedOldAmount = oldAmount;
                    }
                }
                // Update old category
                const oldCategoryBudget = oldBudget.categoryBudgets.find(
                    cat => cat.category.toLowerCase() === oldCategory.toLowerCase()
                );
                if (oldCategoryBudget) {
                    oldCategoryBudget.spent = Math.max(0, oldCategoryBudget.spent - convertedOldAmount);
                }

                // Update total budget spent
                oldBudget.spent = Math.max(0, oldBudget.spent - convertedOldAmount);

                // Recalculate alerts for old budget
                const oldPercentSpent = (oldBudget.spent / oldBudget.totalBudget) * 100;
                oldBudget.alerts.warning = oldPercentSpent >= 75 && oldPercentSpent < 100;
                oldBudget.alerts.critical = oldPercentSpent >= 100;

                await oldBudget.save();
            }

            // Add to new month's budget
            await updateBudgetSpent(transaction);
        }

    } catch (error) {
        console.error("Error adjusting budget after transaction modification:", error);
    }
}
