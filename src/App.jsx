import { useState, useRef, useEffect } from "react";
import paykudiLogo from "./assets/paykudi-logo.png";
import logoDarkMode from "./assets/logodarkmode.png";
import avatarIllustration from "./assets/avatar-illustration.png";
import LoginPage from "./components/Auth/LoginPage.jsx";
import DesktopActivity from "./components/DesktopActivity.jsx";
import DesktopNewPayment from "./components/DesktopNewPayment.jsx";
import DesktopPaymentInvitationModal from "./components/DesktopPaymentInvitationModal.jsx";
import DesktopPaymentRoom from "./components/DesktopPaymentRoom.jsx";
import DesktopPaymentRoomDetail from "./components/DesktopPaymentRoomDetail.jsx";
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
import { ALL_PAYMENT_ROOMS } from "./data/paymentRooms.js";

function BrandLogo({ dark, className }) {
  return (
    <a className={className} href="#home" aria-label="PayKudi home">
      <img
        src={dark ? logoDarkMode : paykudiLogo}
        alt="PayKudi"
        className={`brand-logo-img ${dark ? "logo-dark" : "logo-light"}`}
        style={{ height: "22px", maxHeight: "22px", width: "auto" }}
      />
    </a>
  );
}

// Header Actions with Theme Toggle and Avatar Dropdown Menu (matching target redesign)
function HeaderActions({
  dark,
  onThemeToggle,
  onOpenProfile,
  onSignOut,
  isProfileActive,
  hideAvatar,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const shouldHideAvatar = hideAvatar;

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
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="theme-moon-svg"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ) : (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
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
            title="Howard Ukah-Columba"
          >
            <div className="header-avatar-circle-h">H</div>
            <svg
              width="9"
              height="6"
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
                <div className="header-dropdown-avatar">H</div>
                <div className="header-dropdown-user-info">
                  <div className="header-dropdown-user-name">Howard Ukah-Columba</div>
                  <div className="header-dropdown-user-id">2032614152 · T3</div>
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
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L8.91 5.748a8.035 8.035 0 0 0-1.826 1.054l-1.83-1.056a1.875 1.875 0 0 0-2.28.385l-1.356 1.356a1.875 1.875 0 0 0-.385 2.28l1.056 1.83a8.034 8.034 0 0 0-1.054 1.826l-1.93.318A1.875 1.875 0 0 0 .5 12.922v1.918c0 .917.663 1.699 1.567 1.85l1.93.318c.28.66.634 1.274 1.054 1.826l-1.056 1.83a1.875 1.875 0 0 0 .385 2.28l1.356 1.356c.646.646 1.664.774 2.28.385l1.83-1.056c.552.42 1.166.774 1.826 1.054l.318 1.93c.151.904.933 1.567 1.85 1.567h1.918c.917 0 1.699-.663 1.85-1.567l.318-1.93a8.035 8.035 0 0 0 1.826-1.054l1.83 1.056a1.875 1.875 0 0 0 2.28-.385l1.356-1.356a1.875 1.875 0 0 0 .385-2.28l-1.056-1.83c.42-.552.774-1.166 1.054-1.826l1.93-.318c.904-.151 1.567-.933 1.567-1.85v-1.918c0-.917-.663-1.699-1.567-1.85l-1.93-.318a8.034 8.034 0 0 0-1.054-1.826l1.056-1.83a1.875 1.875 0 0 0-.385-2.28l-1.356-1.356a1.875 1.875 0 0 0-2.28-.385l-1.83 1.056a8.035 8.035 0 0 0-1.826-1.054l-.318-1.93A1.875 1.875 0 0 0 12.922 2.25h-1.844zM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5z" />
                      </svg>
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
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                      </svg>
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

const transactions = [
  { id: "tx-1", title: "Payment received", time: "Today, 10:42 AM", amount: "+₦145,000.00", type: "received" },
  { id: "tx-2", title: "Payment sent", time: "Yesterday, 4:18 PM", amount: "−₦85,000.00", type: "sent" },
  { id: "tx-3", title: "Payout sent", time: "Mon, 9:24 AM", amount: "₦24,000.00", type: "payout" },
  { id: "tx-4", title: "Refund sent", time: "Sun, 2:15 PM", amount: "−₦12,500.00", type: "refund" },
];

function getActivityConfig(item) {
  const t = (item.type || item.title || "").toLowerCase();
  if (t.includes("refund")) {
    return {
      iconClass: "act-icon-refund",
      amountClass: "act-val-refund",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14L4 9l5-5"></path>
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path>
        </svg>
      ),
    };
  }
  if (t.includes("payout") || t.includes("withdrawn") || t.includes("withdraw")) {
    return {
      iconClass: "act-icon-payout",
      amountClass: "act-val-payout",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"></path>
        </svg>
      ),
    };
  }
  if (t.includes("received")) {
    return {
      iconClass: "act-icon-received",
      amountClass: "act-val-received",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v16m0 0l-6-6m6 6l6-6"></path>
        </svg>
      ),
    };
  }
  return {
    iconClass: "act-icon-sent",
    amountClass: "act-val-sent",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"></path>
      </svg>
    ),
  };
}

function ActivityRow({ item, isLast }) {
  const cfg = getActivityConfig(item);
  return (
    <div className="activity-item-row" role="button" tabIndex={0}>
      <div className={`activity-item-icon ${cfg.iconClass}`}>
        {cfg.icon}
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

// Cardless & Centered Balance matching user screenshot
function PayKudiBalance({ visible, onToggleVisibility }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard?.writeText("2032614152");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="cardless-balance">
      {/* Top Meta: Bank icon · Nigerian Naira · Account Number · Copy Icon */}
      <div className="balance-account-bar">
        <span className="material-symbols-outlined balance-bank-icon">account_balance</span>
        <span className="balance-account-text">Nigerian Naira · 2032614152</span>
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
            {visible ? "₦182,000.00" : "••••••••"}
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

      {/* Timestamp */}
      <p className="balance-timestamp">Last updated 28 sec. ago</p>
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
}) {
  const contentScrollRef = useRef(null);

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
        <BrandLogo dark={dark} className="mobile-brand" />
        <HeaderActions
          dark={dark}
          onThemeToggle={onThemeToggle}
          role={role}
          onSwitchRole={() => setRole(role === "Buyer" ? "Seller" : "Buyer")}
          onOpenProfile={() => handleNavClick("Profile")}
          onSignOut={onSignOut}
          isProfileActive={active === "Profile"}
        />
      </header>

      {active === "Withdraw" || active === "Payout" ? (
        <MobileWithdraw
          onCancel={() => handleNavClick("Home")}
          onSuccess={() => {}}
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
          room={activeRoom}
          onCancel={() => handleNavClick("Home")}
          onProceed={() => handleNavClick("Awaiting Payment")}
          onShare={() => {}}
        />
      ) : active === "Awaiting Payment" ? (
        <MobileAwaitingPayment
          room={activeRoom}
          onBack={() => handleNavClick("Payment room")}
          onPaymentConfirmed={() => {}}
        />
      ) : active === "Payment Received" ? (
        <MobilePaymentReceived
          room={activeRoom}
          onBack={() => handleNavClick("Payment room")}
        />
      ) : active === "In Transit" ? (
        <MobileInTransit
          room={activeRoom}
          onBack={() => handleNavClick("Payment room")}
          role={role}
        />
      ) : active === "Confirm Delivery" || active === "Confirm delivery" ? (
        <MobileConfirmDelivery
          room={activeRoom}
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
          room={activeRoom}
          onBack={() => handleNavClick("Payment room")}
          role={role}
        />
      ) : active === "Completed" || active === "Payment Completed" ? (
        <MobileCompleted
          room={activeRoom}
          onBack={() => handleNavClick("Payment room")}
          role={role}
        />
      ) : (
        <div className="mobile-content-scroll" ref={contentScrollRef}>
          {active === "Activity" ? (
            <MobileActivity />
          ) : active === "Payment room" || active === "Payment Room" ? (
            <MobilePaymentRoom
              rooms={paymentRooms}
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
            <DesktopProfile userName="Amaka" onSignOut={onSignOut} />
          ) : (
            <div className="mobile-home-content">
              <div className="mobile-main mobile-main-top">
                <section className="mobile-intro">
                  <h1>Good morning, Amaka</h1>
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
                />
              </div>

              <main className="mobile-main mobile-main-bottom">
                <section className="mobile-activity" id="activity">
                  <div className="mobile-activity-head">
                    <h2>Recent activity</h2>
                    <a
                      href="#activity"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick("Activity");
                      }}
                    >
                      View all
                    </a>
                  </div>
                  <div className="boxless-activity-list">
                    {transactions.map((tx, idx) => (
                      <ActivityRow
                        key={tx.id || tx.title}
                        item={tx}
                        isLast={idx === transactions.length - 1}
                      />
                    ))}
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
    </div>
  );
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [visible, setVisible] = useState(true);
  const [active, setActive] = useState("Home");
  const [role, setRole] = useState("Buyer");
  const [activeRoom, setActiveRoom] = useState({
    id: "ORD-603607",
    orderNumber: "ORD-603607",
    counterparty: "08032001585",
    sellerName: "08032001585",
    item: "Iphone 18 Pro Max",
    amount: "₦1,000,000",
    price: "₦1,000,000",
    priceNumeric: 1000000,
    role: "Buying",
    status: "awaiting_payment",
    statusText: "Awaiting Payment",
    bank: "Guaranteed Trust Bank (GTBank)",
    accountName: "PayKudi(08032001585)",
    accountNumber: "903370574",
  });

  const [paymentRooms, setPaymentRooms] = useState(ALL_PAYMENT_ROOMS);
  const ongoingPaymentRoomsCount = paymentRooms.filter((r) => r.category === "ongoing").length;

  const handleAddPaymentRoom = (newRoom) => {
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
          onLogin={() => {
            setIsLoggedIn(true);
            setActive("Home");
          }}
        />
      ) : (
    <div className="app" data-appearance={dark ? "dark" : "light"}>
      <header className={`topbar ${isModalOpenOnDesktop ? "modal-active-topbar" : ""}`}>
        <BrandLogo dark={dark} className="brand" />
        {!isModalOpenOnDesktop && (
          <nav aria-label="Primary navigation">
            {nav.map(([name, NavIcon]) => (
              <button
                key={name}
                onClick={() => {
                  setActive(name);
                  setIsPaymentModalOpen(false);
                  setIsInvitationModalOpen(false);
                  setIsTermsModalOpen(false);
                  setIsWithdrawModalOpen(false);
                  window.scrollTo({ top: 0, behavior: "instant" });
                }}
                className={active === name ? "active" : ""}
              >
                <NavIcon
                  active={active === name}
                  count={name === "Payment room" ? ongoingPaymentRoomsCount : undefined}
                />
                <span>{name}</span>
              </button>
            ))}
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
          />
        </div>
      </header>

      {/* Desktop Views */}
      {active === "Activity" ? (
        <DesktopActivity />
      ) : active === "Payment room" || active === "Payment Room" ? (
        <DesktopPaymentRoom
          rooms={paymentRooms}
          role={role}
          onBackToHome={() => setActive("Home")}
        />
      ) : active === "Help" || active === "Help & support" ? (
        <DesktopHelp />
      ) : active === "Profile" ? (
        <DesktopProfile userName="Amaka" onSignOut={handleSignOut} />
      ) : active === "Awaiting Payment" ||
         active === "Payment Received" ||
         active === "In Transit" ||
         active === "Confirm Delivery" ||
         active === "Confirm delivery" ||
         active === "Dispute Ongoing" ||
         active === "Dispute ongoing" ||
         active === "Completed" ||
         active === "Payment Completed" ? (
        <main id="desktop-payment-room-detail" className="desktop-container desktop-prd-main-wrapper" style={{ padding: 0, maxWidth: "none", margin: 0 }}>
          <DesktopPaymentRoomDetail
            room={activeRoom || paymentRooms[0]}
            onBack={() => setActive("Payment room")}
            role={role}
            onPaymentConfirmed={() => {}}
          />
        </main>
      ) : (
        <main id="home" className="desktop-container">
          <div className="desktop-content-wrap desktop-intro-wrap">
            <section className="intro">
              <div>
                <h1>Good morning, Amaka</h1>
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
                  onClick={(e) => {
                    e.preventDefault();
                    setActive("Activity");
                  }}
                >
                  View all
                </a>
              </div>
              <div className="boxless-activity-list">
                {transactions.map((tx, idx) => (
                  <ActivityRow
                    key={tx.id || tx.title}
                    item={tx}
                    isLast={idx === transactions.length - 1}
                  />
                ))}
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
          room={activeRoom}
          onProceed={() => {
            setIsInvitationModalOpen(false);
            if (active === "Payment Invitation") setActive("Home");
            setIsTermsModalOpen(true);
          }}
          onShare={() => {}}
        />
      )}

      {/* Agree to Terms Modal (compulsory after Payment Invitation) */}
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
        room={activeRoom}
        sellerName={
          activeRoom?.sellerName ||
          (activeRoom?.role === "Selling" ? "Amaka Obi" : (activeRoom?.counterparty || "Howard Ukah"))
        }
      />

      {/* Desktop Withdraw Modal (pops up in the middle of home screen) */}
      {(isWithdrawModalOpen || active === "Withdraw" || active === "Payout") && (
        <DesktopWithdrawModal
          dark={dark}
          onClose={() => {
            setIsWithdrawModalOpen(false);
            if (active === "Withdraw" || active === "Payout") setActive("Home");
          }}
          onSuccess={() => {}}
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
      />
    </div>
      )}
    </>
  );
}

