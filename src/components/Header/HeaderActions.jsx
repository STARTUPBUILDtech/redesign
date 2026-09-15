import { useDashboard } from "../../context/DashboardContext";

export default function HeaderActions() {
  const { dark, toggleTheme, toggleRole } = useDashboard();

  return (
    <div className="header-actions">
      <button
        type="button"
        onClick={toggleRole}
        className="switch-role-btn"
        title="Switch between Buyer and Seller views"
      >
        Switch role
      </button>

      {/* Profile Avatar */}
      <div
        className="header-avatar-circle"
        aria-label="Open profile"
        title="Profile"
      >
        <span className="material-symbols-outlined avatar-icon">account_circle</span>
      </div>

      {/* Theme Toggle Button */}
      <button
        type="button"
        onClick={toggleTheme}
        className="header-theme-btn"
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <span
          className={`material-symbols-outlined theme-icon ${dark ? "dark-icon" : "light-icon"}`}
        >
          {dark ? "dark_mode" : "light_mode"}
        </span>
      </button>
    </div>
  );
}
