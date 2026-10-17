const Report = require("../models/Report");
const Transaction = require("../models/Transaction");
const Goal = require("../models/Goal");
const Budget = require("../models/Budget"); 
const { convertCurrency } = require("../services/currencyService");
const httpStatus = require("../constants/httpStatus");


/**
 * 📌 Generate a financial report for a specific period
 */
exports.generateReport = async (req, res) => {
    try {
        const { startDate, endDate, currency } = req.body;

        // ✅ Validate required fields
        if (!startDate || !endDate || !currency) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Start date, end date, and currency are required." });
        }

        // ✅ Validate currency
        const allowedCurrencies = ["USD", "EUR", "LKR", "GBP", "INR"];
        if (!allowedCurrencies.includes(currency)) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid currency. Allowed: USD, EUR, LKR, GBP, INR." });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid date format." });
        }

        if (start > end) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Start date must be before end date." });
        }

        // ✅ Retrieve transactions within the date range
        const transactions = await Transaction.find({
            user: req.user._id,
            date: { $gte: start, $lte: end }
        });

        let totalIncome = 0, totalExpenses = 0;
        let breakdown = {};

        // Initialize breakdown object with all categories found in transactions
        for (let tx of transactions) {
            if (!breakdown[tx.category]) {
                breakdown[tx.category] = { income: 0, expenses: 0 };
            }
        }

        // Process each transaction
        for (let tx of transactions) {
            let convertedAmount = tx.amount;

            // ✅ Convert transaction currency to report currency if needed
            if (tx.currency !== currency) {
                try {
                    convertedAmount = await convertCurrency(tx.amount, tx.currency, currency);
                } catch (error) {
                    console.error(`❌ Error converting currency for transaction ${tx._id}:`, error.message);
                    continue; // Skip failed conversions
                }
            }

            if (tx.type === "income") {
                totalIncome += convertedAmount;
                // Add to the category's income
                breakdown[tx.category].income += convertedAmount;
            } else {
                totalExpenses += convertedAmount;
                // Add to the category's expenses
                breakdown[tx.category].expenses += convertedAmount;
            }
        }

        // ✅ Retrieve budgets and convert to report currency
        const budgets = await Budget.find({ 
            user: req.user._id, 
            month: start.toLocaleString('default', { month: 'long' }) + ' ' + start.getFullYear() 
        });

        let totalBudget = 0;
        let remainingBudget = 0;

        for (let budget of budgets) {
            let convertedBudgetAmount = budget.totalBudget;

            // ✅ Convert budget currency to report currency if needed
            if (budget.currency !== currency) {
                try {
                    convertedBudgetAmount = await convertCurrency(budget.totalBudget, budget.currency, currency);
                } catch (error) {
                    console.error(`❌ Error converting currency for budget ${budget._id}:`, error.message);
                    continue; // Skip failed conversions
                }
            }

            totalBudget += convertedBudgetAmount;
        }

        remainingBudget = totalBudget - totalExpenses;

        // ✅ Retrieve goals and convert to report currency
        const goals = await Goal.find({ user: req.user._id });
        let goalProgress = await Promise.all(goals.map(async goal => {
            let convertedTargetAmount = goal.targetAmount;
            let convertedCurrentAmount = goal.currentAmount;

            if (goal.currency !== currency) {
                try {
                    convertedTargetAmount = await convertCurrency(goal.targetAmount, goal.currency, currency);
                    convertedCurrentAmount = await convertCurrency(goal.currentAmount, goal.currency, currency);
                } catch (error) {
                    console.error(`❌ Error converting currency for goal "${goal.name}":`, error.message);
                }
            }

            return {
                goalId: goal._id,
                goalName: goal.name,
                targetAmount: convertedTargetAmount,
                currentAmount: convertedCurrentAmount,
                progressPercentage: ((convertedCurrentAmount / convertedTargetAmount) * 100).toFixed(2)
            };
        }));

        // ✅ Identify large transactions (transactions over 50% of the total budget)
        let significantTransactions = transactions.filter(tx => tx.amount >= totalBudget * 0.5);

        // ✅ Save report
        const report = new Report({
            user: req.user._id,
            currency,  // ✅ Store report currency
            startDate: start,
            endDate: end,
            totalIncome,
            totalExpenses,
            totalBudget,
            remainingBudget,
            breakdown: Object.keys(breakdown).map(category => ({
                category,
                income: breakdown[category].income,
                expenses: breakdown[category].expenses
            })),
            goalProgress,
            significantTransactions
        });

        await report.save();
        res.status(httpStatus.CREATED).json({ message: "Report generated successfully", report });

    } catch (error) {
        console.error("❌ Error generating report:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error generating report" });
    }
};

/**
 * 📌 Retrieve all reports for a user
 */
exports.getReports = async (req, res) => {
    try {
        const reports = await Report.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.status(httpStatus.OK).json(reports);
    } catch (error) {
        console.error("❌ Error fetching reports:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching reports" });
    }
};

/**
 * 📌 Retrieve a single report by ID
 */
exports.getReportById = async (req, res) => {
    try {
        const { targetCurrency } = req.query;
        const report = await Report.findOne({ _id: req.params.id, user: req.user._id });

        if (!report) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "Report not found" });
        }

        // ✅ Convert report values to targetCurrency if needed
        if (targetCurrency && targetCurrency !== report.currency) {
            const allowedCurrencies = ["USD", "EUR", "LKR", "GBP", "INR"];
            if (!allowedCurrencies.includes(targetCurrency)) {
                return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid target currency." });
            }

            try {
                // Convert main report totals
                report.totalIncome = await convertCurrency(report.totalIncome, report.currency, targetCurrency);
                report.totalExpenses = await convertCurrency(report.totalExpenses, report.currency, targetCurrency);
                report.totalBudget = await convertCurrency(report.totalBudget, report.currency, targetCurrency);
                report.remainingBudget = await convertCurrency(report.remainingBudget, report.currency, targetCurrency);
                
                // Convert category breakdown amounts
                for (let item of report.breakdown) {
                    if (item.income > 0) {
                        item.income = await convertCurrency(item.income, report.currency, targetCurrency);
                    }
                    if (item.expenses > 0) {
                        item.expenses = await convertCurrency(item.expenses, report.currency, targetCurrency);
                    }
                }
                
                // Convert goal progress amounts
                for (let goal of report.goalProgress) {
                    goal.targetAmount = await convertCurrency(goal.targetAmount, report.currency, targetCurrency);
                    goal.currentAmount = await convertCurrency(goal.currentAmount, report.currency, targetCurrency);
                    // Recalculate progress percentage with the new currency values
                    goal.progressPercentage = ((goal.currentAmount / goal.targetAmount) * 100).toFixed(2);
                }
                
                // Convert significant transactions if they exist
                if (report.significantTransactions && report.significantTransactions.length > 0) {
                    for (let tx of report.significantTransactions) {
                        tx.amount = await convertCurrency(tx.amount, report.currency, targetCurrency);
                    }
                }
                
                // Update the report currency after all conversions
                report.currency = targetCurrency;
            } catch (error) {
                console.error("❌ Error converting report currency:", error.message);
                return res.status(httpStatus.SERVER_ERROR).json({ 
                    error: "Error converting currency values", 
                    details: error.message 
                });
            }
        }

        res.status(httpStatus.OK).json(report);
    } catch (error) {
        console.error("❌ Error fetching report:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching report" });
    }
};