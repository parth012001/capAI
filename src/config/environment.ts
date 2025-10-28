/**
 * Environment Configuration & Validation
 * Production-grade environment variable validation and configuration management
 */

export interface EnvironmentConfig {
  // Server Configuration
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;

  // Database Configuration
  DATABASE_URL: string;

  // Google OAuth Configuration (Legacy - keep for rollback)
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;

  // Composio Configuration (NEW)
  COMPOSIO_API_KEY?: string;
  COMPOSIO_AUTH_CONFIG_ID?: string;
  USE_COMPOSIO?: boolean;
  WEBHOOK_DOMAIN?: string;

  // OpenAI Configuration
  OPENAI_API_KEY: string;

  // JWT Configuration
  JWT_SECRET: string;

  // Optional Configuration
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';
  WEBHOOK_RENEWAL_INTERVAL?: number; // in hours
  FRONTEND_URL?: string;
}

/**
 * Validate and load environment configuration
 * Fails fast if required environment variables are missing
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET', 
    'GOOGLE_REDIRECT_URI',
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'JWT_SECRET'
  ];

  // Check for missing required variables
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  // Validate PORT
  const port = parseInt(process.env.PORT || '3000', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error('❌ Invalid PORT value. Must be a number between 1 and 65535.');
    process.exit(1);
  }

  // Validate NODE_ENV
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!['development', 'production', 'test'].includes(nodeEnv)) {
    console.error('❌ Invalid NODE_ENV value. Must be: development, production, or test');
    process.exit(1);
  }

  // Validate DATABASE_URL format
  const dbUrl = process.env.DATABASE_URL!;
  if (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    console.error('❌ Invalid DATABASE_URL format. Must start with postgresql:// or postgres://');
    process.exit(1);
  }

  // Validate JWT_SECRET strength (production only)
  const jwtSecret = process.env.JWT_SECRET!;
  if (nodeEnv === 'production' && jwtSecret.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long in production');
    process.exit(1);
  }

  // Validate LOG_LEVEL
  const logLevel = process.env.LOG_LEVEL || 'info';
  if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    console.error('❌ Invalid LOG_LEVEL. Must be: debug, info, warn, or error');
    process.exit(1);
  }

  // Validate Composio configuration
  const useComposio = process.env.USE_COMPOSIO === 'true';
  if (useComposio) {
    const composioMissingVars = [];
    if (!process.env.COMPOSIO_API_KEY) {
      composioMissingVars.push('COMPOSIO_API_KEY');
    }
    if (!process.env.COMPOSIO_AUTH_CONFIG_ID) {
      composioMissingVars.push('COMPOSIO_AUTH_CONFIG_ID');
    }

    if (composioMissingVars.length > 0) {
      console.error('❌ Composio integration enabled (USE_COMPOSIO=true) but missing required variables:');
      composioMissingVars.forEach(varName => {
        console.error(`   - ${varName}`);
      });
      console.error('\nTo use Composio:');
      console.error('  1. Set COMPOSIO_API_KEY from https://app.composio.dev/settings');
      console.error('  2. Set COMPOSIO_AUTH_CONFIG_ID for your Gmail auth config');
      console.error('Or set USE_COMPOSIO=false to use legacy Google OAuth');
      process.exit(1);
    }
  }

  const config: EnvironmentConfig = {
    NODE_ENV: nodeEnv as 'development' | 'production' | 'test',
    PORT: port,
    DATABASE_URL: dbUrl,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI!,
    COMPOSIO_API_KEY: process.env.COMPOSIO_API_KEY,
    COMPOSIO_AUTH_CONFIG_ID: process.env.COMPOSIO_AUTH_CONFIG_ID,
    USE_COMPOSIO: process.env.USE_COMPOSIO === 'true',
    WEBHOOK_DOMAIN: process.env.WEBHOOK_DOMAIN,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    JWT_SECRET: jwtSecret,
    LOG_LEVEL: logLevel as 'debug' | 'info' | 'warn' | 'error',
    WEBHOOK_RENEWAL_INTERVAL: parseInt(process.env.WEBHOOK_RENEWAL_INTERVAL || '6', 10),
    FRONTEND_URL: process.env.FRONTEND_URL
  };

  // Log configuration summary (without sensitive data)
  console.log('✅ Environment configuration loaded successfully:');
  console.log(`   - Environment: ${config.NODE_ENV}`);
  console.log(`   - Port: ${config.PORT}`);
  console.log(`   - Log Level: ${config.LOG_LEVEL}`);
  console.log(`   - Database: ${config.DATABASE_URL.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials
  console.log(`   - Google OAuth: ${config.GOOGLE_CLIENT_ID.substring(0, 12)}...`);
  console.log(`   - Composio: ${config.USE_COMPOSIO ? 'ENABLED' : 'DISABLED'}`);
  if (config.COMPOSIO_API_KEY) {
    console.log(`   - Composio API Key: ${config.COMPOSIO_API_KEY.substring(0, 8)}...`);
  }
  console.log(`   - OpenAI API: ${config.OPENAI_API_KEY.substring(0, 8)}...`);

  return config;
}

/**
 * Global environment configuration instance
 * Note: This will be loaded after dotenv.config() is called
 */
export let env: EnvironmentConfig;
export let features: any;

/**
 * Initialize environment configuration after dotenv is loaded
 */
export function initializeEnvironment(): void {
  env = loadEnvironmentConfig();
  
  /**
   * Environment-specific feature flags
   */
  features = {
    // Enable detailed logging in development
    enableDebugLogging: env.NODE_ENV === 'development',

    // Enable strict security in production
    enableStrictSecurity: env.NODE_ENV === 'production',

    // Enable webhook testing endpoints in development
    enableWebhookTesting: env.NODE_ENV !== 'production',

    // Enable CORS for frontend
    enableCORS: true,

    // Composio integration (feature flag for safe migration)
    useComposio: env.USE_COMPOSIO || false
  };
}