/**
 * Centralized API error handling. Maps thrown errors (from api-client or fetch) to user-facing messages.
 */
const KNOWN_MESSAGES: Record<string, string> = {
  "List not found": "This list was not found or was deleted.",
  "Item not found": "This item was not found or was removed.",
  "Store not found": "This store was not found.",
  "User not found": "Your account could not be found.",
  "Invalid email or password": "Invalid email or password. Please try again.",
  "Refresh token expired or invalid": "Your session expired. Please sign in again.",
  "An account with this email already exists": "An account with this email already exists. Sign in or use a different email.",
};

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

/**
 * Return a user-facing message for an error thrown by the API client or from catch blocks.
 * Use for Alert.alert("Error", getApiErrorMessage(err)).
 */
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    const msg = error.message.trim();
    return KNOWN_MESSAGES[msg] ?? msg;
  }
  if (typeof error === "string") {
    return KNOWN_MESSAGES[error] ?? error;
  }
  return DEFAULT_MESSAGE;
}
