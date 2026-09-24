import { useState, useEffect, useRef } from "react";
import "../../styles/mobile-awaiting-payment.css";
import HelpDrawer from "../Shared/HelpDrawer";
import ChatDrawer from "../Shared/ChatDrawer";

export default function MobileAwaitingPayment({
  room = {},
  onBack,
  onPaymentConfirmed,
}) {
  // 117s countdown timer as shown in reference image
  const [seconds, setSeconds] = useState(117);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isArrowUp, setIsArrowUp] = useState(false);
  const [isLifting, setIsLifting] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [toastText, setToastText] = useState(null);
  const screenRef = useRef(null);

  useEffect(() => {
    if (isChatOpen) {
      if (screenRef.current) {
        screenRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    }
  }, [isChatOpen]);

  // Countdown timer effect
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  // Order data matching reference image
  const orderNumber = room.id || room.orderNumber || "ORD-603607";
  const orderAmount = room.amount || room.price || "₦1,000,000";
  const youPayAmount = room.totalAmount || "₦1,015,300";
  const bankName = room.bank || "Guaranteed Trust Bank (GTBank)";
  const accountName = room.accountName || "PayKudi(08032001585)";
  const accountNumber = room.accountNumber || "903370574";
  const sellerName = room.sellerName || "08032001585";
  const itemName = room.item || room.title || "Iphone 18 Pro Max";
  const variantText = room.variant || "Color, Ram size, Storage";

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

  const handleToggleDetails = () => {
    if (isLifting) return;
    if (!isDetailsOpen) {
      setIsLifting(true);
      setIsArrowUp(true);
      setTimeout(() => {
        setIsDetailsOpen(true);
      }, 300);
      setTimeout(() => {
        setIsLifting(false);
      }, 950);
    } else {
      setIsDetailsOpen(false);
      setIsArrowUp(false);
    }
  };

  const handleCloseDetails = () => {
    if (isLifting) return;
    setIsDetailsOpen(false);
    setIsArrowUp(false);
  };

  const handlePaymentClick = () => {
    setIsPaymentConfirmed(true);
    showToast("Payment confirmation submitted!");
    if (onPaymentConfirmed) onPaymentConfirmed();
  };

  return (
    <div
      ref={screenRef}
      className={`mobile-awaiting-payment-screen ${isChatOpen ? "chat-open" : ""} ${isHelpOpen ? "modal-open" : ""}`}
    >
      {/* ── Top Header (Hidden when chat is up or help is up) ── */}
      {!isChatOpen && !isHelpOpen && (
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
      )}

      {/* ── Content Body ── */}
      <div className="ap-content-body">
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

              {/* Dots 1 -> 2 */}
              <div className="ap-stepper-dots dots-muted" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>

              {/* Step 2: Received */}
              <div className="ap-step-col">
                <div className="ap-step-circle-inactive">2</div>
                <span className="ap-step-name">Received</span>
              </div>

              {/* Dots 2 -> 3 */}
              <div className="ap-stepper-dots dots-muted" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>

              {/* Step 3: In Transit */}
              <div className="ap-step-col">
                <div className="ap-step-circle-inactive">3</div>
                <span className="ap-step-name">In Transit</span>
              </div>

              {/* Dots 3 -> 4 */}
              <div className="ap-stepper-dots dots-muted" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>

              {/* Step 4: Delivered */}
              <div className="ap-step-col">
                <div className="ap-step-circle-inactive">4</div>
                <span className="ap-step-name">Delivered</span>
              </div>

              {/* Dots 4 -> 5 */}
              <div className="ap-stepper-dots dots-muted" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
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

        {/* ── Order details trigger ── */}
        <div className="ap-accordion-wrap">
          <button
            type="button"
            className={`ap-order-details-trigger ${isArrowUp ? "active" : ""}`}
            onClick={handleToggleDetails}
            aria-expanded={isArrowUp}
            disabled={isLifting}
            style={{ cursor: isLifting ? "default" : "pointer" }}
          >
            <span>Order details</span>
            <span className={`material-symbols-outlined ap-details-chevron ${isArrowUp ? "expanded" : ""}`}>
              expand_more
            </span>
          </button>
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
      </div>

      {/* ── Modals ── */}
      {/* Order Details Slide-Up Modal */}
      {isDetailsOpen && (
        <div
          className={`ap-bottom-sheet-backdrop ${isLifting ? "lifting" : ""}`}
          onClick={handleCloseDetails}
        >
          <div
            className="ap-bottom-sheet"
            onClick={(e) => e.stopPropagation()}
            onAnimationEnd={() => setIsLifting(false)}
          >
            {/* Drag Handle */}
            <div className="ap-sheet-handle" />

            {/* Header: Title + Order ID Pill + Close */}
            <div className="ap-sheet-header">
              <div className="ap-sheet-title-group">
                <h3 className="ap-sheet-title">Order Details</h3>
                <span className="ap-sheet-ord-pill">{orderNumber}</span>
              </div>
              <button
                type="button"
                className="ap-sheet-close-btn"
                onClick={handleCloseDetails}
                disabled={isLifting}
                aria-label="Close"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            {/* Item Info Box */}
            <div className="ap-sheet-item-card">
              <div className="ap-sheet-item-avatar">
                {room.image ? (
                  <img src={room.image} alt={itemName} className="ap-sheet-item-img" />
                ) : (
                  <span>{itemName.split(" ")[0]?.toUpperCase() || "IPHONE"}</span>
                )}
              </div>
              <div className="ap-sheet-item-info">
                <div className="ap-sheet-item-name">{itemName.toUpperCase()}</div>
                <div className="ap-sheet-item-sub">
                  {variantText}
                </div>
                <div className="ap-sheet-item-price">{orderAmount}</div>
              </div>
            </div>

            {/* Payment Breakdown Section */}
            <div className="ap-sheet-section">
              <div className="ap-sheet-section-title">PAYMENT BREAKDOWN</div>
              <div className="ap-sheet-breakdown-list">
                <div className="ap-sheet-row">
                  <span className="ap-sheet-row-label">Item Amount</span>
                  <span className="ap-sheet-row-val">{orderAmount}</span>
                </div>
                <div className="ap-sheet-row fee-row">
                  <span className="ap-sheet-row-label">Transaction fee (1.5%)</span>
                  <span className="ap-sheet-row-val">₦15,000</span>
                </div>
                <div className="ap-sheet-row fee-row">
                  <span className="ap-sheet-row-label">Convenience fee</span>
                  <span className="ap-sheet-row-val">₦300</span>
                </div>
                <div className="ap-sheet-divider" />
                <div className="ap-sheet-row total-row">
                  <span className="ap-sheet-row-label">Total</span>
                  <span className="ap-sheet-row-val">{youPayAmount}</span>
                </div>
              </div>
            </div>

            {/* Terms Agreed Section */}
            <div className="ap-sheet-section">
              <div className="ap-sheet-section-title">TERMS AGREED</div>
              <div className="ap-sheet-terms-list">
                {/* Term 1: Delivery Terms */}
                <div className="ap-sheet-term-item">
                  <div className="ap-sheet-term-icon delivery">
                    <span className="material-symbols-outlined">local_shipping</span>
                  </div>
                  <div className="ap-sheet-term-content">
                    <div className="ap-sheet-term-label">Delivery Terms</div>
                    <div className="ap-sheet-term-val">
                      Direct WhatsApp Delivery <span className="ap-sheet-term-sub">(2–3 business days)</span>
                    </div>
                  </div>
                </div>

                {/* Term 2: Inspection Window */}
                <div className="ap-sheet-term-item">
                  <div className="ap-sheet-term-icon inspection">
                    <span className="material-symbols-outlined">timer</span>
                  </div>
                  <div className="ap-sheet-term-content">
                    <div className="ap-sheet-term-label">Inspection Window</div>
                    <div className="ap-sheet-term-val">
                      2 Hours post-delivery <span className="ap-sheet-term-sub">(To confirm or dispute)</span>
                    </div>
                  </div>
                </div>

                {/* Term 3: Seller's Name */}
                <div className="ap-sheet-term-item">
                  <div className="ap-sheet-term-icon seller">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                  <div className="ap-sheet-term-content">
                    <div className="ap-sheet-term-label">Seller's Name</div>
                    <div className="ap-sheet-term-val">{sellerName}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat Slide-In Modal (Stops right under PayKudi header) ── */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        room={room}
        sellerName={sellerName}
        orderNumber={orderNumber}
      />

      {/* ── Help Drawer ── */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onOpenChat={() => setIsChatOpen(true)}
      />

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
