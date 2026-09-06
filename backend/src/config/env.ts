/**
 * Environment variable validation and access.
 * Throws immediately at startup if required vars are missing.
 */

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRY: string;
  JWT_REFRESH_EXPIRY: string;
  OTP_EXPIRY_MINUTES: number;
  ADMIN_SESSION_TIMEOUT_MINUTES: number;
  CORS_ORIGIN: string;
  // ── Email (ZeptoMail) ──
  MAIL_ENABLED: boolean;
  ZEPTOMAIL_API_URL: string;
  ZEPTOMAIL_TOKEN: string;
  MAIL_FROM_ADDRESS: string;
  MAIL_FROM_NAME: string;
  MAIL_REPLY_TO: string;
  MAIL_ADMIN_RECIPIENTS: string[];
  MAIL_MAX_ATTEMPTS: number;
  /** Public site origin used to build links inside emails. */
  APP_BASE_URL: string;
  /** Flat ₹ discount issued to a referrer when their referral first buys. */
  REFERRAL_REWARD_AMOUNT: number;
  REFERRAL_REWARD_VALIDITY_DAYS: number;
}

const getBool = (key: string, fallback: string): boolean =>
  ['1', 'true', 'yes'].includes(getEnv(key, fallback).toLowerCase());

const getList = (key: string, fallback: string): string[] =>
  getEnv(key, fallback)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

const getEnv = (key: string, fallback?: string): string => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
  return value;
};

export const env: EnvConfig = {
  PORT: parseInt(getEnv('PORT', '5000'), 10),
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  MONGODB_URI: getEnv('MONGODB_URI'),
  JWT_SECRET: getEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRY: getEnv('JWT_ACCESS_EXPIRY', '7d'),
  JWT_REFRESH_EXPIRY: getEnv('JWT_REFRESH_EXPIRY', '7d'),
  OTP_EXPIRY_MINUTES: parseInt(getEnv('OTP_EXPIRY_MINUTES', '5'), 10),
  ADMIN_SESSION_TIMEOUT_MINUTES: parseInt(getEnv('ADMIN_SESSION_TIMEOUT_MINUTES', '30'), 10),
  CORS_ORIGIN: getEnv('CORS_ORIGIN', 'http://localhost:5174'),

  // ── Email (ZeptoMail) ──
  // MAIL_ENABLED=false still renders and logs every email (status: 'skipped'),
  // it just never hits the provider. Keep it off in development.
  MAIL_ENABLED: getBool('MAIL_ENABLED', 'false'),
  // NOTE: Zoho India accounts use api.zeptomail.in — others use .com.
  // Confirm the host on your ZeptoMail dashboard's SMTP/API tab.
  ZEPTOMAIL_API_URL: getEnv('ZEPTOMAIL_API_URL', 'https://api.zeptomail.in/v1.1/email'),
  ZEPTOMAIL_TOKEN: getEnv('ZEPTOMAIL_TOKEN', ''),
  MAIL_FROM_ADDRESS: getEnv('MAIL_FROM_ADDRESS', 'noreply@medconnectsoverseas.com'),
  MAIL_FROM_NAME: getEnv('MAIL_FROM_NAME', 'MedConnect Overseas'),
  MAIL_REPLY_TO: getEnv('MAIL_REPLY_TO', 'support@medconnectsoverseas.com'),
  MAIL_ADMIN_RECIPIENTS: getList('MAIL_ADMIN_RECIPIENTS', ''),
  MAIL_MAX_ATTEMPTS: parseInt(getEnv('MAIL_MAX_ATTEMPTS', '5'), 10),
  // Links in emails must be absolute and publicly reachable — never CORS_ORIGIN,
  // which is localhost in development.
  APP_BASE_URL: getEnv('APP_BASE_URL', 'https://medconnectsoverseas.com').replace(/\/+$/, ''),
  REFERRAL_REWARD_AMOUNT: parseInt(getEnv('REFERRAL_REWARD_AMOUNT', '200'), 10),
  REFERRAL_REWARD_VALIDITY_DAYS: parseInt(getEnv('REFERRAL_REWARD_VALIDITY_DAYS', '90'), 10),
};

// Fail fast rather than silently dropping mail in production.
if (env.MAIL_ENABLED && !env.ZEPTOMAIL_TOKEN) {
  throw new Error('❌ MAIL_ENABLED is true but ZEPTOMAIL_TOKEN is not set');
}
