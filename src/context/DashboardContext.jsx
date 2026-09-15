import { createContext, useContext, useState, useEffect } from "react";
import { initialTransactions } from "../data/transactions";

const DashboardContext = createContext(null);

export function DashboardProvider({ children }) {
  const [dark, setDark] = useState(false);
  const [visible, setVisible] = useState(true);
  const [active, setActive] = useState("Home");
  const [role, setRole] = useState("Buyer");
  const [transactions, setTransactions] = useState(initialTransactions);

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
