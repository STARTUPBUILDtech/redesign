/**
 * Room Server Coordination Service
 * Interacts with PayKudi's dedicated Room Server (server.js on port 5000)
 * Handles server-side room creation, status synchronization, and 2-min kill coordination.
 */

const ROOM_SERVER_URL = "http://localhost:5000";

/**
 * Creates a payment room on the server side.
 * The server validates the intent, issues the authoritative orderNumber,
 * syncs to Supabase, starts the timers, and broadcasts via Socket.IO.
 */
export async function createPaymentRoomOnServer({
  item,
  amount,
  role,
  counterparty,
  matchedUser,
  creatorProfile,
  specifications = [],
  itemImage = null,
}) {
  try {
    const res = await fetch(`${ROOM_SERVER_URL}/api/rooms/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item,
        amount,
        role,
        counterparty,
        matchedUser,
        creatorProfile,
        specifications,
        itemImage,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.room) {
        return data.room;
      }
    }
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || errData.message || "Server is unreachable");
  } catch (err) {
    console.warn("[RoomServer] Could not reach Node room server on port 5000:", err.message);
    throw new Error(err.message === "Failed to fetch" || !err.message ? "Server is unreachable" : err.message);
  }
}

/**
 * Retrieves room status and real-time timer from server.
 */
export async function getRoomStatusFromServer(roomId) {
  try {
    const res = await fetch(`${ROOM_SERVER_URL}/api/rooms/${encodeURIComponent(roomId)}/status`);
    if (res.ok) {
      return await res.json();
    }
  } catch (_) {}
  return null;
}

/**
 * Tells the room server that counterparty accepted the invitation.
 */
export async function acceptRoomInviteOnServer(roomId, roomData = {}) {
  try {
    const res = await fetch(`${ROOM_SERVER_URL}/api/rooms/${encodeURIComponent(roomId)}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roomData),
    });
    if (res.ok) return await res.json();
  } catch (_) {}
  return null;
}

/**
 * Tells the room server that creator clicked proceed to payment.
 */
export async function creatorProceedOnServer(roomId, specifications = [], itemImage = null) {
  try {
    const res = await fetch(`${ROOM_SERVER_URL}/api/rooms/${encodeURIComponent(roomId)}/proceed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ specifications, itemImage }),
    });
    if (res.ok) return await res.json();
  } catch (_) {}
  return null;
}

/**
 * Kills a room on the server (manual cancel or decline).
 */
export async function killRoomOnServer(roomId, reason = "user_cancelled") {
  try {
    const res = await fetch(`${ROOM_SERVER_URL}/api/rooms/${encodeURIComponent(roomId)}/kill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) return await res.json();
  } catch (_) {}
  return null;
}

/**
 * Notifies the room server that a user agreed to terms.
 */
export async function agreeRoomTermsOnServer(roomId, termsData = {}) {
  try {
    const res = await fetch(`${ROOM_SERVER_URL}/api/rooms/${encodeURIComponent(roomId)}/agree-terms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(termsData),
    });
    if (res.ok) return await res.json();
  } catch (_) {}
  return null;
}

