const SUCCESS_MESSAGES = {
    AUTH: {
        REGISTER: "User registered successfully",
        LOGIN: "User logged in successfully",
        LOGOUT: "User logged out successfully",
        PASSWORD_RESET: "Password reset successfully",
        PASSWORD_CHANGE: "Password changed successfully"
    },
    USER: {
        CREATED: "User created successfully",
        UPDATED: "User updated successfully",
        DELETED: "User deleted successfully",
        FETCHED: "User fetched successfully",
        ALL_FETCHED: "All users fetched successfully",
        PROFILE_UPDATED: "Profile updated successfully"
    },
    TRANSACTION: {
        CREATED: "Transaction created successfully",
        UPDATED: "Transaction updated successfully",
        DELETED: "Transaction deleted successfully",
        FETCHED: "Transaction fetched successfully",
        ALL_FETCHED: "All transactions fetched successfully",
        RECURRING_CREATED: "Recurring transaction created successfully",
        RECURRING_UPDATED: "Recurring transaction updated successfully"
    },
    BUDGET: {
        CREATED: "Budget created successfully",
        UPDATED: "Budget updated successfully",
        DELETED: "Budget deleted successfully",
        FETCHED: "Budget fetched successfully",
        ALL_FETCHED: "All budgets fetched successfully",
        LIMIT_UPDATED: "Budget limit updated successfully"
    },
    GOAL: {
        CREATED: "Financial goal created successfully",
        UPDATED: "Financial goal updated successfully",
        DELETED: "Financial goal deleted successfully",
        FETCHED: "Financial goal fetched successfully",
        ALL_FETCHED: "All financial goals fetched successfully",
        PROGRESS_UPDATED: "Goal progress updated successfully"
    },
    NOTIFICATION: {
        SENT: "Notification sent successfully",
        UPDATED: "Notification updated successfully",
        DELETED: "Notification deleted successfully",
        FETCHED: "Notification fetched successfully",
        ALL_FETCHED: "All notifications fetched successfully"
    },
    REPORT: {
        GENERATED: "Report generated successfully",
        DOWNLOADED: "Report downloaded successfully",
        DELETED: "Report deleted successfully"
    },
    CURRENCY: {
        UPDATED: "Currency updated successfully",
        CONVERTED: "Currency converted successfully",
        RATES_UPDATED: "Exchange rates updated successfully"
    }
}

module.exports = SUCCESS_MESSAGES;
