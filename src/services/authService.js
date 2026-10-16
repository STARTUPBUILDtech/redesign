/**
 * PayKudi Authentication & Session Service
 * Authoritative session verification against FastAPI backend using httpOnly cookies.
 */

const API_BASE = "http://localhost:8000";

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
      await fetch(`${API_BASE}/auth/csrf`, { credentials: "include" });
      token = getCsrfToken();
    } catch (_) {}
  }
  return token;
}

/**
 * Authoritative session check.
 * Validates the httpOnly session cookie with the FastAPI backend.
 * Automatically attempts token rotation via /auth/refresh if access token has expired.
 */
export async function checkAuthSession() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    if (res.ok) {
      const user = await res.json();
      return { authenticated: true, user };
    }

    // If access token expired (401), attempt refresh with the 7-day refresh cookie
    if (res.status === 401) {
      const csrf = await ensureCsrfToken();
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
      });

      if (refreshRes.ok) {
        // Re-fetch the user profile with the newly rotated access token
        const retryRes = await fetch(`${API_BASE}/auth/me`, {
          method: "GET",
          credentials: "include",
        });
        if (retryRes.ok) {
          const user = await retryRes.json();
          return { authenticated: true, user };
        }
      }
    }

    return { authenticated: false };
  } catch (err) {
    console.warn("[AuthService] Backend session check failed (server offline):", err.message);
    return { authenticated: false, error: "Server is unreachable" };
  }
}

/**
 * Authoritative logout.
 * Notifies the backend to revoke refresh token and clear all httpOnly cookies.
 * Cleans up local client storage.
 */
export async function logoutUser() {
  try {
    const csrf = await ensureCsrfToken();
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        ...(csrf ? { "x-csrf-token": csrf } : {}),
      },
    });
  } catch (err) {
    console.warn("[AuthService] Logout request to backend failed:", err.message);
  } finally {
    try {
      localStorage.removeItem("paykudi_is_logged_in");
      localStorage.removeItem("paykudi_user_profile");
      localStorage.removeItem("paykudi_active_pre_payment_room");
      sessionStorage.removeItem("paykudi_cancelled_rooms");
    } catch (_) {}
  }
}
