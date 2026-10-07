import { supabase, isSupabaseConfigured } from "../supabase/client";

/* ══════════════════════════════════════════════════════════════
   PAYMENT ROOMS SERVICE
   ══════════════════════════════════════════════════════════════ */

export async function getPaymentRoomsFromDB() {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("payment_rooms")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[Supabase] Error fetching payment rooms:", error.message);
      return [];
    }
    return (data || []).map(formatRoomFromDB);
  } catch (err) {
    console.warn("[Supabase] Failed to fetch payment rooms:", err);
    return [];
  }
}

export async function savePaymentRoomToDB(room) {
  if (!isSupabaseConfigured) return room;
  try {
    const dbPayload = {
      id: room.id || ("ORD-" + Math.floor(100000 + Math.random() * 900000)),
      order_number: room.orderNumber || room.id,
      title: room.title || room.item || "Payment Room",
      item: room.item || room.title || "Payment Room",
      amount: room.amount || room.price || "₦0",
      price: room.price || room.amount || "₦0",
      price_numeric: room.priceNumeric || 0,
      role: room.role || "Buying",
      seller_name: room.sellerName || "Seller",
      buyer_name: room.buyerName || "Buyer",
      counterparty: room.counterparty || "",
      status: room.status || "awaiting_payment",
      status_text: room.statusText || "Awaiting Payment",
      category: room.category || "ongoing",
      bank: room.bank || "Guaranteed Trust Bank (GTBank)",
      account_name: room.accountName || "",
      account_number: room.accountNumber || "",
      variant: room.variant || "",
      has_agreed_terms: Boolean(room.hasAgreedTerms),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("payment_rooms")
      .upsert(dbPayload)
      .select()
      .single();

    if (error) {
      console.warn("[Supabase] Error saving payment room:", error.message);
      return room;
    }
    return formatRoomFromDB(data);
  } catch (err) {
    console.warn("[Supabase] Failed to save payment room:", err);
    return room;
  }
}

export async function updatePaymentRoomStatusInDB(roomId, status, statusText) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase
      .from("payment_rooms")
      .update({
        status,
        status_text: statusText,
        updated_at: new Date().toISOString(),
      })
      .eq("id", roomId);
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
  return {
    id: r.id,
    orderNumber: r.order_number || r.id,
    title: r.title,
    item: r.item || r.title,
    amount: r.amount,
    price: r.price || r.amount,
    priceNumeric: Number(r.price_numeric) || 0,
    role: r.role || "Buying",
    sellerName: r.seller_name,
    buyerName: r.buyer_name,
    counterparty: r.counterparty || (r.role === "Buying" ? r.seller_name : r.buyer_name),
    status: r.status,
    statusText: r.status_text,
    category: r.category || (r.status === "completed" ? "completed" : "ongoing"),
    bank: r.bank,
    accountName: r.account_name,
    accountNumber: r.account_number,
    variant: r.variant,
    hasAgreedTerms: r.has_agreed_terms,
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
    const payload = {
      full_name: profile.name || profile.full_name || "PayKudi User",
      phone: profile.phone || null,
      email: profile.email || null,
      username: profile.username ? profile.username.replace(/^@/, "") : null,
      updated_at: new Date().toISOString(),
    };

    // Only attach id if it is a valid UUID format
    const isUUID =
      typeof profile.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile.id);
    if (isUUID) {
      payload.id = profile.id;
    }

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "phone" })
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

