import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { formatItemTitle } from "../utils/paymentRoomUtils";
import {
  getPaymentRoomsFromDB,
  savePaymentRoomToDB,
  savePrePaymentRoomToDB,
  subscribeToPaymentRooms,
  getTransactionsFromDB,
  addTransactionToDB,
  subscribeToTransactions,
} from "../services/supabaseService";

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const [dark, setDark] = useState(false);
  const [visible, setVisible] = useState(true);
  const [active, setActive] = useState("Home");
  const [role, setRole] = useState("Buyer");
  const [transactions, setTransactions] = useState([]);
  const [paymentRooms, setPaymentRooms] = useState([]);
  const [isLoadingDB, setIsLoadingDB] = useState(true);

  // Helper to ensure payment rooms are unique by id or order number
  const deduplicateRooms = (roomsList) => {
    if (!Array.isArray(roomsList)) return [];
    const seen = new Set();
    const result = [];
    for (const r of roomsList) {
      const key = r.id || r.orderNumber || r.order_number;
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(r);
      } else if (!key) {
        result.push(r);
      }
    }
    return result;
  };

  // Load live data from Supabase on mount
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setIsLoadingDB(true);
      const [rooms, txs] = await Promise.all([
        getPaymentRoomsFromDB(),
        getTransactionsFromDB(),
      ]);

      if (isMounted) {
        if (rooms && rooms.length > 0) {
          setPaymentRooms(deduplicateRooms(rooms));
        }
        if (txs && txs.length > 0) {
          setTransactions(txs);
        }
        setIsLoadingDB(false);
      }
    }

    loadInitialData();

    // Listen to Realtime updates from Supabase
    const unsubscribeRooms = subscribeToPaymentRooms(() => {
      getPaymentRoomsFromDB().then((rooms) => {
        if (isMounted && rooms) setPaymentRooms(deduplicateRooms(rooms));
      });
    });

    const unsubscribeTxs = subscribeToTransactions(() => {
      getTransactionsFromDB().then((txs) => {
        if (isMounted && txs) setTransactions(txs);
      });
    });

    return () => {
      isMounted = false;
      unsubscribeRooms?.();
      unsubscribeTxs?.();
    };
  }, []);

  const ongoingPaymentRoomsCount = useMemo(
    () => paymentRooms.filter((r) => r.category === "ongoing").length,
    [paymentRooms]
  );

  const addPaymentRoom = async (newRoom) => {
    if (!newRoom) return newRoom;
    const rawRole = String(newRoom.role || "").toLowerCase();
    const isSelling = rawRole.includes("sell");
    const creatorName = newRoom.creator || newRoom.creatorName;
    const counterpartyName = newRoom.counterparty || newRoom.counterpartyName;
    const formattedTitle = formatItemTitle(newRoom.title || newRoom.item || "Payment Room");

    const formattedRoom = {
      id: newRoom.id || ("ORD-" + Math.floor(100000 + Math.random() * 900000)),
      orderNumber: newRoom.orderNumber || newRoom.id || ("ORD-" + Math.floor(100000 + Math.random() * 900000)),
      title: formattedTitle,
      item: formattedTitle,
      price: newRoom.price || newRoom.amount || "₦0",
      amount: newRoom.amount || newRoom.price || "₦0",
      role: newRoom.role || "Buying",
      creator: creatorName || newRoom.creator,
      sellerName:
        newRoom.sellerName && newRoom.sellerName !== "Seller"
          ? newRoom.sellerName
          : (isSelling ? (creatorName || "Seller") : (counterpartyName || "Seller")),
      buyerName:
        newRoom.buyerName && newRoom.buyerName !== "Buyer"
          ? newRoom.buyerName
          : (!isSelling ? (creatorName || "Buyer") : (counterpartyName || "Buyer")),
      date: "Today · Just now",
      rawDate: "Today",
      status: newRoom.status || "awaiting_payment",
      statusText: newRoom.statusText || "Awaiting Payment",
      category: newRoom.category || "ongoing",
      counterparty: counterpartyName || newRoom.counterparty || (isSelling ? "Buyer" : "Seller"),
      ...newRoom,
    };

    // If room is still pending invite, do not add to active paymentRooms list or table!
    if (formattedRoom.status === "pending_invite" || formattedRoom.category === "pre_payment") {
      try {
        await savePrePaymentRoomToDB(formattedRoom);
      } catch (err) {
        console.warn("[DashboardContext] Failed to persist pre-payment room to DB:", err);
      }
      return formattedRoom;
    }

    // Update in-memory state with deduplication (update in-place if room already exists)
    setPaymentRooms((prev) => {
      const roomId = formattedRoom.id || formattedRoom.orderNumber;
      const existsIndex = prev.findIndex((r) =>
        (r.id && (r.id === roomId || r.id === formattedRoom.orderNumber)) ||
        (r.orderNumber && (r.orderNumber === roomId || r.orderNumber === formattedRoom.orderNumber)) ||
        (r.order_number && (r.order_number === roomId || r.order_number === formattedRoom.orderNumber))
      );
      if (existsIndex !== -1) {
        const existing = prev[existsIndex];
        const next = [...prev];
        next[existsIndex] = {
          ...existing,
          ...formattedRoom,
          title: (formattedRoom.title && formattedRoom.title !== "Payment Room") ? formattedRoom.title : (existing.title || formattedRoom.title),
          item: (formattedRoom.item && formattedRoom.item !== "Payment Room") ? formattedRoom.item : (existing.item || formattedRoom.item),
          price: (formattedRoom.price && formattedRoom.price !== "₦0" && formattedRoom.price !== "₦0.00") ? formattedRoom.price : (existing.price || formattedRoom.price),
          amount: (formattedRoom.amount && formattedRoom.amount !== "₦0" && formattedRoom.amount !== "₦0.00") ? formattedRoom.amount : (existing.amount || formattedRoom.amount),
          sellerName: (formattedRoom.sellerName && formattedRoom.sellerName !== "Seller") ? formattedRoom.sellerName : (existing.sellerName || formattedRoom.sellerName),
          buyerName: (formattedRoom.buyerName && formattedRoom.buyerName !== "Buyer") ? formattedRoom.buyerName : (existing.buyerName || formattedRoom.buyerName),
          counterparty: (formattedRoom.counterparty && formattedRoom.counterparty !== "Counterparty") ? formattedRoom.counterparty : (existing.counterparty || formattedRoom.counterparty),
        };
        return next;
      }
      return [formattedRoom, ...prev];
    });

    // Persist to Supabase in background
    try {
      await savePaymentRoomToDB(formattedRoom);
    } catch (err) {
      console.warn("[DashboardContext] Failed to persist room to DB:", err);
    }

    return formattedRoom;
  };

  const addTransaction = async (newTx) => {
    if (!newTx) return newTx;
    setTransactions((prev) => [newTx, ...prev]);
    try {
      await addTransactionToDB(newTx);
    } catch (err) {
      console.warn("[DashboardContext] Failed to persist transaction to DB:", err);
    }
    return newTx;
  };

  const toggleTheme = () => setDark((prev) => !prev);
  const toggleBalance = () => setVisible((prev) => !prev);
  const toggleRole = () => setRole((prev) => (prev === "Buyer" ? "Seller" : "Buyer"));

  // Keep html or container data-appearance synced
  useEffect(() => {
    document.documentElement.setAttribute("data-appearance", dark ? "dark" : "light");
  }, [dark]);

  const value = {
    dark,
    setDark,
    toggleTheme,
    visible,
    setVisible,
    toggleBalance,
    active,
    setActive,
    role,
    setRole,
    toggleRole,
    transactions,
    setTransactions,
    paymentRooms,
    setPaymentRooms,
    addPaymentRoom,
    addTransaction,
    ongoingPaymentRoomsCount,
    isLoadingDB,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return ctx;
}
