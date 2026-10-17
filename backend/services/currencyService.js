require('dotenv').config(); // Load environment variables
const axios = require('axios');

const API_KEY = process.env.EXCHANGE_RATE_API_KEY; // Load from .env

/**
 * 📌 Fetch the latest exchange rate between two currencies
 * @param {string} from - The base currency (e.g., "USD")
 * @param {string} to - The target currency (e.g., "EUR")
 * @returns {number|null} - Exchange rate or null if error occurs
 */
const getExchangeRate = async (from, to) => {
    try {
        if (!API_KEY) {
            throw new Error("Missing API key for exchange rate service.");
        }

        const response = await axios.get(`https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${from}`);

        if (response.data.result !== "success") {
            console.error(`⚠️ Failed to fetch exchange rates: ${response.data["error-type"]}`);
            return null;
        }

        return response.data.conversion_rates[to] || null;
    } catch (error) {
        console.error("❌ Error fetching exchange rates:", error.message);
        return null;
    }
};

/**
 * 📌 Convert an amount from one currency to another
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - The currency of the amount (e.g., "USD")
 * @param {string} toCurrency - The target currency (e.g., "EUR")
 * @returns {number} - Converted amount
 */
const convertCurrency = async (amount, fromCurrency, toCurrency) => {
    try {
       // Check if amount is valid (defined, positive, and a number)
       if (typeof amount === 'undefined' || amount === null || isNaN(amount) || amount <= 0) {
        console.warn(`⚠️ Invalid or undefined amount received for conversion: ${amount}`);
        return amount; // Fallback to original amount if invalid
    }

    // Check if currencies are defined
    if (!fromCurrency || !toCurrency) {
        console.warn(`⚠️ Missing currency information: fromCurrency = ${fromCurrency}, toCurrency = ${toCurrency}`);
        return amount; // Fallback to original amount if currency information is incomplete
    }

    // No conversion needed if both currencies are the same
    if (fromCurrency === toCurrency) {
        console.log(`🔄 No conversion needed: ${amount} ${fromCurrency} = ${amount} ${toCurrency}`);
        return amount;
    }

    // Fetch the exchange rate
    const rate = await getExchangeRate(fromCurrency, toCurrency);
    if (!rate) {
        console.warn(`⚠️ Unable to fetch exchange rate for ${fromCurrency} → ${toCurrency}. Using original amount.`);
        return amount; // Fallback to original amount if conversion fails
    }

    // Convert the amount
    const convertedAmount = (amount * rate).toFixed(2);
    console.log(`✅ Converted: ${amount} ${fromCurrency} → ${convertedAmount} ${toCurrency}`);
    return parseFloat(convertedAmount); // Return converted amount as float
} catch (error) {
    console.error("❌ Error converting currency:", error.message);
    return amount; // Return original amount if an error occurs
}
};

module.exports = { getExchangeRate, convertCurrency };
