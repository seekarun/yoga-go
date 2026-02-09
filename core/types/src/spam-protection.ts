export interface SpamCheckResult {
  passed: boolean;
  reason?: "honeypot" | "too_fast" | "rate_limited";
  remaining?: number;
}

export interface SpamProtectionFields {
  _hp?: string; // honeypot value (should be empty)
  _t?: string; // base64-encoded form load timestamp
}

export interface SpamProtectionOptions {
  tableName: string;
  maxRequests?: number; // default 5
  windowMinutes?: number; // default 15
  minSubmitSeconds?: number; // default 3
}
