export const CONTACT_EMAIL_HOUR_LIMIT = 3;
export const CONTACT_GLOBAL_HOUR_LIMIT = 30;

export function gateContactSubmission(input: {
  honeypot?: string;
  turnstileOk: boolean;
  perEmailCount?: number;
  globalCount?: number;
}): string | null {
  if (input.honeypot) {
    return "Invalid submission detected.";
  }

  if (!input.turnstileOk) {
    return "Invalid submission detected.";
  }

  if ((input.perEmailCount ?? 0) >= CONTACT_EMAIL_HOUR_LIMIT) {
    return "Too many requests. Please try again in a few minutes.";
  }

  if ((input.globalCount ?? 0) >= CONTACT_GLOBAL_HOUR_LIMIT) {
    return "Too many requests. Please try again in a few minutes.";
  }

  return null;
}
