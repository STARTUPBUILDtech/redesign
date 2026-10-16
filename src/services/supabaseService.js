import { supabase, isSupabaseConfigured } from "../supabase/client";
import { formatItemTitle } from "../utils/paymentRoomUtils";

/* ══════════════════════════════════════════════════════════════
   PAYMENT ROOMS SERVICE
   ══════════════════════════════════════════════════════════════ */

export async function getPaymentRoomsFromDB() {
  if (!isSupabaseConfigured) return [];
  try {
    // Attempt to query with seller and buyer profile relationships
    const { data, error } = await supabase
      .from("payment_rooms")
      .select(`
        *,
        seller:profiles!seller_id(id, full_name, username, avatar_url),
        buyer:profiles!buyer_id(id, full_name, username, avatar_url)
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data.map(formatRoomFromDB);
    }

    // Fallback query if profile relationships are not yet linked
    const fallback = await supabase
      .from("payment_rooms")
      .select("*")
      .order("created_at", { ascending: false });

    if (fallback.error) {
      console.warn("[Supabase] Error fetching payment rooms:", fallback.error.message);
      return [];
    }
    return (fallback.data || []).map(formatRoomFromDB);
  } catch (err) {
    console.warn("[Supabase] Failed to fetch payment rooms:", err);
    return [];
  }
}

export async function savePaymentRoomToDB(room) {
  const rawRole = String(room?.role || "").toLowerCase();
  const isSellerRole = rawRole.includes("sell");
  const creator = room?.creator || room?.creatorName || "";
  const counterparty = room?.counterparty || room?.counterpartyName || "";
  const defaultSeller = isSellerRole ? (creator || "Seller") : (counterparty || "Seller");
  const defaultBuyer = isSellerRole ? (counterparty || "Buyer") : (creator || "Buyer");
  const titleFormatted = formatItemTitle(room?.title || room?.item || "Payment Room");

  // Parse numeric amount safely from string or number
  const rawAmount = room?.priceNumeric ?? room?.amount ?? room?.price ?? 0;
  const numAmount = typeof rawAmount === "number"
    ? rawAmount
    : Number(String(rawAmount).replace(/[^0-9.]/g, "")) || 0;

  const agreed = Boolean(room?.hasAgreedTerms || room?.has_agreed_terms);

  const orderNum = room?.orderNumber || room?.id || ("ORD-" + Math.floor(100000 + Math.random() * 900000));

  const dbPayload = {
    order_number: orderNum,
    title: titleFormatted,
    amount: numAmount,
    currency: room?.currency || "NGN",
    seller_id: room?.seller_id || room?.sellerId || (isSellerRole ? room?.creatorId : room?.counterpartyId) || null,
    buyer_id: room?.buyer_id || room?.buyerId || (isSellerRole ? room?.counterpartyId : room?.creatorId) || null,
    status: room?.status || "awaiting_payment",
    variant: room?.variant || null,
    buyer_agreed_terms: room?.buyerAgreedTerms !== undefined ? Boolean(room.buyerAgreedTerms) : (!isSellerRole ? agreed : false),
    seller_agreed_terms: room?.sellerAgreedTerms !== undefined ? Boolean(room.sellerAgreedTerms) : (isSellerRole ? agreed : false),
    updated_at: new Date().toISOString(),
  };

  // Sync to local FastAPI SQLite backend if available
  try {
    fetch("http://localhost:8000/auth/payment-rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dbPayload),
    }).catch(() => {});

    fetch("http://localhost:8000/auth/payment-rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dbPayload),
    }).catch(() => {});
  } catch (_) {}

  if (!isSupabaseConfigured) return room;

  try {
    const { data, error } = await supabase
      .from("payment_rooms")
      .upsert(dbPayload)
      .select()
      .single();

    if (error) {
      console.warn("[Supabase] Error saving payment room:", error.message);
      return room;
    }

    // Move out of pre_payment_rooms table
    const targetId = room.id || room.orderNumber;
    const targetOrderNumber = room.orderNumber || room.id;
    if (targetId) {
      try {
        await supabase.from("pre_payment_rooms").delete().eq("id", targetId);
      } catch (delErr) {
        console.warn("[Supabase] Failed to delete pre-payment room by id:", delErr);
      }
    }
    if (targetOrderNumber && targetOrderNumber !== targetId) {
      try {
        await supabase.from("pre_payment_rooms").delete().eq("order_number", targetOrderNumber);
      } catch (delErr) {
        console.warn("[Supabase] Failed to delete pre-payment room by order_number:", delErr);
      }
    }

    return formatRoomFromDB(data);
  } catch (err) {
    console.warn("[Supabase] Failed to save payment room:", err);
    return room;
  }
}


export async function getPrePaymentRoomsFromDB() {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("pre_payment_rooms")
      .select("*");

    if (error) {
      console.warn("[Supabase] Error fetching pre-payment rooms:", error.message);
      return [];
    }
    return (data || []).map(formatRoomFromDB);
  } catch (err) {
    console.warn("[Supabase] Failed to fetch pre-payment rooms:", err);
    return [];
  }
}

export async function savePrePaymentRoomToDB(room) {
  if (!isSupabaseConfigured || !room) return room;
  try {
    const orderNum = room.orderNumber || room.order_number || room.id || ("ORD-" + Math.floor(100000 + Math.random() * 900000));
    const titleFormatted = formatItemTitle(room.item || room.title || "Payment Item");

    // Parse numeric amount safely (Supabase expects numeric(14, 2))
    const rawPrice = room.priceNumeric ?? room.amount ?? room.price ?? 0;
    const numPrice = typeof rawPrice === "number"
      ? rawPrice
      : Number(String(rawPrice).replace(/[^0-9.]/g, "")) || 0;

    let userProfile = null;
    try {
      userProfile = JSON.parse(localStorage.getItem("paykudi_user_profile") || "{}");
    } catch (_) {}

    const toDigitsOnly = (v) => {
      if (!v) return null;
      let d = String(v).replace(/\D/g, "");
      if (d.startsWith("234") && d.length > 3) d = d.slice(3);
      d = d.replace(/^0+/, "");
      return d || null;
    };

    // Creator ID must strictly be their numeric user ID (numbers only!)
    const creatorId = toDigitsOnly(room.creator_id || room.creatorId || userProfile?.account_id || userProfile?.phone || userProfile?.id) || "8032001585";
    const cpId = toDigitsOnly(room.counterpartyId || room.counterparty_id || room.counterpartyPhone || room.counterparty_phone) || "9033705741";
    const buyerId = toDigitsOnly(room.buyer_id || room.buyerId) || (String(room.role || "").toLowerCase().includes("sell") ? cpId : creatorId);
    const sellerId = toDigitsOnly(room.seller_id || room.sellerId) || (String(room.role || "").toLowerCase().includes("sell") ? creatorId : cpId);

    const dbPayload = {
      order_number: orderNum,
      item: titleFormatted,
      price: numPrice,
      creator_id: creatorId,
      counterparty_joined: Boolean(room.counterpartyJoined || room.counterparty_joined),
      status_text: room.status_text || room.statusText || (room.status === "expired" ? "Expired" : "pending_invite"),
      buyer_id: buyerId,
      seller_id: sellerId,
      resend_count: Number(room.resend_count || room.resendCount || 0),
      expires_at: room.expires_at || room.expiresAt || null,
      resent_at: room.resent_at || room.resentAt || null,
    };

    // Sync to local FastAPI SQLite backend if available
    try {
      fetch("http://localhost:8000/auth/pre-payment-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...room, ...dbPayload }),
      }).catch(() => {});
    } catch (_) {}

    const { data, error } = await supabase
      .from("pre_payment_rooms")
      .upsert(dbPayload, { onConflict: "order_number" })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("[Supabase] Error saving pre-payment room:", error.message);
      return room;
    }
    return data ? formatRoomFromDB(data) : room;
  } catch (err) {
    console.warn("[Supabase] Failed to save pre-payment room:", err);
    return room;
  }
}

export async function deletePrePaymentRoomFromDB(roomId) {
  if (!isSupabaseConfigured || !roomId) return;
  try {
    await supabase.from("pre_payment_rooms").delete().eq("id", roomId);
    await supabase.from("pre_payment_rooms").delete().eq("order_number", roomId);
  } catch (err) {
    console.warn("[Supabase] Failed to delete pre-payment room:", err);
  }
}

export async function saveKilledPaymentRoomToDB(room, reason = "timeout_creator_not_joined") {
  const targetId = room?.id || room?.orderNumber || "ORD-ROOM";
  const targetOrderNumber = room?.orderNumber || room?.id || "ORD-ROOM";
  const killedPayload = {
    id: targetId,
    order_number: targetOrderNumber,
    title: room?.title || room?.item || "Payment Item",
    item: room?.item || room?.title || "Payment Item",
    amount: room?.amount || room?.price || "₦0.00",
    price: room?.price || room?.amount || "₦0.00",
    role: room?.role || "Buying",
    creator: room?.creator || room?.creatorName || "User",
    counterparty: room?.counterparty || room?.counterpartyName || "Counterparty",
    reason: reason || "timeout_creator_not_joined",
    killed_at: new Date().toISOString(),
    metadata: {
      specifications: room?.specifications || [],
      item_image: room?.itemImage || room?.item_image || null,
      counterparty_joined: Boolean(room?.counterparty_joined || room?.counterpartyJoined),
      creator_proceeded: Boolean(room?.creator_proceeded || room?.creatorProceeded),
    },
  };

  // 1. Delete from pre_payment_rooms
  try {
    await deletePrePaymentRoomFromDB(targetId);
  } catch (_) {}

  // 2. Ensure deleted from payment_rooms (main payment room db)
  if (isSupabaseConfigured) {
    try {
      await supabase.from("payment_rooms").delete().eq("id", targetId);
      await supabase.from("payment_rooms").delete().eq("order_number", targetOrderNumber);
    } catch (_) {}

    // 3. Save into killed_payment_rooms
    try {
      await supabase.from("killed_payment_rooms").upsert(killedPayload);
    } catch (err) {
      console.warn("[Supabase] Failed to save killed payment room:", err);
    }
  }

  // 4. Also notify Node server.js
  try {
    fetch(`http://localhost:5000/api/rooms/${encodeURIComponent(targetId)}/kill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, room: killedPayload }),
    }).catch(() => {});
  } catch (_) {}

  // 5. Also sync to FastAPI backend
  try {
    fetch(`http://localhost:8000/auth/pre-payment-rooms/${encodeURIComponent(targetId)}`, {
      method: "DELETE",
    }).catch(() => {});
    fetch(`http://localhost:8000/auth/pre-payment-rooms/${encodeURIComponent(targetId)}/kill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }).catch(() => {});
  } catch (_) {}

  return killedPayload;
}

export async function getKilledPaymentRoomsFromDB() {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("killed_payment_rooms")
      .select("*")
      .order("killed_at", { ascending: false });

    if (error) {
      console.warn("[Supabase] Error fetching killed payment rooms:", error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn("[Supabase] Failed to fetch killed payment rooms:", err);
    return [];
  }
}

export async function updatePaymentRoomStatusInDB(roomId, status, statusText) {
  if (!isSupabaseConfigured) return;
  try {
    const updatePayload = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (statusText) updatePayload.status_text = statusText;

    await supabase
      .from("payment_rooms")
      .update(updatePayload)
      .eq("order_number", roomId);
  } catch (err) {
    console.warn("[Supabase] Failed to update room status:", err);
  }
}

export function subscribeToPaymentRooms(callback) {
  if (!isSupabaseConfigured) return () => {};
  const channel = supabase
    .channel("public:payment_rooms")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "payment_rooms" },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

function formatRoomFromDB(r) {
  if (!r) return null;

  // Extract amount as number and format currency display
  const rawAmt = r.amount ?? r.price_numeric ?? r.price ?? 0;
  const numAmount = typeof rawAmt === "number"
    ? rawAmt
    : Number(String(rawAmt).replace(/[^0-9.]/g, "")) || 0;
  const formattedPrice = `₦${numAmount.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  // Profile data from joined profiles (or fallback to legacy columns)
  const sellerProf = r.seller || {};
  const buyerProf = r.buyer || {};
  const sellerName = sellerProf.full_name || sellerProf.username || r.seller_name || "Seller";
  const buyerName = buyerProf.full_name || buyerProf.username || r.buyer_name || "Buyer";
  const sellerBank = sellerProf.bank_name || r.bank || "Guaranteed Trust Bank (GTBank)";
  const sellerAccount = sellerProf.account_number || r.account_number || null;

  const rawRole = String(r.role || "").toLowerCase();
  const isSellerRole = rawRole.includes("sell");
  const creator = r.creator || (isSellerRole ? sellerName : buyerName);
  const counterparty = r.counterparty || (isSellerRole ? buyerName : sellerName);

  const statusMap = {
    awaiting_payment: "Awaiting Payment",
    payment_received: "Payment Received",
    in_transit: "In Transit",
    confirm_delivery: "Confirm Delivery",
    completed: "Completed",
    dispute: "Dispute Ongoing",
    cancelled: "Cancelled",
  };
  const status = r.status || "awaiting_payment";
  const statusText = r.status_text || statusMap[status] || "Awaiting Payment";
  const category = r.category || (status === "completed" ? "completed" : status === "cancelled" ? "cancelled" : "ongoing");
  const titleFormatted = formatItemTitle(r.title || r.item || "Payment Item");
  const hasAgreed = Boolean(r.buyer_agreed_terms || r.seller_agreed_terms || r.has_agreed_terms);

  return {
    id: r.order_number || r.id,
    orderNumber: r.order_number || r.id,
    title: titleFormatted,
    item: titleFormatted,
    amount: formattedPrice,
    price: formattedPrice,
    priceNumeric: numAmount,
    currency: r.currency || "NGN",
    role: r.role || "Buying",
    sellerId: r.seller_id,
    seller_id: r.seller_id,
    buyerId: r.buyer_id,
    buyer_id: r.buyer_id,
    creator_id: r.creator_id,
    creatorId: r.creator_id,
    creatorPhone: (isSellerRole ? sellerProf.phone : buyerProf.phone) || r.creator_phone || r.creator_id,
    creator_phone: (isSellerRole ? sellerProf.phone : buyerProf.phone) || r.creator_phone || r.creator_id,
    creatorUsername: (isSellerRole ? sellerProf.username : buyerProf.username) || r.creator_username || "",
    creator_username: (isSellerRole ? sellerProf.username : buyerProf.username) || r.creator_username || "",
    counterparty_joined: Boolean(r.counterparty_joined),
    counterpartyJoined: Boolean(r.counterparty_joined),
    resend_count: r.resend_count || 0,
    resendCount: r.resend_count || 0,
    expires_at: r.expires_at,
    resent_at: r.resent_at,
    sellerName: sellerName,
    buyerName: buyerName,
    creator: creator,
    creatorName: creator,
    counterparty: counterparty,
    counterpartyName: counterparty,
    counterpartyUsername: (isSellerRole ? buyerProf.username : sellerProf.username) || r.counterparty_username || "",
    counterparty_username: (isSellerRole ? buyerProf.username : sellerProf.username) || r.counterparty_username || "",
    counterpartyPhone: (isSellerRole ? buyerProf.phone : sellerProf.phone) || r.counterparty_phone || (isSellerRole ? r.buyer_id : r.seller_id) || "",
    counterparty_phone: (isSellerRole ? buyerProf.phone : sellerProf.phone) || r.counterparty_phone || (isSellerRole ? r.buyer_id : r.seller_id) || "",
    status: status,
    statusText: statusText,
    category: category,
    bank: sellerBank,
    accountName: sellerName,
    accountNumber: sellerAccount,
    variant: r.variant,
    buyerAgreedTerms: Boolean(r.buyer_agreed_terms),
    sellerAgreedTerms: Boolean(r.seller_agreed_terms),
    hasAgreedTerms: hasAgreed,
    date: r.created_at
      ? new Date(r.created_at).toLocaleDateString("en-NG", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Just now",
  };
}

/* ══════════════════════════════════════════════════════════════
   TRANSACTIONS SERVICE
   ══════════════════════════════════════════════════════════════ */

export async function getTransactionsFromDB() {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[Supabase] Error fetching transactions:", error.message);
      return [];
    }
    return (data || []).map(formatTxFromDB);
  } catch (err) {
    console.warn("[Supabase] Failed to fetch transactions:", err);
    return [];
  }
}

export async function addTransactionToDB(tx) {
  if (!isSupabaseConfigured) return tx;
  try {
    const dbPayload = {
      id: tx.id || ("tx-" + Date.now()),
      title: tx.title || "Transaction",
      time: tx.time || "Today",
      amount: tx.amount || "₦0.00",
      amount_numeric: tx.amountNumeric || 0,
      type: tx.type || "received",
      type_key: tx.typeKey || tx.type || "received",
      bank_code: tx.bankCode || "kuda",
      bank_name: tx.bankName || "",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("transactions")
      .insert(dbPayload)
      .select()
      .single();

    if (error) {
      console.warn("[Supabase] Error adding transaction:", error.message);
      return tx;
    }
    return formatTxFromDB(data);
  } catch (err) {
    console.warn("[Supabase] Failed to add transaction:", err);
    return tx;
  }
}

export function subscribeToTransactions(callback) {
  if (!isSupabaseConfigured) return () => {};
  const channel = supabase
    .channel("public:transactions")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "transactions" },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

function formatTxFromDB(t) {
  if (!t) return null;
  return {
    id: t.id,
    title: t.title,
    time: t.time || (t.created_at ? new Date(t.created_at).toLocaleDateString() : "Today"),
    amount: t.amount,
    amountNumeric: Number(t.amount_numeric) || 0,
    type: t.type,
    typeKey: t.type_key || t.type,
    bankCode: t.bank_code || "kuda",
    bankName: t.bank_name,
  };
}

/* ══════════════════════════════════════════════════════════════
   USER PROFILE SERVICE
   ══════════════════════════════════════════════════════════════ */

export async function getUserProfileFromDB(userId) {
  if (!isSupabaseConfigured || !userId) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export async function updateUserProfileInDB(userId, updates) {
  if (!isSupabaseConfigured || !userId) return;
  try {
    await supabase
      .from("profiles")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", userId);
  } catch (err) {
    console.warn("[Supabase] Failed to update profile:", err);
  }
}

export async function saveUserProfileToDB(profile) {
  if (!isSupabaseConfigured || !profile) return null;
  try {
    const rawPhone = profile.phone || profile.id || profile.accountId || "";
    const phoneId = String(rawPhone).trim();
    if (!phoneId) return null;

    const payload = {
      id: phoneId, // Phone number IS the ID!
      full_name: profile.name || profile.full_name || "PayKudi User",
      email: profile.email || null,
      username: profile.username ? profile.username.replace(/^@/, "") : null,
      avatar_url: profile.avatar_url || profile.avatar || null,
      avatar_color: profile.avatar_color || profile.avatarColor || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("[Supabase] Profile sync notice:", error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn("[Supabase] Failed to sync profile to Supabase:", err);
    return null;
  }
}

