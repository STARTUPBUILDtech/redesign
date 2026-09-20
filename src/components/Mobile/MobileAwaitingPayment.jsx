import { useState, useEffect } from "react";
import "../../styles/mobile-awaiting-payment.css";

export default function MobileAwaitingPayment({
  room = {},
  onBack,
  onPaymentConfirmed,
}) {
  // 117s countdown timer as shown in reference image
  const [seconds, setSeconds] = useState(117);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [toastText, setToastText] = useState(null);

  // Chat message state
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: "seller",
      text: "Hello Amaka! Your order is packaged and ready for dispatch as soon as payment is confirmed.",
      time: "10:41 AM",
    },
    {
      id: 2,
      sender: "buyer",
      text: "Making payment to GTBank escrow account right now!",
      time: "10:42 AM",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Countdown timer effect
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  // Order data matching reference image
  const orderNumber = "ORD-603607";
  const orderAmount = "₦1,000,000";
  const youPayAmount = "₦10,15,300";
  const bankName = "Guaranteed Trust Bank (GTBank)";
  const accountName = "PayKudi(08032001585)";
  const accountNumber = "903370574";
  const sellerName = "08032001585";
  const itemName = room.item || room.title || "Iphone 18 Pro Max";

  const handleCopy = (text, label) => {
    try {
      navigator.clipboard?.writeText(text);
      setCopiedKey(label);
      showToast(`Copied ${label}`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopiedKey(label);
      showToast(`Copied ${label}`);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const showToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(null), 2000);
  };

  const handlePaymentClick = () => {
    setIsPaymentConfirmed(true);
    showToast("Payment confirmation submitted!");
    if (onPaymentConfirmed) onPaymentConfirmed();
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: "buyer",
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setChatInput("");
  };

  return (
    <div className="mobile-awaiting-payment-screen">
      {/* ── Top Header ── */}
      <header className="ap-top-header">
        <div className="ap-header-left">
          <button
            type="button"
            className="ap-back-btn"
            onClick={onBack}
            aria-label="Back to Payment Rooms"
            title="Back"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>
              chevron_left
            </span>
          </button>
          <h1 className="ap-header-title">Awaiting Payment</h1>
        </div>

        <div className="ap-header-actions">
          <button
            type="button"
            className="ap-help-btn"
            onClick={() => setIsHelpOpen(true)}
            aria-label="Help"
            title="Help"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              help_outline
            </span>
          </button>
          <button
            type="button"
            className="ap-chat-btn"
            onClick={() => setIsChatOpen(true)}
            aria-label="Chat"
          >
            <span className="material-symbols-outlined">chat</span>
            <span>Chat</span>
          </button>
        </div>
      </header>

      {/* ── Content Body ── */}
      <main className="ap-content-body">
        {/* ── ORDER AMOUNT & STATUS BANNER CARD ── */}
        <section className="ap-banner-card" aria-label="Order summary">
          {/* Top Row: ORDER AMOUNT + TIMER */}
          <div className="ap-banner-top-row">
            <div className="ap-amount-col">
              <span className="ap-sublabel">ORDER AMOUNT</span>
              <h2 className="ap-amount-value">{orderAmount}</h2>
            </div>
            <div className="ap-timer-badge">
              <span>{seconds}s</span>
            </div>
          </div>

          {/* Divider */}
          <div className="ap-banner-divider" />

          {/* Bottom Row: ORDER STATUS with 5 steps */}
          <div className="ap-stepper-wrap">
            <span className="ap-sublabel">ORDER STATUS</span>
            <div className="ap-stepper-row">
              {/* Step 1: Payment (Active) */}
              <div className="ap-step-col">
                <div className="ap-step-circle-active">1</div>
                <span className="ap-step-name">Payment</span>
              </div>

              {/* Step 2: Received */}
              <div className="ap-step-col">
                <div className="ap-step-circle-inactive">2</div>
                <span className="ap-step-name">Received</span>
              </div>

              {/* Step 3: In Transit */}
              <div className="ap-step-col">
                <div className="ap-step-circle-inactive">3</div>
                <span className="ap-step-name">In Transit</span>
              </div>

              {/* Step 4: Delivered */}
              <div className="ap-step-col">
                <div className="ap-step-circle-inactive">4</div>
                <span className="ap-step-name">Delivered</span>
              </div>

              {/* Step 5: Completed */}
              <div className="ap-step-col">
                <div className="ap-step-circle-inactive">5</div>
                <span className="ap-step-name">Completed</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── PROCEED TO MAKE PAYMENT ── */}
        <div className="ap-section-title">PROCEED TO MAKE PAYMENT</div>

        <div className="ap-details-list" role="list">
          {/* Field 1: Order Number */}
          <div className="ap-field-row" role="listitem">
            <div className="ap-field-left">
              <span className="ap-field-label">Order Number</span>
              <span className="ap-field-val">{orderNumber}</span>
            </div>
            <button
              type="button"
              className={`ap-copy-btn ${copiedKey === "Order Number" ? "copied" : ""}`}
              onClick={() => handleCopy(orderNumber, "Order Number")}
              aria-label="Copy Order Number"
              title="Copy"
            >
              <span className="material-symbols-outlined">
                {copiedKey === "Order Number" ? "check" : "content_copy"}
              </span>
            </button>
          </div>

          {/* Field 2: You Pay */}
          <div className="ap-field-row" role="listitem">
            <div className="ap-field-left">
              <span className="ap-field-label">You Pay</span>
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span className="ap-you-pay-val">{youPayAmount}</span>
                <span className="ap-charges-note">(Incl Charges)</span>
              </div>
            </div>
            <button
              type="button"
              className={`ap-copy-btn ${copiedKey === "You Pay" ? "copied" : ""}`}
              onClick={() => handleCopy(youPayAmount, "You Pay")}
              aria-label="Copy Amount"
              title="Copy"
            >
              <span className="material-symbols-outlined">
                {copiedKey === "You Pay" ? "check" : "content_copy"}
              </span>
            </button>
          </div>

          {/* Field 3: Bank */}
          <div className="ap-field-row" role="listitem">
            <div className="ap-field-left">
              <span className="ap-field-label">Bank</span>
              <span className="ap-field-val">{bankName}</span>
            </div>
            <button
              type="button"
              className={`ap-copy-btn ${copiedKey === "Bank" ? "copied" : ""}`}
              onClick={() => handleCopy(bankName, "Bank")}
              aria-label="Copy Bank"
              title="Copy"
            >
              <span className="material-symbols-outlined">
                {copiedKey === "Bank" ? "check" : "content_copy"}
              </span>
            </button>
          </div>

          {/* Field 4: Account Name */}
          <div className="ap-field-row" role="listitem">
            <div className="ap-field-left">
              <span className="ap-field-label">Account Name</span>
              <span className="ap-field-val">{accountName}</span>
            </div>
            <button
              type="button"
              className={`ap-copy-btn ${copiedKey === "Account Name" ? "copied" : ""}`}
              onClick={() => handleCopy(accountName, "Account Name")}
              aria-label="Copy Account Name"
              title="Copy"
            >
              <span className="material-symbols-outlined">
                {copiedKey === "Account Name" ? "check" : "content_copy"}
              </span>
            </button>
          </div>

          {/* Field 5: Account Number */}
          <div className="ap-field-row" role="listitem">
            <div className="ap-field-left">
              <span className="ap-field-label">Account Number</span>
              <span className="ap-field-val">{accountNumber}</span>
            </div>
            <button
              type="button"
              className={`ap-copy-btn ${copiedKey === "Account Number" ? "copied" : ""}`}
              onClick={() => handleCopy(accountNumber, "Account Number")}
              aria-label="Copy Account Number"
              title="Copy"
            >
              <span className="material-symbols-outlined">
                {copiedKey === "Account Number" ? "check" : "content_copy"}
              </span>
            </button>
          </div>

          {/* Field 6: Seller's Name */}
          <div className="ap-field-row" role="listitem">
            <div className="ap-field-left">
              <span className="ap-field-label">Seller's Name</span>
              <span className="ap-field-val">{sellerName}</span>
            </div>
            <button
              type="button"
              className={`ap-copy-btn ${copiedKey === "Seller Name" ? "copied" : ""}`}
              onClick={() => handleCopy(sellerName, "Seller Name")}
              aria-label="Copy Seller Name"
              title="Copy"
            >
              <span className="material-symbols-outlined">
                {copiedKey === "Seller Name" ? "check" : "content_copy"}
              </span>
            </button>
          </div>
        </div>

        {/* ── Order details dropdown ── */}
        <div className="ap-accordion-wrap">
          <button
            type="button"
            className="ap-order-details-trigger"
            onClick={() => setIsDetailsOpen((prev) => !prev)}
            aria-expanded={isDetailsOpen}
          >
            <span>Order details</span>
            <span
              className={`material-symbols-outlined ap-details-chevron ${
                isDetailsOpen ? "expanded" : ""
              }`}
            >
              expand_more
            </span>
          </button>

          {isDetailsOpen && (
            <div className="ap-accordion-dropdown">
              <div className="ap-acc-row">
                <span className="ap-acc-key">Item:</span>
                <span className="ap-acc-val">{itemName}</span>
              </div>
              <div className="ap-acc-row">
                <span className="ap-acc-key">Base Amount:</span>
                <span className="ap-acc-val">{orderAmount}</span>
              </div>
              <div className="ap-acc-row">
                <span className="ap-acc-key">Escrow Fee (Charges):</span>
                <span className="ap-acc-val">₦15,300</span>
              </div>
              <div className="ap-acc-row" style={{ paddingTop: 6, borderTop: "1px solid var(--line, #e5e7eb)" }}>
                <span className="ap-acc-key" style={{ fontWeight: 700, color: "var(--ink, #161618)" }}>
                  Total:
                </span>
                <span className="ap-acc-val" style={{ color: "#19a66c" }}>
                  {youPayAmount}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Primary Action Button: I Have Made Payment ── */}
        <div className="ap-cta-container">
          <button
            type="button"
            className={`ap-primary-payment-btn ${isPaymentConfirmed ? "confirmed" : ""}`}
            onClick={handlePaymentClick}
          >
            {isPaymentConfirmed ? "Payment Confirmed" : "I Have Made Payment"}
          </button>
        </div>

        {/* ── Footer Protection Disclaimer ── */}
        <footer className="ap-footer-note">
          <span>Your payment is protected by <strong>PayKudi</strong></span>
          <span
            className="material-symbols-outlined ap-footer-info-icon"
            onClick={() => setIsInfoOpen(true)}
            title="Learn more"
          >
            info
          </span>
        </footer>
      </main>

      {/* ── Modals ── */}
      {/* Chat Modal */}
      {isChatOpen && (
        <div className="ap-modal-backdrop" onClick={() => setIsChatOpen(false)}>
          <div className="ap-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3>Chat with Seller ({sellerName})</h3>
              <button
                type="button"
                className="ap-modal-close"
                onClick={() => setIsChatOpen(false)}
                aria-label="Close"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div className="ap-chat-list">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`ap-chat-msg ${msg.sender}`}>
                  <p style={{ margin: 0 }}>{msg.text}</p>
                  <span style={{ fontSize: 10, opacity: 0.7, display: "block", textAlign: "right", marginTop: 2 }}>
                    {msg.time}
                  </span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendChat} className="ap-chat-form">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="ap-chat-input"
              />
              <button type="submit" className="ap-chat-send" disabled={!chatInput.trim()}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="ap-modal-backdrop" onClick={() => setIsHelpOpen(false)}>
          <div className="ap-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3>Payment Help & Guide</h3>
              <button
                type="button"
                className="ap-modal-close"
                onClick={() => setIsHelpOpen(false)}
                aria-label="Close"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
              <p>
                <strong>1. Transfer to Escrow:</strong> Transfer exactly <strong>{youPayAmount}</strong> to the PayKudi dedicated account shown on screen.
              </p>
              <p>
                <strong>2. Confirm Transfer:</strong> Once you make the transfer via your bank app, tap <strong>"I Have Made Payment"</strong>.
              </p>
              <p>
                <strong>3. Escrow Holds Funds:</strong> PayKudi holds the funds safely until you receive and confirm your item.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Protection Info Modal */}
      {isInfoOpen && (
        <div className="ap-modal-backdrop" onClick={() => setIsInfoOpen(false)}>
          <div className="ap-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3>PayKudi Escrow Protection</h3>
              <button
                type="button"
                className="ap-modal-close"
                onClick={() => setIsInfoOpen(false)}
                aria-label="Close"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
              <p>
                Every transaction on PayKudi is backed by 100% money-back escrow protection:
              </p>
              <ul style={{ paddingLeft: 20, margin: "8px 0" }}>
                <li>Zero risk of fraud or non-delivery</li>
                <li>Seller only receives funds when you inspect and confirm</li>
                <li>24/7 dispute resolution and full refund support</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastText && <div className="ap-toast">{toastText}</div>}
    </div>
  );
}
