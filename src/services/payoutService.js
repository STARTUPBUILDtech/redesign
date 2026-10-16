/**
 * Payout Accounts Service
 * Persists and synchronizes payout accounts with the database (FastAPI SQLite)
 * and falls back seamlessly to localStorage for offline support.
 */

const STORAGE_KEY = "paykudi_payout_accounts";

export function getCsrfToken() {
  try {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("paykudi_csrf_token="))
      ?.split("=")[1];
  } catch (_) {
    return null;
  }
}

export async function ensureCsrfToken() {
  let token = getCsrfToken();
  if (!token) {
    try {
      await fetch("http://localhost:8000/auth/csrf", { credentials: "include" });
      token = getCsrfToken();
    } catch (_) {}
  }
  return token;
}

export function getStoredPayoutAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const genericNums = [
        "8032001585",
        "8032007872",
        "2001948291",
        "2345678900",
        "1234567653",
        "0234567891",
        "0123456789",
      ];
      const clean = parsed.filter((a) => {
        if (!a) return false;
        const name = String(a.account_name || a.accountName || a.name || "").toLowerCase();
        const num = String(a.number || a.account_number || a.accountNumber || "").trim();
        const bank = String(a.bank || a.bank_code || a.bankCode || "").toLowerCase();
        if (name.includes("chinaza") || name.includes("amaka")) return false;
        if (genericNums.includes(num)) return false;
        if (bank.includes("kuda") && (num === "8032007872" || num === "8032001585" || num === "2001948291")) return false;
        return true;
      });
      if (clean.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      }
      return clean;
    }
  } catch (_) {}
  return [];
}


export function saveStoredPayoutAccounts(accounts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    window.dispatchEvent(new Event("paykudi_payout_accounts_updated"));
  } catch (_) {}
}

/**
 * Fetch accounts from database with fallback to localStorage
 */
export async function getPayoutAccountsFromDB() {
  let stored = getStoredPayoutAccounts();
  try {
    const res = await fetch("http://localhost:8000/auth/payout-accounts", {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        saveStoredPayoutAccounts(data);
        return data;
      }
    }
  } catch (err) {
    console.warn("[PayoutService] Backend offline, using cached accounts:", err);
  }
  return stored;
}

/**
 * Save new payout account to database and cache in localStorage
 */
export async function savePayoutAccountToDB(account) {
  const localList = getStoredPayoutAccounts();
  const tempId = "acc-" + Date.now();
  const formatted = {
    id: account.id || tempId,
    bank: account.bank,
    bank_code: account.bankCode || account.bank_code || "kuda",
    bankCode: account.bankCode || account.bank_code || "kuda",
    account_number: account.accountNumber || account.account_number || account.number,
    accountNumber: account.accountNumber || account.account_number || account.number,
    number: account.accountNumber || account.account_number || account.number,
    account_name: account.accountName || account.account_name || account.name,
    accountName: account.accountName || account.account_name || account.name,
    name: account.accountName || account.account_name || account.name,
    is_default: Boolean(account.isDefault ?? account.is_default),
    isDefault: Boolean(account.isDefault ?? account.is_default),
  };

  try {
    const csrf = await ensureCsrfToken();
    const res = await fetch("http://localhost:8000/auth/payout-accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrf ? { "x-csrf-token": csrf } : {}),
      },
      credentials: "include",
      body: JSON.stringify({
        bank: formatted.bank,
        bank_code: formatted.bank_code,
        account_number: formatted.account_number,
        account_name: formatted.account_name,
        is_default: formatted.is_default,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      formatted.id = data.id;
      formatted.user_id = data.user_id;
    }
  } catch (err) {
    console.warn("[PayoutService] Backend save error, saving locally:", err);
  }

  // Update local list
  const nextList = formatted.is_default
    ? [formatted, ...localList.filter((a) => a.account_number !== formatted.account_number).map((a) => ({ ...a, is_default: false, isDefault: false }))]
    : [...localList.filter((a) => a.account_number !== formatted.account_number), formatted];

  saveStoredPayoutAccounts(nextList);
  return formatted;
}

/**
 * Delete a payout account
 */
export async function deletePayoutAccountFromDB(accountId) {
  try {
    const csrf = await ensureCsrfToken();
    const res = await fetch(`http://localhost:8000/auth/payout-accounts/${accountId}`, {
      method: "DELETE",
      headers: csrf ? { "x-csrf-token": csrf } : {},
      credentials: "include",
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Failed to delete payout account");
    }
  } catch (err) {
    console.warn("[PayoutService] Backend delete error:", err);
    throw err;
  }

  const localList = getStoredPayoutAccounts();
  const nextList = localList.filter((a) => a.id !== accountId);
  saveStoredPayoutAccounts(nextList);
}

/**
 * Set a payout account as default
 */
export async function setDefaultPayoutAccountInDB(accountId) {
  try {
    const csrf = await ensureCsrfToken();
    await fetch(`http://localhost:8000/auth/payout-accounts/${accountId}/default`, {
      method: "PATCH",
      headers: csrf ? { "x-csrf-token": csrf } : {},
      credentials: "include",
    });
  } catch (err) {
    console.warn("[PayoutService] Backend setDefault error:", err);
  }

  const localList = getStoredPayoutAccounts();
  const nextList = localList.map((a) => ({
    ...a,
    is_default: a.id === accountId,
    isDefault: a.id === accountId,
  }));
  saveStoredPayoutAccounts(nextList);
}
