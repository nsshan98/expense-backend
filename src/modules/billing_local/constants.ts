
export const MANUAL_SUBSCRIPTION_CONSTANTS = {
    PLAN_ID: 'premium-monthly', // Hardcoded Plan ID
    PLAN_PRICE: 499,
    PLAN_DURATION_DAYS: 30,
    CURRENCY: 'BDT',
    GRACE_PERIOD_DAYS: 3,
    PROVIDERS: ['bkash', 'nagad', 'rocket'] as const,
};

export const ORDER_STATUS = {
    DRAFT: 'draft',
    PENDING_VERIFICATION: 'pending_verification',
    REJECTED: 'rejected',
    COMPLETED: 'completed', // When subscription is active
} as const;

export const PAYMENT_STATUS = {
    SUBMITTED: 'submitted',
    VERIFIED: 'verified',
    REJECTED: 'rejected',
} as const;

export const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
} as const;
