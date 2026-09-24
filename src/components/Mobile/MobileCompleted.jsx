import { useState, useRef, useEffect } from "react";
import "../../styles/mobile-awaiting-payment.css";
import "../../styles/mobile-completed.css";
import ReceiptModal from "../Shared/ReceiptModal";
import HelpDrawer from "../Shared/HelpDrawer";
import ProtectionInfoModal from "../Shared/ProtectionInfoModal";
import ChatDrawer from "../Shared/ChatDrawer";
import OrderDetailsModal from "../Shared/OrderDetailsModal";
import ReceiptIcon from "../Shared/ReceiptIcon";

export default function MobileCompleted({
  room = {},
  onBack,
  role = "Buying",
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isArrowUp, setIsArrowUp] = useState(false);
  const [isLifting, setIsLifting] = useState(false);

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
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

  const showToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(null), 3500);
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedKey(key);
        showToast(`Copied ${key} to clipboard`);
        setTimeout(() => setCopiedKey(null), 2000);
      })
      .catch(() => {
        showToast("Failed to copy to clipboard");
      });
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

  const orderNumber = room.id || room.orderNumber || "ORD-192834";
  const orderAmount = room.amount || room.price || "₦145,000";
  const sellerName = room.sellerName || room.counterparty || "Sneaker Plug";
  const youPaidAmount = room.youPaid || (orderAmount.startsWith("₦") ? orderAmount : `₦${orderAmount}`);
  const itemName = room.item || room.title || "Item Order";

  return (
    <div
      ref={screenRef}
      className={`mobile-awaiting-payment-screen ${isChatOpen ? "chat-open" : ""} ${isHelpOpen ? "modal-open" : ""}`}
    >
      {/* ── Top Header (Exact structure as MobileAwaitingPayment) ── */}
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
            <h1 className="ap-header-title">Completed</h1>
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

      {/* ── Content Body (Exact structure as MobileAwaitingPayment) ── */}
      <div className="ap-content-body">
        {/* ── ORDER AMOUNT & STATUS BANNER CARD ── */}
        <section className="ap-banner-card comp-banner-card" aria-label="Order summary">
          {/* Top Row: ORDER AMOUNT + RECEIPT BUTTON */}
          <div className="ap-banner-top-row">
            <div className="ap-amount-col">
              <span className="ap-sublabel">ORDER AMOUNT</span>
              <h2 className="ap-amount-value">{orderAmount}</h2>
            </div>
            <button
              type="button"
              className="comp-receipt-btn"
              onClick={() => setIsReceiptOpen(true)}
              aria-label="View Receipt"
            >
              <ReceiptIcon size={15} />
              <span>Receipt</span>
            </button>
          </div>

          {/* Divider */}
          <div className="ap-banner-divider" />

          {/* Bottom Row: ORDER STATUS with 5 steps horizontally aligned */}
          <div className="ap-stepper-wrap">
            <span className="ap-sublabel">ORDER STATUS</span>
            <div className="ap-stepper-row">
              {/* Step 1: Payment (Checked Yellow/Orange) */}
              <div className="ap-step-col">
                <div className="comp-step-circle-checked-orange">
                  <span className="material-symbols-outlined">check</span>
                </div>
                <span className="ap-step-name">Payment</span>
              </div>

              {/* Dots 1 -> 2 */}
              <div className="ap-stepper-dots dots-comp-white" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>

              {/* Step 2: Received (Checked Blue) */}
              <div className="ap-step-col">
                <div className="comp-step-circle-checked-blue">
                  <span className="material-symbols-outlined">check</span>
                </div>
                <span className="ap-step-name">Received</span>
              </div>

              {/* Dots 2 -> 3 */}
              <div className="ap-stepper-dots dots-comp-white" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>

              {/* Step 3: In Transit (Checked Purple) */}
              <div className="ap-step-col">
                <div className="comp-step-circle-checked-purple">
                  <span className="material-symbols-outlined">check</span>
                </div>
                <span className="ap-step-name">In Transit</span>
              </div>

              {/* Dots 3 -> 4 */}
              <div className="ap-stepper-dots dots-comp-white" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>

              {/* Step 4: Delivered (Checked Teal/Green) */}
              <div className="ap-step-col">
                <div className="comp-step-circle-checked-green">
                  <span className="material-symbols-outlined">check</span>
                </div>
                <span className="ap-step-name">Delivered</span>
              </div>

              {/* Dots 4 -> 5 */}
              <div className="ap-stepper-dots dots-comp-white" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>

              {/* Step 5: Completed (Glowing White Circle with Green Check) */}
              <div className="ap-step-col">
                <div className="comp-step-circle-completed">
                  <span className="material-symbols-outlined">check</span>
                </div>
                <span className="ap-step-name active" style={{ fontWeight: 800 }}>Completed</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION TITLE: COMPLETED ── */}
        <div className="ap-section-title comp-title">COMPLETED</div>

        {/* ── DETAILS FIELDS LIST ── */}
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

          {/* Field 2: You Paid */}
          <div className="ap-field-row" role="listitem">
            <div className="ap-field-left">
              <span className="ap-field-label">You Paid</span>
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span className="ap-you-pay-val">{youPaidAmount}</span>
                <span className="ap-charges-note">(Incl Charges)</span>
              </div>
            </div>
            <button
              type="button"
              className={`ap-copy-btn ${copiedKey === "You Paid" ? "copied" : ""}`}
              onClick={() => handleCopy(youPaidAmount, "You Paid")}
              aria-label="Copy Amount"
              title="Copy"
            >
              <span className="material-symbols-outlined">
                {copiedKey === "You Paid" ? "check" : "content_copy"}
              </span>
            </button>
          </div>

          {/* Field 3: Seller's Name */}
          <div className="ap-field-row" role="listitem">
            <div className="ap-field-left">
              <span className="ap-field-label">Seller's Name</span>
              <span className="ap-field-val">{sellerName}</span>
            </div>
            <button
              type="button"
              className={`ap-copy-btn ${copiedKey === "Seller's Name" ? "copied" : ""}`}
              onClick={() => handleCopy(sellerName, "Seller's Name")}
              aria-label="Copy Seller's Name"
              title="Copy"
            >
              <span className="material-symbols-outlined">
                {copiedKey === "Seller's Name" ? "check" : "content_copy"}
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

        {/* ── Footer Protection Disclaimer ── */}
        <footer className="ap-footer-note comp-footer-note">
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

      {/* ── Order Details Slide-Up Bottom Sheet Modal ── */}
      <OrderDetailsModal
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        room={{
          ...room,
          id: orderNumber,
          amount: orderAmount,
          item: itemName,
          sellerName,
        }}
      />

      {/* ── Chat Slide-In Modal ── */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        room={room}
        role={role}
        sellerName={sellerName}
        counterpartyName={sellerName}
        orderNumber={orderNumber}
      />

      {/* ── Receipt Modal ── */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        room={{
          ...room,
          id: orderNumber,
          amount: orderAmount,
          price: orderAmount,
          item: itemName,
          sellerName,
        }}
      />

      {/* ── Help Drawer ── */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onOpenChat={() => setIsChatOpen(true)}
      />

      {/* ── Protection Info Modal ── */}
      <ProtectionInfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />

      {/* ── Toast Notification ── */}
      {toastText && (
        <div className="ap-toast" role="status" aria-live="polite">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
            check_circle
          </span>
          <span>{toastText}</span>
        </div>
      )}
    </div>
  );
}
