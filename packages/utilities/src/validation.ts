// ──────────────────────────────────────────────
// Validation utilities
// ──────────────────────────────────────────────

/** Check if a string is a valid email */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/** Check if a string meets minimum password requirements */
export function isStrongPassword(password: string): boolean {
  return password.length >= 8;
}

/** Check if a string is a valid username (alphanumeric + hyphens/underscores, 3-30 chars) */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}

/** Check if a value is a valid MongoDB ObjectId hex string */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/** Sanitize a string by trimming and removing excess whitespace */
export function sanitizeString(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}
