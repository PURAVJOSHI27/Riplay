/**
 * Jest Setup File
 * 
 * This file runs before all tests to configure the test environment.
 */

// Load environment variables from .env file for testing
require('dotenv').config();

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Global test timeout for long-running tests (property-based tests)
jest.setTimeout(30000);

// Mock console methods to reduce noise (optional)
// Uncomment if you want to suppress console output during tests
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Add custom matchers or global test utilities here if needed
