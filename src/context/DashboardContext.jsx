import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { initialTransactions } from "../data/transactions";
import { ALL_PAYMENT_ROOMS } from "../data/paymentRooms";

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const [dark, setDark] = useState(false);
  const [visible, setVisible] = useState(true);
  const [active, setActive] = useState("Home");
  const [role, setRole] = useState("Buyer");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [paymentRooms, setPaymentRooms] = useState(ALL_PAYMENT_ROOMS);

  const ongoingPaymentRoomsCount = useMemo(
    () => paymentRooms.filter((r) => r.category === "ongoing").length,
    [paymentRooms]
  );

  const addPaymentRoom = (newRoom) => {
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
      counterparty: newRoom.counterparty || "08032001585",
      ...newRoom,
    };
    setPaymentRooms((prev) => [formattedRoom, ...prev]);
    return formattedRoom;
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
    ongoingPaymentRoomsCount,
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
