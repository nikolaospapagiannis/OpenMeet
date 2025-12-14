/**
 * Environment Configuration and Validation
 * Ensures all required environment variables are set before starting the application
 */

interface RequiredEnvVars {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  DATABASE_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
}

interface OptionalEnvVars {
  NODE_ENV?: string;
  PORT?: string;
  JWT_EXPIRES_IN?: string;
  JWT_REFRESH_EXPIRES_IN?: string;
  REDIS_PASSWORD?: string;
  LOG_LEVEL?: string;
  COOKIE_SECURE?: string;
  COOKIE_DOMAIN?: string;
  COOKIE_SAME_SITE?: string;
  ENCRYPTION_KEY?: string;
}

type EnvVars = RequiredEnvVars & OptionalEnvVars;

class EnvironmentConfig {
  private static instance: EnvironmentConfig;
  private config: EnvVars;

  private constructor() {
    this.validateRequiredVars();
    this.config = this.loadConfig();
  }

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig.instance) {
      EnvironmentConfig.instance = new EnvironmentConfig();
    }
    return EnvironmentConfig.instance;
  }

  private validateRequiredVars(): void {
    const requiredVars: (keyof RequiredEnvVars)[] = [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
      'DATABASE_URL',
      'REDIS_HOST',
      'REDIS_PORT',
    ];

    const missingVars: string[] = [];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables:\n${missingVars.map(v => `  - ${v}`).join('\n')}\n\n` +
        `Please configure these variables in your .env file or environment.`
      );
    }

    // Validate JWT_SECRET length (should be at least 32 characters)
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      throw new Error(
        'JWT_SECRET must be at least 32 characters long for security purposes.\n' +
        'Generate a secure secret using: openssl rand -base64 32'
      );
    }

    if (process.env.JWT_REFRESH_SECRET && process.env.JWT_REFRESH_SECRET.length < 32) {
      throw new Error(
        'JWT_REFRESH_SECRET must be at least 32 characters long for security purposes.\n' +
        'Generate a secure secret using: openssl rand -base64 32'
      );
    }

    // Validate ENCRYPTION_KEY if provided
    if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 32) {
      throw new Error(
        'ENCRYPTION_KEY must be exactly 32 characters long for AES-256 encryption.\n' +
        'Generate a secure key using: openssl rand -hex 32'
      );
    }
  }

  private loadConfig(): EnvVars {
    return {
      JWT_SECRET: process.env.JWT_SECRET!,
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
      DATABASE_URL: process.env.DATABASE_URL!,
      REDIS_HOST: process.env.REDIS_HOST!,
      REDIS_PORT: process.env.REDIS_PORT!,
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: process.env.PORT || '3001',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
      JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      LOG_LEVEL: process.env.LOG_LEVEL || 'info',
      COOKIE_SECURE: process.env.COOKIE_SECURE || 'false',
      COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
      COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE,
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    };
  }

  get<K extends keyof EnvVars>(key: K): EnvVars[K] {
    return this.config[key];
  }

  getRequired<K extends keyof RequiredEnvVars>(key: K): RequiredEnvVars[K] {
    return this.config[key];
  }

  isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }
}

// Export singleton instance
export const env = EnvironmentConfig.getInstance();

// Export individual getters for convenience
export const getEnv = <K extends keyof EnvVars>(key: K): EnvVars[K] => env.get(key);
export const getRequiredEnv = <K extends keyof RequiredEnvVars>(key: K): RequiredEnvVars[K] => env.getRequired(key);
export const isProduction = (): boolean => env.isProduction();
export const isDevelopment = (): boolean => env.isDevelopment();
export const isTest = (): boolean => env.isTest();
