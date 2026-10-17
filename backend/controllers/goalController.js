const Goal = require("../models/Goal");
const { createNotification } = require("../controllers/notificationController");
const Transaction = require("../models/Transaction"); 
const { convertCurrency } = require("../services/currencyService");
const httpStatus = require("../constants/httpStatus");


/**
 * 📌 Create a new financial goal
 */
exports.createGoal = async (req, res) => {
    try {
        let { name, targetAmount, deadline, autoAllocate, allocationPercentage, currency } = req.body;

        // ✅ Required field validation
        if (!name || !targetAmount|| !currency) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Goal name and target amount are required." });
        }

        // ✅ Validate targetAmount
        if (typeof targetAmount !== "number" || targetAmount <= 0) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Target amount must be a positive number." });
        }

        // ✅ Validate deadline (if provided)
        if (deadline) {
            const deadlineDate = new Date(deadline);
            if (isNaN(deadlineDate.getTime())) {
                return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid date format for deadline." });
            }
            if (deadlineDate < new Date()) {
                return res.status(httpStatus.BAD_REQUEST).json({ error: "Deadline cannot be in the past." });
            }
        }
        // ✅ Validate currency selection
        const allowedCurrencies = ["USD", "EUR", "LKR", "GBP", "INR"];
        if (!allowedCurrencies.includes(currency)) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid currency. Allowed: USD, EUR, LKR, GBP, INR." });
        }

        // ✅ Validate autoAllocate and allocationPercentage
        if (autoAllocate !== undefined && typeof autoAllocate !== "boolean") {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Auto allocation must be a boolean value." });
        }

        if (autoAllocate && (typeof allocationPercentage !== "number" || allocationPercentage <= 0 || allocationPercentage > 100)) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Allocation percentage must be a number between 1 and 100." });
        }

        // ✅ Create and save goal
        const goal = new Goal({
            user: req.user._id,
            name,
            targetAmount,
            currency,
            deadline: deadline || null,
            autoAllocate: autoAllocate || false,
            allocationPercentage: allocationPercentage || 0,
            reminderSent: false // Ensure this is set to false for new goals
        });

        await goal.save();
        res.status(httpStatus.CREATED).json({ message: "Goal created successfully", goal });

    } catch (error) {
        console.error("❌ Error creating goal:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error creating goal" });
    }
};

/**
 * 📌 Get all goals for the logged-in user
 */
exports.getGoals = async (req, res) => {
    try {
        const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.status(httpStatus.OK).json(goals);
    } catch (error) {
        console.error("❌ Error fetching goals:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching goals" });
    }
};

/**
 * 📌 Get a single goal by ID
 */
exports.getGoalById = async (req, res) => {
    try {
        const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });

        if (!goal) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "Goal not found" });
        }

        res.status(httpStatus.OK).json(goal);
    } catch (error) {
        console.error("❌ Error fetching goal:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error fetching goal" });
    }
};

/**
 * 📌 Update an existing goal
 */
exports.updateGoal = async (req, res) => {
    try {
        const { name, targetAmount, deadline, autoAllocate, allocationPercentage, currency } = req.body;
        const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });

        if (!goal) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "Goal not found" });
        }

        // ✅ Validate name
        if (name !== undefined && typeof name !== "string") {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Goal name must be a string." });
        }

        // ✅ Validate targetAmount
        if (targetAmount !== undefined && (typeof targetAmount !== "number" || targetAmount <= 0)) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Target amount must be a positive number." });
        }

        // ✅ Validate deadline
        if (deadline) {
            const deadlineDate = new Date(deadline);
            if (isNaN(deadlineDate.getTime())) {
                return res.status(httpStatus.BAD_REQUEST).json({ error: "Invalid date format for deadline." });
            }
            if (deadlineDate < new Date()) {
                return res.status(httpStatus.BAD_REQUEST).json({ error: "Deadline cannot be in the past." });
            }
        }

        // ✅ Validate autoAllocate and allocationPercentage
        if (autoAllocate !== undefined && typeof autoAllocate !== "boolean") {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Auto allocation must be a boolean value." });
        }

        if (allocationPercentage !== undefined && (typeof allocationPercentage !== "number" || allocationPercentage <= 0 || allocationPercentage > 100)) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Allocation percentage must be a number between 1 and 100." });
        }
         // ✅ Prevent changing currency after goal creation
         if (currency && currency !== goal.currency) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Cannot change currency of an existing goal." });
        }

        // Save original values to check if goal is achieved after update
        const originalTargetAmount = goal.targetAmount;
        const wasAchievedBefore = goal.currentAmount >= originalTargetAmount;

        // ✅ Apply updates
        goal.name = name || goal.name;
        goal.targetAmount = targetAmount !== undefined ? targetAmount : goal.targetAmount;
        goal.deadline = deadline || goal.deadline;
        goal.autoAllocate = autoAllocate !== undefined ? autoAllocate : goal.autoAllocate;
        goal.allocationPercentage = allocationPercentage !== undefined ? allocationPercentage : goal.allocationPercentage;

        // Check if goal is now achieved due to target amount adjustment
        const isAchievedAfter = goal.currentAmount >= goal.targetAmount;
        
        // If goal wasn't achieved before but is now, and reminder wasn't sent, send notification
        if (!wasAchievedBefore && isAchievedAfter && !goal.reminderSent) {
            try {
                await createNotification(
                    goal.user,
                    "goal_alert",
                    "🎉 Goal Reached!",
                    `Congratulations! You have reached your goal: "${goal.name}".`,
                    "info",
                    goal._id,
                    "Goal"
                );
                goal.reminderSent = true;
                console.log(`✅ Notification sent for goal "${goal.name}" after update`);
            } catch (notificationError) {
                console.error(`❌ Failed to send notification for goal "${goal.name}":`, notificationError);
            }
        }
        
        // If target amount was increased and goal is no longer achieved, reset reminderSent
        if (wasAchievedBefore && !isAchievedAfter) {
            goal.reminderSent = false;
        }

        await goal.save();
        res.status(httpStatus.OK).json({ message: "Goal updated successfully", goal });

    } catch (error) {
        console.error("❌ Error updating goal:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error updating goal" });
    }
};

/**
 * 📌 Delete a goal
 */
exports.deleteGoal = async (req, res) => {
    try {
        const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });

        if (!goal) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "Goal not found" });
        }

        res.status(httpStatus.OK).json({ message: "Goal deleted successfully" });
    } catch (error) {
        console.error("❌ Error deleting goal:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error deleting goal" });
    }
};

/**
 * 📌 Track savings progress & send notifications if goal is reached
 */
/**
 * 📌 Track savings progress & send notifications if goal is reached
 */
exports.updateGoalProgress = async (transaction) => {
    try {
        if (transaction.type !== "income") {
            console.log("Skipping goal progress update for non-income transaction");
            return;
        }

        const goals = await Goal.find({ user: transaction.user, autoAllocate: true });
        console.log(`Checking ${goals.length} goals for auto-allocation from transaction`);

        for (let goal of goals) {
            const wasAlreadyAchieved = goal.currentAmount >= goal.targetAmount;
            
            // If goal was already achieved but reminder wasn't sent, send it now
            if (wasAlreadyAchieved && !goal.reminderSent) {
                try {
                    await createNotification(
                        goal.user,
                        "goal_alert",
                        "🎉 Goal Reached!",
                        `Congratulations! You have reached your goal: "${goal.name}".`,
                        "info",
                        goal._id,
                        "Goal"
                    );
                    goal.reminderSent = true;
                    await goal.save();
                    console.log(`✅ Notification sent for previously achieved goal "${goal.name}"`);
                } catch (notificationError) {
                    console.error(`❌ Failed to send notification for goal "${goal.name}":`, notificationError);
                }
                continue;
            }
            
            // Skip further processing if goal has already been achieved
            if (wasAlreadyAchieved) {
                console.log(`Goal "${goal.name}" already achieved, skipping update`);
                continue;
            }

            let allocatedAmount = (transaction.amount * goal.allocationPercentage) / 100;

            // ✅ Convert transaction currency to goal currency if needed
            if (transaction.currency !== goal.currency) {
                try {
                    allocatedAmount = await convertCurrency(allocatedAmount, transaction.currency, goal.currency);
                } catch (error) {
                    console.error(`❌ Error converting currency for goal "${goal.name}":`, error.message);
                    continue; // Skip conversion if it fails
                }
            }

            const oldAmount = goal.currentAmount;
            const remainingAmount = goal.targetAmount - goal.currentAmount;
            goal.currentAmount += Math.min(allocatedAmount, remainingAmount);
            
            console.log(`Goal "${goal.name}": ${oldAmount.toFixed(2)} -> ${goal.currentAmount.toFixed(2)} / ${goal.targetAmount.toFixed(2)}`);

            // ✅ Check if the goal has been NEWLY reached by this update
            const isNewlyAchieved = oldAmount < goal.targetAmount && goal.currentAmount >= goal.targetAmount;
            
            if (isNewlyAchieved) {
                try {
                    // Using createNotification for consistency with other notifications
                    await createNotification(
                        goal.user,
                        "goal_alert",
                        "🎉 Goal Reached!",
                        `Congratulations! You have reached your goal: "${goal.name}".`,
                        "info",
                        goal._id,
                        "Goal"
                    );

                    console.log(`✅ Notification sent for goal "${goal.name}"`);
                    goal.reminderSent = true; // Mark goal as notified
                } catch (notificationError) {
                    console.error(`❌ Failed to send notification for goal "${goal.name}":`, notificationError);
                }
            }

            await goal.save();
        }

    } catch (error) {
        console.error("❌ Error updating goal progress:", error);
    }
};

/**
 * 📌 Add savings to a goal manually
 */
exports.addSavingsToGoal = async (req, res) => {
    try {
        const { amount, currency } = req.body;

        const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });

        if (!goal) {
            return res.status(httpStatus.NOT_FOUND).json({ error: "Goal not found" });
        }

        // Check if goal is already achieved
        if (goal.currentAmount >= goal.targetAmount) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                error: "Goal already achieved. Cannot add more savings to a completed goal." 
            });
        }

        if (amount <= 0) {
            return res.status(httpStatus.BAD_REQUEST).json({ error: "Amount must be greater than zero." });
        }
        let adjustedAmount = amount;

        // ✅ Convert manually added savings if currency differs
        if (currency !== goal.currency) {
            try {
                adjustedAmount = await convertCurrency(amount, currency, goal.currency);
            } catch (error) {
                console.error(`❌ Error converting added savings to goal currency:`, error.message);
                return res.status(httpStatus.SERVER_ERROR).json({ error: "Currency conversion failed." });
            }
        }

        const wasAchieved = goal.currentAmount >= goal.targetAmount;
        
        // Ensure we don't exceed the target amount
        const remainingAmount = goal.targetAmount - goal.currentAmount;
        goal.currentAmount += Math.min(adjustedAmount, remainingAmount);
        
        // Check if goal is now achieved due to manual addition
        if (!wasAchieved && goal.currentAmount >= goal.targetAmount && !goal.reminderSent) {
            try {
                await createNotification(
                    goal.user,
                    "goal_alert",
                    "🎉 Goal Reached!",
                    `Congratulations! You have reached your goal: "${goal.name}".`,
                    "info",
                    goal._id,
                    "Goal"
                );
                
                goal.reminderSent = true;
                console.log(`✅ Notification sent for goal "${goal.name}" after manual savings addition`);
            } catch (notificationError) {
                console.error(`❌ Failed to send notification for goal "${goal.name}":`, notificationError);
            }
        }
        
        await goal.save();

        // ✅ Create a transaction for tracking savings
        const transaction = await Transaction.create({
            user: req.user._id,
            type: "income",
            amount: adjustedAmount,
            currency: goal.currency,
            category: "Salary",
            date: new Date()
        });

        res.status(httpStatus.OK).json({ message: "Savings added successfully", goal });

    } catch (error) {
        console.error("❌ Error updating goal:", error);
        res.status(httpStatus.SERVER_ERROR).json({ error: "Error updating goal" });
    }
};