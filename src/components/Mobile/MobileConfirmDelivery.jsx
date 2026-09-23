import { useState, useEffect, useRef } from "react";
import "../../styles/mobile-awaiting-payment.css";
import "../../styles/mobile-in-transit.css";
import "../../styles/mobile-confirm-delivery.css";
import ReceiptModal from "../Shared/ReceiptModal";
import HelpDrawer from "../Shared/HelpDrawer";
import ProtectionInfoModal from "../Shared/ProtectionInfoModal";
import ReportIssueModal from "../Shared/ReportIssueModal";

export default function MobileConfirmDelivery({
  room = {},
  onBack,
  onDeliveryConfirmed,
  onNavigateToDispute,
  role = "Buying",
}) {
  // 59m 57s countdown timer as shown in reference image (3597 seconds)
  const [seconds, setSeconds] = useState(3597);
  const [copiedKey, setCopiedKey] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isArrowUp, setIsArrowUp] = useState(false);
  const [isLifting, setIsLifting] = useState(false);

  const [isShippingStatusOpen, setIsShippingStatusOpen] = useState(false);
  const [isShippingArrowUp, setIsShippingArrowUp] = useState(false);
  const [isShippingLifting, setIsShippingLifting] = useState(false);

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [toastText, setToastText] = useState(null);

  // Chat message state matching reference design
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: "seller",
      text: "Package delivered! Please inspect the item and confirm delivery when satisfied.",
      time: "Today 1:15 PM",
    },
    {
      id: 2,
      sender: "buyer",
      text: "Received the package from GIG rider. Inspecting now!",
      time: "Today 1:22 PM",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatMessagesRef = useRef(null);
  const screenRef = useRef(null);

  const scrollToChatBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (isChatOpen) {
      if (screenRef.current) {
        screenRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
      scrollToChatBottom();
    }
  }, [isChatOpen, chatMessages]);

  // Countdown timer effect (counting down every second)
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  const formatTimer = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Order data matching reference image
  const orderNumber = room.id || room.orderNumber || "ORD-662819";
  const orderAmount = room.amount || room.price || "₦50,000";
  const courierService = room.courier || "GIG Logistics";
  const trackingNumber = room.trackingNumber || "GIG2208471";
  const deliveryStatus = room.deliveryStatus || "Delivered Today";
  const sellerName = room.sellerName || "Emeka Tech Hub";
  const buyerName = room.buyerName || "Amaka Obi";
  const itemName = room.item || room.title || "Nike Air Max 2025";
  const variantText = room.variant || "Black / Volt, Size 43";

  const isBuying = role === "Buying" || room.role === "Buying";
  const counterpartyLabel = isBuying ? "Seller's Name" : "Buyer's Name";
  const counterpartyName = isBuying ? sellerName : buyerName;

  // Pricing calculations
  const rawNum =
    typeof room.priceNumeric === "number"
      ? room.priceNumeric
      : parseInt(String(orderAmount).replace(/[^0-9]/g, ""), 10) || 50000;
  const txFee = (rawNum * 0.015).toLocaleString();
  const totalAmount = `₦${(rawNum + rawNum * 0.015 + 300).toLocaleString()}`;

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

  // Toggle Order Details with smooth lift animation
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

  // Toggle Shipping Status Modal
  const handleToggleShippingStatus = () => {
    if (isShippingLifting) return;
    if (!isShippingStatusOpen) {
      setIsShippingLifting(true);
      setIsShippingArrowUp(true);
      setTimeout(() => {
        setIsShippingStatusOpen(true);
      }, 300);
      setTimeout(() => {
        setIsShippingLifting(false);
      }, 950);
    } else {
      setIsShippingStatusOpen(false);
      setIsShippingArrowUp(false);
    }
  };

  const handleCloseShippingStatus = () => {
    if (isShippingLifting) return;
    setIsShippingStatusOpen(false);
    setIsShippingArrowUp(false);
  };

  const handleConfirmAction = () => {
    setIsConfirmModalOpen(false);
    showToast("Delivery confirmed successfully! Escrow released.");
    if (onDeliveryConfirmed) onDeliveryConfirmed();
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
    <div
      ref={screenRef}
      className={`mobile-awaiting-payment-screen ${isChatOpen ? "chat-open" : ""} ${isReportOpen || isHelpOpen ? "modal-open" : ""}`}
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
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                chevron_left
              </span>
            </button>
            <h1 className="ap-header-title">Confirm Delivery</h1>
          </div>

          <div className="ap-header-actions">
            <button
              type="button"
              className="ap-help-btn"
              onClick={() => setIsHelpOpen(true)}
              aria-label="Help"
              title="Help"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
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
        {/* ── TEAL ORDER AMOUNT & STATUS BANNER CARD ── */}
        <section className="ap-banner-card cd-banner-card" aria-label="Order summary">
          {/* Top Row: ORDER AMOUNT + RECEIPT BUTTON */}
          <div className="ap-banner-top-row">
            <div className="ap-amount-col">
              <span className="ap-sublabel">ORDER AMOUNT</span>
              <h2 className="ap-amount-value">{orderAmount}</h2>
            </div>
            <button
              type="button"
              className="pr-receipt-btn"
              onClick={() => setIsReceiptOpen(true)}
              aria-label="View Receipt"
            >
              <span className="material-symbols-outlined">receipt</span>
              <span>Receipt</span>
            </button>
          </div>

          {/* Divider */}
          <div className="ap-banner-divider" />

          {/* Bottom Row: ORDER STATUS with 5 steps and connector dots */}
          <div className="ap-stepper-wrap">
            <span className="ap-sublabel">ORDER STATUS</span>
            <div className="ap-stepper-row cd-stepper-row">
              {/* Step 1: Payment (Checked Orange) */}
              <div className="ap-step-col">
                <div className="cd-step-circle-checked-orange">
                  <span className="material-symbols-outlined">check</span>
                </div>
                <span className="ap-step-name">Payment</span>
              </div>

              {/* Dots 1 -> 2: Blending Orange to Blue */}
              <div className="ap-stepper-dots dots-orange-to-blue" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>

              {/* Step 2: Received (Checked Blue) */}
              <div className="ap-step-col">
                <div className="cd-step-circle-checked-blue">
                  <span className="material-symbols-outlined">check</span>
                </div>
                <span className="ap-step-name">Received</span>
              </div>

              {/* Dots 2 -> 3: Blending Blue to Purple */}
              <div className="ap-stepper-dots dots-blue-to-purple" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>

              {/* Step 3: In Transit (Checked Purple) */}
              <div className="ap-step-col">
                <div className="cd-step-circle-checked-purple">
                  <span className="material-symbols-outlined">check</span>
                </div>
                <span className="ap-step-name">In Transit</span>
              </div>

              {/* Dots 3 -> 4: Blending Purple to White (prev to present active) */}
              <div className="ap-stepper-dots dots-purple-to-white" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>

              {/* Step 4: Delivered (Active Glowing White) */}
              <div className="ap-step-col">
                <div className="cd-step-circle-active">4</div>
                <span className="ap-step-name" style={{ fontWeight: 800 }}>Delivered</span>
              </div>

              {/* Dots 4 -> 5 */}
              <div className="ap-stepper-dots dots-muted" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>

              {/* Step 5: Completed (Inactive) */}
              <div className="ap-step-col">
                <div className="ap-step-circle-inactive">5</div>
                <span className="ap-step-name">Completed</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION TITLE: ORDER DELIVERED ── */}
        <div className="cd-section-title">ORDER DELIVERED</div>

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

          {/* Field 2: Courier Service */}
          <div className="ap-field-row" role="listitem">
            <div className="ap-field-left">
              <span className="ap-field-label">Courier Service</span>
              <span className="ap-field-val">{courierService}</span>
            </div>
            <button
              type="button"
              className={`ap-copy-btn ${copiedKey === "Courier Service" ? "copied" : ""}`}
              onClick={() => handleCopy(courierService, "Courier Service")}
              aria-label="Copy Courier Service"
              title="Copy"
            >
              <span className="material-symbols-outlined">
                {copiedKey === "Courier Service" ? "check" : "content_copy"}
              </span>
            </button>
          </div>

          {/* Field 3: Tracking Number */}
          <div className="ap-field-row" role="listitem">
            <div className="ap-field-left">
              <span className="ap-field-label">Tracking Number</span>
              <span className="ap-field-val">{trackingNumber}</span>
            </div>
            <button
              type="button"
              className={`ap-copy-btn ${copiedKey === "Tracking Number" ? "copied" : ""}`}
              onClick={() => handleCopy(trackingNumber, "Tracking Number")}
              aria-label="Copy Tracking Number"
              title="Copy"
            >
              <span className="material-symbols-outlined">
                {copiedKey === "Tracking Number" ? "check" : "content_copy"}
              </span>
            </button>
          </div>

          {/* Field 4: Delivery Status */}
          <div className="ap-field-row" role="listitem">
            <div className="ap-field-left">
              <span className="ap-field-label">Delivery Status</span>
              <span className="ap-field-val cd-delivery-status-val">{deliveryStatus}</span>
            </div>
          </div>

          {/* Field 5: Seller's Name */}
          <div className="ap-field-row" role="listitem">
            <div className="ap-field-left">
              <span className="ap-field-label">{counterpartyLabel}</span>
              <span className="ap-field-val">{counterpartyName}</span>
            </div>
            <button
              type="button"
              className={`ap-copy-btn ${copiedKey === "Seller's Name" ? "copied" : ""}`}
              onClick={() => handleCopy(counterpartyName, "Seller's Name")}
              aria-label="Copy Seller's Name"
              title="Copy"
            >
              <span className="material-symbols-outlined">
                {copiedKey === "Seller's Name" ? "check" : "content_copy"}
              </span>
            </button>
          </div>
        </div>

        {/* ── Dual Actions Row: Order details + Shipping status ── */}
        <div className="it-dual-actions-row">
          <button
            type="button"
            className={`it-action-trigger it-order-details-trigger ${isArrowUp ? "active" : ""}`}
            onClick={handleToggleDetails}
            aria-expanded={isArrowUp}
            disabled={isLifting}
            style={{ cursor: isLifting ? "default" : "pointer" }}
          >
            <span>Order details</span>
            <span className={`material-symbols-outlined it-trigger-arrow ${isArrowUp ? "expanded" : ""}`}>
              expand_more
            </span>
          </button>

          <button
            type="button"
            className={`it-action-trigger it-shipping-status-trigger ${isShippingArrowUp ? "active" : ""}`}
            onClick={handleToggleShippingStatus}
            aria-expanded={isShippingArrowUp}
            disabled={isShippingLifting}
            style={{ cursor: isShippingLifting ? "default" : "pointer" }}
          >
            <span>Shipping status</span>
            <span className={`material-symbols-outlined it-trigger-arrow ${isShippingArrowUp ? "expanded" : ""}`}>
              expand_more
            </span>
          </button>
        </div>

        {/* ── Action Buttons ── */}
        <div className="cd-actions-container">
          {/* Primary Green CTA: Confirm Delivery with Timer */}
          <button
            type="button"
            className="cd-confirm-btn"
            onClick={() => setIsConfirmModalOpen(true)}
          >
            <span>Confirm Delivery</span>
            <div className="cd-timer-badge">
              <span className="material-symbols-outlined">timer</span>
              <span>{formatTimer(seconds)}</span>
            </div>
          </button>

          {/* Secondary Red CTA: Report an Issue */}
          <button
            type="button"
            className="cd-report-btn"
            onClick={() => setIsReportOpen(true)}
          >
            <span>Report an Issue</span>
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

      {/* ── Order Details Slide-Up Modal ── */}
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
            <div className="ap-sheet-handle" />
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

            <div className="ap-sheet-item-card">
              <div className="ap-sheet-item-avatar">
                {room.image ? (
                  <img src={room.image} alt={itemName} className="ap-sheet-item-img" />
                ) : (
                  <span>{itemName.split(" ")[0]?.toUpperCase() || "ITEM"}</span>
                )}
              </div>
              <div className="ap-sheet-item-info">
                <div className="ap-sheet-item-name">{itemName.toUpperCase()}</div>
                <div className="ap-sheet-item-sub">{variantText}</div>
                <div className="ap-sheet-item-price">{orderAmount}</div>
              </div>
            </div>

            <div className="ap-sheet-section">
              <div className="ap-sheet-section-title">PAYMENT BREAKDOWN</div>
              <div className="ap-sheet-breakdown-list">
                <div className="ap-sheet-row">
                  <span className="ap-sheet-row-label">Item Amount</span>
                  <span className="ap-sheet-row-val">{orderAmount}</span>
                </div>
                <div className="ap-sheet-row fee-row">
                  <span className="ap-sheet-row-label">Transaction fee (1.5%)</span>
                  <span className="ap-sheet-row-val">₦{txFee}</span>
                </div>
                <div className="ap-sheet-row fee-row">
                  <span className="ap-sheet-row-label">Convenience fee</span>
                  <span className="ap-sheet-row-val">₦300</span>
                </div>
                <div className="ap-sheet-divider" />
                <div className="ap-sheet-row total-row">
                  <span className="ap-sheet-row-label">Total</span>
                  <span className="ap-sheet-row-val">{totalAmount}</span>
                </div>
              </div>
            </div>

            <div className="ap-sheet-section">
              <div className="ap-sheet-section-title">TERMS AGREED</div>
              <div className="ap-sheet-terms-list">
                <div className="ap-sheet-term-item">
                  <div className="ap-sheet-term-icon delivery">
                    <span className="material-symbols-outlined">local_shipping</span>
                  </div>
                  <div className="ap-sheet-term-content">
                    <div className="ap-sheet-term-label">Delivery Terms</div>
                    <div className="ap-sheet-term-val">
                      {courierService} <span className="ap-sheet-term-sub">(Delivered)</span>
                    </div>
                  </div>
                </div>

                <div className="ap-sheet-term-item">
                  <div className="ap-sheet-term-icon inspection">
                    <span className="material-symbols-outlined">timer</span>
                  </div>
                  <div className="ap-sheet-term-content">
                    <div className="ap-sheet-term-label">Inspection Window</div>
                    <div className="ap-sheet-term-val">
                      24 Hours post-delivery <span className="ap-sheet-term-sub">(Inspection active)</span>
                    </div>
                  </div>
                </div>

                <div className="ap-sheet-term-item">
                  <div className="ap-sheet-term-icon seller">
                    <span className="material-symbols-outlined">person</span>
                  </div>
                  <div className="ap-sheet-term-content">
                    <div className="ap-sheet-term-label">{counterpartyLabel}</div>
                    <div className="ap-sheet-term-val">{counterpartyName}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Shipping Status Slide-Up Modal ── */}
      {isShippingStatusOpen && (
        <div
          className={`ap-bottom-sheet-backdrop ${isShippingLifting ? "lifting" : ""}`}
          onClick={handleCloseShippingStatus}
        >
          <div
            className="ap-bottom-sheet ssm-sheet"
            onClick={(e) => e.stopPropagation()}
            onAnimationEnd={() => setIsShippingLifting(false)}
          >
            <div className="ap-sheet-handle" />

            {/* Header */}
            <div className="ap-sheet-header">
              <div className="ap-sheet-title-group">
                <h3 className="ap-sheet-title">Shipping Status</h3>
                <span className="it-tracking-pill">{orderNumber}</span>
              </div>
              <button
                type="button"
                className="ap-sheet-close-btn"
                onClick={handleCloseShippingStatus}
                aria-label="Close shipping status"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="ssm-body">
              {/* ORDER TRACKING */}
              <div className="ssm-section-label">ORDER TRACKING</div>

              <div className="ssm-timeline">
                {/* Step 1 */}
                <div className="ssm-step ssm-step--completed">
                  <div className="ssm-dot ssm-dot--completed">
                    <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div className="ssm-step-content">
                    <div className="ssm-step-row">
                      <span className="ssm-step-title ssm-step-title--completed">Package Picked Up</span>
                      <span className="ssm-step-time">11:30 AM</span>
                    </div>
                    <p className="ssm-step-desc">Collected by courier from seller facility</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="ssm-step ssm-step--completed">
                  <div className="ssm-dot ssm-dot--completed">
                    <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div className="ssm-step-content">
                    <div className="ssm-step-row">
                      <span className="ssm-step-title ssm-step-title--completed">Sorted at Origin Hub</span>
                      <span className="ssm-step-time">03:45 PM</span>
                    </div>
                    <p className="ssm-step-desc">Processed at main regional sorting facility</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="ssm-step ssm-step--completed">
                  <div className="ssm-dot ssm-dot--completed">
                    <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div className="ssm-step-content">
                    <div className="ssm-step-row">
                      <span className="ssm-step-title ssm-step-title--completed">In Transit to Destination</span>
                      <span className="ssm-step-time">08:20 AM</span>
                    </div>
                    <p className="ssm-step-desc">Processed through regional sorting hub</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="ssm-step ssm-step--completed">
                  <div className="ssm-dot ssm-dot--completed">
                    <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div className="ssm-step-content">
                    <div className="ssm-step-row">
                      <span className="ssm-step-title ssm-step-title--completed">Arrived at Local Facility</span>
                      <span className="ssm-step-time">11:05 AM</span>
                    </div>
                    <p className="ssm-step-desc">Sorted and allocated to delivery rider</p>
                  </div>
                </div>

                {/* Step 5: Delivered Today */}
                <div className="ssm-step ssm-step--completed">
                  <div className="ssm-dot ssm-dot--completed">
                    <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div className="ssm-step-content">
                    <div className="ssm-step-row">
                      <span className="ssm-step-title ssm-step-title--completed">Delivered to Buyer</span>
                      <span className="ssm-step-time">01:15 PM</span>
                    </div>
                    <p className="ssm-step-desc">Signed and received at delivery address</p>
                  </div>
                </div>
              </div>

              {/* PROOF OF SHIPPING */}
              <div className="ssm-proof-header">
                <span className="ssm-section-label">PROOF OF SHIPPING</span>
                <button type="button" className="ssm-view-all-btn">View All (5)</button>
              </div>

              <div className="ssm-proof-grid">
                {[
                  { label: "Package Box",   color: "#e0e7ff", icon: "inventory_2" },
                  { label: "Waybill Slip",  color: "#fef9c3", icon: "receipt_long" },
                  { label: "Packaging",     color: "#dcfce7", icon: "category" },
                  { label: "Security Seal", color: "#fce7f3", icon: "verified" },
                ].map((img, i) => (
                  <div key={i} className="ssm-proof-thumb">
                    <div className="ssm-proof-img" style={{ background: img.color }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 24, color: "#6b7280" }}>{img.icon}</span>
                    </div>
                    <span className="ssm-proof-label">{img.label}</span>
                  </div>
                ))}
                <button type="button" className="ssm-proof-more-btn" aria-label="View 1 more photo">
                  +1
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delivery Confirmation Modal ── */}
      {isConfirmModalOpen && (
        <div className="ap-bottom-sheet-backdrop" onClick={() => setIsConfirmModalOpen(false)}>
          <div className="ap-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="ap-sheet-handle" />
            <div className="ap-sheet-header">
              <div className="ap-sheet-title-group">
                <h3 className="ap-sheet-title">Confirm Delivery</h3>
              </div>
              <button
                type="button"
                className="ap-sheet-close-btn"
                onClick={() => setIsConfirmModalOpen(false)}
                aria-label="Close"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div style={{ padding: "8px 0 16px", display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to confirm delivery for <strong>{itemName}</strong>?
              </p>
              <div style={{ background: "rgba(22, 163, 74, 0.08)", border: "1px solid rgba(22, 163, 74, 0.25)", borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ fontSize: 12.5, color: "#15803d", margin: 0, fontWeight: 600, lineHeight: 1.4 }}>
                  Once confirmed, the escrow payment of <strong>{orderAmount}</strong> will be released immediately to {counterpartyName}.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 10,
                    border: "1px solid var(--line)",
                    background: "var(--surface)",
                    color: "var(--ink)",
                    fontFamily: "inherit",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 10,
                    border: "none",
                    background: "#16a34a",
                    color: "#ffffff",
                    fontFamily: "inherit",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Yes, Release Funds
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Report Issue Modal Sheet ── */}
      <ReportIssueModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        orderNumber={orderNumber}
        onSubmitReport={({ reason, description, images }) => {
          const imgCountText = images && images.length > 0 ? ` with ${images.length} photo${images.length > 1 ? "s" : ""}` : "";
          showToast(`Dispute opened (${reason})${imgCountText}. Escrow funds placed on hold.`);
          if (onNavigateToDispute) {
            setTimeout(() => {
              onNavigateToDispute({ reason, description, images });
            }, 1000);
          }
        }}
      />

      {/* ── Chat Slide-In Modal (Stops right under PayKudi header) ── */}
      {isChatOpen && (
        <div className="ap-chat-backdrop" onClick={() => setIsChatOpen(false)}>
          <div className="ap-chat-slide-modal" onClick={(e) => e.stopPropagation()}>
            {/* Green Header */}
            <div className="ap-chat-green-header">
              <div className="ap-chat-header-info">
                <span className="ap-chat-header-user">{counterpartyName}</span>
                <span className="ap-chat-header-order">{orderNumber}</span>
              </div>
              <button
                type="button"
                className="ap-chat-close-btn"
                onClick={() => setIsChatOpen(false)}
                aria-label="Close Chat"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            {/* Security Notice */}
            <div className="ap-chat-security-banner">
              <span className="material-symbols-outlined">verified_user</span>
              <span>This chat is protected by <strong>PayKudi security</strong></span>
            </div>

            {/* Messages Container */}
            <div ref={chatMessagesRef} className="ap-chat-messages-container">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`ap-chat-message-row ${msg.sender}`}>
                  {msg.sender === "seller" && (
                    <span className="ap-chat-sender-name">{counterpartyName}</span>
                  )}
                  <div className={`ap-chat-bubble ${msg.sender}`}>
                    <p>{msg.text}</p>
                  </div>
                  <span className="ap-chat-timestamp">
                    {msg.time} {msg.sender === "buyer" ? "• Sent" : ""}
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom Input Bar */}
            <form onSubmit={handleSendChat} className="ap-chat-input-bar">
              <button type="button" className="ap-chat-attach-btn" aria-label="Add attachment">
                <span className="material-symbols-outlined">add_circle</span>
              </button>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onFocus={() => {
                  setTimeout(scrollToChatBottom, 120);
                }}
                placeholder="Type a message..."
                className="ap-chat-text-input"
              />
              <button
                type="submit"
                className="ap-chat-send-btn"
                disabled={!chatInput.trim()}
                aria-label="Send message"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </form>
          </div>
        </div>
      )}

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
          buyerName,
          courier: courierService,
          trackingNumber,
        }}
      />

      {/* ── Help Drawer ── */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onOpenChat={() => setIsChatOpen(true)}
        onReportIssue={() => setIsReportOpen(true)}
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
