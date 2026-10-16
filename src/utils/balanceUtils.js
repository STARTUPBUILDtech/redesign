import { ensureCsrfToken } from "../services/payoutService";

// Utility functions for Available Pocket Balance management (base unit: kobo)
export const DEFAULT_POCKET_BALANCE_KOBO = 0; // New users start with 0 kobo = ₦0.00
const API_BASE = "http://localhost:8000";

/**
 * Retrieves the stored pocket balance in kobo from localStorage.
 * Defaults to 0 kobo (₦0.00). This serves strictly as a client display cache.
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
 * Saves the pocket balance in kobo to localStorage display cache and dispatches sync events.
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
 * Synchronizes the wallet balance directly from the Python backend single-source-of-truth.
 * Overwrites the local display cache with the server-verified amount.
 */
export async function syncWalletBalanceFromServer() {
  if (typeof window !== "undefined" && localStorage.getItem("paykudi_is_logged_in") !== "true") {
    return getStoredPocketBalanceKobo();
  }

  try {
    const res = await fetch(`${API_BASE}/wallet/balance`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.wallet_balance_kobo === "number") {
        saveStoredPocketBalanceKobo(data.wallet_balance_kobo);
        return data.wallet_balance_kobo;
      }
    }
  } catch (_) {
    // Backend offline / network error: fallback gracefully to display cache
  }
  return getStoredPocketBalanceKobo();
}

/**
 * Submits an atomic, server-verified withdrawal request with Idempotency-Key.
 */
export async function requestServerWithdrawal({ amountKobo, accountId, idempotencyKey }) {
  const csrf = await ensureCsrfToken();
  const res = await fetch(`${API_BASE}/wallet/withdraw`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({
      amount_kobo: amountKobo,
      account_id: accountId,
    }),
  });

  if (!res.ok) {
    let errMsg = "Withdrawal request failed.";
    try {
      const errData = await res.json();
      if (errData && errData.detail) errMsg = errData.detail;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const data = await res.json();
  if (data && typeof data.new_balance_kobo === "number") {
    saveStoredPocketBalanceKobo(data.new_balance_kobo);
  }
  return data;
}

/**
 * Confirms delivery and releases held escrow funds via server-side verification.
 */
export async function releaseEscrowServer({ orderNumber, idempotencyKey }) {
  const csrf = await ensureCsrfToken();
  const res = await fetch(`${API_BASE}/payment-rooms/${orderNumber}/release`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrf ? { "x-csrf-token": csrf } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
  });

  if (!res.ok) {
    let errMsg = "Escrow release failed.";
    try {
      const errData = await res.json();
      if (errData && errData.detail) errMsg = errData.detail;
    } catch (_) {}
    throw new Error(errMsg);
  }

  const data = await res.json();
  // Refresh balance in background after release
  syncWalletBalanceFromServer().catch(() => {});
  return data;
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

// Automatically sync on page initialization ONLY if logged in
if (typeof window !== "undefined") {
  setTimeout(() => {
    if (localStorage.getItem("paykudi_is_logged_in") === "true") {
      syncWalletBalanceFromServer().catch(() => {});
    }
  }, 100);
}


