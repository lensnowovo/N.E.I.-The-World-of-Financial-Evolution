export const LEGAL_EFFECTIVE_DATE = '2026-07-22';
export const TERMS_VERSION = '2026-07-22';
export const PRIVACY_VERSION = '2026-07-22';
export const CROSS_BORDER_NOTICE_VERSION = '2026-07-22';
export const CONTRIBUTION_RULES_VERSION = '2026-07-22';

export const LEGAL_CONTACT = {
  github: 'https://github.com/lensnowovo/N.E.I.-The-World-of-Financial-Evolution/security',
  email: process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL?.trim() || null,
} as const;

export const REQUIRED_REGISTRATION_CONSENTS = [
  { consentType: 'terms', version: TERMS_VERSION },
  { consentType: 'privacy', version: PRIVACY_VERSION },
  { consentType: 'cross_border', version: CROSS_BORDER_NOTICE_VERSION },
] as const;

export function isCurrentRegistrationConsent(input: {
  termsAccepted?: unknown;
  privacyAccepted?: unknown;
  adultConfirmed?: unknown;
  crossBorderAccepted?: unknown;
  termsVersion?: unknown;
  privacyVersion?: unknown;
}): boolean {
  return (
    input.termsAccepted === true &&
    input.privacyAccepted === true &&
    input.adultConfirmed === true &&
    input.crossBorderAccepted === true &&
    input.termsVersion === TERMS_VERSION &&
    input.privacyVersion === PRIVACY_VERSION
  );
}
