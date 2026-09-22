import { useState, useEffect, useRef } from "react";
import "../../styles/mobile-awaiting-payment.css";
import "../../styles/mobile-payment-received.css";
import "../../styles/mobile-in-transit.css";
import HelpDrawer from "../Shared/HelpDrawer";

export default function MobileInTransit({
  room = {},
  onBack,
  role = "Buyer",
}) {
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
  const [toastText, setToastText] = useState(null);

  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: "seller",
      text: "Package has been dispatched via GIG Logistics! Tracking # is KMLMLMMO.",
      time: "Yesterday 3:15 PM",
    },
    {
      id: 2,
      sender: "buyer",
      text: "Thanks for the update! I can see it is currently in transit.",
      time: "Yesterday 3:42 PM",
    },
    {
      id: 3,
      sender: "seller",
      text: "You're welcome! Please confirm delivery once received.",
      time: "Today 9:10 AM",
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

  const orderNumber = room.id || room.orderNumber || "ORD-774120";
  const orderAmountRaw = room.amount || room.price || "₦385,000";
  const orderAmount = orderAmountRaw;
  // Compute fees matching Awaiting Payment modal
  const priceNum = room.priceNumeric || parseFloat(orderAmountRaw.replace(/[^0-9.]/g, "")) || 385000;
  const txFee = Math.round(priceNum * 0.015).toLocaleString("en-US");
  const totalAmount = room.totalAmount || `₦${(priceNum + Math.round(priceNum * 0.015) + 300).toLocaleString("en-US")}`;
  const courierService = room.courier || "GIG Logistics";
  const trackingNumber = room.trackingNumber || "KMLMLMMO";
  const estimatedArrival = room.estimatedArrival || "12-10-2024";
  const buyerName = room.buyerName || "Amaka Obi";
  const sellerName = room.sellerName || "Gadget Haven";
  const counterpartyName = (role === "Seller" || room.role === "Selling") ? buyerName : sellerName;
  const counterpartyLabel = (role === "Seller" || room.role === "Selling") ? "Buyer's Name" : "Seller's Name";
  const itemName = room.item || room.title || "Sony WH-1000XM5 Headphones";
  const variantText = room.variant || "Midnight Silver, Noise Cancelling";

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

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: role === "Seller" ? "seller" : "buyer",
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setChatInput("");
  };

  return (
    <div
      ref={screenRef}
      className={`mobile-awaiting-payment-screen ${isChatOpen ? "chat-open" : ""}`}
    >
      {/* ── Top Header (Hidden when chat is up) ── */}
      {!isChatOpen && (
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
            <h1 className="ap-header-title">In Transit</h1>
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
        {/* ── PURPLE ORDER STATUS BANNER CARD ── */}
        <section className="ap-banner-card it-banner-card" aria-label="Order summary">
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

          {/* Bottom Row: ORDER STATUS with 5 steps */}
          <div className="ap-stepper-wrap">
            <span className="ap-sublabel">ORDER STATUS</span>
            <div className="ap-stepper-row it-stepper-row">
              {/* Step 1: Payment (Checked Orange) */}
              <div className="ap-step-col">
                <div className="it-step-circle-checked-orange">
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
                <div className="it-step-circle-checked-blue">
                  <span className="material-symbols-outlined">check</span>
                </div>
                <span className="ap-step-name">Received</span>
              </div>

              {/* Dots 2 -> 3: Blending Blue to White (prev to present active) */}
              <div className="ap-stepper-dots dots-blue-to-white" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>

              {/* Step 3: In Transit (Active Glowing White) */}
              <div className="ap-step-col">
                <div className="it-step-circle-active">3</div>
                <span className="ap-step-name" style={{ fontWeight: 800 }}>In Transit</span>
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

        {/* ── SHIPPING DETAILS SECTION ── */}
        <div className="ap-section-title it-title">SHIPPING DETAILS</div>

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

          {/* Field 4: Estimated Arrival (no copy) */}
          <div className="ap-field-row" role="listitem">
            <div className="ap-field-left">
              <span className="ap-field-label">Estimated Arrival</span>
              <span className="ap-field-val">{estimatedArrival}</span>
            </div>
          </div>

          {/* Field 5: Seller's Name */}
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
                      {courierService} <span className="ap-sheet-term-sub">(3–5 business days)</span>
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
                      24 Hours post-delivery <span className="ap-sheet-term-sub">(To confirm or dispute)</span>
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
                <div className="ssm-timeline-line" />

                {/* Step 1: Package Picked Up — completed */}
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

                {/* Step 2: Sorted at Origin Hub — completed */}
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

                {/* Step 3: In Transit — active */}
                <div className="ssm-step ssm-step--active">
                  <div className="ssm-dot ssm-dot--active">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>local_shipping</span>
                  </div>
                  <div className="ssm-step-content">
                    <div className="ssm-step-row">
                      <span className="ssm-step-title ssm-step-title--active">In Transit to Destination</span>
                      <span className="ssm-step-badge ssm-step-badge--active">Active</span>
                    </div>
                    <p className="ssm-step-desc">En route to destination delivery hub</p>
                  </div>
                </div>

                {/* Step 4: Arrived at Local Facility — pending */}
                <div className="ssm-step ssm-step--pending">
                  <div className="ssm-dot ssm-dot--pending">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>domain</span>
                  </div>
                  <div className="ssm-step-content">
                    <div className="ssm-step-row">
                      <span className="ssm-step-title ssm-step-title--pending">Arrived at Local Facility</span>
                      <span className="ssm-step-badge ssm-step-badge--pending">Pending</span>
                    </div>
                    <p className="ssm-step-desc">Sorting for local dispatch rider allocation</p>
                  </div>
                </div>

                {/* Step 5: Out for Delivery — pending */}
                <div className="ssm-step ssm-step--pending">
                  <div className="ssm-dot ssm-dot--pending">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>two_wheeler</span>
                  </div>
                  <div className="ssm-step-content">
                    <div className="ssm-step-row">
                      <span className="ssm-step-title ssm-step-title--pending">Out for Delivery</span>
                      <span className="ssm-step-badge ssm-step-badge--pending">Pending</span>
                    </div>
                    <p className="ssm-step-desc">Courier rider on the way to delivery address</p>
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

      {/* ── Chat Slide-In Modal ── */}
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
                    <span className="ap-chat-sender-name">{sellerName}</span>
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
      {isReceiptOpen && (
        <div className="ap-modal-backdrop" onClick={() => setIsReceiptOpen(false)}>
          <div className="ap-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="ap-sheet-handle" />
            <div className="ap-sheet-header">
              <div className="ap-sheet-title-group">
                <h3 className="ap-sheet-title">Payment Receipt</h3>
                <span className="ap-sheet-ord-pill">{orderNumber}</span>
              </div>
              <button
                type="button"
                className="ap-sheet-close-btn"
                onClick={() => setIsReceiptOpen(false)}
                aria-label="Close"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
            <div className="ap-sheet-body" style={{ textAlign: "center", padding: "16px 0" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: "#7c3aed", display: "block", marginBottom: 8 }}>
                local_shipping
              </span>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>In Transit</div>
              <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
                {orderNumber} · {itemName}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#161618", marginBottom: 20 }}>
                {orderAmount}
              </div>
              <button
                type="button"
                style={{
                  background: "#161618",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 32px",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Download Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Help Drawer ── */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onOpenChat={() => setIsChatOpen(true)}
      />

      {/* ── Protection Info Modal ── */}
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
              <p>Every transaction on PayKudi is backed by 100% money-back escrow protection:</p>
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
