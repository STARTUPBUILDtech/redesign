// Utility functions for Available Pocket Balance management (base unit: kobo)
export const DEFAULT_POCKET_BALANCE_KOBO = 0; // New users start with 0 kobo = ₦0.00

/**
 * Retrieves the stored pocket balance in kobo from localStorage.
 * Defaults to 0 kobo (₦0.00).
 */
export function getStoredPocketBalanceKobo() {
  try {
    const stored = localStorage.getItem("paykudi_user_profile");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.pocket_balance_kobo !== undefined && !isNaN(Number(parsed.pocket_balance_kobo))) {
        return Math.max(0, Math.round(Number(parsed.pocket_balance_kobo)));
      }
    }
  } catch {}
  return DEFAULT_POCKET_BALANCE_KOBO;
}

/**
 * Saves the pocket balance in kobo to localStorage and dispatches sync events.
 */
export function saveStoredPocketBalanceKobo(kobo) {
  const cleanKobo = Math.max(0, Math.round(Number(kobo) || 0));
  try {
    const stored = JSON.parse(localStorage.getItem("paykudi_user_profile") || "{}");
    const updated = { ...stored, pocket_balance_kobo: cleanKobo };
    localStorage.setItem("paykudi_user_profile", JSON.stringify(updated));
    window.dispatchEvent(new Event("paykudi_profile_updated"));
    window.dispatchEvent(new CustomEvent("paykudi_balance_updated", { detail: { kobo: cleanKobo } }));
  } catch {}
  return cleanKobo;
}

/**
 * Converts kobo integer to Naira amount (1 NGN = 100 kobo).
 */
export function koboToNaira(kobo) {
  return (Number(kobo) || 0) / 100;
}

/**
 * Converts Naira amount to kobo integer (1 NGN = 100 kobo).
 */
export function nairaToKobo(naira) {
  return Math.round((Number(naira) || 0) * 100);
}

/**
 * Formats pocket balance in Naira currency string.
 */
export function formatPocketBalanceNaira(kobo, withDecimals = true) {
  const naira = koboToNaira(kobo);
  return "₦" + naira.toLocaleString("en-NG", {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  });
}
