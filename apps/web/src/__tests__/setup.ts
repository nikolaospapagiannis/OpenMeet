import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import React from 'react';

// Polyfill TextEncoder/TextDecoder for Jest environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock scrollTo
window.scrollTo = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key(index: number) {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key(index: number) {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock crypto.randomUUID
if (!global.crypto) {
  global.crypto = {} as any;
}
global.crypto.randomUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Suppress console errors and warnings in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((...args) => {
    // Only log errors that are not React warnings
    if (
      typeof args[0] === 'string' &&
      !args[0].includes('Warning:') &&
      !args[0].includes('ReactDOM.render')
    ) {
      originalError(...args);
    }
  });

  console.warn = jest.fn((...args) => {
    // Only log warnings that are important
    if (
      typeof args[0] === 'string' &&
      !args[0].includes('componentWillReceiveProps') &&
      !args[0].includes('componentWillMount')
    ) {
      originalWarn(...args);
    }
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

// Test utilities
export const createMockRouter = (overrides = {}) => ({
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
  query: {},
  asPath: '/',
  basePath: '',
  locale: 'en',
  locales: ['en'],
  defaultLocale: 'en',
  isLocaleDomain: false,
  isReady: true,
  isPreview: false,
  ...overrides,
});

export const createMockAuthContext = (overrides = {}) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  updateUser: jest.fn(),
  ...overrides,
});

export const waitForLoadingToFinish = () =>
  waitFor(() => {
    const loadingElements = screen.queryAllByText(/loading|spinner/i);
    expect(loadingElements).toHaveLength(0);
  });

// Mock API responses
export const mockApiResponses = {
  login: {
    success: {
      user: {
        id: '1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
      },
      token: 'mock-jwt-token',
    },
    error: {
      message: 'Invalid email or password',
      code: 'INVALID_CREDENTIALS',
    },
  },
  register: {
    success: {
      user: {
        id: '1',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
      },
      message: 'Registration successful. Please verify your email.',
    },
    error: {
      message: 'Email already exists',
      code: 'EMAIL_EXISTS',
    },
  },
  forgotPassword: {
    success: {
      message: 'Password reset email sent',
    },
    error: {
      message: 'User not found',
      code: 'USER_NOT_FOUND',
    },
  },
  resetPassword: {
    success: {
      message: 'Password reset successful',
    },
    error: {
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    },
  },
  verifyEmail: {
    success: {
      message: 'Email verified successfully',
    },
    error: {
      message: 'Invalid or expired verification token',
      code: 'INVALID_TOKEN',
    },
  },
  setupMFA: {
    success: {
      qrCode: 'otpauth://totp/Example:user@example.com?secret=SECRET&issuer=Example',
      secret: 'SECRETKEY123456',
    },
    error: {
      message: 'Failed to setup MFA',
      code: 'MFA_SETUP_FAILED',
    },
  },
  completeMFA: {
    success: {
      backupCodes: [
        'BACKUP1',
        'BACKUP2',
        'BACKUP3',
        'BACKUP4',
        'BACKUP5',
        'BACKUP6',
        'BACKUP7',
        'BACKUP8',
      ],
    },
    error: {
      message: 'Invalid verification code',
      code: 'INVALID_CODE',
    },
  },
};

// Re-export testing library functions
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';