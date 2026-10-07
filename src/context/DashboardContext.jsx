import { createContext, useContext, useState, useEffect, useMemo } from "react";
import {
  getPaymentRoomsFromDB,
  savePaymentRoomToDB,
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
          setPaymentRooms(rooms);
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
        if (isMounted && rooms) setPaymentRooms(rooms);
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
    const formattedRoom = {
      id: newRoom.id || ("ORD-" + Math.floor(100000 + Math.random() * 900000)),
      orderNumber: newRoom.orderNumber || newRoom.id || ("ORD-" + Math.floor(100000 + Math.random() * 900000)),
      title: newRoom.title || newRoom.item || "Payment Room",
      item: newRoom.item || newRoom.title || "Payment Room",
      price: newRoom.price || newRoom.amount || "₦0",
      amount: newRoom.amount || newRoom.price || "₦0",
      role: newRoom.role || "Buying",
      sellerName:
        newRoom.sellerName ||
        (newRoom.role === "Selling" ? "Amaka Obi" : (newRoom.counterparty || "Seller")),
      buyerName:
        newRoom.buyerName ||
        (newRoom.role === "Buying" ? "Amaka Obi" : (newRoom.counterparty || "Buyer")),
      date: "Today · Just now",
      rawDate: "Today",
      status: newRoom.status || "awaiting_payment",
      statusText: newRoom.statusText || "Awaiting Payment",
      category: newRoom.category || "ongoing",
      counterparty: newRoom.counterparty || "8032001585",
      ...newRoom,
    };

    // Update in-memory state immediately for instant feedback
    setPaymentRooms((prev) => [formattedRoom, ...prev]);

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
