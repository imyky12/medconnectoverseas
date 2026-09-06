/** OTP expiry in minutes */
export const OTP_EXPIRY_MINUTES = 5;

/** Maximum login sessions per user (single-device policy) */
export const MAX_SESSIONS_PER_USER = 1;

/** Admin auto-logout timeout in minutes */
export const ADMIN_SESSION_TIMEOUT_MINUTES = 30;

/** Supported OTP channels */
export const OTP_CHANNELS = {
  EMAIL: 'email',
  SMS: 'sms',
} as const;

/** User roles */
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

/** Purchase statuses */
export const PURCHASE_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  REFUNDED: 'refunded',
  FAILED: 'failed',
} as const;

/** Coupon types */
export const COUPON_TYPE = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
} as const;
