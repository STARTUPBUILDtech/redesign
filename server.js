import http from "http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// CORS setup
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }));
app.use(express.json());

// Socket.io setup
const io = new SocketIOServer(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// In-Memory store for active rooms & kill timers
// key: roomId (e.g. "ORD-308292") -> Room Object
const activeRooms = new Map();
// key: roomId -> NodeJS.Timeout
const killTimers = new Map();

const KILL_TIMEOUT_MS = 120 * 1000; // 2 minutes

/**
 * Persist room to killed_payment_rooms and clean up pre_payment_rooms & payment_rooms
 */
async function killRoom(roomId, reason = "timeout_creator_not_joined") {
  const room = activeRooms.get(roomId) || { id: roomId, orderNumber: roomId };

  // 1. Clear any active kill timer
  if (killTimers.has(roomId)) {
    clearTimeout(killTimers.get(roomId));
    killTimers.delete(roomId);
  }

  // 2. Mark in-memory as killed
  room.status = "killed";
  room.statusText = "Killed";
  room.isKilled = true;
  room.killReason = reason;
  room.killedAt = new Date().toISOString();
  activeRooms.set(roomId, room);

  console.log(`[server.js] Room ${roomId} has been KILLED. Reason: ${reason}`);

  const targetId = room.id || roomId;
  const targetOrderNumber = room.orderNumber || targetId;

  // 3. Supabase cleanup: MUST NOT be in pre_payment_rooms or payment_rooms!
  if (supabase) {
    try {
      // Remove from pre_payment_rooms
      await supabase.from("pre_payment_rooms").delete().eq("id", targetId);
      await supabase.from("pre_payment_rooms").delete().eq("order_number", targetOrderNumber);

      // Remove from main payment_rooms
      await supabase.from("payment_rooms").delete().eq("id", targetId);
      await supabase.from("payment_rooms").delete().eq("order_number", targetOrderNumber);

      // Save into killed_payment_rooms
      await supabase.from("killed_payment_rooms").upsert({
        id: targetId,
        order_number: targetOrderNumber,
        title: room.title || room.item || "Payment Room",
        item: room.item || room.title || "Payment Item",
        amount: room.amount || room.price || "₦0.00",
        price: room.price || room.amount || "₦0.00",
        role: room.role || "Buying",
        creator: room.creator || room.creatorName || "User",
        counterparty: room.counterparty || room.counterpartyName || "Counterparty",
        reason: reason,
        killed_at: room.killedAt,
        metadata: {
          specifications: room.specifications || [],
          counterparty_joined: Boolean(room.counterpartyJoined),
          creator_proceeded: Boolean(room.creatorProceeded),
        },
      });
      console.log(`[server.js] Successfully saved ${roomId} to Supabase killed_payment_rooms.`);
    } catch (err) {
      console.error(`[server.js] Error cleaning Supabase for killed room ${roomId}:`, err);
    }
  }

  // 4. Broadcast room_killed event to all socket clients
  io.to(roomId).emit("room_killed", {
    roomId,
    reason,
    message: reason === "timeout_creator_not_joined"
      ? "Payment room was killed: counterparty did not join within 2 minutes."
      : `Payment room was killed (${reason}).`,
    room,
  });

  io.emit("paykudi_room_killed_global", { roomId, reason, room });
  io.emit("paykudi_invite_killed", { id: roomId, roomId, reason, room });
  return room;
}

/**
 * Helper to get or hydrate a room from activeRooms or Supabase
 */
async function getOrFetchRoom(roomId, incomingData = {}) {
  let room = activeRooms.get(roomId);
  if (!room || !room.title || !room.amount) {
    if (supabase) {
      try {
        const { data } = await supabase
          .from("pre_payment_rooms")
          .select("*")
          .or(`id.eq.${roomId},order_number.eq.${roomId}`)
          .maybeSingle();
        if (data) {
          room = {
            ...(room || {}),
            ...data,
            id: data.id || roomId,
            orderNumber: data.order_number || data.id || roomId,
            title: data.title || data.item || "Payment Item",
            item: data.item || data.title || "Payment Item",
            amount: data.amount || data.price || "₦0.00",
            price: data.price || data.amount || "₦0.00",
            creator: data.creator || "Creator",
            counterparty: data.counterparty || "Counterparty",
            sellerName: data.seller_name || (String(data.role || "").toLowerCase().includes("sell") ? data.creator : data.counterparty),
            buyerName: data.buyer_name || (String(data.role || "").toLowerCase().includes("sell") ? data.counterparty : data.creator),
          };
          activeRooms.set(roomId, room);
        }
      } catch (err) {
        console.warn(`[server.js] Could not fetch room ${roomId} from Supabase:`, err.message);
      }
    }
  }

  if (!room) {
    room = { id: roomId, orderNumber: roomId, creatorProceeded: false, counterpartyJoined: false };
  }

  if (incomingData && typeof incomingData === "object") {
    room = {
      ...room,
      ...incomingData,
      title: incomingData.title || incomingData.item || room.title || room.item,
      item: incomingData.item || incomingData.title || room.item || room.title,
      amount: incomingData.amount || incomingData.price || room.amount || room.price,
      price: incomingData.price || incomingData.amount || room.price || room.amount,
      creator: incomingData.creator || room.creator,
      counterparty: incomingData.counterparty || room.counterparty,
      sellerName: incomingData.sellerName || room.sellerName,
      buyerName: incomingData.buyerName || room.buyerName,
    };
  }

  activeRooms.set(roomId, room);
  return room;
}

/**
 * Socket.IO Realtime Connection Handler
 */
io.on("connection", (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // User joins a payment room channel
  socket.on("join_room", async ({ roomId, user, role }) => {
    if (!roomId) return;
    socket.join(roomId);
    console.log(`[Socket.io] User ${user || socket.id} (${role || "user"}) joined room: ${roomId}`);

    const existing = await getOrFetchRoom(roomId);
    if (existing) {
      socket.emit("room_state", { room: existing });
    }
  });

  // Creator sends new invite: broadcast to all connected clients in realtime
  socket.on("send_invite", async ({ room }) => {
    if (!room) return;
    const roomId = room.id || room.orderNumber;
    console.log(`[Socket.io] New invitation broadcasted for room ${roomId}`);
    await getOrFetchRoom(roomId, room);
    io.emit("paykudi_new_invite", { room });
  });

  // User 2 (Counterparty) clicks Accept Invitation
  socket.on("accept_invite", async ({ roomId, room: incomingRoom, roomData }) => {
    if (!roomId) return;
    console.log(`[Socket.io] Counterparty accepted invite for room ${roomId}`);

    let room = await getOrFetchRoom(roomId, incomingRoom || roomData);
    room.counterpartyJoined = true;
    room.counterparty_joined = true;
    activeRooms.set(roomId, room);

    // Notify creator that counterparty joined
    io.to(roomId).emit("counterparty_joined", { roomId, room });
    io.emit("paykudi_invite_accepted", { roomId, room });

    // ONLY IF creator has EXPLICITLY clicked proceed:
    if (room.creatorProceeded === true) {
      console.log(`[Socket.io] Creator had already proceeded for ${roomId}. Ready!`);
      if (killTimers.has(roomId)) {
        clearTimeout(killTimers.get(roomId));
        killTimers.delete(roomId);
      }
      room.status = "awaiting_payment";
      room.statusText = "Awaiting Payment";
      io.to(roomId).emit("room_ready", { roomId, room });
    } else {
      // Creator has NOT proceeded yet -> User 2 MUST WAIT!
      console.log(`[Socket.io] Creator has NOT proceeded for ${roomId}. User 2 is waiting. Starting 2-minute kill timer.`);
      room.waitingForCreator = true;
      room.waitingStartedAt = Date.now();
      room.expiresAtMs = Date.now() + KILL_TIMEOUT_MS;

      if (killTimers.has(roomId)) {
        clearTimeout(killTimers.get(roomId));
      }
      const timer = setTimeout(() => {
        killRoom(roomId, "timeout_creator_not_joined");
      }, KILL_TIMEOUT_MS);
      killTimers.set(roomId, timer);

      io.to(roomId).emit("waiting_for_creator", {
        roomId,
        room,
        timeoutSeconds: 120,
        expiresAtMs: room.expiresAtMs,
      });
    }
  });

  // User 1 (Creator) clicks "Proceed to make payment"
  socket.on("creator_proceeded", async ({ roomId, specifications, itemImage, room: incomingRoom }) => {
    if (!roomId) return;
    console.log(`[Socket.io] Creator proceeded for room ${roomId}`);

    let room = await getOrFetchRoom(roomId, incomingRoom);
    room.creatorProceeded = true;
    room.creator_proceeded = true;
    if (specifications) room.specifications = specifications;
    if (itemImage) room.itemImage = itemImage;
    activeRooms.set(roomId, room);

    // If counterparty has already accepted, clear timer and open room for both!
    if (room.counterpartyJoined || room.counterparty_joined) {
      console.log(`[Socket.io] Both joined room ${roomId}! Transitioning to active payment room.`);
      if (killTimers.has(roomId)) {
        clearTimeout(killTimers.get(roomId));
        killTimers.delete(roomId);
      }
      room.status = "awaiting_payment";
      room.statusText = "Awaiting Payment";
      room.waitingForCreator = false;

      io.to(roomId).emit("room_ready", { roomId, room });
      io.emit("paykudi_room_ready_global", { roomId, room });
    } else {
      io.to(roomId).emit("creator_ready", { roomId, room });
    }
  });

  // User declines invitation
  socket.on("decline_invite", async ({ roomId, reason }) => {
    if (!roomId) return;
    console.log(`[Socket.io] Invitation declined for room ${roomId}`);
    await killRoom(roomId, reason || "declined");
  });

  // User agrees to terms
  socket.on("agree_terms", async ({ roomId, role, state, city, location }) => {
    if (!roomId) return;
    const room = await getOrFetchRoom(roomId);
    if (!room) return;
    const isSeller = String(role || "").toLowerCase().includes("sell");
    if (isSeller) {
      room.sellerAgreedTerms = true;
      room.seller_agreed_terms = true;
    } else {
      room.buyerAgreedTerms = true;
      room.buyer_agreed_terms = true;
    }
    if (state) room.deliveryState = state;
    if (city) room.deliveryCity = city;
    if (location) room.deliveryLocation = location;
    activeRooms.set(roomId, room);
    io.to(roomId).emit("terms_agreed", { roomId, role: isSeller ? "seller" : "buyer", state, city, location, room });
  });

  socket.on("disconnect", () => {
    // client disconnected
  });
});

/**
 * REST API Endpoints
 */

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    server: "PayKudi Realtime Payment Room Server",
    activeRoomsCount: activeRooms.size,
    activeTimersCount: killTimers.size,
    timestamp: new Date().toISOString(),
  });
});

// Get all active rooms
app.get("/api/rooms", async (req, res) => {
  const rooms = Array.from(activeRooms.values());
  res.json({ rooms });
});

// Authoritative Server-Side Payment Room Creation
app.post("/api/rooms/create", async (req, res) => {
  try {
    const body = req.body || {};
    const item = String(body.item || body.itemPurpose || body.title || "").trim();
    if (!item) {
      return res.status(400).json({ error: "Item title or description is required" });
    }

    // Parse and validate numeric amount
    const rawAmt = body.amount ?? body.price ?? 0;
    const cleanAmtStr = String(rawAmt).replace(/[^\d.]/g, "");
    const numericAmount = parseFloat(cleanAmtStr) || 0;
    if (numericAmount <= 0) {
      return res.status(400).json({ error: "Valid payment amount greater than zero is required" });
    }

    // Generate authoritative, collision-free Order Number on the server
    let orderNum = body.orderNumber || body.id;
    if (!orderNum || String(orderNum).startsWith("TEMP-")) {
      orderNum = "ORD-" + Math.floor(100000 + Math.random() * 900000);
      while (activeRooms.has(orderNum)) {
        orderNum = "ORD-" + Math.floor(100000 + Math.random() * 900000);
      }
    }

    const formattedItem = item
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

    const formattedAmount = `₦${numericAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

    const nowMs = Date.now();
    const expiresAtMs = nowMs + KILL_TIMEOUT_MS;
    const nowIso = new Date(nowMs).toISOString();
    const expIso = new Date(expiresAtMs).toISOString();

    const isSelling = String(body.role || "").toLowerCase().includes("sell");
    const creator = body.creatorProfile || body.currentUser || {};
    const matchedUser = body.matchedUser || {};

    const toDigitsOnly = (v) => {
      if (!v) return "";
      let d = String(v).replace(/\D/g, "");
      if (d.startsWith("234") && d.length > 3) d = d.slice(3);
      return d.replace(/^0+/, "");
    };

    const creatorId = toDigitsOnly(creator.account_id || creator.phone || creator.id) || "8032001585";
    const cpId = toDigitsOnly(matchedUser.account_id || matchedUser.whatsapp_number || matchedUser.phone || matchedUser.id || body.counterpartyId) || "9033705741";
    const creatorName = creator.name || creator.fullName || creator.full_name || "Howard Ukah";
    const creatorUser = creator.username || "howard001";
    const creatorPhone = creator.phone || creator.whatsapp_number || "8032001585";
    const creatorAvatar = creator.avatar_color || "#3b82f6";

    const cpName = matchedUser.full_name || matchedUser.name || body.counterparty || "Counterparty";
    const cpUser = matchedUser.username || body.counterpartyUsername || "";
    const cpPhone = matchedUser.whatsapp_number || matchedUser.phone || body.counterpartyPhone || "";
    const cpAvatar = matchedUser.avatar_color || "#10b981";

    const sName = isSelling ? creatorName : cpName;
    const sUser = isSelling ? creatorUser : cpUser;
    const sPhone = isSelling ? creatorPhone : cpPhone;
    const sAvatar = isSelling ? creatorAvatar : cpAvatar;

    const bName = isSelling ? cpName : creatorName;
    const bUser = isSelling ? cpUser : creatorUser;
    const bPhone = isSelling ? cpPhone : creatorPhone;
    const bAvatar = isSelling ? cpAvatar : creatorAvatar;

    const room = {
      id: orderNum,
      orderNumber: orderNum,
      order_number: orderNum,
      item: formattedItem,
      title: formattedItem,
      amount: formattedAmount,
      price: formattedAmount,
      priceNumeric: numericAmount,
      role: isSelling ? "Selling" : "Buying",
      creatorRole: isSelling ? "Seller" : "Buyer",
      creator: creatorName,
      creatorName,
      creator_id: creatorId,
      creatorId,
      creatorUsername: creatorUser,
      creatorPhone,
      creator_avatar_color: creatorAvatar,
      creatorAvatarColor: creatorAvatar,
      counterparty: cpName,
      counterpartyName: cpName,
      counterpartyId: matchedUser.id || cpId,
      counterparty_id: cpId,
      counterpartyUsername: cpUser,
      counterpartyPhone: cpPhone,
      counterparty_avatar_color: cpAvatar,
      counterpartyAvatarColor: cpAvatar,
      sellerName: sName,
      seller: sName,
      seller_name: sName,
      sellerUsername: sUser,
      sellerPhone: sPhone,
      sellerAvatarColor: sAvatar,
      seller_id: isSelling ? creatorId : cpId,
      sellerId: isSelling ? creatorId : cpId,
      buyerName: bName,
      buyer: bName,
      buyer_name: bName,
      buyerUsername: bUser,
      buyerPhone: bPhone,
      buyerAvatarColor: bAvatar,
      buyer_id: isSelling ? cpId : creatorId,
      buyerId: isSelling ? cpId : creatorId,
      counterpartyJoined: false,
      counterparty_joined: false,
      creatorProceeded: false,
      creator_proceeded: false,
      category: "pre_payment",
      status: "pending_invite",
      statusText: "Invite Sent",
      status_text: "Invite Sent",
      created_at: nowIso,
      updated_at: nowIso,
      expires_at: expIso,
      created_at_ms: nowMs,
      expires_at_ms: expiresAtMs,
      secondsLeft: 120,
      specifications: body.specifications || [],
      itemImage: body.itemImage || null,
    };

    activeRooms.set(orderNum, room);

    // Persist directly to Supabase pre_payment_rooms table from server
    if (supabase) {
      try {
        await supabase.from("pre_payment_rooms").upsert({
          order_number: orderNum,
          item: formattedItem,
          price: numericAmount,
          creator_id: creatorId,
          counterparty_joined: false,
          status_text: "Invite Sent",
          buyer_id: isSelling ? cpId : creatorId,
          seller_id: isSelling ? creatorId : cpId,
          expires_at: expIso,
          created_at: nowIso,
        });
        console.log(`[server.js] Room ${orderNum} persisted to Supabase pre_payment_rooms.`);
      } catch (sbErr) {
        console.warn(`[server.js] Warning: Supabase pre_payment_rooms sync error for ${orderNum}:`, sbErr.message);
      }
    }

    // Mirror to FastAPI backend if available
    try {
      fetch("http://localhost:8000/auth/pre-payment-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(room),
      }).catch(() => {});
    } catch (_) {}

    // Broadcast in realtime to all connected clients
    io.emit("paykudi_new_invite", { room });
    io.emit("new_payment_room_created", { room });
    console.log(`[server.js] Room ${orderNum} created on server and broadcasted via Socket.io.`);

    return res.status(201).json({ success: true, room });
  } catch (err) {
    console.error(`[server.js] Error creating payment room:`, err);
    return res.status(500).json({ error: "Failed to create payment room", detail: err.message });
  }
});

// Get room by ID
app.get("/api/rooms/:id", async (req, res) => {
  const roomId = req.params.id;
  const room = await getOrFetchRoom(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json({ room });
});

// Get room status and timer info
app.get("/api/rooms/:id/status", async (req, res) => {
  const roomId = req.params.id;
  const room = await getOrFetchRoom(roomId);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const secondsLeft = room.expiresAtMs
    ? Math.max(0, Math.round((room.expiresAtMs - Date.now()) / 1000))
    : 120;

  res.json({
    room,
    secondsLeft,
    isWaiting: Boolean(room.waitingForCreator),
    counterpartyJoined: Boolean(room.counterpartyJoined),
    creatorProceeded: Boolean(room.creatorProceeded),
  });
});

// Counterparty accepts room invite
app.post("/api/rooms/:id/accept", async (req, res) => {
  const roomId = req.params.id;
  let room = await getOrFetchRoom(roomId, req.body);

  room.counterpartyJoined = true;
  room.counterparty_joined = true;
  activeRooms.set(roomId, room);

  io.to(roomId).emit("counterparty_joined", { roomId, room });

  if (room.creatorProceeded === true) {
    if (killTimers.has(roomId)) {
      clearTimeout(killTimers.get(roomId));
      killTimers.delete(roomId);
    }
    room.status = "awaiting_payment";
    room.statusText = "Awaiting Payment";
    io.to(roomId).emit("room_ready", { roomId, room });
    return res.json({ status: "ready", room });
  }

  // Start 2-min timer
  room.waitingForCreator = true;
  room.expiresAtMs = Date.now() + KILL_TIMEOUT_MS;
  if (killTimers.has(roomId)) {
    clearTimeout(killTimers.get(roomId));
  }
  const timer = setTimeout(() => {
    killRoom(roomId, "timeout_creator_not_joined");
  }, KILL_TIMEOUT_MS);
  killTimers.set(roomId, timer);

  io.to(roomId).emit("waiting_for_creator", {
    roomId,
    room,
    timeoutSeconds: 120,
    expiresAtMs: room.expiresAtMs,
  });

  return res.json({ status: "waiting", room, secondsLeft: 120 });
});

// Creator proceeds
app.post("/api/rooms/:id/proceed", (req, res) => {
  const roomId = req.params.id;
  let room = activeRooms.get(roomId) || { id: roomId, orderNumber: roomId };
  room.creatorProceeded = true;
  room.creator_proceeded = true;
  if (req.body.specifications) room.specifications = req.body.specifications;
  if (req.body.itemImage) room.itemImage = req.body.itemImage;
  activeRooms.set(roomId, room);

  if (room.counterpartyJoined || room.counterparty_joined) {
    if (killTimers.has(roomId)) {
      clearTimeout(killTimers.get(roomId));
      killTimers.delete(roomId);
    }
    room.status = "awaiting_payment";
    room.statusText = "Awaiting Payment";
    room.waitingForCreator = false;
    io.to(roomId).emit("room_ready", { roomId, room });
    return res.json({ status: "ready", room });
  }

  io.to(roomId).emit("creator_ready", { roomId, room });
  return res.json({ status: "creator_ready", room });
});

// User agrees to terms endpoint
app.post("/api/rooms/:id/agree-terms", async (req, res) => {
  const roomId = req.params.id;
  const { role, state, city, location } = req.body || {};
  const room = await getOrFetchRoom(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  const isSeller = String(role || "").toLowerCase().includes("sell");
  if (isSeller) {
    room.sellerAgreedTerms = true;
    room.seller_agreed_terms = true;
  } else {
    room.buyerAgreedTerms = true;
    room.buyer_agreed_terms = true;
  }
  if (state) room.deliveryState = state;
  if (city) room.deliveryCity = city;
  if (location) room.deliveryLocation = location;
  activeRooms.set(roomId, room);

  io.to(roomId).emit("terms_agreed", { roomId, role: isSeller ? "seller" : "buyer", state, city, location, room });
  return res.json({ success: true, room });
});

// Kill room manually
app.post("/api/rooms/:id/kill", async (req, res) => {
  const roomId = req.params.id;
  const reason = req.body?.reason || "timeout_creator_not_joined";
  const killedRoom = await killRoom(roomId, reason);
  res.json({ success: true, room: killedRoom });
});

// Start HTTP + Socket.IO Server
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 PayKudi Payment Room Server running on port ${PORT}`);
  console.log(`   - HTTP: http://localhost:${PORT}`);
  console.log(`   - WebSocket (Socket.IO): ws://localhost:${PORT}`);
  console.log(`   - 2-Minute Kill Timer & Supabase Sync Enabled`);
  console.log(`=======================================================`);
});
