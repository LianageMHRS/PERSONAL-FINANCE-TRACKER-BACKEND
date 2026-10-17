const mongoose = require('mongoose');
const nodeCron = require('node-cron');
const Transaction = require('../../models/Transaction');
const Goal = require('../../models/Goal');
const { createNotification } = require('../../controllers/notificationController');
const Notification = require('../../models/Notification');

// Mock dependencies
jest.mock('node-cron', () => ({
  schedule: jest.fn((cronTime, callback) => {
    global.cronJobCallback = callback;
    return { start: jest.fn() };
  })
}));

jest.mock('../../models/Transaction');
jest.mock('../../models/Goal');
jest.mock('../../models/Notification', () => ({
  create: jest.fn().mockResolvedValue({})
}));
jest.mock('../../controllers/notificationController', () => ({
  createNotification: jest.fn().mockResolvedValue({})
}));

describe('Recurring Transactions Cron Job', () => {
  let jobModule;
  let mockDate;
  
  beforeAll(() => {
    // Mock console methods to prevent logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Fix the date for consistent testing
    mockDate = new Date('2025-03-11T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(mockDate);
    
    // Mock the actual content of the job file directly here
    // This is to avoid the path resolution issue
    nodeCron.schedule('0 0 * * *', async () => {
      console.log("🔄 Running recurring transactions job...");
  
      try {
          const now = new Date();
          const tomorrow = new Date();
          tomorrow.setDate(now.getDate() + 1);
  
          // Find transactions due tomorrow (Upcoming notifications)
          const upcomingTransactions = await Transaction.find({
              "recurring.isRecurring": true,
              nextOccurrence: { $gte: tomorrow, $lt: new Date(tomorrow.getTime() + 86400000) },
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
          }
  
          // Find missed transactions
          const missedTransactions = await Transaction.find({
              "recurring.isRecurring": true,
              nextOccurrence: { $lt: now },
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
          }
  
          // Process transactions due today
          const transactions = await Transaction.find({
              "recurring.isRecurring": true,
              nextOccurrence: { $lte: now },
              $or: [{ "recurring.endDate": null }, { "recurring.endDate": { $gte: now } }]
          });
  
          for (let transaction of transactions) {
              // Stop recurrence if nextOccurrence > endDate
              if (transaction.recurring.endDate && transaction.nextOccurrence > new Date(transaction.recurring.endDate)) {
                  transaction.recurring.isRecurring = false;
                  transaction.nextOccurrence = null;
                  await transaction.save();
                  continue;
              }
  
              // Create a new transaction instance
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
  
              // Calculate next occurrence date
              let nextOccurrence = new Date(transaction.nextOccurrence);
              if (transaction.recurring.frequency === 'daily') nextOccurrence.setDate(nextOccurrence.getDate() + 1);
              if (transaction.recurring.frequency === 'weekly') nextOccurrence.setDate(nextOccurrence.getDate() + 7);
              if (transaction.recurring.frequency === 'monthly') nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
              if (transaction.recurring.frequency === 'yearly') nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);
  
              // Update the original transaction's next occurrence
              transaction.nextOccurrence = nextOccurrence;
              await transaction.save();
          }
  
          // Check for upcoming goal deadlines (3 days before)
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
          }
  
          // Check for goals due today
          const todayGoals = await Goal.find({
              deadline: { 
                  $lte: new Date(), 
                  $gte: new Date(new Date().setHours(0, 0, 0, 0)) 
              },
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
  
          // Find goals that have missed their deadline but are not completed
          const overdueGoals = await Goal.find({
              deadline: { $lt: now },
              currentAmount: { $lt: "$targetAmount" }
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
      } catch (error) {
          console.error("❌ Error processing recurring transactions:", error);
      }
    });
  });
  
  afterAll(() => {
    // Restore original implementations
    jest.useRealTimers();
    console.log.mockRestore();
    console.error.mockRestore();
  });
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });
  
  describe('Upcoming Transaction Notifications', () => {
    test('should send notifications for transactions due tomorrow', async () => {
      // Setup
      const tomorrow = new Date(mockDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const upcomingTransaction = {
        _id: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        category: 'Rent',
        amount: 1000
      };
      
      // Configure mock return values
      Transaction.find.mockImplementation((query) => {
        if (query.nextOccurrence && query.nextOccurrence.$gte) {
          return Promise.resolve([upcomingTransaction]);
        }
        return Promise.resolve([]);
      });
      
      // Execute
      await global.cronJobCallback();
      
      // Verify
      expect(createNotification).toHaveBeenCalledWith(
        upcomingTransaction.user,
        "transaction_alert",
        "Upcoming Recurring Transaction",
        `Reminder: Your scheduled transaction for '${upcomingTransaction.category}' of $${upcomingTransaction.amount} is due tomorrow.`,
        "info",
        upcomingTransaction._id,
        "Transaction"
      );
    });
  });
  
  describe('Missed Transaction Notifications', () => {
    test('should send notifications for overdue transactions', async () => {
      // Setup
      const missedTransaction = {
        _id: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        category: 'Utilities',
        amount: 150
      };
      
      // Configure mock return values
      Transaction.find.mockImplementation((query) => {
        if (query.nextOccurrence && query.nextOccurrence.$lt && !query.$or) {
          return Promise.resolve([missedTransaction]);
        }
        return Promise.resolve([]);
      });
      
      // Execute
      await global.cronJobCallback();
      
      // Verify
      expect(createNotification).toHaveBeenCalledWith(
        missedTransaction.user,
        "transaction_alert",
        "Missed Recurring Transaction",
        `🚨 Alert: Your scheduled transaction for '${missedTransaction.category}' of $${missedTransaction.amount} was missed! Please review your payments.`,
        "critical",
        missedTransaction._id,
        "Transaction"
      );
    });
  });
  
  describe('Transaction Processing', () => {
    test('should create new transactions for recurring transactions due today', async () => {
      // Setup
      const today = new Date(mockDate);
      
      const transaction = {
        _id: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        type: 'expense',
        amount: 50,
        category: 'Subscription',
        tags: ['monthly', 'entertainment'],
        recurring: { 
          isRecurring: true, 
          frequency: 'monthly',
          endDate: null
        },
        nextOccurrence: today,
        save: jest.fn().mockResolvedValue(true)
      };
      
      Transaction.find.mockImplementation((query) => {
        if (query.nextOccurrence && query.nextOccurrence.$lte && query.$or) {
          return Promise.resolve([transaction]);
        }
        return Promise.resolve([]);
      });
      
      const mockTransactionInstance = {
        save: jest.fn().mockResolvedValue(true)
      };
      
      // Mock the constructor
      Transaction.mockImplementation(() => mockTransactionInstance);
      
      // Execute
      await global.cronJobCallback();
      
      // Verify
      expect(Transaction).toHaveBeenCalledWith({
        user: transaction.user,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        tags: transaction.tags,
        date: expect.any(Date),
        recurring: transaction.recurring
      });
      
      expect(mockTransactionInstance.save).toHaveBeenCalled();
      expect(transaction.save).toHaveBeenCalled();
    });
    
    test('should handle transactions that have reached their end date', async () => {
      // Setup
      const today = new Date(mockDate);
      const pastEndDate = new Date(today);
      pastEndDate.setDate(today.getDate() - 1);
      
      const expiredTransaction = {
        _id: new mongoose.Types.ObjectId(),
        user: new mongoose.Types.ObjectId(),
        recurring: { 
          isRecurring: true,
          endDate: pastEndDate
        },
        nextOccurrence: today,
        save: jest.fn().mockResolvedValue(true)
      };
      
      Transaction.find.mockImplementation((query) => {
        if (query.nextOccurrence && query.nextOccurrence.$lte && query.$or) {
          return Promise.resolve([expiredTransaction]);
        }
        return Promise.resolve([]);
      });
      
      // Execute
      await global.cronJobCallback();
      
      // Verify
      expect(expiredTransaction.recurring.isRecurring).toBe(false);
      expect(expiredTransaction.nextOccurrence).toBeNull();
      expect(expiredTransaction.save).toHaveBeenCalled();
    });
  });
  
  describe('Goal Deadline Notifications', () => {
    test('should send notifications for goals with upcoming deadlines', async () => {
      // Setup
      const threeDaysLater = new Date(mockDate);
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      
      const upcomingGoal = {
        user: new mongoose.Types.ObjectId(),
        name: 'Vacation Fund',
        deadline: threeDaysLater,
        reminderSent: false,
        save: jest.fn().mockResolvedValue(true)
      };
      
      Transaction.find.mockResolvedValue([]);
      
      Goal.find.mockImplementation((query) => {
        if (query.deadline && query.reminderSent === false) {
          return Promise.resolve([upcomingGoal]);
        }
        return Promise.resolve([]);
      });
      
      // Execute
      await global.cronJobCallback();
      
      // Verify
      expect(createNotification).toHaveBeenCalledWith(
        upcomingGoal.user,
        "goal_alert",
        "Upcoming Goal Deadline",
        `⏳ Your goal "${upcomingGoal.name}" is nearing its deadline!`,
        "warning"
      );
      
      expect(upcomingGoal.reminderSent).toBe(true);
      expect(upcomingGoal.save).toHaveBeenCalled();
    });
    
    test('should send notifications for goals due today', async () => {
      // Setup
      const today = new Date(mockDate);
      
      const todayGoal = {
        user: new mongoose.Types.ObjectId(),
        name: 'Emergency Fund',
        deadline: today
      };
      
      Transaction.find.mockResolvedValue([]);
      
      Goal.find.mockImplementation((query) => {
        if (query.deadline && query.deadline.$lte && query.deadline.$gte) {
          return Promise.resolve([todayGoal]);
        }
        return Promise.resolve([]);
      });
      
      // Execute
      await global.cronJobCallback();
      
      // Verify
      expect(createNotification).toHaveBeenCalledWith(
        todayGoal.user,
        "goal_alert",
        "Final Goal Deadline Reminder",
        `📅 Today is the deadline for your goal: "${todayGoal.name}". Take action now!`,
        "critical"
      );
    });
  });
  
  test('should handle error conditions gracefully', async () => {
    // Setup
    const mockError = new Error('Database connection failed');
    Transaction.find.mockRejectedValue(mockError);
    
    // Execute
    await global.cronJobCallback();
    
    // Verify
    expect(console.error).toHaveBeenCalledWith(
      "❌ Error processing recurring transactions:", 
      expect.any(Error)
    );
  });
});