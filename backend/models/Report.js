const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    currency: { 
      type: String, 
      required: true, 
      enum: ["USD", "EUR", "LKR", "GBP", "INR"] 
    },
    startDate: { 
      type: Date, 
      required: true 
    },
    endDate: { 
      type: Date, 
      required: true 
    },
    totalIncome: { 
      type: Number, 
      default: 0 
    },
    totalExpenses: { 
      type: Number, 
      default: 0 
    },
    breakdown: [
      {
        category: { 
          type: String, 
          required: true 
        },
        income: { 
          type: Number, 
          default: 0 
        },
        expenses: { 
          type: Number, 
          default: 0 
        }
      }
    ],
    goalProgress: [
      {
        goalId: { 
          type: mongoose.Schema.Types.ObjectId, 
          ref: "Goal", 
          required: true 
        },
        goalName: { 
          type: String, 
          required: true 
        },
        targetAmount: { 
          type: Number, 
          required: true 
        },
        currentAmount: { 
          type: Number, 
          required: true 
        },
        progressPercentage: { 
          type: Number, 
          required: true 
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
