import { useState, useRef, useEffect } from "react";
import OrderDetailsModal from "./Shared/OrderDetailsModal";
import ShippingStatusModal from "./Shared/ShippingStatusModal";
import HelpDrawer from "./Shared/HelpDrawer";
import ReceiptModal from "./Shared/ReceiptModal";
import "../styles/desktop-payment-room-detail.css";

const BANKS = [
  "Access Bank",
  "Guaranteed Trust Bank (GTBank)",
  "Zenith Bank",
  "First Bank of Nigeria",
  "United Bank for Africa (UBA)",
  "Kuda Bank",
  "Opay",
  "Palmpay",
];

export default function DesktopPaymentRoomDetail({
  room = {},
  onBack,
  role = "Buyer",
  onSwitchRole,
  onPaymentConfirmed,
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDetailsArrowUp, setIsDetailsArrowUp] = useState(false);
  const [isDetailsLifting, setIsDetailsLifting] = useState(false);
  const [isShippingOpen, setIsShippingOpen] = useState(false);
  const [isShippingArrowUp, setIsShippingArrowUp] = useState(false);
  const [isShippingLifting, setIsShippingLifting] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [seconds, setSeconds] = useState(119);

  const status = room.status || "awaiting_payment";
  const isAwaitingPayment = status === "awaiting_payment";
  const isPaymentReceived = status === "payment_received";
  const isInTransit = status === "in_transit";
  const statusText = room.statusText || (
    isInTransit ? "In Transit" :
    isPaymentReceived ? "Payment Received" :
    "Awaiting Payment"
  );

  const courierService = room.courier || "GIG Logistics";
  const trackingNumber = room.trackingNumber || "KMLMLMMO";
  const estimatedArrival = room.estimatedArrival || "12-10-2024";

  // Derive order data matching screenshot
  const orderNumber = room.id || room.orderNumber || "ORD-992384";
  const orderAmount = room.amount || room.price || "₦50,000";
  const priceNumeric =
    room.priceNumeric ||
    parseFloat(String(orderAmount).replace(/[^0-9.]/g, "")) ||
    50000;
  const txCharges = Math.round(priceNumeric * 0.015) + 300;
  const youPayAmount =
    room.youPaid ||
    room.totalAmount ||
    (priceNumeric ? `₦${(priceNumeric + txCharges).toLocaleString("en-US")}` : "₦2,381,165");
  const bankName = room.bank || "Guaranteed Trust Bank (GTBank)";
  const [selectedBank, setSelectedBank] = useState(
    room.refundBank || (isPaymentReceived ? "Access Bank" : room.bank) || "Access Bank"
  );
  const [isChangeBankOpen, setIsChangeBankOpen] = useState(false);
  const sellerName = room.sellerName || (isPaymentReceived ? "Amaka Obi" : (room.counterparty || "Emeka Tech Hub"));
  const buyerName = room.buyerName || "Tunde Adeleke";
  const accountName = room.accountName || (isPaymentReceived ? "Marcus Vance" : `PayKudi(${sellerName})`);
  const accountNumber = room.accountNumber || (isPaymentReceived ? "0123456789" : "903370574");

  // Chat message state
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: "seller",
      senderName: sellerName,
      text: "Hello! I have the Sony WH-1000XM5 packaged and ready to ship once payment is secured.",
      time: "09:30 AM",
    },
    {
      id: 2,
      sender: "buyer",
      senderName: buyerName,
      text: "Thanks! Initiating payment now via bank transfer.",
      time: "09:35 AM",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatStreamRef = useRef(null);

  const scrollToChatBottom = () => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToChatBottom();
  }, [chatMessages]);

  // Timer countdown
  useEffect(() => {
    if (!isAwaitingPayment || seconds <= 0) return;
    const t = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [isAwaitingPayment, seconds]);

  const handleToggleDetails = () => {
    if (isDetailsLifting) return;
    if (!isDetailsOpen) {
      setIsDetailsLifting(true);
      setIsDetailsArrowUp(true);
      setTimeout(() => {
        setIsDetailsOpen(true);
      }, 300);
      setTimeout(() => {
        setIsDetailsLifting(false);
      }, 950);
    } else {
      setIsDetailsOpen(false);
      setIsDetailsArrowUp(false);
    }
  };

  const handleCloseDetails = () => {
    if (isDetailsLifting) return;
    setIsDetailsOpen(false);
    setIsDetailsArrowUp(false);
  };

  const handleToggleShipping = () => {
    if (isShippingLifting) return;
    if (!isShippingOpen) {
      setIsShippingLifting(true);
      setIsShippingArrowUp(true);
      setTimeout(() => {
        setIsShippingOpen(true);
      }, 300);
      setTimeout(() => {
        setIsShippingLifting(false);
      }, 950);
    } else {
      setIsShippingOpen(false);
      setIsShippingArrowUp(false);
    }
  };

  const handleCloseShipping = () => {
    if (isShippingLifting) return;
    setIsShippingOpen(false);
    setIsShippingArrowUp(false);
  };

  const handleCopy = (val, key) => {
    try {
      navigator.clipboard?.writeText(val);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handlePaymentClick = () => {
    setIsPaymentConfirmed(true);
    if (onPaymentConfirmed) onPaymentConfirmed();
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: role === "Seller" ? "seller" : "buyer",
        senderName: role === "Seller" ? sellerName : buyerName,
        text: chatInput.trim(),
        time: timeStr,
      },
    ]);
    setChatInput("");
  };

  return (
    <div className="desktop-prd-wrapper">
      <div className="desktop-prd-container">
        {/* ══════════════════════════════════════════════════════════════
            LEFT COLUMN: ORDER DETAILS
            ══════════════════════════════════════════════════════════════ */}
        <div className="desktop-prd-left-col">
          {/* Header row: Back button, Title, Switch role, Help button */}
          <div className="desktop-prd-header">
            <div className="desktop-prd-header-left">
              <button
                type="button"
                className="desktop-prd-back-circle-btn"
                onClick={onBack}
                aria-label="Back"
                title="Back to payment rooms"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  chevron_left
                </span>
              </button>
              <h2 className="desktop-prd-header-title">{statusText}</h2>
              {onSwitchRole && (
                <button
                  type="button"
                  className="desktop-prd-switch-role-btn"
                  onClick={onSwitchRole}
                  title="Switch between Buyer and Seller"
                >
                  Switch role
                </button>
              )}
            </div>

            <button
              type="button"
              className="desktop-prd-help-circle-btn"
              onClick={() => setIsHelpOpen(true)}
              aria-label="Help"
              title="Help and guide"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                help_outline
              </span>
            </button>
          </div>

          {/* Details Body */}
          <div className="desktop-prd-details-body">
            {/* Banner Card */}
            <div
              className={`desktop-prd-banner-card ${
                isInTransit
                  ? "in-transit"
                  : isPaymentReceived
                  ? "payment-received"
                  : "awaiting-payment"
              }`}
            >
              <div className="desktop-prd-banner-top">
                <div className="desktop-prd-amount-col">
                  <span className="desktop-prd-banner-label">ORDER AMOUNT</span>
                  <h3 className="desktop-prd-banner-amount">{orderAmount}</h3>
                </div>

                {isAwaitingPayment ? (
                  <div className="desktop-prd-timer-pill">{seconds}s</div>
                ) : (
                  <button
                    type="button"
                    className="desktop-prd-receipt-pill-btn"
                    onClick={() => setIsReceiptOpen(true)}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      receipt_long
                    </span>
                    <span>Receipt</span>
                  </button>
                )}
              </div>

              <div className="desktop-prd-banner-divider" />

              {/* Stepper */}
              <div className="desktop-prd-stepper-wrap">
                <span className="desktop-prd-banner-label">ORDER STATUS</span>
                <div
                  className={`desktop-prd-stepper-row ${
                    isPaymentReceived
                      ? "payment-received"
                      : isInTransit
                      ? "in-transit"
                      : "awaiting-payment"
                  }`}
                >
                  {/* Step 1: Payment */}
                  <div className="desktop-prd-step-col">
                    <div
                      className={`desktop-prd-step-circle ${
                        isAwaitingPayment
                          ? "active-step"
                          : "checked-orange"
                      }`}
                    >
                      {isAwaitingPayment ? (
                        "1"
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: 14, fontWeight: 800 }}>
                          check
                        </span>
                      )}
                    </div>
                    <span className={`desktop-prd-step-name ${isAwaitingPayment ? "active" : ""}`}>Payment</span>
                  </div>

                  {/* Step 2: Received */}
                  <div className="desktop-prd-step-col">
                    <div
                      className={`desktop-prd-step-circle ${
                        isPaymentReceived
                          ? "active-step"
                          : isInTransit
                          ? "checked-blue"
                          : "inactive"
                      }`}
                    >
                      {isPaymentReceived ? (
                        "2"
                      ) : isInTransit ? (
                        <span className="material-symbols-outlined" style={{ fontSize: 14, fontWeight: 800 }}>
                          check
                        </span>
                      ) : (
                        "2"
                      )}
                    </div>
                    <span className={`desktop-prd-step-name ${isPaymentReceived ? "active" : ""}`}>Received</span>
                  </div>

                  {/* Step 3: In Transit */}
                  <div className="desktop-prd-step-col">
                    <div
                      className={`desktop-prd-step-circle ${
                        isInTransit ? "active-step" : "inactive"
                      }`}
                    >
                      3
                    </div>
                    <span className={`desktop-prd-step-name ${isInTransit ? "active" : ""}`}>In Transit</span>
                  </div>

                  {/* Step 4: Delivered */}
                  <div className="desktop-prd-step-col">
                    <div className="desktop-prd-step-circle inactive">4</div>
                    <span className="desktop-prd-step-name">Delivered</span>
                  </div>

                  {/* Step 5: Completed */}
                  <div className="desktop-prd-step-col">
                    <div className="desktop-prd-step-circle inactive">5</div>
                    <span className="desktop-prd-step-name">Completed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Title */}
            <div
              className={`desktop-prd-section-title ${
                isInTransit
                  ? "in-transit"
                  : isPaymentReceived
                  ? "payment-received"
                  : "awaiting-payment"
              }`}
            >
              {isInTransit
                ? "SHIPPING DETAILS"
                : isPaymentReceived
                ? "PAYMENT RECEIVED"
                : "PROCEED TO MAKE PAYMENT"}
            </div>

            {/* Fields List */}
            <div className="desktop-prd-fields-list">
              {/* Field 1: Order Number */}
              <div className="desktop-prd-field-row">
                <div className="desktop-prd-field-left">
                  <span className="desktop-prd-field-label">Order Number</span>
                  <span className="desktop-prd-field-val">{orderNumber}</span>
                </div>
                <button
                  type="button"
                  className={`desktop-prd-copy-btn ${copiedKey === "ord" ? "copied" : ""}`}
                  onClick={() => handleCopy(orderNumber, "ord")}
                  title="Copy Order Number"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {copiedKey === "ord" ? "check" : "content_copy"}
                  </span>
                </button>
              </div>

              {/* Field 2: You Pay / Courier */}
              {isAwaitingPayment ? (
                <div className="desktop-prd-field-row">
                  <div className="desktop-prd-field-left">
                    <span className="desktop-prd-field-label">You Pay</span>
                    <span className="desktop-prd-field-val highlight-green">
                      {youPayAmount}
                      <span className="charges-sub">(Incl Charges)</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`desktop-prd-copy-btn ${copiedKey === "pay" ? "copied" : ""}`}
                    onClick={() => handleCopy(youPayAmount, "pay")}
                    title="Copy You Pay Amount"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {copiedKey === "pay" ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
              ) : isInTransit ? (
                <div className="desktop-prd-field-row">
                  <div className="desktop-prd-field-left">
                    <span className="desktop-prd-field-label">Courier Service</span>
                    <span className="desktop-prd-field-val">GIG Logistics</span>
                  </div>
                  <button
                    type="button"
                    className={`desktop-prd-copy-btn ${copiedKey === "courier" ? "copied" : ""}`}
                    onClick={() => handleCopy("GIG Logistics", "courier")}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {copiedKey === "courier" ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
              ) : isPaymentReceived ? (
                <div className="desktop-prd-field-row">
                  <div className="desktop-prd-field-left">
                    <span className="desktop-prd-field-label">You Paid</span>
                    <span className="desktop-prd-field-val highlight-green">
                      {youPayAmount}
                      <span className="charges-sub">(Incl Charges)</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`desktop-prd-copy-btn ${copiedKey === "paid" ? "copied" : ""}`}
                    onClick={() => handleCopy(youPayAmount, "paid")}
                    title="Copy You Paid Amount"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {copiedKey === "paid" ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
              ) : null}

              {/* Field 3: Bank / Tracking Number */}
              {isAwaitingPayment ? (
                <div className="desktop-prd-field-row">
                  <div className="desktop-prd-field-left">
                    <span className="desktop-prd-field-label">Bank</span>
                    <span className="desktop-prd-field-val">{bankName}</span>
                  </div>
                  <button
                    type="button"
                    className={`desktop-prd-copy-btn ${copiedKey === "bank" ? "copied" : ""}`}
                    onClick={() => handleCopy(bankName, "bank")}
                    title="Copy Bank Name"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {copiedKey === "bank" ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
              ) : isInTransit ? (
                <div className="desktop-prd-field-row">
                  <div className="desktop-prd-field-left">
                    <span className="desktop-prd-field-label">Tracking Number</span>
                    <span className="desktop-prd-field-val">KMLMLMMO</span>
                  </div>
                  <button
                    type="button"
                    className={`desktop-prd-copy-btn ${copiedKey === "tracking" ? "copied" : ""}`}
                    onClick={() => handleCopy("KMLMLMMO", "tracking")}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {copiedKey === "tracking" ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
              ) : isPaymentReceived ? (
                <div className="desktop-prd-field-row">
                  <div className="desktop-prd-field-left">
                    <span className="desktop-prd-field-label">Bank (Refund Account)</span>
                    <span className="desktop-prd-field-val">{selectedBank}</span>
                  </div>
                  <button
                    type="button"
                    className="desktop-prd-change-btn"
                    onClick={() => setIsChangeBankOpen(true)}
                    title="Change refund bank"
                  >
                    Change
                  </button>
                </div>
              ) : null}

              {/* Field 4: Account Name / Estimated Arrival */}
              {isAwaitingPayment ? (
                <div className="desktop-prd-field-row">
                  <div className="desktop-prd-field-left">
                    <span className="desktop-prd-field-label">Account Name</span>
                    <span className="desktop-prd-field-val">{accountName}</span>
                  </div>
                  <button
                    type="button"
                    className={`desktop-prd-copy-btn ${copiedKey === "accName" ? "copied" : ""}`}
                    onClick={() => handleCopy(accountName, "accName")}
                    title="Copy Account Name"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {copiedKey === "accName" ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
              ) : isInTransit ? (
                <div className="desktop-prd-field-row">
                  <div className="desktop-prd-field-left">
                    <span className="desktop-prd-field-label">Estimated Arrival</span>
                    <span className="desktop-prd-field-val">12-10-2024</span>
                  </div>
                </div>
              ) : isPaymentReceived ? (
                <div className="desktop-prd-field-row">
                  <div className="desktop-prd-field-left">
                    <span className="desktop-prd-field-label">Account Name</span>
                    <span className="desktop-prd-field-val">{accountName}</span>
                  </div>
                  <button
                    type="button"
                    className={`desktop-prd-copy-btn ${copiedKey === "accName" ? "copied" : ""}`}
                    onClick={() => handleCopy(accountName, "accName")}
                    title="Copy Account Name"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {copiedKey === "accName" ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
              ) : null}

              {/* Field 5: Account Number (for payment screens) / Seller's Name (for in-transit) */}
              {isAwaitingPayment || isPaymentReceived ? (
                <div className="desktop-prd-field-row">
                  <div className="desktop-prd-field-left">
                    <span className="desktop-prd-field-label">Account Number</span>
                    <span className="desktop-prd-field-val">{accountNumber}</span>
                  </div>
                  <button
                    type="button"
                    className={`desktop-prd-copy-btn ${copiedKey === "accNum" ? "copied" : ""}`}
                    onClick={() => handleCopy(accountNumber, "accNum")}
                    title="Copy Account Number"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {copiedKey === "accNum" ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
              ) : isInTransit ? (
                <div className="desktop-prd-field-row">
                  <div className="desktop-prd-field-left">
                    <span className="desktop-prd-field-label">Seller's Name</span>
                    <span className="desktop-prd-field-val">{sellerName}</span>
                  </div>
                  <button
                    type="button"
                    className={`desktop-prd-copy-btn ${copiedKey === "seller" ? "copied" : ""}`}
                    onClick={() => handleCopy(sellerName, "seller")}
                    title="Copy Seller's Name"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {copiedKey === "seller" ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
              ) : null}

              {/* Field 6: Seller's Name — shown when Field 5 was Account Number */}
              {(isAwaitingPayment || isPaymentReceived) && (
                <div className="desktop-prd-field-row">
                  <div className="desktop-prd-field-left">
                    <span className="desktop-prd-field-label">Seller's Name</span>
                    <span className="desktop-prd-field-val">{sellerName}</span>
                  </div>
                  <button
                    type="button"
                    className={`desktop-prd-copy-btn ${copiedKey === "seller" ? "copied" : ""}`}
                    onClick={() => handleCopy(sellerName, "seller")}
                    title="Copy Seller's Name"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {copiedKey === "seller" ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Accordions Row */}
            <div className="desktop-prd-accordions-row">
              <button
                type="button"
                className={`desktop-prd-accordion-trigger ${isDetailsArrowUp ? "active" : ""}`}
                onClick={handleToggleDetails}
                aria-expanded={isDetailsArrowUp}
                disabled={isDetailsLifting}
                style={{ cursor: isDetailsLifting ? "default" : "pointer" }}
              >
                <span>Order details</span>
                <span className={`material-symbols-outlined desktop-prd-trigger-chevron ${isDetailsArrowUp ? "expanded" : ""}`} style={{ fontSize: 18 }}>
                  expand_more
                </span>
              </button>

              {isInTransit && (
                <button
                  type="button"
                  className={`desktop-prd-accordion-trigger purple ${isShippingArrowUp ? "active" : ""}`}
                  onClick={handleToggleShipping}
                  aria-expanded={isShippingArrowUp}
                  disabled={isShippingLifting}
                  style={{ cursor: isShippingLifting ? "default" : "pointer" }}
                >
                  <span>Shipping status</span>
                  <span className={`material-symbols-outlined desktop-prd-trigger-chevron ${isShippingArrowUp ? "expanded" : ""}`} style={{ fontSize: 18 }}>
                    expand_more
                  </span>
                </button>
              )}
            </div>

            {/* Primary Action Button (I Have Made Payment) or spacer to preserve identical height & footer position */}
            {isAwaitingPayment ? (
              <button
                type="button"
                className={`desktop-prd-primary-btn ${isPaymentConfirmed ? "confirmed" : ""}`}
                onClick={handlePaymentClick}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  check_circle
                </span>
                <span>
                  {isPaymentConfirmed ? "Payment Confirmed" : "I Have Made Payment"}
                </span>
              </button>
            ) : (
              <div
                className={`desktop-prd-btn-spacer ${isInTransit ? "in-transit" : ""}`}
                aria-hidden="true"
              />
            )}

            {/* Disclaimer */}
            <footer className="desktop-prd-footer-note">
              <span>Your payment is protected by <strong>PayKudi</strong></span>
              <span
                className="material-symbols-outlined desktop-prd-info-icon"
                onClick={() => setIsInfoOpen(true)}
                title="Learn more"
              >
                info
              </span>
            </footer>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN: PERSISTENT CHAT BOX
            ══════════════════════════════════════════════════════════════ */}
        <div className="desktop-prd-right-col">
          {/* Green Header */}
          <div className="desktop-prd-chat-header">
            <span className="desktop-prd-chat-header-user">{sellerName}</span>
            <span className="desktop-prd-chat-header-order">{orderNumber}</span>
          </div>

          {/* Security Notice */}
          <div className="desktop-prd-chat-security">
            <span className="material-symbols-outlined desktop-prd-chat-security-icon">
              verified_user
            </span>
            <span>
              This chat is protected by <strong>PayKudi security</strong>
            </span>
          </div>

          {/* Messages Container */}
          <div className="desktop-prd-chat-stream" ref={chatStreamRef}>
            {chatMessages.map((msg) => {
              const isOutgoing = msg.sender === (role === "Seller" ? "seller" : "buyer");
              return (
                <div
                  key={msg.id}
                  className={`desktop-prd-chat-row ${isOutgoing ? "outgoing" : "incoming"}`}
                >
                  {!isOutgoing && (
                    <span className="desktop-prd-sender-label">{msg.senderName}</span>
                  )}
                  <div
                    className={`desktop-prd-chat-bubble ${
                      isOutgoing ? "outgoing" : "incoming"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span
                    className={`desktop-prd-chat-time ${
                      isOutgoing ? "outgoing" : ""
                    }`}
                  >
                    {msg.time} {isOutgoing ? "• Sent" : ""}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendChat} className="desktop-prd-chat-input-bar">
            <button
              type="button"
              className="desktop-prd-chat-attach-btn"
              aria-label="Add attachment"
              title="Add attachment"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                add_circle
              </span>
            </button>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="desktop-prd-chat-input"
            />
            <button
              type="submit"
              className="desktop-prd-chat-send-btn"
              disabled={!chatInput.trim()}
              aria-label="Send message"
              title="Send message"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                send
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* Modals */}
      <OrderDetailsModal
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        room={room}
      />

      <ShippingStatusModal
        isOpen={isShippingOpen}
        onClose={handleCloseShipping}
        room={room}
      />

      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        room={room}
      />

      {/* Info Modal */}
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
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  close
                </span>
              </button>
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5, padding: "8px 0" }}>
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

      {/* Change Refund Bank Modal */}
      {isChangeBankOpen && (
        <div className="desktop-prd-modal-backdrop" onClick={() => setIsChangeBankOpen(false)}>
          <div className="desktop-prd-bank-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Select Refund Bank</h3>
              <button
                type="button"
                onClick={() => setIsChangeBankOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", display: "flex", alignItems: "center" }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>
            <div className="desktop-prd-bank-list">
              {BANKS.map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`desktop-prd-bank-opt ${selectedBank === b ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedBank(b);
                    setIsChangeBankOpen(false);
                  }}
                >
                  <span>{b}</span>
                  {selectedBank === b && (
                    <span className="material-symbols-outlined" style={{ color: "#19a66c", fontSize: 18 }}>check</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
