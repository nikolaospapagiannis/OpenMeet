module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'frontend/src/**/*.{ts,tsx}',
    'backend/src/**/*.{ts,js}',
    '!**/*.d.ts',
    '!**/*.test.{ts,tsx,js}',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  testMatch: [
    '**/__tests__/**/*.{ts,tsx,js}',
    '**/*.{test,spec}.{ts,tsx,js}',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
