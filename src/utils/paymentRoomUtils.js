/**
 * Utility functions for Payment Rooms:
 * - formatItemTitle: Sentence/Title-cases item names (e.g. "honda activa 2026" -> "Honda Activa 2026")
 * - cleanIdentifier: Normalizes usernames, names, phone numbers for fuzzy matching
 * - getRoomPerspective: Computes whether the current logged-in user is Selling or Buying,
 *   along with the appropriate role tag ("Selling" or "Buying"), counterparty label ("Seller: " or "Buyer: "),
 *   and counterparty name.
 */

/**
 * Format string into Title Case (capitalizing the first letter of each word).
 * e.g. "honda activa 2026" -> "Honda Activa 2026"
 */
export function formatItemTitle(str) {
  if (!str || typeof str !== "string") return "Payment Item";
  return str
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return "";
      if (word.includes("-")) {
        return word
          .split("-")
          .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : ""))
          .join("-");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Clean string for identifier comparison (removes whitespace, symbols, lowercases)
 */
export function cleanIdentifier(val) {
  if (!val) return "";
  let str = String(val).toLowerCase().trim();
  str = str.replace(/^@/, "");
  const digits = str.replace(/\D/g, "");
  if (digits.length >= 7) {
    let d = digits;
    if (d.startsWith("234")) d = d.slice(3);
    d = d.replace(/^0+/, "");
    return d;
  }
  return str.replace(/[^a-z0-9]/g, "");
}

/**
 * Determines the viewer's role and perspective details for a given room.
 */
export function getRoomPerspective(room, currentUser = null) {
  if (!room) {
    return {
      roleText: "Buying",
      isBuying: true,
      counterpartyLabel: "Seller: ",
      counterpartyLabelLong: "Seller's Name: ",
      counterpartyName: "Counterparty",
      title: "Payment Item",
    };
  }

  // Fallback to localStorage user if currentUser is null/empty
  let user = currentUser;
  if (!user || (!user.username && !user.fullName && !user.name && !user.phone)) {
    try {
      const stored = localStorage.getItem("paykudi_user_profile");
      if (stored) {
        user = JSON.parse(stored);
      }
    } catch (_) {}
  }

  const userTokens = new Set();
  if (user) {
    [
      user.username,
      user.fullName,
      user.name,
      user.full_name,
      user.phone,
      user.whatsapp_number,
      user.accountId,
      user.account_id,
      user.id,
    ].forEach((val) => {
      const c = cleanIdentifier(val);
      if (c && c.length >= 3) userTokens.add(c);
    });
  }

  const matchesUser = (fieldVal) => {
    if (!fieldVal || userTokens.size === 0) return false;
    const c = cleanIdentifier(fieldVal);
    if (!c || c.length < 3) return false;
    for (const token of userTokens) {
      if (c === token || (c.length >= 4 && token.length >= 4 && (c.includes(token) || token.includes(c)))) {
        return true;
      }
    }
    return false;
  };

  const rawRoleLower = String(room.role || room.creatorRole || "").toLowerCase();
  const creatorIsSelling = rawRoleLower.includes("sell");

  const sellerCandidate =
    room.sellerName && room.sellerName !== "Seller"
      ? room.sellerName
      : room.seller_name && room.seller_name !== "Seller"
      ? room.seller_name
      : creatorIsSelling
      ? (room.creator || room.creatorName || "Seller")
      : (room.counterparty || room.counterpartyName || "Seller");

  const buyerCandidate =
    room.buyerName && room.buyerName !== "Buyer"
      ? room.buyerName
      : room.buyer_name && room.buyer_name !== "Buyer"
      ? room.buyer_name
      : creatorIsSelling
      ? (room.counterparty || room.counterpartyName || "Buyer")
      : (room.creator || room.creatorName || "Buyer");

  const isCreator =
    matchesUser(room.creator) ||
    matchesUser(room.creatorName) ||
    matchesUser(room.creatorUsername) ||
    matchesUser(room.creatorPhone);

  const isCounterparty =
    matchesUser(room.counterparty) ||
    matchesUser(room.counterpartyName) ||
    matchesUser(room.counterpartyUsername) ||
    matchesUser(room.counterpartyPhone);

  const isSeller =
    matchesUser(sellerCandidate) ||
    matchesUser(room.sellerPhone) ||
    matchesUser(room.sellerUsername) ||
    ((room.seller_id || room.sellerId) && user?.id && (room.seller_id === user.id || room.sellerId === user.id));

  const isBuyer =
    matchesUser(buyerCandidate) ||
    matchesUser(room.buyerPhone) ||
    matchesUser(room.buyerUsername) ||
    ((room.buyer_id || room.buyerId) && user?.id && (room.buyer_id === user.id || room.buyerId === user.id));

  let userRoleIsSelling = false;

  if (isSeller && !isBuyer) {
    userRoleIsSelling = true;
  } else if (isBuyer && !isSeller) {
    userRoleIsSelling = false;
  } else if (isCreator) {
    userRoleIsSelling = creatorIsSelling;
  } else if (isCounterparty) {
    // If user is the counterparty, their role is the OPPOSITE of creator's role
    userRoleIsSelling = !creatorIsSelling;
  } else {
    // Fallback: default to stored role
    userRoleIsSelling = creatorIsSelling;
  }

  const roleText = userRoleIsSelling ? "Selling" : "Buying";
  const isBuying = !userRoleIsSelling;

  const rawOtherParty = userRoleIsSelling ? buyerCandidate : sellerCandidate;
  const cleanOtherParty =
    rawOtherParty && rawOtherParty !== "Buyer" && rawOtherParty !== "Seller"
      ? rawOtherParty
      : (room.counterparty && room.counterparty !== "Counterparty"
          ? room.counterparty
          : userRoleIsSelling ? "Buyer" : "Seller");

  const formattedTitle = formatItemTitle(room.title || room.item || "Payment Item");

  return {
    roleText,
    isBuying,
    counterpartyLabel: isBuying ? "Seller: " : "Buyer: ",
    counterpartyLabelLong: isBuying ? "Seller's Name: " : "Buyer's Name: ",
    counterpartyName: cleanOtherParty,
    title: formattedTitle,
  };
}
