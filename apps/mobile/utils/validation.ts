/** Lightweight client-side email check (server remains authoritative). */
export function isValidEmailFormat(email: string): boolean {
  const t = email.trim();
  if (!t) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}
