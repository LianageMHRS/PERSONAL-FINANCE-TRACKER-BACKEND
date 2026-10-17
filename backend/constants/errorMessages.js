const ERROR_MESSAGES = {
    AUTH: {
        INVALID_CREDENTIALS: "Invalid email or password",
        EMAIL_EXISTS: "Email already exists",
        USER_NOT_FOUND: "User not found",
        INVALID_TOKEN: "Invalid token",
        TOKEN_EXPIRED: "Token has expired",
        UNAUTHORIZED: "Unauthorized access",
        INVALID_ROLE: "Invalid role assignment",
        PASSWORD_MISMATCH: "Passwords do not match",
        WEAK_PASSWORD: "Password does not meet security requirements"
    },
    USER: {
        NOT_FOUND: "User not found",
        INVALID_ID: "Invalid user ID",
        UPDATE_FAILED: "Failed to update user",
        DELETE_FAILED: "Failed to delete user",
        INVALID_INPUT: "Invalid user input data"
    },
    TRANSACTION: {
        NOT_FOUND: "Transaction not found",
        INVALID_AMOUNT: "Invalid transaction amount",
        INVALID_CATEGORY: "Invalid transaction category",
        INVALID_DATE: "Invalid transaction date",
        CREATE_FAILED: "Failed to create transaction",
        UPDATE_FAILED: "Failed to update transaction",
        DELETE_FAILED: "Failed to delete transaction",
        INVALID_RECURRING_PATTERN: "Invalid recurring transaction pattern"
    },
    BUDGET: {
        NOT_FOUND: "Budget not found",
        LIMIT_EXCEEDED: "Budget limit exceeded",
        INVALID_LIMIT: "Invalid budget limit",
        INVALID_PERIOD: "Invalid budget period",
        CREATE_FAILED: "Failed to create budget",
        UPDATE_FAILED: "Failed to update budget",
        DELETE_FAILED: "Failed to delete budget"
    },
    GOAL: {
        NOT_FOUND: "Financial goal not found",
        INVALID_TARGET: "Invalid goal target amount",
        INVALID_DEADLINE: "Invalid goal deadline",
        CREATE_FAILED: "Failed to create goal",
        UPDATE_FAILED: "Failed to update goal",
        DELETE_FAILED: "Failed to delete goal"
    },
    NOTIFICATION: {
        SEND_FAILED: "Failed to send notification",
        INVALID_TYPE: "Invalid notification type",
        NOT_FOUND: "Notification not found"
    },
    REPORT: {
        GENERATION_FAILED: "Failed to generate report",
        INVALID_DATE_RANGE: "Invalid date range for report",
        NOT_FOUND: "Report not found"
    },
    CURRENCY: {
        CONVERSION_FAILED: "Currency conversion failed",
        INVALID_CURRENCY: "Invalid currency code",
        RATE_UPDATE_FAILED: "Failed to update exchange rates"
    },
    DATABASE: {
        CONNECTION_ERROR: "Database connection error",
        QUERY_FAILED: "Database query failed",
        VALIDATION_ERROR: "Database validation error"
    },
    SERVER: {
        INTERNAL_ERROR: "Internal server error",
        SERVICE_UNAVAILABLE: "Service temporarily unavailable",
        RATE_LIMIT_EXCEEDED: "Too many requests, please try again later"
    },
    VALIDATION: {
        REQUIRED_FIELD: "Required field missing",
        INVALID_FORMAT: "Invalid data format",
        INVALID_LENGTH: "Invalid field length",
        INVALID_VALUE: "Invalid value provided"
    }
}

module.exports = ERROR_MESSAGES;