import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { DashboardProvider } from "./context/DashboardContext.jsx";
import "../default.css";
import "../Screen-1.screen.css";
import "../responsive.css";
import "../mobile.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <DashboardProvider>
        <App />
      </DashboardProvider>
    </ErrorBoundary>
  </StrictMode>
);

