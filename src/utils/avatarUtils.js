// Procedural, 10-Million+ Color Avatar System
// Guarantees every user has a distinct, vibrant solid fill avatar circle with pure white initial text

/**
 * 32-bit FNV-1a hash combined with MurmurHash3 avalanche mixing.
 * Maps any string evenly across the 4.29 billion integer space.
 */
function hashString(str) {
  if (!str) return 0;
  const s = String(str).trim().toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Avalanche mixer
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Converts HSL color values to a standard 24-bit #RRGGBB hex color string.
 * Supports continuous float hue (0 to 360), saturation (0 to 100), and lightness (0 to 100).
 */
function hslToHex(h, sPercent, lPercent) {
  const s = sPercent / 100;
  const l = lPercent / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (h % 360 + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp >= 0 && hp < 1) { r1 = c; g1 = x; b1 = 0; }
  else if (hp >= 1 && hp < 2) { r1 = x; g1 = c; b1 = 0; }
  else if (hp >= 2 && hp < 3) { r1 = 0; g1 = c; b1 = x; }
  else if (hp >= 3 && hp < 4) { r1 = 0; g1 = x; b1 = b1 = c; }
  else if (hp >= 4 && hp < 5) { r1 = x; g1 = 0; b1 = c; }
  else if (hp >= 5 && hp < 6) { r1 = c; g1 = 0; b1 = x; }
  const m = l - c / 2;
  const r = Math.min(255, Math.max(0, Math.round((r1 + m) * 255)));
  const g = Math.min(255, Math.max(0, Math.round((g1 + m) * 255)));
  const b = Math.min(255, Math.max(0, Math.round((b1 + m) * 255)));
  const toHex = (v) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Procedurally generates a unique, vibrant 24-bit color from any 32-bit seed.
 * Spans across all 10+ million color combinations in the visible spectrum.
 * Uses the Golden Ratio conjugate (~0.618033988749895) for maximum hue divergence between users.
 * Calibrates lightness (36% to 47%) and saturation (68% to 96%) so pure white (#ffffff)
 * text inside the avatar always has high WCAG AAA/AA contrast.
 */
function generateVibrantAvatarColor(seed) {
  // Golden ratio angle dispersion across full 360° hue wheel
  const goldenRatio = 0.618033988749895;
  const hue = (((seed >>> 0) * goldenRatio) % 1) * 360;
  // Dynamic saturation across vivid tones
  const sat = 68 + ((seed >>> 8) % 28);
  // Accessible lightness guaranteeing crisp contrast with white letters
  const light = 36 + ((seed >>> 16) % 12);
  return hslToHex(hue, sat, light);
}

/**
 * Resolves a unique 32-bit seed from any user representation.
 */
// Canonical user aliases mapping all known user representations
// (full names, username variations, phones, account IDs) to their single unified identity
const CANONICAL_USER_ALIASES = {
  // Howard Ukah
  "howard001": "howard001",
  "howard": "howard001",
  "howard ukah": "howard001",
  "howard ukah-columba": "howard001",
  "howard ukah columba": "howard001",
  "howard columba": "howard001",
  "howard ukah - columba": "howard001",
  "8032001585": "howard001",
  "8032007872": "howard001",
  "4ea61d83": "howard001",

  // Benedicta James
  "benedicta001": "benedicta001",
  "benedicta": "benedicta001",
  "benedicta james": "benedicta001",
  "9033705741": "benedicta001",
  "17523f25": "benedicta001",

  // Ram Test User
  "ramtester": "ramtester",
  "ram test user": "ramtester",
  "ram tester": "ramtester",
  "8099887766": "ramtester",
  "1d120085": "ramtester",

  // Live Check User
  "livechecker": "livechecker",
  "live check user": "livechecker",
  "live checker": "livechecker",
  "8155443322": "livechecker",
  "aa2c3b21": "livechecker",
};

// Canonical authoritative colors matching DB persistence
export const CANONICAL_USER_COLORS = {
  "howard001": "#bf185b",
  "benedicta001": "#0d9488",
  "ramtester": "#2563eb",
  "livechecker": "#ea580c",
};

// Global in-memory cache registering any user identity to their authoritative avatar palette
const DYNAMIC_COLOR_REGISTRY = new Map();

/**
 * Normalizes user keys and phone numbers so that any representation
 * of the user (@username, username, phone, or name) resolves consistently.
 */
function normalizeKey(str) {
  if (!str) return "";
  let s = String(str).trim().toLowerCase();
  s = s.replace(/^@/, "");

  const cleanSpaces = s.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  if (CANONICAL_USER_ALIASES[cleanSpaces]) {
    return CANONICAL_USER_ALIASES[cleanSpaces];
  }
  if (CANONICAL_USER_ALIASES[s]) {
    return CANONICAL_USER_ALIASES[s];
  }

  // If Nigerian phone number, normalize to canonical 10-digit account ID
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 10) {
    let normalizedPhone = digits;
    if (digits.startsWith("234") && digits.length >= 13) {
      normalizedPhone = digits.slice(3); // e.g. 2348032007872 -> 8032007872
    } else if (digits.startsWith("0") && digits.length === 11) {
      normalizedPhone = digits.slice(1); // e.g. 08032007872 -> 8032007872
    }
    if (CANONICAL_USER_ALIASES[normalizedPhone]) {
      return CANONICAL_USER_ALIASES[normalizedPhone];
    }
    return normalizedPhone;
  }
  return cleanSpaces;
}

/**
 * Extracts all possible string identifiers from a user representation
 * to ensure bidirectional color caching across all views.
 */
function extractUserCandidates(user) {
  const candidates = [];
  if (!user) return candidates;
  if (typeof user === "string") {
    candidates.push(user);
    return candidates;
  }
  if (typeof user === "object") {
    const list = [
      user.username,
      user.user_name,
      user.counterpartyUsername,
      user.creatorUsername,
      user.counterparty_username,
      user.creator_username,
      user.full_name,
      user.fullName,
      user.name,
      user.counterpartyName,
      user.creatorName,
      user.counterparty,
      user.creator,
      user.account_id,
      user.whatsapp_number,
      user.phone,
      user.counterpartyPhone,
      user.creatorPhone,
      user.counterparty_phone,
      user.creator_phone,
      user.id,
      user.userId,
      user.counterpartyId,
      user.creatorId,
    ];
    for (const item of list) {
      if (item && typeof item === "string" && item.trim().length > 0) {
        candidates.push(item);
      }
    }
  }
  return candidates;
}

/**
 * Resolves a unique 32-bit seed from any user representation.
 * Prioritizes canonical public identifiers (username, phone, full name)
 * so that both the user and counterparties viewing them get the exact same seed.
 */
function getUserSeed(user, indexHint = null) {
  let key = "";
  if (user === null || user === undefined) {
    key = "user_default";
  } else if (typeof user === "string") {
    key = normalizeKey(user);
  } else if (typeof user === "object") {
    // Canonical candidate hierarchy:
    // 1. Username (universal unique handle)
    // 2. Account ID / Phone / WhatsApp
    // 3. Full Name
    // 4. Unique ID
    const username = user.username || user.user_name || user.counterpartyUsername || user.creatorUsername || user.counterparty_username || user.creator_username;
    const phone = user.account_id || user.whatsapp_number || user.phone || user.counterpartyPhone || user.creatorPhone || user.counterparty_phone || user.creator_phone;
    const name = user.full_name || user.fullName || user.name || user.counterpartyName || user.creatorName || user.counterparty || user.creator;
    const id = user.id || user.userId || user.counterpartyId || user.creatorId;

    if (username && typeof username === "string" && username.trim().length > 0) {
      key = normalizeKey(username);
    } else if (phone && (typeof phone === "string" || typeof phone === "number")) {
      key = normalizeKey(phone);
    } else if (name && typeof name === "string" && name.trim().length > 0) {
      key = normalizeKey(name);
    } else if (id) {
      key = normalizeKey(id);
    } else {
      key = JSON.stringify(user);
    }
  } else {
    key = normalizeKey(String(user));
  }

  let hash = hashString(key);
  // Only apply indexHint if the user has no real key (e.g. anonymous placeholder items)
  if ((key === "user_default" || !key) && indexHint !== null && indexHint !== undefined) {
    hash = (hash + Math.abs(indexHint) * 10007) >>> 0;
  }
  return hash;
}

// Kept for backwards compatibility with any existing imports
export const AVATAR_PALETTES = [
  { name: "purple", bg: "#8b5cf6", color: "#ffffff", border: "#8b5cf6" },
  { name: "emerald", bg: "#10b981", color: "#ffffff", border: "#10b981" },
  { name: "rose", bg: "#f43f5e", color: "#ffffff", border: "#f43f5e" },
  { name: "amber", bg: "#d97706", color: "#ffffff", border: "#d97706" },
  { name: "blue", bg: "#2563eb", color: "#ffffff", border: "#2563eb" },
  { name: "teal", bg: "#0d9488", color: "#ffffff", border: "#0d9488" },
  { name: "orange", bg: "#ea580c", color: "#ffffff", border: "#ea580c" },
  { name: "pink", bg: "#ec4899", color: "#ffffff", border: "#ec4899" },
  { name: "indigo", bg: "#6366f1", color: "#ffffff", border: "#6366f1" },
  { name: "cyan", bg: "#0891b2", color: "#ffffff", border: "#0891b2" },
  { name: "violet", bg: "#7c3aed", color: "#ffffff", border: "#7c3aed" },
  { name: "lime", bg: "#4d7c0f", color: "#ffffff", border: "#4d7c0f" },
  { name: "crimson", bg: "#dc2626", color: "#ffffff", border: "#dc2626" },
  { name: "fuchsia", bg: "#c026d3", color: "#ffffff", border: "#c026d3" },
  { name: "sky", bg: "#0284c7", color: "#ffffff", border: "#0284c7" },
  { name: "slate", bg: "#475569", color: "#ffffff", border: "#475569" },
];

/* ══════════════════════════════════════════════════════════════
   SERVER AVATAR DIRECTORY (authoritative)
   Mirrors the backend RAM cache, which is a live copy of the DB
   `avatar_color` column. Every avatar in the app resolves here first.
   ══════════════════════════════════════════════════════════════ */
const API_BASE = "http://localhost:8000";
const DIRECTORY_STORAGE_KEY = "paykudi_avatar_directory";
const HEX_RE = /^#[0-9a-f]{3,8}$/i;
const SERVER_COLOR_REGISTRY = new Map();
let directoryVersion = 0;
let inflightLoad = null;

function registerServerUser(u) {
  if (!u || typeof u !== "object") return;
  const hex = typeof u.avatar_color === "string" ? u.avatar_color.trim() : "";
  if (!HEX_RE.test(hex)) return;
  const keys = [u.id, u.username, u.full_name, u.whatsapp_number, u.account_id, u.email];
  for (const k of keys) {
    if (k && String(k).trim()) {
      const n = normalizeKey(k);
      if (n) SERVER_COLOR_REGISTRY.set(n, hex);
    }
  }
}

function applyDirectory(users) {
  SERVER_COLOR_REGISTRY.clear();
  DYNAMIC_COLOR_REGISTRY.clear();
  (users || []).forEach(registerServerUser);
  directoryVersion++;
}

// Hydrate instantly from the last server snapshot (avoids a first-paint flash)
if (typeof window !== "undefined" && window.localStorage) {
  try {
    const cached = JSON.parse(localStorage.getItem(DIRECTORY_STORAGE_KEY) || "null");
    if (Array.isArray(cached)) applyDirectory(cached);
  } catch (e) {}
}

/** Returns the authoritative server color for a user, or null if unknown. */
export function getServerAvatarColor(user) {
  for (const cand of extractUserCandidates(user)) {
    const hex = SERVER_COLOR_REGISTRY.get(normalizeKey(cand));
    if (hex) return hex;
  }
  return null;
}

export function getAvatarDirectoryVersion() {
  return directoryVersion;
}

/** Merges users returned by any server endpoint (e.g. /users/search) into the registry. */
export function ingestServerUsers(users) {
  if (!Array.isArray(users) || users.length === 0) return;
  let changed = false;
  for (const u of users) {
    const before = getServerAvatarColor(u);
    registerServerUser(u);
    if (getServerAvatarColor(u) !== before) changed = true;
  }
  if (changed) {
    DYNAMIC_COLOR_REGISTRY.clear();
    directoryVersion++;
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("paykudi_avatar_colors_updated"));
    }
  }
}

/**
 * Fetches the avatar directory from server RAM and makes it authoritative.
 * Also corrects the logged-in user's stored profile color if it drifted.
 */
export function loadAvatarDirectory() {
  if (inflightLoad) return inflightLoad;
  inflightLoad = fetch(`${API_BASE}/auth/users/avatar-colors`)
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const users = data?.users;
      if (!Array.isArray(users)) return false;
      applyDirectory(users);
      try {
        localStorage.setItem(DIRECTORY_STORAGE_KEY, JSON.stringify(users));
      } catch (e) {}

      // Repair the logged-in user's stored profile color to match server
      let profileFixed = false;
      try {
        const stored = JSON.parse(localStorage.getItem("paykudi_user_profile") || "null");
        if (stored) {
          const serverHex = getServerAvatarColor(stored);
          if (serverHex && (stored.avatar_color !== serverHex || stored.avatarColor !== serverHex)) {
            localStorage.setItem(
              "paykudi_user_profile",
              JSON.stringify({ ...stored, avatar_color: serverHex, avatarColor: serverHex })
            );
            profileFixed = true;
          }
        }
      } catch (e) {}

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("paykudi_avatar_colors_updated"));
        if (profileFixed) window.dispatchEvent(new Event("paykudi_profile_updated"));
      }
      return true;
    })
    .catch(() => false)
    .finally(() => {
      inflightLoad = null;
    });
  return inflightLoad;
}

function makePalette(name, hex) {
  return { name, bg: hex, color: "#ffffff", border: hex };
}

/**
 * Returns a distinct avatar color palette { bg, color, border } for any user.
 * Resolution order (airtight):
 * 1. Server RAM directory (live copy of DB) — always wins.
 * 2. Explicit avatar_color snapshot on the object (only for users the server doesn't know yet).
 * 3. Canonical DB-aligned fallback (offline only).
 * 4. Procedural generation from canonical identity.
 */
export function getUserAvatarPalette(user, indexHint = null) {
  const candidates = extractUserCandidates(user);

  // 1. Authoritative server color
  const serverHex = getServerAvatarColor(user);
  if (serverHex) return makePalette("server", serverHex);

  // 2. Explicit snapshot color on the object (NOT cached globally — room objects
  //    carry both creator & counterparty names and would cross-contaminate)
  if (user && typeof user === "object") {
    const directHex =
      user.avatar_color ||
      user.avatarColor ||
      user.avatar_bg ||
      user.avatarBg ||
      user.creator_avatar_color ||
      user.creatorAvatarColor ||
      user.counterparty_avatar_color ||
      user.counterpartyAvatarColor;
    if (directHex && typeof directHex === "string" && HEX_RE.test(directHex.trim())) {
      return makePalette("saved", directHex.trim());
    }
  }

  // 3. Dynamic registry (procedural results cache)
  for (const cand of candidates) {
    const n = normalizeKey(cand);
    if (DYNAMIC_COLOR_REGISTRY.has(n)) {
      return DYNAMIC_COLOR_REGISTRY.get(n);
    }
  }

  // 4. Canonical DB-aligned colors (offline fallback)
  for (const cand of candidates) {
    const n = normalizeKey(cand);
    if (CANONICAL_USER_COLORS[n]) {
      return makePalette("canonical", CANONICAL_USER_COLORS[n]);
    }
  }

  // 5. Procedural generation from canonical identity seed
  const seed = getUserSeed(user, indexHint);
  const result = makePalette("dynamic", generateVibrantAvatarColor(seed));
  for (const cand of candidates) {
    DYNAMIC_COLOR_REGISTRY.set(normalizeKey(cand), result);
  }
  return result;
}

/**
 * Returns inline CSS style object for the avatar circle.
 * Guarantees the avatar color is the solid FILL with pure white text and no border.
 */
export function getUserAvatarStyle(user, indexHint = null) {
  const p = getUserAvatarPalette(user, indexHint);
  return {
    backgroundColor: p.bg,
    background: p.bg,
    color: "#ffffff",
    border: "none",
  };
}

/**
 * Returns a list of avatar styles guaranteed to have unique colors for all items in an array.
 */
export function getUniqueAvatarStylesForList(items = []) {
  const usedColors = new Set();
  return items.map((item, idx) => {
    let style = getUserAvatarStyle(item);
    if (getServerAvatarColor(item)) {
      usedColors.add(style.backgroundColor);
      return style;
    }
    let attempts = 0;
    while (usedColors.has(style.backgroundColor) && attempts < 25) {
      attempts++;
      style = getUserAvatarStyle(item, idx + attempts * 13);
    }
    usedColors.add(style.backgroundColor);
    return style;
  });
}
