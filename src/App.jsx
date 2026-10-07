import { useState, useRef, useEffect, useMemo } from "react";
import paykudiLogo from "./assets/paykudi-logo.png";
import logoDarkMode from "./assets/logodarkmode.png";
import LoginPage from "./components/Auth/LoginPage.jsx";
import DesktopActivity from "./components/DesktopActivity.jsx";
import DesktopNewPayment from "./components/DesktopNewPayment.jsx";
import DesktopPaymentInvitationModal from "./components/DesktopPaymentInvitationModal.jsx";
import DesktopPaymentRoom from "./components/DesktopPaymentRoom.jsx";
import MobileActivity from "./components/Mobile/MobileActivity.jsx";
import MobileNewPayment from "./components/Mobile/MobileNewPayment.jsx";
import MobilePaymentInvitation from "./components/Mobile/MobilePaymentInvitation.jsx";
import MobilePaymentRoom from "./components/Mobile/MobilePaymentRoom.jsx";
import MobileAwaitingPayment from "./components/Mobile/MobileAwaitingPayment.jsx";
import MobilePaymentReceived from "./components/Mobile/MobilePaymentReceived.jsx";
import MobileInTransit from "./components/Mobile/MobileInTransit.jsx";
import MobileConfirmDelivery from "./components/Mobile/MobileConfirmDelivery.jsx";
import MobileDisputeOngoing from "./components/Mobile/MobileDisputeOngoing.jsx";
import MobileCompleted from "./components/Mobile/MobileCompleted.jsx";
import MobileHelp from "./components/Mobile/MobileHelp.jsx";
import DesktopHelp from "./components/DesktopHelp.jsx";
import DesktopProfile from "./components/DesktopProfile.jsx";
import DesktopWithdrawModal from "./components/DesktopWithdrawModal.jsx";
import MobileWithdraw from "./components/Mobile/MobileWithdraw.jsx";
import AgreeTermsModal from "./components/Shared/AgreeTermsModal.jsx";
import BankLogo from "./components/BankLogo.jsx";
import ReceiptModal from "./components/Shared/ReceiptModal.jsx";
import EmptyActivityGraphic from "./components/Shared/EmptyActivityGraphic.jsx";
import { ALL_PAYMENT_ROOMS } from "./data/paymentRooms.js";
import { useDashboard } from "./context/DashboardContext.jsx";
import {
  getStoredPocketBalanceKobo,
  saveStoredPocketBalanceKobo,
  koboToNaira,
  nairaToKobo,
  formatPocketBalanceNaira,
} from "./utils/balanceUtils.js";

function BrandLogo({ dark, className, onClick }) {
  return (
    <a
      className={className}
      href="#"
      onClick={(e) => {
        e.preventDefault();
        if (onClick) onClick();
        if (window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }}
      aria-label="PayKudi home"
    >
      <img
        src={dark ? logoDarkMode : paykudiLogo}
        alt="PayKudi"
        className={`brand-logo-img ${dark ? "logo-dark" : "logo-light"}`}
        style={{ height: "22px", maxHeight: "22px", width: "auto" }}
      />
    </a>
  );
}

// Dynamic greeting based on time of day
function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "Good morning";
  } else if (hour >= 12 && hour < 17) {
    return "Good afternoon";
  } else {
    return "Good evening";
  }
}

// Helper to verify if a string is a phone number
function isPhoneNumber(str) {
  if (!str || typeof str !== "string") return false;
  const trimmed = str.trim();
  return trimmed.startsWith("+") || /^\d[\d\s-]{6,}$/.test(trimmed);
}

// Helper to extract clean full name, first name, and avatar initial
function extractUserNames(rawName, fallback = "Howard Ukah-Columba") {
  let name = typeof rawName === "string" ? rawName.trim() : "";
  if (!name || isPhoneNumber(name) || name === "Amaka") {
    try {
      const stored = JSON.parse(localStorage.getItem("paykudi_user_profile") || "{}");
      if (stored?.name && !isPhoneNumber(stored.name) && stored.name.trim() !== "Amaka") {
        name = stored.name.trim();
      }
    } catch {}
  }
  if (!name || isPhoneNumber(name) || name === "Amaka") {
    name = fallback;
  }
  const parts = name.split(/\s+/).filter(Boolean);
  let firstName = parts[0] || "Howard";
  if (isPhoneNumber(firstName)) {
    firstName = "Howard";
  }
  firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  const capitalizedFullName = parts
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const letterMatch = firstName.match(/[a-zA-Z]/) || name.match(/[a-zA-Z]/);
  const initial = (letterMatch ? letterMatch[0] : "H").toUpperCase();
  return { fullName: capitalizedFullName || name, firstName, initial };
}

// Header Actions with Theme Toggle and Avatar Dropdown Menu (matching target redesign)
function HeaderActions({
  dark,
  onThemeToggle,
  onOpenProfile,
  onSignOut,
  isProfileActive,
  hideAvatar,
  user,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const shouldHideAvatar = hideAvatar;

  const { fullName: userName, firstName: userFirstName, initial: userInitial } = extractUserNames(
    user?.fullName || user?.firstName || user?.name
  );
  const displayInitial = String(user?.initial || userInitial || "H").toUpperCase();

  // Close dropdown on outside click or touch
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  const [copiedId, setCopiedId] = useState(false);
  const userId = formatAccountId(user?.phone || "8032001585");

  const handleCopyId = (e) => {
    e.stopPropagation();
    try {
      navigator.clipboard?.writeText(userId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="header-actions">
      {/* Theme Toggle Button */}
      <button
        type="button"
        onClick={onThemeToggle}
        className="header-theme-btn"
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {dark ? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="theme-moon-svg"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="theme-sun-svg"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        )}
      </button>

      {/* Avatar Dropdown Trigger & Floating Menu */}
      {!shouldHideAvatar && (
        <div className="header-profile-container" ref={dropdownRef}>
          <button
            type="button"
            className={`header-profile-trigger ${isDropdownOpen ? "active" : ""}`}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            title={userName}
          >
            <div className="header-avatar-circle-h">{displayInitial}</div>
            <svg
              width="13"
              height="8"
              viewBox="4.5 7.5 15 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`header-chevron-icon ${isDropdownOpen ? "open" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="header-profile-dropdown" role="menu">
              {/* User Identity Header */}
              <div className="header-dropdown-user">
                <div className="header-dropdown-avatar">{displayInitial}</div>
                <div className="header-dropdown-user-info">
                  <div className="header-dropdown-user-name">{userName}</div>
                  <div className="header-dropdown-user-id">
                    <span>{userId}</span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="header-dropdown-copy-btn"
                      title={copiedId ? "Copied!" : "Copy ID"}
                      aria-label="Copy ID"
                    >
                      <span className="material-symbols-outlined header-dropdown-copy-icon">
                        {copiedId ? "check" : "content_copy"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="header-dropdown-divider" />

              {/* Action Rows */}
              <div className="header-dropdown-menu">
                {/* Account Item */}
                <button
                  type="button"
                  className="header-dropdown-item"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onOpenProfile) onOpenProfile();
                  }}
                  role="menuitem"
                >
                  <div className="header-dropdown-item-left">
                    <span className="dropdown-item-icon">
                      <span className="nav-profile-wrap" style={{ display: "inline-flex", alignItems: "center" }}>
                        <span className="material-symbols-outlined nav-symbol" style={{ fontSize: 20 }}>
                          person
                        </span>
                        <i className="fa-brands fa-whatsapp nav-whatsapp-icon"></i>
                      </span>
                    </span>
                    <span className="dropdown-item-label">Account</span>
                  </div>
                </button>

                {/* Theme Item */}
                <button
                  type="button"
                  className="header-dropdown-item"
                  onClick={onThemeToggle}
                  role="menuitem"
                >
                  <div className="header-dropdown-item-left">
                    <span className="dropdown-item-icon">
                      {dark ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="5" />
                          <line x1="12" y1="1" x2="12" y2="3" />
                          <line x1="12" y1="21" x2="12" y2="23" />
                          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                          <line x1="1" y1="12" x2="3" y2="12" />
                          <line x1="21" y1="12" x2="23" y2="12" />
                          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                        </svg>
                      )}
                    </span>
                    <span className="dropdown-item-label">Theme</span>
                  </div>
                  <div className="header-dropdown-item-right">
                    <span className="dropdown-theme-val">{dark ? "Dark" : "Light"}</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>

                {/* Log out Item */}
                <button
                  type="button"
                  className="header-dropdown-item"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onSignOut) onSignOut();
                  }}
                  role="menuitem"
                >
                  <div className="header-dropdown-item-left">
                    <span className="dropdown-item-icon">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                    </span>
                    <span className="dropdown-item-label">Log out</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Navbar Icons matching C:\Users\abc\OneDrive\Videos\dashboard.html
const HomeIcon = ({ active }) => (
  <span
    className="material-symbols-outlined nav-symbol"
    style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
  >
    dashboard
  </span>
);
const ActivityIcon = ({ active }) => (
  <span
    className="material-symbols-outlined nav-symbol"
    style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
  >
    analytics
  </span>
);
const PaymentRoomIcon = ({ active, count = 5 }) => (
  <span className="nav-pr-wrap">
    <span
      className="material-symbols-outlined nav-symbol"
      style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
    >
      payments
    </span>
    {count !== undefined && count !== null && Number(count) > 0 && (
      <span id="m-pr-nav-badge" className="nav-pr-badge">{count}</span>
    )}
  </span>
);
const HelpIcon = ({ active }) => (
  <span
    className="material-symbols-outlined nav-symbol"
    style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
  >
    contact_support
  </span>
);
const ProfileIcon = ({ active }) => (
  <span className="nav-profile-wrap">
    <span
      className="material-symbols-outlined nav-symbol"
      style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
    >
      person
    </span>
    <i className="fa-brands fa-whatsapp nav-whatsapp-icon"></i>
  </span>
);

function getActivityConfig(item) {
  const t = (item.type || item.typeKey || item.title || "").toLowerCase();

  if (t.includes("refund")) {
    return {
      typeKey: "refund",
      defaultBank: "kuda",
      amountClass: "act-val-refund",
      badgeClass: "refund",
      badgeIcon: (
        <svg width="8.5" height="8.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14L4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
        </svg>
      ),
    };
  }
  if (t.includes("payout") || t.includes("withdrawn") || t.includes("withdraw")) {
    return {
      typeKey: "payout",
      defaultBank: "firstbank",
      amountClass: "act-val-payout",
      badgeClass: "payout",
      badgeIcon: (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "translate(-0.5px, 0.5px)" }}>
          <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
        </svg>
      ),
    };
  }
  if (t.includes("received")) {
    return {
      typeKey: "received",
      defaultBank: "access",
      amountClass: "act-val-received",
      badgeClass: "received",
      badgeIcon: (
        <svg width="8.5" height="8.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v16m0 0l-6-6m6 6l6-6" />
        </svg>
      ),
    };
  }
  return {
    typeKey: "sent",
    defaultBank: "zenith",
    amountClass: "act-val-sent",
    badgeClass: "sent",
    badgeIcon: (
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "translate(-0.5px, 0.5px)" }}>
        <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
      </svg>
    ),
  };
}

function ActivityRow({ item, isLast, onSelect }) {
  const cfg = getActivityConfig(item);
  const bank = item.bankCode || item.bank || cfg.defaultBank;
  return (
    <div
      className="activity-item-row"
      role="button"
      tabIndex={0}
      style={{ cursor: "pointer" }}
      onClick={() => onSelect && onSelect(item)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect && onSelect(item)}
    >
      <div className="activity-item-icon">
        <BankLogo bankCode={bank} size={40} className="activity-bank-badge" />
        <span className={`activity-direction-badge ${cfg.badgeClass}`}>
          {cfg.badgeIcon}
        </span>
      </div>
      <div className={`activity-item-inner ${isLast ? "no-border" : ""}`}>
        <div className="activity-item-info">
          <h4 className="activity-item-title">{item.title}</h4>
          <p className="activity-item-time">{item.time}</p>
        </div>
        <div className="activity-item-amount">
          <p className={`activity-item-value ${cfg.amountClass}`}>{item.amount}</p>
        </div>
      </div>
    </div>
  );
}

// Live ticking time-ago counter (counts by seconds until minutes, then updates every minute)
function useLiveTimeAgo(lastUpdated) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const calcDiff = () => Math.max(0, Math.floor((Date.now() - (lastUpdated || Date.now())) / 1000));
    setSeconds(calcDiff());

    const timer = setInterval(() => {
      setSeconds(calcDiff());
    }, 1000);

    return () => clearInterval(timer);
  }, [lastUpdated]);

  if (seconds < 2) return "Last updated just now";
  if (seconds < 60) return `Last updated ${seconds} sec. ago`;
  const mins = Math.floor(seconds / 60);
  if (mins === 1) return "Last updated 1 min. ago";
  if (mins < 60) return `Last updated ${mins} mins. ago`;
  const hours = Math.floor(mins / 60);
  return `Last updated ${hours} ${hours === 1 ? "hr" : "hrs"} ago`;
}

// Helper to format Nigerian phone numbers as clean PayKudi account IDs without leading 0
export const formatAccountId = (val) => {
  if (!val) return "8032001585";
  let digits = String(val).replace(/\D/g, "");
  if (!digits) return "8032001585";
  if (digits.startsWith("234")) {
    digits = digits.slice(3);
  }
  // Strip any leading zeros so '08032001585' becomes '8032001585'
  digits = digits.replace(/^0+/, "");
  return digits || "8032001585";
};

// Cardless & Centered Balance matching user screenshot
function PayKudiBalance({
  visible,
  onToggleVisibility,
  balance = "₦0.00",
  accountNumber = "8032001585",
  lastUpdated,
}) {
  const [copied, setCopied] = useState(false);
  const [localTimestamp, setLocalTimestamp] = useState(() => lastUpdated || Date.now());

  // Reset timer whenever parent updates balance or lastUpdated timestamp
  useEffect(() => {
    setLocalTimestamp(lastUpdated || Date.now());
  }, [lastUpdated, balance]);

  const timeAgo = useLiveTimeAgo(localTimestamp);
  const cleanAccount = formatAccountId(accountNumber);

  const handleCopy = () => {
    try {
      navigator.clipboard?.writeText(cleanAccount);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const rawString = String(balance || "₦0.00");
  const hasNaira = rawString.includes("₦");
  const currencySymbol = hasNaira ? "₦" : "";
  const numericPart = rawString.replace(/^₦/, "").trim();

  return (
    <div className="cardless-balance">
      {/* Top Meta: Bank icon · Nigerian Naira · Account Number · Copy Icon */}
      <div className="balance-account-bar">
        <span className="material-symbols-outlined balance-bank-icon">account_balance</span>
        <span className="balance-account-text">Nigerian Naira · {cleanAccount}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="balance-copy-btn"
          title={copied ? "Copied!" : "Copy account number"}
          aria-label="Copy account number"
        >
          <span className="material-symbols-outlined balance-copy-icon">
            {copied ? "check" : "content_copy"}
          </span>
        </button>
      </div>

      {/* Main Balance Row: Centered Amount + Action Toggle Button */}
      <div className="balance-main-row">
        <div className="balance-amount-wrapper">
          <h2 className="balance-amount-text">
            {!visible ? (
              "••••••••"
            ) : (
              <>
                {currencySymbol && <span className="balance-currency-symbol">{currencySymbol}</span>}
                <span>{numericPart}</span>
              </>
            )}
          </h2>
          <button
            type="button"
            onClick={onToggleVisibility}
            className="balance-eye-btn"
            aria-label={visible ? "Hide balance" : "Show balance"}
            title={visible ? "Hide balance" : "Show balance"}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
              {visible ? "visibility" : "visibility_off"}
            </span>
          </button>
        </div>
      </div>

      {/* Live dynamic timestamp (refresh button removed) */}
      <div className="balance-timestamp-row">
        <p className="balance-timestamp">{timeAgo}</p>
      </div>
    </div>
  );
}

function MobileDashboard({
  dark,
  onThemeToggle,
  active,
  setActive,
  visible,
  setVisible,
  role,
  setRole,
  activeRoom,
  setActiveRoom,
  paymentRooms,
  onAddPaymentRoom,
  ongoingPaymentRoomsCount,
  onSignOut = () => {},
  prActiveTab,
  setPrActiveTab,
  prSearchQuery,
  setPrSearchQuery,
  prSelectedRole,
  setSelectedRole: setPrSelectedRole,
  prSelectedState,
  setSelectedState: setPrSelectedState,
  prIsSearchExpanded,
  setIsSearchExpanded: setPrIsSearchExpanded,
  transactions: propTransactions,
  totalBalance: propTotalBalance,
  currentUser,
  pocketBalanceKobo,
  onWithdrawSuccess,
}) {
  let dash = null;
  try {
    dash = useDashboard();
  } catch (e) {
    dash = null;
  }

  const transactions = propTransactions ?? dash?.transactions ?? [];
  const totalBalance = propTotalBalance ?? "₦0.00";
  const userAccountNumber = formatAccountId(currentUser?.phone || "8032001585");

  const contentScrollRef = useRef(null);
  const [selectedActivityReceipt, setSelectedActivityReceipt] = useState(null);

  const handleNavClick = (view) => {
    setActive(view);
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const isNoNav =
    active === "Withdraw" ||
    active === "Payout" ||
    active === "New Payment" ||
    active === "Payment Invitation" ||
    active === "Awaiting Payment" ||
    active === "Payment Received" ||
    active === "In Transit" ||
    active === "Confirm Delivery" ||
    active === "Confirm delivery" ||
    active === "Dispute Ongoing" ||
    active === "Dispute ongoing" ||
    active === "Completed" ||
    active === "Payment Completed";

  return (
    <div className={`mobile-dashboard${isNoNav ? " no-nav-mode" : ""}`} data-appearance={dark ? "dark" : "light"}>
      <header className="mobile-header">
        <BrandLogo
          dark={dark}
          className="mobile-brand"
          onClick={() => handleNavClick("Home")}
        />
        <HeaderActions
          dark={dark}
          onThemeToggle={onThemeToggle}
          role={role}
          onSwitchRole={() => setRole(role === "Buyer" ? "Seller" : "Buyer")}
          onOpenProfile={() => handleNavClick("Profile")}
          onSignOut={onSignOut}
          isProfileActive={active === "Profile"}
          user={currentUser}
        />
      </header>

      {active === "Withdraw" || active === "Payout" ? (
        <MobileWithdraw
          availableBalance={koboToNaira(pocketBalanceKobo)}
          onCancel={() => handleNavClick("Home")}
          onSuccess={(res) => {
            if (onWithdrawSuccess) onWithdrawSuccess(res);
          }}
        />
      ) : active === "New Payment" ? (
        <MobileNewPayment
          onCancel={() => handleNavClick("Home")}
          onSuccess={(newRoom) => {
            if (newRoom) {
              const added = onAddPaymentRoom ? onAddPaymentRoom(newRoom) : newRoom;
              setActiveRoom(added);
            }
            setActive("Payment Invitation");
          }}
        />
      ) : active === "Payment Invitation" ? (
        <MobilePaymentInvitation
          room={activeRoom || {}}
          onCancel={() => handleNavClick("Home")}
          onProceed={() => handleNavClick("Awaiting Payment")}
          onShare={() => {}}
        />
      ) : active === "Awaiting Payment" ? (
        <MobileAwaitingPayment
          room={activeRoom || {}}
          onBack={() => handleNavClick("Payment room")}
          onPaymentConfirmed={() => {}}
        />
      ) : active === "Payment Received" ? (
        <MobilePaymentReceived
          room={activeRoom || {}}
          onBack={() => handleNavClick("Payment room")}
        />
      ) : active === "In Transit" ? (
        <MobileInTransit
          room={activeRoom || {}}
          onBack={() => handleNavClick("Payment room")}
          role={role}
        />
      ) : active === "Confirm Delivery" || active === "Confirm delivery" ? (
        <MobileConfirmDelivery
          room={activeRoom || {}}
          onBack={() => handleNavClick("Payment room")}
          role={role}
          onNavigateToDispute={(disputeData) => {
            if (disputeData) {
              setActiveRoom((prev) => ({
                ...prev,
                status: "dispute_ongoing",
                statusText: "Dispute Ongoing",
                disputeReason: disputeData.reason,
                disputeMessage: disputeData.description,
                disputePhotos: disputeData.images,
              }));
            }
            setActive("Dispute Ongoing");
          }}
        />
      ) : active === "Dispute Ongoing" || active === "Dispute ongoing" ? (
        <MobileDisputeOngoing
          room={activeRoom || {}}
          onBack={() => handleNavClick("Payment room")}
          role={role}
        />
      ) : active === "Completed" || active === "Payment Completed" ? (
        <MobileCompleted
          room={activeRoom || {}}
          onBack={() => handleNavClick("Payment room")}
          role={role}
        />
      ) : (
        <div className="mobile-content-scroll" ref={contentScrollRef}>
          {active === "Activity" ? (
            <MobileActivity onWithdraw={() => handleNavClick("Withdraw")} />
          ) : active === "Payment room" || active === "Payment Room" ? (
            <MobilePaymentRoom
              rooms={paymentRooms}
              activeTab={prActiveTab}
              setActiveTab={setPrActiveTab}
              searchTerm={prSearchQuery}
              setSearchTerm={setPrSearchQuery}
              selectedRole={prSelectedRole}
              setSelectedRole={setPrSelectedRole}
              selectedState={prSelectedState}
              setSelectedState={setPrSelectedState}
              isSearchExpanded={prIsSearchExpanded}
              setIsSearchExpanded={setPrIsSearchExpanded}
              onNewPayment={() => setActive("New Payment")}
              onSelectRoom={(r) => {
                if (r) setActiveRoom(r);
                if (r && (r.status === "awaiting_payment" || r.statusText === "Awaiting Payment")) {
                  setActive("Awaiting Payment");
                } else if (r && (r.status === "payment_received" || r.statusText === "Payment Received")) {
                  setActive("Payment Received");
                } else if (r && (r.status === "in_transit" || r.statusText === "In Transit")) {
                  setActive("In Transit");
                } else if (r && (r.status === "delivered" || r.statusText === "Confirm delivery" || r.statusText === "Confirm Delivery")) {
                  setActive("Confirm Delivery");
                } else if (r && (r.status === "dispute_ongoing" || r.statusText === "Dispute Ongoing" || r.statusText === "Dispute ongoing")) {
                  setActive("Dispute Ongoing");
                } else if (r && (r.status === "completed" || r.statusText === "Completed")) {
                  setActive("Completed");
                } else {
                  setActive("Payment Invitation");
                }
              }}
            />
          ) : active === "Help" || active === "Help & support" ? (
            <MobileHelp onOpenChat={() => {}} />
          ) : active === "Profile" ? (
            <DesktopProfile userName={currentUser?.fullName || "Howard Ukah-Columba"} dark={dark} onSignOut={onSignOut} />
          ) : (
            <div className="mobile-home-content">
              <div className="mobile-main mobile-main-top">
                <section className="mobile-intro">
                  <h1>{getTimeGreeting()}, {currentUser?.firstName || "Howard"}</h1>
                  <p>What will you like to do?</p>
                </section>
                <section className="mobile-cta">
                  <button
                    type="button"
                    className="mobile-primary"
                    onClick={() => handleNavClick("New Payment")}
                  >
                    <b className="btn-plus">＋</b> New Payment
                  </button>
                  <button
                    type="button"
                    className="mobile-secondary"
                    onClick={() => handleNavClick("Withdraw")}
                  >
                    Withdraw
                  </button>
                </section>
              </div>

              {/* Balance Tile with no padding, spanning left to right, no corner radius */}
              <div className="balance-tile">
                <PayKudiBalance
                  visible={visible}
                  onToggleVisibility={() => setVisible(!visible)}
                  balance={totalBalance}
                  accountNumber={userAccountNumber}
                />
              </div>

              <main className="mobile-main mobile-main-bottom">
                <section className={`mobile-activity ${transactions.length === 0 ? "has-empty-state" : ""}`} id="activity">
                  <div className="mobile-activity-head">
                    <h2>Recent activity</h2>
                    <a
                      href="#activity"
                      className={transactions.length === 0 ? "is-disabled" : ""}
                      tabIndex={transactions.length === 0 ? -1 : undefined}
                      aria-disabled={transactions.length === 0}
                      onClick={(e) => {
                        e.preventDefault();
                        if (transactions.length === 0) return;
                        handleNavClick("Activity");
                      }}
                    >
                      View all
                    </a>
                  </div>
                  <div className={`boxless-activity-list ${transactions.length === 0 ? "is-empty-list" : ""}`}>
                    {transactions.length === 0 ? (
                      <div className="activity-empty-state home-recent-empty-state">
                        <div className="activity-empty-graphic-wrap">
                          <EmptyActivityGraphic />
                        </div>
                        <h3 className="activity-empty-title">No Transactions</h3>
                        <p className="activity-empty-subtitle">You haven’t completed any transactions.</p>
                      </div>
                    ) : (
                      transactions.map((tx, idx) => (
                        <ActivityRow
                          key={tx.id || tx.title}
                          item={tx}
                          isLast={idx === transactions.length - 1}
                          onSelect={setSelectedActivityReceipt}
                        />
                      ))
                    )}
                  </div>
                </section>
              </main>
            </div>
          )}
        </div>
      )}

      {/* Mobile Expanding Pill Bottom Nav (matching dashboard.html #m-bottom-nav) */}
      {!isNoNav && (
        <>
          <div className="mobile-bottom-blur-curtain" aria-hidden="true" />
          <nav id="m-bottom-nav" className="mobile-nav" aria-label="Primary navigation">
            <button
              type="button"
              id="m-nav-home"
              className={`nav-bottom-link ${active === "Home" ? "active" : ""}`}
              onClick={() => handleNavClick("Home")}
            >
              <HomeIcon active={active === "Home"} />
              <span className="nav-link-label">Home</span>
            </button>
            <button
              type="button"
              id="m-nav-activity"
              className={`nav-bottom-link ${active === "Activity" ? "active" : ""}`}
              onClick={() => handleNavClick("Activity")}
            >
              <ActivityIcon active={active === "Activity"} />
              <span className="nav-link-label">Activity</span>
            </button>
            <button
              type="button"
              id="m-nav-notifications"
              className={`nav-bottom-link ${active === "Payment room" || active === "Payment Room" ? "active" : ""}`}
              onClick={() => handleNavClick("Payment room")}
            >
              <PaymentRoomIcon
                active={active === "Payment room" || active === "Payment Room"}
                count={ongoingPaymentRoomsCount}
              />
              <span className="nav-link-label">Payment Room</span>
            </button>
            <button
              type="button"
              id="m-nav-help"
              className={`nav-bottom-link ${active === "Help" ? "active" : ""}`}
              onClick={() => handleNavClick("Help")}
            >
              <HelpIcon active={active === "Help"} />
              <span className="nav-link-label">Help</span>
            </button>
            <button
              type="button"
              id="m-nav-profile"
              className={`nav-bottom-link ${active === "Profile" ? "active" : ""}`}
              onClick={() => handleNavClick("Profile")}
            >
              <ProfileIcon active={active === "Profile"} />
              <span className="nav-link-label">Profile</span>
            </button>
          </nav>
        </>
      )}

      <ReceiptModal
        isOpen={!!selectedActivityReceipt}
        onClose={() => setSelectedActivityReceipt(null)}
        item={selectedActivityReceipt}
      />
    </div>
  );
}

export default function App() {
  let dash = null;
  try {
    dash = useDashboard();
  } catch (e) {
    dash = null;
  }

  const [dark, setDark] = useState(false);
  const [selectedDesktopActivityReceipt, setSelectedDesktopActivityReceipt] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [visible, setVisible] = useState(true);
  const [active, setActive] = useState("Home");
  const [role, setRole] = useState("Buyer");
  const [activeRoom, setActiveRoom] = useState(null);

  // Automatically remove #home or any hash from the browser address bar
  useEffect(() => {
    const clearHash = () => {
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    };
    clearHash();
    window.addEventListener("hashchange", clearHash);
    return () => window.removeEventListener("hashchange", clearHash);
  }, []);

  // User details with first name extraction and phone number
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem("paykudi_user_profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        const { fullName, firstName, initial } = extractUserNames(parsed.name);
        const phone = parsed.phone ? formatAccountId(parsed.phone) : "8032001585";
        // Clean up stored phone number as name if previously corrupted
        if (isPhoneNumber(parsed.name)) {
          delete parsed.name;
          localStorage.setItem("paykudi_user_profile", JSON.stringify(parsed));
        }
        return {
          fullName,
          firstName,
          initial,
          phone,
        };
      }
    } catch {}
    return {
      fullName: "Howard Ukah-Columba",
      firstName: "Howard",
      initial: "H",
      phone: "8032001585",
    };
  });

  // Sync profile if updated elsewhere in the app
  useEffect(() => {
    const syncProfile = () => {
      try {
        const stored = localStorage.getItem("paykudi_user_profile");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.name || parsed.phone) {
            const { fullName, firstName, initial } = extractUserNames(parsed.name);
            const phone = parsed.phone ? formatAccountId(parsed.phone) : "8032001585";
            setCurrentUser({
              fullName,
              firstName,
              initial,
              phone,
            });
          }
        }
      } catch {}
    };

    window.addEventListener("storage", syncProfile);
    window.addEventListener("paykudi_profile_updated", syncProfile);
    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener("paykudi_profile_updated", syncProfile);
    };
  }, []);

  const userAccountNumber = formatAccountId(currentUser?.phone || "8032001585");

  const paymentRooms = dash?.paymentRooms || ALL_PAYMENT_ROOMS;
  const transactions = dash?.transactions || [];
  const ongoingPaymentRoomsCount = dash?.ongoingPaymentRoomsCount ?? paymentRooms.filter((r) => r.category === "ongoing").length;

  const [pocketBalanceKobo, setPocketBalanceKobo] = useState(getStoredPocketBalanceKobo);

  useEffect(() => {
    const handleBalanceSync = () => {
      setPocketBalanceKobo(getStoredPocketBalanceKobo());
    };
    window.addEventListener("paykudi_profile_updated", handleBalanceSync);
    window.addEventListener("paykudi_balance_updated", handleBalanceSync);
    window.addEventListener("storage", handleBalanceSync);
    return () => {
      window.removeEventListener("paykudi_profile_updated", handleBalanceSync);
      window.removeEventListener("paykudi_balance_updated", handleBalanceSync);
      window.removeEventListener("storage", handleBalanceSync);
    };
  }, []);

  const totalBalance = useMemo(() => {
    return formatPocketBalanceNaira(pocketBalanceKobo, true);
  }, [pocketBalanceKobo]);

  // Shared Payment Room Filters (synchronized across desktop & mobile screen resizes)
  const [prActiveTab, setPrActiveTab] = useState("ongoing");
  const [prSearchQuery, setPrSearchQuery] = useState("");
  const [prSelectedRole, setPrSelectedRole] = useState("all");
  const [prSelectedState, setPrSelectedState] = useState("all");
  const [prIsSearchExpanded, setPrIsSearchExpanded] = useState(false);

  const handleAddPaymentRoom = async (newRoom) => {
    if (!newRoom) return newRoom;
    if (dash?.addPaymentRoom) {
      return await dash.addPaymentRoom(newRoom);
    }
    return newRoom;
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setActive("Home");
    setIsPaymentModalOpen(false);
    setIsInvitationModalOpen(false);
    setIsTermsModalOpen(false);
    setIsWithdrawModalOpen(false);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-appearance", dark ? "dark" : "light");
    document.body.setAttribute("data-appearance", dark ? "dark" : "light");
    if (dark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, [dark]);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  // Derive modal-open state directly from React state — no DOM polling needed.
  // The MutationObserver approach caused a re-render loop that froze the UI.
  const isModalOpenOnDesktop =
    isPaymentModalOpen ||
    isInvitationModalOpen ||
    isTermsModalOpen ||
    isWithdrawModalOpen;

  // Sync body class for CSS selectors that need it
  useEffect(() => {
    if (isModalOpenOnDesktop) {
      document.body.classList.add("modal-open-desktop");
    } else {
      document.body.classList.remove("modal-open-desktop");
    }
    return () => {
      document.body.classList.remove("modal-open-desktop");
    };
  }, [isModalOpenOnDesktop]);

  const nav = [
    ["Home", HomeIcon],
    ["Activity", ActivityIcon],
    ["Payment room", PaymentRoomIcon],
    ["Help & support", HelpIcon],
    ["Profile", ProfileIcon],
  ];

  return (
    <>
      {!isLoggedIn ? (
        <LoginPage
          dark={dark}
          onThemeToggle={() => setDark(!dark)}
          onLogin={(userData) => {
            setIsLoggedIn(true);
            setActive("Home");
            const { fullName, firstName, initial } = extractUserNames(userData?.name);
            const phone = userData?.phone ? formatAccountId(userData.phone) : (currentUser?.phone || "8032001585");
            const email = userData?.email || userData?.user?.email || "";
            setCurrentUser({ fullName, firstName, initial, phone, email });
            try {
              const stored = JSON.parse(localStorage.getItem("paykudi_user_profile") || "{}");
              localStorage.setItem(
                "paykudi_user_profile",
                JSON.stringify({
                  ...stored,
                  id: userData?.id || userData?.user?.id || stored?.id,
                  name: fullName,
                  phone,
                  email: email || stored?.email || "",
                })
              );
            } catch {}
          }}
        />
      ) : (
    <div className="app" data-appearance={dark ? "dark" : "light"}>
      <header className={`topbar ${isModalOpenOnDesktop ? "modal-active-topbar" : ""}`}>
        <BrandLogo
          dark={dark}
          className="brand"
          onClick={() => {
            setActive("Home");
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
        />
        {!isModalOpenOnDesktop && (
          <nav aria-label="Primary navigation">
            {nav.map(([name, NavIcon]) => {
              const isPMRoom =
                name === "Payment room" &&
                (active === "Payment room" ||
                 active === "Payment Room" ||
                 active === "Awaiting Payment" ||
                 active === "Payment Received" ||
                 active === "In Transit" ||
                 active === "Confirm Delivery" ||
                 active === "Confirm delivery" ||
                 active === "Dispute Ongoing" ||
                 active === "Dispute ongoing" ||
                 active === "Completed" ||
                 active === "Payment Completed");
              const isBtnActive = active === name || isPMRoom;

              return (
                <button
                  key={name}
                  onClick={() => {
                    if (name === "Payment room") {
                      setActiveRoom(null);
                    }
                    setActive(name);
                    setIsPaymentModalOpen(false);
                    setIsInvitationModalOpen(false);
                    setIsTermsModalOpen(false);
                    setIsWithdrawModalOpen(false);
                    window.scrollTo({ top: 0, behavior: "instant" });
                  }}
                  className={isBtnActive ? "active" : ""}
                >
                  <NavIcon
                    active={isBtnActive}
                    count={name === "Payment room" ? ongoingPaymentRoomsCount : undefined}
                  />
                  <span>{name}</span>
                </button>
              );
            })}
          </nav>
        )}
        <div className="top-actions">
          <HeaderActions
            dark={dark}
            onThemeToggle={() => setDark(!dark)}
            onOpenProfile={() => {
              setActive("Profile");
              setIsPaymentModalOpen(false);
              setIsWithdrawModalOpen(false);
              window.scrollTo({ top: 0, behavior: "instant" });
            }}
            onSignOut={handleSignOut}
            isProfileActive={active === "Profile"}
            hideAvatar={isModalOpenOnDesktop}
            user={currentUser}
          />
        </div>
      </header>

      {/* Desktop Views */}
      {active === "Activity" ? (
        <DesktopActivity onWithdraw={() => setIsWithdrawModalOpen(true)} />
      ) : active === "Payment room" ||
         active === "Payment Room" ||
         active === "Awaiting Payment" ||
         active === "Payment Received" ||
         active === "In Transit" ||
         active === "Confirm Delivery" ||
         active === "Confirm delivery" ||
         active === "Dispute Ongoing" ||
         active === "Dispute ongoing" ||
         active === "Completed" ||
         active === "Payment Completed" ? (
        <DesktopPaymentRoom
          rooms={paymentRooms}
          role={role}
          dark={dark}
          initialSelectedRoom={activeRoom || null}
          onBackToHome={() => setActive("Home")}
          onNewPayment={() => setActive("New Payment")}
          activeTab={prActiveTab}
          setActiveTab={setPrActiveTab}
          searchQuery={prSearchQuery}
          setSearchQuery={setPrSearchQuery}
          selectedRole={prSelectedRole}
          setSelectedRole={setPrSelectedRole}
          selectedState={prSelectedState}
          setSelectedState={setPrSelectedState}
          isSearchExpanded={prIsSearchExpanded}
          setIsSearchExpanded={setPrIsSearchExpanded}
          onSelectRoom={(r) => {
            if (r) {
              setActiveRoom(r);
              if (r.status === "awaiting_payment" || r.statusText === "Awaiting Payment") {
                setActive("Awaiting Payment");
              } else if (r.status === "payment_received" || r.statusText === "Payment Received") {
                setActive("Payment Received");
              } else if (r.status === "in_transit" || r.statusText === "In Transit") {
                setActive("In Transit");
              } else if (r.status === "delivered" || r.statusText === "Confirm delivery" || r.statusText === "Confirm Delivery") {
                setActive("Confirm Delivery");
              } else if (r.status === "dispute_ongoing" || r.statusText === "Dispute Ongoing" || r.statusText === "Dispute ongoing") {
                setActive("Dispute Ongoing");
              } else if (r.status === "completed" || r.statusText === "Completed" || r.statusText === "Payment Completed") {
                setActive("Completed");
              }
            }
          }}
        />
      ) : active === "Help" || active === "Help & support" ? (
        <DesktopHelp />
      ) : active === "Profile" ? (
        <DesktopProfile userName={currentUser?.fullName || "Howard Ukah-Columba"} dark={dark} onSignOut={handleSignOut} layout="split" />
      ) : (
        <main id="home" className="desktop-container">
          <div className="desktop-content-wrap desktop-intro-wrap">
            <section className="intro">
              <div>
                <h1>{getTimeGreeting()}, {currentUser?.firstName || "Howard"}</h1>
                <p>What will you like to do?</p>
              </div>
              <div className="intro-actions">
                <button
                  className="primary-button"
                  onClick={() => setIsPaymentModalOpen(true)}
                >
                  <b className="btn-plus">＋</b> New Payment
                </button>
                <button
                  className="secondary-button"
                  onClick={() => setIsWithdrawModalOpen(true)}
                >
                  Withdraw
                </button>
              </div>
            </section>
          </div>
          <section className="summary desktop-balance-banner" aria-label="Dashboard summary">
            <div className="desktop-cardless-balance-wrap">
              <div className="balance-tile">
                <PayKudiBalance
                  visible={visible}
                  onToggleVisibility={() => setVisible(!visible)}
                  balance={totalBalance}
                  accountNumber={userAccountNumber}
                />
              </div>
            </div>
          </section>
          <div className="desktop-content-wrap desktop-activity-wrap">
            <section className="activity-card boxless-activity-card" aria-label="Recent activity">
              <div className="activity-heading">
                <h2>Recent activity</h2>
                <a
                  href="#activity"
                  className={transactions.length === 0 ? "is-disabled" : ""}
                  tabIndex={transactions.length === 0 ? -1 : undefined}
                  aria-disabled={transactions.length === 0}
                  onClick={(e) => {
                    e.preventDefault();
                    if (transactions.length === 0) return;
                    setActive("Activity");
                  }}
                >
                  View all
                </a>
              </div>
              <div className="boxless-activity-list">
                {transactions.length === 0 ? (
                  <div className="activity-empty-state home-recent-empty-state">
                    <div className="activity-empty-graphic-wrap">
                      <EmptyActivityGraphic />
                    </div>
                    <h3 className="activity-empty-title">No Transactions</h3>
                    <p className="activity-empty-subtitle">You haven’t completed any transactions.</p>
                  </div>
                ) : (
                  transactions.map((tx, idx) => (
                    <ActivityRow
                      key={tx.id || tx.title}
                      item={tx}
                      isLast={idx === transactions.length - 1}
                      onSelect={setSelectedDesktopActivityReceipt}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
      )}

      {/* Desktop New Payment Modal (pops up in the middle of home screen) */}
      {(isPaymentModalOpen || active === "New Payment") && (
        <DesktopNewPayment
          onCancel={() => {
            setIsPaymentModalOpen(false);
            if (active === "New Payment") setActive("Home");
          }}
          onSuccess={(created) => {
            if (created) {
              const added = handleAddPaymentRoom(created);
              setActiveRoom(added || created);
            }
            setIsPaymentModalOpen(false);
            if (active === "New Payment") setActive("Home");
            setIsInvitationModalOpen(true);
          }}
          onOpenInvitation={(created) => {
            setIsPaymentModalOpen(false);
            if (active === "New Payment") setActive("Home");
            if (created) {
              const added = handleAddPaymentRoom(created);
              setActiveRoom(added || created);
            }
            setIsInvitationModalOpen(true);
          }}
        />
      )}

      {/* Desktop Payment Invitation Modal (same modal size as New Payment modal, compulsory until Proceed) */}
      {(isInvitationModalOpen || active === "Payment Invitation") && (
        <DesktopPaymentInvitationModal
          room={activeRoom || {}}
          onProceed={() => {
            setIsInvitationModalOpen(false);
            if (active === "Payment Invitation") setActive("Home");
            setIsTermsModalOpen(true);
          }}
          onShare={() => {}}
        />
      )}

      {/* Agree to Terms Modal (compulsory after Payment Invitation) */}
      {isTermsModalOpen && (
        <AgreeTermsModal
          isOpen={isTermsModalOpen}
          onClose={() => {
            setIsTermsModalOpen(false);
            setIsInvitationModalOpen(true);
          }}
          onAgree={({ state, city, location }) => {
            setIsTermsModalOpen(false);
            if (activeRoom) {
              const storageKey = `pk_agreed_terms_${activeRoom.id || activeRoom.orderNumber || "ORD-603607"}`;
              try {
                localStorage.setItem(storageKey, "true");
              } catch (e) {}
              activeRoom.deliveryState = state;
              activeRoom.deliveryCity = city;
              activeRoom.deliveryLocation = location;
              activeRoom.hasAgreedTerms = true;
            }
            setActive("Awaiting Payment");
          }}
          room={activeRoom || {}}
          sellerName={
            activeRoom?.sellerName ||
            (activeRoom?.role === "Selling" ? "Amaka Obi" : (activeRoom?.counterparty || "Howard Ukah"))
          }
        />
      )}

      {/* Desktop Withdraw Modal (pops up in the middle of home screen) */}
      {(isWithdrawModalOpen || active === "Withdraw" || active === "Payout") && (
        <DesktopWithdrawModal
          dark={dark}
          availableBalance={koboToNaira(pocketBalanceKobo)}
          onClose={() => {
            setIsWithdrawModalOpen(false);
            if (active === "Withdraw" || active === "Payout") setActive("Home");
          }}
          onSuccess={(res) => {
            const withdrawnNaira = res?.amount || res;
            if (withdrawnNaira && !isNaN(withdrawnNaira)) {
              const deductKobo = nairaToKobo(withdrawnNaira);
              const nextKobo = Math.max(0, pocketBalanceKobo - deductKobo);
              saveStoredPocketBalanceKobo(nextKobo);
              setPocketBalanceKobo(nextKobo);
            }
          }}
        />
      )}

      {/* Mobile Screen Dashboard (preserved for mobile screen) */}
      <MobileDashboard
        dark={dark}
        onThemeToggle={() => setDark(!dark)}
        active={active}
        setActive={setActive}
        visible={visible}
        setVisible={setVisible}
        role={role}
        setRole={setRole}
        activeRoom={activeRoom}
        setActiveRoom={setActiveRoom}
        paymentRooms={paymentRooms}
        onAddPaymentRoom={handleAddPaymentRoom}
        ongoingPaymentRoomsCount={ongoingPaymentRoomsCount}
        onSignOut={handleSignOut}
        prActiveTab={prActiveTab}
        setPrActiveTab={setPrActiveTab}
        prSearchQuery={prSearchQuery}
        setPrSearchQuery={setPrSearchQuery}
        prSelectedRole={prSelectedRole}
        setPrSelectedRole={setPrSelectedRole}
        prSelectedState={prSelectedState}
        setPrSelectedState={setPrSelectedState}
        prIsSearchExpanded={prIsSearchExpanded}
        setPrIsSearchExpanded={setPrIsSearchExpanded}
        transactions={transactions}
        totalBalance={totalBalance}
        currentUser={currentUser}
        pocketBalanceKobo={pocketBalanceKobo}
        onWithdrawSuccess={(res) => {
          const withdrawnNaira = res?.amount || res;
          if (withdrawnNaira && !isNaN(withdrawnNaira)) {
            const deductKobo = nairaToKobo(withdrawnNaira);
            const nextKobo = Math.max(0, pocketBalanceKobo - deductKobo);
            saveStoredPocketBalanceKobo(nextKobo);
            setPocketBalanceKobo(nextKobo);
          }
        }}
      />

      <ReceiptModal
        isOpen={!!selectedDesktopActivityReceipt}
        onClose={() => setSelectedDesktopActivityReceipt(null)}
        item={selectedDesktopActivityReceipt}
      />
    </div>
      )}
    </>
  );
}

