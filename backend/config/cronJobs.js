const cron = require('node-cron');
const Transaction = require('../models/Transaction');
const Goal = require("../models/Goal");
const { createNotification } = require('../controllers/notificationController'); // Import notification function

/**
 * Cron Job: Runs every day at midnight (00:00)
 * - Finds recurring transactions due for execution
 * - Creates a new transaction based on recurrence rules
 * - Updates the nextOccurrence field for the next execution
 * - Sends notifications for upcoming or missed transactions
 */
cron.schedule('0 0 * * *', async () => {
    console.log("🔄 Running recurring transactions job...");

    try {
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(now.getDate() + 1);

        // 🔍 1️⃣ Find transactions that are due **tomorrow** (Upcoming notifications)
        const upcomingTransactions = await Transaction.find({
            "recurring.isRecurring": true,
            nextOccurrence: { $gte: tomorrow, $lt: new Date(tomorrow.getTime() + 86400000) }, // Within the next day
        });

        for (let transaction of upcomingTransactions) {
            await createNotification(
                transaction.user,
                "transaction_alert",
                "Upcoming Recurring Transaction",
                `Reminder: Your scheduled transaction for '${transaction.category}' of $${transaction.amount} is due tomorrow.`,
                "info",
                transaction._id,
                "Transaction"
            );
            console.log(`🔔 Notification sent: Upcoming transaction in '${transaction.category}' for $${transaction.amount}`);
        }

        // 🔍 2️⃣ Find transactions that **should have been processed but were not** (Missed transactions)
        const missedTransactions = await Transaction.find({
            "recurring.isRecurring": true,
            nextOccurrence: { $lt: now }, // Overdue transaction
        });

        for (let transaction of missedTransactions) {
            await createNotification(
                transaction.user,
                "transaction_alert",
                "Missed Recurring Transaction",
                `🚨 Alert: Your scheduled transaction for '${transaction.category}' of $${transaction.amount} was missed! Please review your payments.`,
                "critical",
                transaction._id,
                "Transaction"
            );
            console.log(`❌ Notification sent: Missed transaction in '${transaction.category}' for $${transaction.amount}`);
        }

        // 🔄 3️⃣ Process transactions that are **due today**
        const transactions = await Transaction.find({
            "recurring.isRecurring": true,
            nextOccurrence: { $lte: now },
            $or: [{ "recurring.endDate": null }, { "recurring.endDate": { $gte: now } }]
        });

        for (let transaction of transactions) {
            // ✅ Stop recurrence if nextOccurrence > endDate
            if (transaction.recurring.endDate && transaction.nextOccurrence > new Date(transaction.recurring.endDate)) {
                transaction.recurring.isRecurring = false;
                transaction.nextOccurrence = null;
                await transaction.save();
                console.log(`⚠️ Recurring transaction (ID: ${transaction._id}) has ended.`);
                continue; // Skip to the next transaction
            }

            // ✅ Create a new transaction instance
            const newTransaction = new Transaction({
                user: transaction.user,
                type: transaction.type,
                amount: transaction.amount,
                category: transaction.category,
                tags: transaction.tags,
                date: new Date(),
                recurring: transaction.recurring
            });

            await newTransaction.save();

            // ✅ Calculate next occurrence date
            let nextOccurrence = new Date(transaction.nextOccurrence);
            if (transaction.recurring.frequency === 'daily') nextOccurrence.setDate(nextOccurrence.getDate() + 1);
            if (transaction.recurring.frequency === 'weekly') nextOccurrence.setDate(nextOccurrence.getDate() + 7);
            if (transaction.recurring.frequency === 'monthly') nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
            if (transaction.recurring.frequency === 'yearly') nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);

            // ✅ Update the original transaction's next occurrence
            transaction.nextOccurrence = nextOccurrence;
            await transaction.save();
        }

        console.log("✅ Recurring transactions processed successfully.");
         // 🔔 4️⃣ Send notifications for **upcoming goal deadlines** (3 days before)
         console.log("🔍 Checking for upcoming goal deadlines...");
         const today = new Date();
         const upcomingGoals = await Goal.find({
             deadline: { $lte: new Date(today.setDate(today.getDate() + 3)) },
             reminderSent: false
         });
 
         for (let goal of upcomingGoals) {
             await createNotification(
                 goal.user,
                 "goal_alert",
                 "Upcoming Goal Deadline",
                 `⏳ Your goal "${goal.name}" is nearing its deadline!`,
                 "warning"
             );
 
             goal.reminderSent = true;
             await goal.save();
         }console.log("✅ Goal deadline reminders sent successfully.");

          // 🔔 5️⃣ Send notifications for **goals due today**
        console.log("🔍 Checking for goals due today...");
        const todayGoals = await Goal.find({
            deadline: { $lte: new Date(), $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        });

        for (let goal of todayGoals) {
            await createNotification(
                goal.user,
                "goal_alert",
                "Final Goal Deadline Reminder",
                `📅 Today is the deadline for your goal: "${goal.name}". Take action now!`,
                "critical"
            );
        }

        console.log("✅ Final goal deadline reminders sent successfully.");
        // 🔍 Find goals that have missed their deadline but are not completed
        const overdueGoals = await Goal.find({
            deadline: { $lt: now },
            currentAmount: { $lt: "$targetAmount" } // Only notify if the goal is incomplete
        });

        for (let goal of overdueGoals) {
            await Notification.create({
                user: goal.user,
                type: "goal_alert",
                title: "⚠️ Goal Deadline Missed",
                message: `The deadline for your goal "${goal.name}" has passed, but it was not reached. Consider adjusting your savings plan.`,
                severity: "warning"
            });
        }

        console.log("✅ Overdue goal notifications sent.");
    } catch (error) {
        console.error("❌ Error processing recurring transactions:", error);
    }
});
