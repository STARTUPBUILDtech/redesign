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
import GlowingLogoLoader from "./components/Shared/GlowingLogoLoader.jsx";
import { ALL_PAYMENT_ROOMS } from "./data/paymentRooms.js";
import { savePrePaymentRoomToDB, savePaymentRoomToDB, getPrePaymentRoomsFromDB } from "./services/supabaseService.js";
import { isSupabaseConfigured } from "./supabase/client.js";
import { getUserAvatarStyle, getServerAvatarColor, getAvatarDirectoryVersion, loadAvatarDirectory } from "./utils/avatarUtils.js";
import AcceptInviteModal from "./components/Shared/AcceptInviteModal.jsx";
import { computeInviteSecondsLeft } from "./utils/timerUtils.js";
import { getSocket, emitSendInviteSocket } from "./services/socketService.js";
import { checkAuthSession, logoutUser } from "./services/authService.js";
import { useDashboard } from "./context/DashboardContext.jsx";
import {
  getStoredPocketBalanceKobo,
  saveStoredPocketBalanceKobo,
  koboToNaira,
  nairaToKobo,
  formatPocketBalanceNaira,
} from "./utils/balanceUtils.js";

function BrandLogo({ dark, className, onClick }) {
  const isDark = typeof dark === "boolean"
    ? dark
    : (typeof document !== "undefined" &&
        (document.documentElement.getAttribute("data-appearance") === "dark" ||
         document.body.getAttribute("data-appearance") === "dark" ||
         document.body.classList.contains("dark")));

  return (
    <a
      className={`${className || ""}${isDark ? " is-dark" : ""}`}
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
        src={isDark ? logoDarkMode : paykudiLogo}
        alt="PayKudi"
        className="brand-logo-img"
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

// Helper to format full name into sentence case (e.g. "howard ukah" -> "Howard Ukah")
export const formatFullName = (name) => {
  if (!name || typeof name !== "string") return "";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => {
      if (w.includes("-")) {
        return w.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("-");
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
};

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
  const formatWord = (w) => {
    if (w.includes("-")) {
      return w.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("-");
    }
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  };
  firstName = formatWord(firstName);
  const capitalizedFullName = parts.map(formatWord).join(" ");
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
  const userAvatarStyle = getUserAvatarStyle(user || userName);

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
            <div className="header-avatar-circle-h" style={userAvatarStyle}>{displayInitial}</div>
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
                <div className="header-dropdown-avatar" style={userAvatarStyle}>{displayInitial}</div>

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

export const toDigitsOnly = (v) => {
  if (!v) return "";
  let d = String(v).replace(/\D/g, "");
  if (d.startsWith("234") && d.length > 3) d = d.slice(3);
  return d.replace(/^0+/, "");
};

export function isUserCounterpartyOfRoom(room, user) {
  if (!room || !user) return false;

  const userPhone = toDigitsOnly(user.phone || user.whatsapp_number || user.accountId || user.account_id || user.id);
  const userId = toDigitsOnly(user.id || user.accountId || user.account_id || user.phone);
  const userUsername = (user.username || user.user_name || "").toLowerCase().replace(/^@/, "").trim();
  const userFullName = (user.fullName || user.name || user.full_name || "").toLowerCase().trim();

  // If user is definitively the creator, they cannot be the counterparty
  const creatorPhone = toDigitsOnly(room.creator_phone || room.creatorPhone);
  const creatorId = toDigitsOnly(room.creator_id || room.creatorId);
  const creatorUsername = (room.creator_username || room.creatorUsername || "").toLowerCase().replace(/^@/, "").trim();
  if (
    (creatorPhone && userPhone && (creatorPhone === userPhone || creatorPhone.endsWith(userPhone) || userPhone.endsWith(creatorPhone))) ||
    (creatorId && (creatorId === userPhone || creatorId === userId)) ||
    (creatorUsername && userUsername && creatorUsername === userUsername)
  ) {
    return false;
  }

  const cpPhone = toDigitsOnly(room.counterparty_phone || room.counterpartyPhone);
  const cpAccountId = toDigitsOnly(room.counterparty_account_id || room.counterpartyAccountId || room.counterpartyId || room.counterparty_id);
  const cpUsername = (room.counterparty_username || room.counterpartyUsername || "").toLowerCase().replace(/^@/, "").trim();
  const cpName = (room.counterparty || room.counterpartyName || "").toLowerCase().trim();

  if (cpPhone && userPhone && (cpPhone === userPhone || cpPhone.endsWith(userPhone) || userPhone.endsWith(cpPhone))) return true;
  if (cpAccountId && (cpAccountId === userPhone || cpAccountId === userId)) return true;
  if (cpUsername && userUsername && cpUsername === userUsername) return true;
  if (userFullName && cpName && (cpName === userFullName || cpName.includes(userFullName) || userFullName.includes(cpName))) return true;

  // Role-based counterparty identification:
  // If creator is Buyer, the Counterparty is the Seller!
  // If creator is Seller, the Counterparty is the Buyer!
  const isCreatorBuyer = (room.role || room.creatorRole || "").toLowerCase().includes("buy");
  const isCreatorSeller = (room.role || room.creatorRole || "").toLowerCase().includes("sell");

  const cpRolePhone = toDigitsOnly(isCreatorBuyer ? (room.seller_id || room.sellerId || room.sellerPhone || room.seller_phone) : (room.buyer_id || room.buyerId || room.buyerPhone || room.buyer_phone));
  const cpRoleUsername = (isCreatorBuyer ? (room.sellerUsername || room.seller_username) : (room.buyerUsername || room.buyer_username) || "").toLowerCase().replace(/^@/, "").trim();
  const cpRoleName = (isCreatorBuyer ? (room.sellerName || room.seller_name || room.seller) : (room.buyerName || room.buyer_name || room.buyer) || "").toLowerCase().trim();

  if (cpRolePhone && userPhone && (cpRolePhone === userPhone || cpRolePhone.endsWith(userPhone) || userPhone.endsWith(cpRolePhone))) return true;
  if (cpRoleUsername && userUsername && cpRoleUsername === userUsername) return true;
  if (userFullName && cpRoleName && (cpRoleName === userFullName || cpRoleName.includes(userFullName) || userFullName.includes(cpRoleName))) return true;

  return false;
}

export function isUserCreatorOfRoom(room, user) {
  if (!room || !user) return false;
  // If the user matches the counterparty, they are strictly NOT the creator!
  if (isUserCounterpartyOfRoom(room, user)) return false;

  const userPhone = toDigitsOnly(user.phone || user.whatsapp_number || user.accountId || user.account_id || user.id);
  const userId = toDigitsOnly(user.id || user.accountId || user.account_id || user.phone);
  const userUsername = (user.username || user.user_name || "").toLowerCase().replace(/^@/, "").trim();
  const userFullName = (user.fullName || user.name || user.full_name || "").toLowerCase().trim();

  const creatorId = toDigitsOnly(room.creator_id || room.creatorId);
  const creatorPhone = toDigitsOnly(room.creator_phone || room.creatorPhone);
  const creatorUsername = (room.creator_username || room.creatorUsername || "").toLowerCase().replace(/^@/, "").trim();
  const creatorName = (room.creator || room.creatorName || "").toLowerCase().trim();

  if (creatorId && (creatorId === userPhone || creatorId === userId)) return true;
  if (creatorPhone && userPhone && (creatorPhone === userPhone || creatorPhone.endsWith(userPhone) || userPhone.endsWith(creatorPhone))) return true;
  if (creatorUsername && userUsername && creatorUsername === userUsername) return true;
  if (userFullName && creatorName && (creatorName === userFullName || creatorName.includes(userFullName) || userFullName.includes(creatorName))) return true;

  return false;
}

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
  isModalOpen: propIsModalOpen,
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
  setPrSelectedRole: propSetPrSelectedRole,
  setSelectedRole: propSetSelectedRole,
  prSelectedState,
  setPrSelectedState: propSetPrSelectedState,
  setSelectedState: propSetSelectedState,
  prIsSearchExpanded,
  setPrIsSearchExpanded: propSetPrIsSearchExpanded,
  setIsSearchExpanded: propSetIsSearchExpanded,
  transactions: propTransactions,
  totalBalance: propTotalBalance,
  currentUser,
  pocketBalanceKobo,
  onWithdrawSuccess,
}) {
  const setPrSelectedRole = propSetPrSelectedRole || propSetSelectedRole;
  const setPrSelectedState = propSetPrSelectedState || propSetSelectedState;
  const setPrIsSearchExpanded = propSetPrIsSearchExpanded || propSetIsSearchExpanded;

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
  const [isPageLoading, setIsPageLoading] = useState(false);

  const isCreatorPrePaymentActive = Boolean(
    activeRoom &&
    isUserCreatorOfRoom(activeRoom, currentUser) &&
    !activeRoom.creator_proceeded &&
    !activeRoom.creatorProceeded &&
    activeRoom.status !== "completed" &&
    activeRoom.status !== "awaiting_payment"
  );

  useEffect(() => {
    if (isCreatorPrePaymentActive && active !== "Payment Invitation") {
      setActive("Payment Invitation");
    }
  }, [isCreatorPrePaymentActive, active, setActive]);

  const handleNavClick = (view) => {
    if (isCreatorPrePaymentActive) {
      if (active !== "Payment Invitation") setActive("Payment Invitation");
      return;
    }
    if (view === active) return;
    setIsPageLoading(true);
    setActive(view);
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
    setTimeout(() => {
      setIsPageLoading(false);
    }, 360);
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
          isModalOpen={propIsModalOpen}
          className="mobile-brand"
          onClick={() => {
            if (isCreatorPrePaymentActive) return;
            handleNavClick("Home");
          }}
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

      {(isPageLoading || dash?.isLoadingDB) && active !== "New Payment" && active !== "Withdraw" && active !== "Payout" ? (
        <div className="mobile-content-scroll" ref={contentScrollRef} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <GlowingLogoLoader dark={dark} layout="mobile" />
        </div>
      ) : active === "Withdraw" || active === "Payout" ? (
        <MobileWithdraw
          availableBalance={koboToNaira(pocketBalanceKobo)}
          onCancel={() => handleNavClick("Home")}
          onSuccess={(res) => {
            if (onWithdrawSuccess) onWithdrawSuccess(res);
          }}
          dark={dark}
        />
      ) : active === "New Payment" ? (
        <MobileNewPayment
          currentUser={currentUser}
          onCancel={() => handleNavClick("Home")}
          onSuccess={(newRoom) => {
            if (newRoom) {
              setActiveRoom(newRoom);
              // Do NOT create in active payment rooms table until counterparty accepts!
              savePrePaymentRoomToDB(newRoom);
              emitSendInviteSocket(newRoom);
              try {
                const bc = new BroadcastChannel("paykudi_sync_channel");
                bc.postMessage({ type: "paykudi_new_invite", room: newRoom });
              } catch (_) {}
              try {
                localStorage.setItem("paykudi_last_new_invite", JSON.stringify(newRoom));
              } catch (_) {}
              try {
                fetch("http://localhost:8000/auth/pre-payment-rooms", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(newRoom),
                }).catch(() => {});
              } catch (e) {}
            }
            setActive("Payment Invitation");
          }}
        />
      ) : (active === "Payment Invitation" && activeRoom && isUserCreatorOfRoom(activeRoom, currentUser) && !isUserCounterpartyOfRoom(activeRoom, currentUser)) ? (
        <MobilePaymentInvitation
          room={activeRoom}
          user={currentUser}
          onCancel={(cancelledRoom) => {
            const targetId = cancelledRoom?.id || cancelledRoom?.orderNumber || cancelledRoom?.order_number || activeRoom?.id || activeRoom?.orderNumber || activeRoom?.order_number;
            if (targetId) {
              cancelledRoomsRef.current.add(targetId);
              dismissedInvitesRef.current.add(targetId);
              try {
                const list = JSON.parse(sessionStorage.getItem("paykudi_cancelled_rooms") || "[]");
                list.push(targetId);
                sessionStorage.setItem("paykudi_cancelled_rooms", JSON.stringify([...new Set(list)]));
              } catch (_) {}
            }
            setActiveRoom(null);
            setIsInvitationModalOpen(false);
            try {
              localStorage.removeItem("paykudi_active_pre_payment_room");
            } catch (_) {}
            setActive("Home");
          }}
          onCreateNewRoom={() => {
            setActiveRoom(null);
            setIsInvitationModalOpen(false);
            try {
              localStorage.removeItem("paykudi_active_pre_payment_room");
            } catch (_) {}
            handleNavClick("New Payment");
          }}
          onProceed={async (proceedRoom) => {
            try {
              localStorage.removeItem("paykudi_active_pre_payment_room");
            } catch (_) {}
            const target = proceedRoom || activeRoom || {};
            const updated = {
              ...target,
              status: "awaiting_payment",
              statusText: "Awaiting Payment",
              category: "ongoing",
              creator_proceeded: true,
              creatorProceeded: true,
            };
            setActiveRoom(updated);
            try {
              if (dash?.addPaymentRoom) {
                await dash.addPaymentRoom(updated);
              }
            } catch (e) {}
            handleNavClick("Awaiting Payment");
          }}
          onShare={() => {}}
        />
      ) : active === "Awaiting Payment" ? (
        <MobileAwaitingPayment
          room={activeRoom || {}}
          role={role}
          currentUser={currentUser}
          onBack={() => handleNavClick("Payment room")}
          onPaymentConfirmed={() => {}}
        />
      ) : active === "Payment Received" ? (
        <MobilePaymentReceived
          room={activeRoom || {}}
          role={role}
          currentUser={currentUser}
          onBack={() => handleNavClick("Payment room")}
        />
      ) : active === "In Transit" ? (
        <MobileInTransit
          room={activeRoom || {}}
          role={role}
          currentUser={currentUser}
          onBack={() => handleNavClick("Payment room")}
        />
      ) : active === "Confirm Delivery" || active === "Confirm delivery" ? (
        <MobileConfirmDelivery
          room={activeRoom || {}}
          role={role}
          currentUser={currentUser}
          onBack={() => handleNavClick("Payment room")}
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
          role={role}
          currentUser={currentUser}
          onBack={() => handleNavClick("Payment room")}
        />
      ) : active === "Completed" || active === "Payment Completed" ? (
        <MobileCompleted
          room={activeRoom || {}}
          role={role}
          currentUser={currentUser}
          onBack={() => handleNavClick("Payment room")}
        />
      ) : (
        <div className="mobile-content-scroll" ref={contentScrollRef}>
          {active === "Activity" ? (
            <MobileActivity onWithdraw={() => handleNavClick("Withdraw")} />
          ) : active === "Payment room" || active === "Payment Room" ? (
            <MobilePaymentRoom
              rooms={paymentRooms}
              currentUser={currentUser}
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
                if (r) {
                  setIsPageLoading(true);
                  setTimeout(() => setIsPageLoading(false), 260);
                  setActiveRoom(r);
                }
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
            <DesktopProfile user={currentUser} userName={currentUser?.fullName || "Howard Ukah-Columba"} username={currentUser?.username} dark={dark} onSignOut={onSignOut} />
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
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [visible, setVisible] = useState(true);
  const [active, setActive] = useState(() => {
    try {
      const stored = localStorage.getItem("paykudi_active_pre_payment_room");
      if (stored) {
        const parsed = JSON.parse(stored);
        const pId = parsed?.id || parsed?.orderNumber || parsed?.order_number;
        const cancelled = JSON.parse(sessionStorage.getItem("paykudi_cancelled_rooms") || "[]");
        if (pId && Array.isArray(cancelled) && cancelled.includes(pId)) {
          localStorage.removeItem("paykudi_active_pre_payment_room");
          return "Home";
        }
        let user = null;
        try {
          user = JSON.parse(localStorage.getItem("paykudi_user_profile") || "{}");
        } catch (_) {}
        if (
          parsed &&
          user &&
          !isUserCounterpartyOfRoom(parsed, user) &&
          isUserCreatorOfRoom(parsed, user) &&
          !parsed.creator_proceeded &&
          !parsed.creatorProceeded &&
          parsed.status !== "completed" &&
          parsed.status !== "awaiting_payment" &&
          parsed.status !== "cancelled" &&
          parsed.status !== "killed"
        ) {
          return "Payment Invitation";
        }
      }
    } catch (_) {}
    return "Home";
  });
  const [role, setRole] = useState("Buyer");
  const [activeRoom, setActiveRoom] = useState(() => {
    try {
      const stored = localStorage.getItem("paykudi_active_pre_payment_room");
      if (stored) {
        const parsed = JSON.parse(stored);
        const pId = parsed?.id || parsed?.orderNumber || parsed?.order_number;
        const cancelled = JSON.parse(sessionStorage.getItem("paykudi_cancelled_rooms") || "[]");
        if (pId && Array.isArray(cancelled) && cancelled.includes(pId)) {
          localStorage.removeItem("paykudi_active_pre_payment_room");
          return null;
        }
        let user = null;
        try {
          user = JSON.parse(localStorage.getItem("paykudi_user_profile") || "{}");
        } catch (_) {}
        if (
          parsed &&
          user &&
          !isUserCounterpartyOfRoom(parsed, user) &&
          isUserCreatorOfRoom(parsed, user) &&
          !parsed.creator_proceeded &&
          !parsed.creatorProceeded &&
          parsed.status !== "completed" &&
          parsed.status !== "awaiting_payment" &&
          parsed.status !== "cancelled" &&
          parsed.status !== "killed"
        ) {
          return parsed;
        }
      }
    } catch (_) {}
    return null;
  });
  const [isDesktopPageLoading, setIsDesktopPageLoading] = useState(false);

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
        const username = parsed.username || (parsed.name ? parsed.name.toLowerCase().replace(/[^a-z0-9]/g, "") : "howard001");
        const avatarColor = getServerAvatarColor({ username, phone, fullName }) || parsed.avatar_color || parsed.avatarColor || getUserAvatarStyle({ username, phone, fullName }).backgroundColor;
        return {
          fullName,
          firstName,
          initial,
          phone,
          username,
          avatar_color: avatarColor,
          avatarColor: avatarColor,
        };
      }
    } catch {}
    const defaultColor = getUserAvatarStyle("howard001").backgroundColor;
    return {
      fullName: "Howard Ukah-Columba",
      firstName: "Howard",
      initial: "H",
      phone: "8032001585",
      username: "howard001",
      avatar_color: defaultColor,
      avatarColor: defaultColor,
    };
  });

  // Authoritative server session verification on startup
  useEffect(() => {
    let isMounted = true;
    checkAuthSession().then((res) => {
      if (!isMounted) return;
      if (res.authenticated && res.user) {
        setIsLoggedIn(true);
        const u = res.user;
        const { fullName, firstName, initial } = extractUserNames(u.full_name || u.name);
        const phone = u.whatsapp_number || u.phone || "";
        const email = u.email || "";
        const username = (u.username || (fullName ? fullName.toLowerCase().replace(/[^a-z0-9]/g, "") : "user")).replace(/^@/, "");
        const accountId = formatAccountId(phone);
        const avatarColor = u.avatar_color || getUserAvatarStyle({ username, phone, fullName }).backgroundColor;
        setCurrentUser({ fullName, firstName, initial, phone, email, username, accountId, avatar_color: avatarColor, avatarColor });
        try {
          localStorage.setItem("paykudi_is_logged_in", "true");
          localStorage.setItem("paykudi_user_profile", JSON.stringify({
            id: u.id,
            name: fullName,
            phone,
            email,
            username,
            avatar_color: avatarColor,
          }));
        } catch (_) {}
      } else {
        setIsLoggedIn(false);
        try {
          localStorage.removeItem("paykudi_is_logged_in");
          localStorage.removeItem("paykudi_user_profile");
        } catch (_) {}
      }
      setIsAuthChecking(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync profile if updated elsewhere in the app
  useEffect(() => {
    const syncProfile = () => {
      try {
        const stored = localStorage.getItem("paykudi_user_profile");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.name || parsed.phone || parsed.username) {
            const { fullName, firstName, initial } = extractUserNames(parsed.name);
            const phone = parsed.phone ? formatAccountId(parsed.phone) : "8032001585";
            const username = parsed.username || (parsed.name ? parsed.name.toLowerCase().replace(/[^a-z0-9]/g, "") : "howard001");
            const avatarColor = getServerAvatarColor({ username, phone, fullName }) || parsed.avatar_color || parsed.avatarColor || getUserAvatarStyle({ username, phone, fullName }).backgroundColor;
            setCurrentUser({
              fullName,
              firstName,
              initial,
              phone,
              username,
              avatar_color: avatarColor,
              avatarColor: avatarColor,
            });
          }
        }
      } catch {}
    };

    window.addEventListener("storage", syncProfile);
    window.addEventListener("paykudi_profile_updated", syncProfile);
    window.addEventListener("paykudi_avatar_colors_updated", syncProfile);
    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener("paykudi_profile_updated", syncProfile);
      window.removeEventListener("paykudi_avatar_colors_updated", syncProfile);
    };
  }, []);

  // Authoritative avatar colors: pull from server RAM (DB copy) on boot, on focus, and every 30s.
  // Bumping this version re-renders the whole tree so every avatar repaints with server colors.
  const [, setAvatarDirectoryVersion] = useState(getAvatarDirectoryVersion());
  useEffect(() => {
    const onColorsUpdated = () => setAvatarDirectoryVersion(getAvatarDirectoryVersion());
    const refresh = () => loadAvatarDirectory();
    window.addEventListener("paykudi_avatar_colors_updated", onColorsUpdated);
    window.addEventListener("focus", refresh);
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => {
      window.removeEventListener("paykudi_avatar_colors_updated", onColorsUpdated);
      window.removeEventListener("focus", refresh);
      clearInterval(interval);
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

  const handleSignOut = async () => {
    await logoutUser();
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
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(() => {
    try {
      const stored = localStorage.getItem("paykudi_active_pre_payment_room");
      if (stored) {
        const parsed = JSON.parse(stored);
        const pId = parsed?.id || parsed?.orderNumber || parsed?.order_number;
        const cancelled = JSON.parse(sessionStorage.getItem("paykudi_cancelled_rooms") || "[]");
        if (pId && Array.isArray(cancelled) && cancelled.includes(pId)) {
          localStorage.removeItem("paykudi_active_pre_payment_room");
          return false;
        }
        let user = null;
        try {
          user = JSON.parse(localStorage.getItem("paykudi_user_profile") || "{}");
        } catch (_) {}
        if (
          parsed &&
          user &&
          !isUserCounterpartyOfRoom(parsed, user) &&
          isUserCreatorOfRoom(parsed, user) &&
          !parsed.creator_proceeded &&
          !parsed.creatorProceeded &&
          parsed.status !== "completed" &&
          parsed.status !== "awaiting_payment" &&
          parsed.status !== "cancelled" &&
          parsed.status !== "killed"
        ) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  });
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [pendingInviteModal, setPendingInviteModal] = useState(null);
  const dismissedInvitesRef = useRef(new Set());
  const acceptedInvitesRef = useRef(new Set());
  const cancelledRoomsRef = useRef(new Set());

  // Responsive device detection: ensures MobileDashboard & Desktop views don't mount portals simultaneously
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth <= 700;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(max-width: 700px)");
    const onChange = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Restore any dismissed invites & cancelled rooms from current session so they never pop up again on polling
  useEffect(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem("paykudi_dismissed_invites") || "[]");
      if (Array.isArray(stored)) {
        stored.forEach((id) => dismissedInvitesRef.current.add(id));
      }
    } catch (e) {}
    try {
      const cancelled = JSON.parse(sessionStorage.getItem("paykudi_cancelled_rooms") || "[]");
      if (Array.isArray(cancelled)) {
        cancelled.forEach((id) => cancelledRoomsRef.current.add(id));
      }
    } catch (e) {}
  }, []);

  // Unified Pre-payment Room Poller & Resolver: Ensures neither the Creator's Payment Invitation modal nor the Counterparty's Accept Invite modal ever leaves sight while a pre-payment room exists under the user's ID
  useEffect(() => {
    let isCancelled = false;

    const checkPrePaymentRoomsForUser = async () => {
      if (!isLoggedIn || !currentUser) return;

      let rooms = [];

      // 1. Prioritize live Supabase DB if configured
      if (isSupabaseConfigured) {
        try {
          const dbRooms = await getPrePaymentRoomsFromDB();
          if (Array.isArray(dbRooms)) {
            rooms = [...dbRooms];
          }
        } catch (e) {
          console.warn("[Supabase] pre_payment_rooms fetch error:", e);
        }
      }

      // 2. Supplement with local backend if available
      try {
        const res = await fetch("http://localhost:8000/auth/pre-payment-rooms");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.rooms)) {
            data.rooms.forEach((r) => {
              const rId = r.id || r.orderNumber || r.order_number;
              if (rId && !rooms.some((x) => (x.id === rId || x.orderNumber === rId || x.order_number === rId))) {
                rooms.push(r);
              }
            });
          }
        }
      } catch (err) {}

      if (isCancelled) return;

      // 1. Where current user is the CREATOR:
      const creatorRoom = rooms.find((r) => {
        const rId = r.id || r.orderNumber || r.order_number;
        if (!rId) return false;
        if (cancelledRoomsRef.current.has(rId)) return false;
        if (
          r.status === "cancelled" ||
          r.status === "killed" ||
          r.isKilled ||
          r.is_cancelled ||
          r.reason === "creator_cancelled" ||
          r.status_text === "Cancelled" ||
          r.status_text === "Killed" ||
          r.statusText === "Cancelled" ||
          r.statusText === "Killed"
        ) {
          return false;
        }
        if (!isUserCreatorOfRoom(r, currentUser)) return false;
        const hasProceeded = Boolean(r.creator_proceeded || r.creatorProceeded || r.status === "completed" || r.status === "awaiting_payment");
        if (hasProceeded) return false;
        const isPermanentlyKilled = (r.isKilled || r.status === "killed") && (r.resend_count ?? 0) >= 3;
        if (isPermanentlyKilled) return false;
        return true;
      });

      if (creatorRoom && !isCancelled) {
        setActiveRoom((prev) => {
          if (prev && (prev.id === creatorRoom.id || prev.orderNumber === creatorRoom.orderNumber || prev.order_number === creatorRoom.order_number)) {
            const cpJoined = Boolean(creatorRoom.counterparty_joined || creatorRoom.counterpartyJoined || prev.counterpartyJoined);
            const resendCount = creatorRoom.resend_count ?? prev.resend_count;
            const status = creatorRoom.status || prev.status;
            const statusText = creatorRoom.statusText || creatorRoom.status_text || prev.statusText;
            if (
              prev.counterpartyJoined === cpJoined &&
              prev.counterparty_joined === cpJoined &&
              prev.resend_count === resendCount &&
              prev.status === status &&
              prev.statusText === statusText
            ) {
              return prev;
            }
            return {
              ...creatorRoom,
              ...prev,
              counterpartyJoined: cpJoined,
              counterparty_joined: cpJoined,
              resend_count: resendCount,
              status,
              statusText,
            };
          }
          return creatorRoom;
        });
        setIsInvitationModalOpen((prev) => (prev ? prev : true));
        if (isMobile && active !== "Payment Invitation") {
          setActive("Payment Invitation");
        }
        try {
          localStorage.setItem("paykudi_active_pre_payment_room", JSON.stringify(creatorRoom));
        } catch (_) {}
      } else if (!isCancelled) {
        // No pre-payment room exists in the DB for the current user:
        // Clear any stale cached room and close the invitation modal!
        try {
          localStorage.removeItem("paykudi_active_pre_payment_room");
        } catch (_) {}

        setActiveRoom((curr) => {
          if (curr && !curr.creator_proceeded && !curr.creatorProceeded && curr.status !== "awaiting_payment" && curr.status !== "completed") {
            const currId = curr.id || curr.orderNumber || curr.order_number;
            if (!rooms.some((r) => (r.id === currId || r.orderNumber === currId || r.order_number === currId))) {
              setIsInvitationModalOpen(false);
              return null;
            }
          }
          return curr;
        });

        setIsInvitationModalOpen(false);
        if (active === "Payment Invitation") {
          setActive("Home");
        }
      }

      // 2. Where current user is the COUNTERPARTY:
      const counterpartyRoom = rooms.find((r) => {
        const rId = r.id || r.orderNumber || r.order_number;
        if (!rId) return false;
        if (cancelledRoomsRef.current.has(rId)) return false;
        if (
          r.status === "cancelled" ||
          r.status === "killed" ||
          r.isKilled ||
          r.is_cancelled ||
          r.reason === "creator_cancelled" ||
          r.status_text === "Cancelled" ||
          r.status_text === "Killed" ||
          r.statusText === "Cancelled" ||
          r.statusText === "Killed"
        ) {
          return false;
        }
        if (!isUserCounterpartyOfRoom(r, currentUser)) return false;
        if (
          dismissedInvitesRef.current.has(r.id) ||
          dismissedInvitesRef.current.has(r.orderNumber) ||
          dismissedInvitesRef.current.has(r.order_number)
        ) {
          return false;
        }
        const hasProceeded = Boolean(r.creator_proceeded || r.creatorProceeded || r.status === "completed");
        if (hasProceeded) return false;
        const isPermanentlyKilled = (r.isKilled || r.status === "killed") && (r.resend_count ?? 0) >= 3;
        if (isPermanentlyKilled) return false;

        // If counterparty has not joined yet, the invite must be active and not expired!
        if (!r.counterparty_joined && !r.counterpartyJoined) {
          const rem = computeInviteSecondsLeft(r);
          if (rem <= 0 || r.status === "expired" || r.is_expired || r.status_text === "Expired" || r.statusText === "Expired") {
            return false;
          }
        }
        return true;
      });

      if (counterpartyRoom && !isCancelled) {
        // Current user is strictly the counterparty: ensure creator view/modal is never shown to them!
        setIsInvitationModalOpen(false);
        if (active === "Payment Invitation") {
          setActive("Home");
        }
        try {
          const stored = localStorage.getItem("paykudi_active_pre_payment_room");
          if (stored) {
            const p = JSON.parse(stored);
            if (p && isUserCounterpartyOfRoom(p, currentUser)) {
              localStorage.removeItem("paykudi_active_pre_payment_room");
            }
          }
        } catch (_) {}
        setActiveRoom((curr) => {
          if (curr && !curr.creator_proceeded && !curr.creatorProceeded && isUserCounterpartyOfRoom(curr, currentUser)) {
            return null;
          }
          return curr;
        });

        const rem = computeInviteSecondsLeft(counterpartyRoom);
        setPendingInviteModal((prev) => {
          if (prev && (prev.id === counterpartyRoom.id || prev.orderNumber === counterpartyRoom.orderNumber || prev.order_number === counterpartyRoom.order_number)) {
            return {
              ...prev,
              ...counterpartyRoom,
              secondsLeft: rem,
              counterparty_joined: Boolean(counterpartyRoom.counterparty_joined || counterpartyRoom.counterpartyJoined || prev.counterparty_joined),
              counterpartyJoined: Boolean(counterpartyRoom.counterparty_joined || counterpartyRoom.counterpartyJoined || prev.counterpartyJoined),
            };
          }
          return {
            ...counterpartyRoom,
            secondsLeft: rem,
            counterparty_joined: Boolean(counterpartyRoom.counterparty_joined || counterpartyRoom.counterpartyJoined),
            counterpartyJoined: Boolean(counterpartyRoom.counterparty_joined || counterpartyRoom.counterpartyJoined),
          };
        });
      } else if (!isCancelled) {
        // If current pending invite is expired and counterparty has not joined, clear it so it doesn't get stuck on screen
        setPendingInviteModal((curr) => {
          if (curr && !curr.counterparty_joined && !curr.counterpartyJoined) {
            const rem = computeInviteSecondsLeft(curr);
            if (rem <= 0 || curr.status === "expired" || curr.is_expired || curr.status_text === "Expired" || curr.statusText === "Expired") {
              return null;
            }
          }
          return curr;
        });
      }
    };

    checkPrePaymentRoomsForUser();
    const interval = setInterval(checkPrePaymentRoomsForUser, 2500);

    const onShowInvite = (e) => {
      if (e.detail) {
        const rId = e.detail.id || e.detail.orderNumber;
        if (rId) dismissedInvitesRef.current.delete(rId);
        const rem = computeInviteSecondsLeft(e.detail);
        setPendingInviteModal({
          ...e.detail,
          secondsLeft: rem,
        });
      }
    };
    window.addEventListener("paykudi_show_invite_modal", onShowInvite);

    const handleIncomingNewInvite = (room) => {
      if (!room) return;
      if (isUserCounterpartyOfRoom(room, currentUser)) {
        const rId = room.id || room.orderNumber;
        if (rId) dismissedInvitesRef.current.delete(rId);
        const rem = computeInviteSecondsLeft(room);
        if (rem > 0) {
          setIsInvitationModalOpen(false);
          if (active === "Payment Invitation") setActive("Home");
          setPendingInviteModal({
            ...room,
            secondsLeft: rem,
            status: "pending_invite",
            is_expired: false,
          });
        }
      }
    };

    const handleIncomingResent = (detail) => {
      const room = detail?.room || detail;
      if (!room) return;
      if (isUserCounterpartyOfRoom(room, currentUser)) {
        const rId = room.id || room.orderNumber;
        if (rId) dismissedInvitesRef.current.delete(rId);
        const rem = computeInviteSecondsLeft(room);
        setPendingInviteModal({
          ...room,
          secondsLeft: rem,
          status: "pending_invite",
          is_expired: rem <= 0,
        });
      }
    };

    const onResent = (e) => handleIncomingResent(e.detail);
    window.addEventListener("paykudi_invite_resent", onResent);

    const onInviteKilled = (e) => {
      const killedId = e.detail?.id || e.detail?.roomId;
      if (killedId) {
        cancelledRoomsRef.current.add(killedId);
        dismissedInvitesRef.current.add(killedId);
        try {
          const list = JSON.parse(sessionStorage.getItem("paykudi_cancelled_rooms") || "[]");
          list.push(killedId);
          sessionStorage.setItem("paykudi_cancelled_rooms", JSON.stringify([...new Set(list)]));
        } catch (_) {}

        setActiveRoom((curr) => {
          if (curr && (curr.id === killedId || curr.orderNumber === killedId || curr.order_number === killedId)) {
            setIsInvitationModalOpen(false);
            try {
              localStorage.removeItem("paykudi_active_pre_payment_room");
            } catch (_) {}
            return null;
          }
          return curr;
        });

        setIsInvitationModalOpen((curr) => {
          try {
            const stored = JSON.parse(localStorage.getItem("paykudi_active_pre_payment_room") || "{}");
            if (stored && (stored.id === killedId || stored.orderNumber === killedId || stored.order_number === killedId)) {
              localStorage.removeItem("paykudi_active_pre_payment_room");
              return false;
            }
          } catch (_) {}
          return curr;
        });

        if (active === "Payment Invitation") {
          setActive("Home");
        }

        setPendingInviteModal((curr) => {
          if (curr && (curr.id === killedId || curr.orderNumber === killedId || curr.order_number === killedId)) {
            return null;
          }
          return curr;
        });
      }
    };
    window.addEventListener("paykudi_invite_killed", onInviteKilled);

    let bc;
    try {
      bc = new BroadcastChannel("paykudi_sync_channel");
      bc.onmessage = (msg) => {
        if (msg.data?.type === "paykudi_new_invite") {
          handleIncomingNewInvite(msg.data.room);
        } else if (msg.data?.type === "paykudi_invite_resent") {
          handleIncomingResent(msg.data.detail);
        } else if (msg.data?.type === "paykudi_invite_killed") {
          onInviteKilled({ detail: { id: msg.data.id || msg.data.roomId } });
        }
      };
    } catch (e) {}

    let onSocketNewInvite;
    let onSocketKilled;
    const s = getSocket();
    if (s) {
      onSocketNewInvite = (data) => {
        handleIncomingNewInvite(data?.room || data);
      };
      onSocketKilled = (data) => {
        onInviteKilled({ detail: { id: data?.roomId || data?.id } });
      };
      s.on("paykudi_new_invite", onSocketNewInvite);
      s.on("room_killed", onSocketKilled);
      s.on("paykudi_invite_killed", onSocketKilled);
    }

    const onStorage = (e) => {
      if (e.key === "paykudi_last_new_invite" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleIncomingNewInvite(parsed);
        } catch (err) {}
      } else if (e.key === "paykudi_last_invite_resent" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleIncomingResent(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      window.removeEventListener("paykudi_show_invite_modal", onShowInvite);
      window.removeEventListener("paykudi_invite_resent", onResent);
      window.removeEventListener("paykudi_invite_killed", onInviteKilled);
      window.removeEventListener("storage", onStorage);
      if (s && onSocketNewInvite) {
        s.off("paykudi_new_invite", onSocketNewInvite);
      }
      if (bc) bc.close();
    };
  }, [isLoggedIn, currentUser, isMobile, active]);

  const handleDeclineCounterpartyInvite = (declinedInvite) => {
    const id = declinedInvite?.id || declinedInvite?.orderNumber || pendingInviteModal?.id || pendingInviteModal?.orderNumber;
    if (id) {
      dismissedInvitesRef.current.add(id);
      try {
        sessionStorage.setItem("paykudi_dismissed_invites", JSON.stringify([...dismissedInvitesRef.current]));
      } catch (e) {}
    }
    setPendingInviteModal(null);
  };

  const handleAcceptCounterpartyInvite = async (acceptedRoom) => {
    const id = acceptedRoom?.id || acceptedRoom?.orderNumber || pendingInviteModal?.id || pendingInviteModal?.orderNumber;
    if (id) {
      acceptedInvitesRef.current.add(id);
      dismissedInvitesRef.current.add(id);
      try {
        sessionStorage.setItem("paykudi_dismissed_invites", JSON.stringify([...dismissedInvitesRef.current]));
      } catch (e) {}
    }
    const inviteSource = pendingInviteModal || {};
    // Officially create active payment room now that it is accepted
    const roomToCreate = {
      ...inviteSource,
      ...acceptedRoom,
      title: acceptedRoom?.title || acceptedRoom?.item || inviteSource?.title || inviteSource?.item || "Payment Item",
      item: acceptedRoom?.item || acceptedRoom?.title || inviteSource?.item || inviteSource?.title || "Payment Item",
      amount: acceptedRoom?.amount || acceptedRoom?.price || inviteSource?.amount || inviteSource?.price || "₦0.00",
      price: acceptedRoom?.price || acceptedRoom?.amount || inviteSource?.price || inviteSource?.amount || "₦0.00",
      sellerName: acceptedRoom?.sellerName || inviteSource?.sellerName,
      buyerName: acceptedRoom?.buyerName || inviteSource?.buyerName,
      creator: acceptedRoom?.creator || inviteSource?.creator,
      counterparty: acceptedRoom?.counterparty || inviteSource?.counterparty,
      status: "awaiting_payment",
      statusText: "Awaiting Payment",
      category: "ongoing",
      counterpartyJoined: true,
      counterparty_joined: true,
    };

    // Notify local backend of room acceptance so it moves out of pre_payment_rooms table
    if (id) {
      try {
        fetch(`http://localhost:8000/auth/pre-payment-rooms/${encodeURIComponent(id)}/accept`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: currentUser?.full_name || currentUser?.username || "Counterparty" }),
        }).catch(() => {});
      } catch (e) {}
    }


    await handleAddPaymentRoom(roomToCreate);


    // Dispatch window event so creator's screen immediately unlocks
    window.dispatchEvent(
      new CustomEvent("paykudi_invite_accepted", {
        detail: roomToCreate,
      })
    );

    // Clear invite modal and open the payment room
    setPendingInviteModal(null);
    setActiveRoom(roomToCreate);
    setActive("Payment room");
  };

  const isCreatorPrePaymentActive = Boolean(
    activeRoom &&
    isUserCreatorOfRoom(activeRoom, currentUser) &&
    !activeRoom.creator_proceeded &&
    !activeRoom.creatorProceeded &&
    activeRoom.status !== "completed" &&
    activeRoom.status !== "awaiting_payment"
  );

  // Derive modal-open state directly from React state — no DOM polling needed.
  const isModalOpenOnDesktop =
    isPaymentModalOpen ||
    active === "New Payment" ||
    isInvitationModalOpen ||
    isCreatorPrePaymentActive ||
    active === "Payment Invitation" ||
    isTermsModalOpen ||
    isWithdrawModalOpen ||
    active === "Withdraw" ||
    active === "Payout" ||
    !!pendingInviteModal ||
    !!selectedDesktopActivityReceipt;

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

  if (isAuthChecking) {
    return <GlowingLogoLoader dark={dark} layout="desktop" />;
  }

  return (
    <>
      {!isLoggedIn ? (
        <LoginPage
          dark={false}
          onLogin={(userData) => {
            try {
              localStorage.setItem("paykudi_is_logged_in", "true");
            } catch (_) {}
            setIsLoggedIn(true);
            setActive("Home");
            const { fullName, firstName, initial } = extractUserNames(userData?.name);
            const phone = userData?.phone ? formatAccountId(userData.phone) : (currentUser?.phone || "");
            const email = userData?.email || userData?.user?.email || "";
            const username = (userData?.username || userData?.user?.username || (fullName ? fullName.toLowerCase().replace(/[^a-z0-9]/g, "") : "")).replace(/^@/, "");
            const accountId = formatAccountId(phone);
            const avatarColor = userData?.avatar_color || userData?.avatarColor || userData?.user?.avatar_color || getUserAvatarStyle({ username, phone, fullName }).backgroundColor;
            setCurrentUser({ fullName, firstName, initial, phone, email, username, accountId, avatar_color: avatarColor, avatarColor });
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
                  username,
                  account_id: accountId,
                  avatar_color: avatarColor,
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
          isModalOpen={isModalOpenOnDesktop}
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
                    if (name !== active) {
                      setIsDesktopPageLoading(true);
                      if (name === "Payment room") {
                        setActiveRoom(null);
                      }
                      setActive(name);
                      setIsPaymentModalOpen(false);
                      setIsInvitationModalOpen(false);
                      setIsTermsModalOpen(false);
                      setIsWithdrawModalOpen(false);
                      window.scrollTo({ top: 0, behavior: "instant" });
                      setTimeout(() => {
                        setIsDesktopPageLoading(false);
                      }, 360);
                    }
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
              if (active !== "Profile") {
                setIsDesktopPageLoading(true);
                setTimeout(() => setIsDesktopPageLoading(false), 360);
              }
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
      {(isDesktopPageLoading || dash?.isLoadingDB) && active !== "New Payment" ? (
        <main className="desktop-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 120px)" }}>
          <GlowingLogoLoader dark={dark} layout="desktop" />
        </main>
      ) : active === "Activity" ? (
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
        !isMobile && (
          <DesktopPaymentRoom
            rooms={paymentRooms}
            currentUser={currentUser}
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
                setIsDesktopPageLoading(true);
                setTimeout(() => setIsDesktopPageLoading(false), 260);
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
        )
      ) : active === "Help" || active === "Help & support" ? (
        <DesktopHelp />
      ) : active === "Profile" ? (
        <DesktopProfile user={currentUser} userName={currentUser?.fullName || "Howard Ukah-Columba"} username={currentUser?.username} dark={dark} onSignOut={handleSignOut} layout="split" />
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
      {!isMobile && (isPaymentModalOpen || active === "New Payment") && (
        <DesktopNewPayment
          currentUser={currentUser}
          onCancel={() => {
            setIsPaymentModalOpen(false);
            if (active === "New Payment") setActive("Home");
          }}
          onSuccess={(created) => {
            if (created) {
              setActiveRoom(created);
              try {
                localStorage.setItem("paykudi_active_pre_payment_room", JSON.stringify(created));
              } catch (_) {}
              // Do NOT create in active payment rooms table until counterparty accepts!
              savePrePaymentRoomToDB(created);
              emitSendInviteSocket(created);
              try {
                const bc = new BroadcastChannel("paykudi_sync_channel");
                bc.postMessage({ type: "paykudi_new_invite", room: created });
              } catch (_) {}
              try {
                localStorage.setItem("paykudi_last_new_invite", JSON.stringify(created));
              } catch (_) {}
              try {
                fetch("http://localhost:8000/auth/pre-payment-rooms", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(created),
                }).catch(() => {});
              } catch (e) {}
            }
            setIsPaymentModalOpen(false);
            if (active === "New Payment") setActive("Home");
            setIsInvitationModalOpen(true);
          }}
          onOpenInvitation={(created) => {
            setIsPaymentModalOpen(false);
            if (active === "New Payment") setActive("Home");
            if (created) {
              setActiveRoom(created);
              try {
                localStorage.setItem("paykudi_active_pre_payment_room", JSON.stringify(created));
              } catch (_) {}
              // Do NOT create in active payment rooms table until counterparty accepts!
              savePrePaymentRoomToDB(created);
              emitSendInviteSocket(created);
              try {
                const bc = new BroadcastChannel("paykudi_sync_channel");
                bc.postMessage({ type: "paykudi_new_invite", room: created });
              } catch (_) {}
              try {
                localStorage.setItem("paykudi_last_new_invite", JSON.stringify(created));
              } catch (_) {}
              try {
                fetch("http://localhost:8000/auth/pre-payment-rooms", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(created),
                }).catch(() => {});
              } catch (e) {}
            }
            setIsInvitationModalOpen(true);
          }}
        />
      )}

      {/* Desktop Payment Invitation Modal (same modal size as New Payment modal, compulsory until Proceed) */}
      {!isMobile && ((isCreatorPrePaymentActive || isInvitationModalOpen || active === "Payment Invitation") && activeRoom && isUserCreatorOfRoom(activeRoom, currentUser) && !isUserCounterpartyOfRoom(activeRoom, currentUser)) && (
        <DesktopPaymentInvitationModal
          room={activeRoom}
          onProceed={async (proceedRoom) => {
            try {
              localStorage.removeItem("paykudi_active_pre_payment_room");
            } catch (_) {}
            setIsInvitationModalOpen(false);
            const target = proceedRoom || activeRoom || {};
            const updated = {
              ...target,
              status: "awaiting_payment",
              statusText: "Awaiting Payment",
              category: "ongoing",
              creator_proceeded: true,
              creatorProceeded: true,
            };
            setActiveRoom(updated);
            try {
              if (dash?.addPaymentRoom) {
                await dash.addPaymentRoom(updated);
              } else {
                await handleAddPaymentRoom(updated);
              }
            } catch (e) {}
            setActive("Awaiting Payment");
          }}
          onCreateNewRoom={() => {
            try {
              localStorage.removeItem("paykudi_active_pre_payment_room");
            } catch (_) {}
            setIsInvitationModalOpen(false);
            setActiveRoom(null);
            setIsPaymentModalOpen(true);
            setActive("New Payment");
          }}
          onCancel={(cancelledRoom) => {
            const targetId = cancelledRoom?.id || cancelledRoom?.orderNumber || cancelledRoom?.order_number || activeRoom?.id || activeRoom?.orderNumber || activeRoom?.order_number;
            if (targetId) {
              cancelledRoomsRef.current.add(targetId);
              dismissedInvitesRef.current.add(targetId);
              try {
                const list = JSON.parse(sessionStorage.getItem("paykudi_cancelled_rooms") || "[]");
                list.push(targetId);
                sessionStorage.setItem("paykudi_cancelled_rooms", JSON.stringify([...new Set(list)]));
              } catch (_) {}
            }
            setActiveRoom(null);
            setIsInvitationModalOpen(false);
            try {
              localStorage.removeItem("paykudi_active_pre_payment_room");
            } catch (_) {}
            setActive("Home");
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
              activeRoom.category = "ongoing";
              activeRoom.status = "awaiting_payment";
              activeRoom.statusText = "Awaiting Payment";
            }
            setActive("Awaiting Payment");
          }}
          room={activeRoom || {}}
          sellerName={activeRoom?.sellerName}
          buyerName={activeRoom?.buyerName}
          role={role}
          currentUser={currentUser}
        />
      )}

      {/* Desktop Withdraw Modal (pops up in the middle of home screen) */}
      {!isMobile && (isWithdrawModalOpen || active === "Withdraw" || active === "Payout") && (
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

      {/* Mobile Screen Dashboard (rendered when on mobile device viewport) */}
      {isMobile && (
        <MobileDashboard
          dark={dark}
          isModalOpen={isModalOpenOnDesktop}
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
      )}

      <ReceiptModal
        isOpen={!!selectedDesktopActivityReceipt}
        onClose={() => setSelectedDesktopActivityReceipt(null)}
        item={selectedDesktopActivityReceipt}
      />

      {/* Counterparty Accept Invitation Modal */}
      {pendingInviteModal && (
        <AcceptInviteModal
          key={`${pendingInviteModal.id || pendingInviteModal.orderNumber || "invite"}_${pendingInviteModal.resent_at || pendingInviteModal.updated_at || ""}`}
          invite={pendingInviteModal}
          onAccept={handleAcceptCounterpartyInvite}
          onDecline={handleDeclineCounterpartyInvite}
        />
      )}
    </div>
      )}
    </>
  );
}

