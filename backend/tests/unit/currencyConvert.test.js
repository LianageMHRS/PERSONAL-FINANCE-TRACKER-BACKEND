const { getExchangeRate, convertCurrency } = require('../../services/currencyService');
const axios = require('axios');
const dotenv = require('dotenv');

// Mock axios and dotenv
jest.mock('axios');
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

describe('Currency Converter', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXCHANGE_RATE_API_KEY = 'test-api-key';
    console.error = jest.fn();
    console.warn = jest.fn();
    console.log = jest.fn();
  });

  describe('getExchangeRate', () => {

    test('should return null when target currency is not found', async () => {
      // Mock API response without the target currency
      axios.get.mockResolvedValue({
        data: {
          result: 'success',
          conversion_rates: {
            USD: 1,
            EUR: 0.85
          }
        }
      });

      const rate = await getExchangeRate('USD', 'XYZ');
      
      expect(rate).toBeNull();
    });

    test('should return null when API call fails', async () => {
      // Mock API error
      axios.get.mockRejectedValue(new Error('Network error'));

      const rate = await getExchangeRate('USD', 'EUR');
      
      expect(rate).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    test('should return null when API returns an error result', async () => {
      // Mock API response with error
      axios.get.mockResolvedValue({
        data: {
          result: 'error',
          'error-type': 'invalid-key'
        }
      });

      const rate = await getExchangeRate('USD', 'EUR');
      
      expect(rate).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });

    test('should throw error when API key is missing', async () => {
      // Remove API key
      delete process.env.EXCHANGE_RATE_API_KEY;

      const rate = await getExchangeRate('USD', 'EUR');
      
      expect(rate).toBeNull();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('convertCurrency', () => {
    
    test('should return original amount when currencies are the same', async () => {
      const amount = 100;
      const convertedAmount = await convertCurrency(amount, 'USD', 'USD');
      
      expect(convertedAmount).toBe(amount);
      expect(console.log).toHaveBeenCalledWith('🔄 No conversion needed: 100 USD = 100 USD');
    });

    test('should return original amount when amount is invalid', async () => {
      const testCases = [undefined, null, NaN, -100, 0];
      
      for (const invalidAmount of testCases) {
        const result = await convertCurrency(invalidAmount, 'USD', 'EUR');
        expect(result).toBe(invalidAmount);
        expect(console.warn).toHaveBeenCalled();
      }
    });

    test('should return original amount when currencies are undefined', async () => {
      const amount = 100;
      
      const result1 = await convertCurrency(amount, undefined, 'EUR');
      expect(result1).toBe(amount);
      
      const result2 = await convertCurrency(amount, 'USD', undefined);
      expect(result2).toBe(amount);
      
      expect(console.warn).toHaveBeenCalled();
    });

  });
});