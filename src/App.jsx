import { useState, useRef, useEffect } from "react";
import paykudiLogo from "./assets/paykudi-logo.png";
import logoDarkMode from "./assets/logodarkmode.png";
import DesktopActivity from "./components/DesktopActivity.jsx";
import DesktopNewPayment from "./components/DesktopNewPayment.jsx";
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

// Header Actions matching C:\Users\abc\OneDrive\Videos\dashboard.html
function HeaderActions({ dark, onThemeToggle }) {
  return (
    <div className="header-actions">
      {/* Profile Avatar (matching #m-profile-sticky-avatar from dashboard.html) */}
      <div
        className="header-avatar-circle"
        aria-label="Open profile"
        title="Profile"
      >
        <span className="material-symbols-outlined avatar-icon">account_circle</span>
      </div>

      {/* Theme Toggle Button (matching dashboard.html) */}
      <button
        type="button"
        onClick={onThemeToggle}
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
}) {
  const contentScrollRef = useRef(null);

  const handleNavClick = (view) => {
    setActive(view);
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  };

  const isNoNav =
    active === "New Payment" ||
    active === "Payment Invitation" ||
    active === "Awaiting Payment" ||
    active === "Payment Received" ||
    active === "In Transit" ||
    active === "Confirm Delivery" ||
    active === "Confirm delivery" ||
    active === "Dispute Ongoing" ||
    active === "Dispute ongoing";

  return (
    <div className={`mobile-dashboard${isNoNav ? " no-nav-mode" : ""}`} data-appearance={dark ? "dark" : "light"}>
      <header className="mobile-header">
        <BrandLogo dark={dark} className="mobile-brand" />
        <HeaderActions
          dark={dark}
          onThemeToggle={onThemeToggle}
          role={role}
          onSwitchRole={() => setRole(role === "Buyer" ? "Seller" : "Buyer")}
        />
      </header>

      {active === "New Payment" ? (
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
          onProceed={() => handleNavClick("Home")}
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
                } else {
                  setActive("Payment Invitation");
                }
              }}
            />
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
                  <button type="button" className="mobile-secondary">Withdraw</button>
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
  const [visible, setVisible] = useState(true);
  const [active, setActive] = useState("Activity");
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

  const nav = [
    ["Home", HomeIcon],
    ["Activity", ActivityIcon],
    ["Payment room", PaymentRoomIcon],
    ["Help & support", HelpIcon],
    ["Profile", ProfileIcon],
  ];

  return (
    <div className="app" data-appearance={dark ? "dark" : "light"}>
      <header className="topbar">
        <BrandLogo dark={dark} className="brand" />
        <nav aria-label="Primary navigation">
          {nav.map(([name, NavIcon]) => (
            <button
              key={name}
              onClick={() => {
                setActive(name);
                setIsPaymentModalOpen(false);
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
        <div className="top-actions">
          <HeaderActions
            dark={dark}
            onThemeToggle={() => setDark(!dark)}
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
      ) : active === "Payment Invitation" ? (
        <main id="payment-room" className="desktop-container desktop-payment-room">
          <div className="desktop-payment-room-inner">
            <MobilePaymentInvitation
              room={{
                id: "ORD-482910",
                counterparty: "Alex Morgan",
                item: "Iphone 18 Pro Max",
                amount: "₦89,000",
                role: role === "Buyer" ? "Seller" : "Buyer",
              }}
              onCancel={() => setActive("Home")}
              onProceed={() => setActive("Home")}
              onShare={() => {}}
            />
          </div>
        </main>
      ) : active === "Awaiting Payment" ? (
        <main id="payment-room" className="desktop-container desktop-payment-room">
          <div className="desktop-payment-room-inner">
            <MobileAwaitingPayment
              room={activeRoom}
              onBack={() => setActive("Payment room")}
              onPaymentConfirmed={() => {}}
            />
          </div>
        </main>
      ) : active === "Dispute Ongoing" || active === "Dispute ongoing" ? (
        <main id="payment-room" className="desktop-container desktop-payment-room">
          <div className="desktop-payment-room-inner">
            <MobileDisputeOngoing
              room={activeRoom}
              onBack={() => setActive("Payment room")}
              role={role}
            />
          </div>
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
                <button className="secondary-button">Withdraw</button>
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
              handleAddPaymentRoom(created);
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
      />
    </div>
  );
}

