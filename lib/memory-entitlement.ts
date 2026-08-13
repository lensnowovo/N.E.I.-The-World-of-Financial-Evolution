const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MEMORY_TRIAL_MIN_DAYS = 1;
export const MEMORY_TRIAL_MAX_DAYS = 365;
export const MEMORY_TRIAL_DEFAULT_DAYS = 90;

export type MemoryTrialGrantInput = {
  email: string;
  days: number;
};

export function parseMemoryTrialGrant(value: unknown): MemoryTrialGrantInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const input = value as Record<string, unknown>;
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const days = input.days === undefined ? MEMORY_TRIAL_DEFAULT_DAYS : input.days;

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  if (!Number.isInteger(days)) return null;
  if ((days as number) < MEMORY_TRIAL_MIN_DAYS || (days as number) > MEMORY_TRIAL_MAX_DAYS) {
    return null;
  }

  return { email, days: days as number };
}
