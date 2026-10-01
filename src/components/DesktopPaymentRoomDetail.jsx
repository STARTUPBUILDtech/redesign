import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import OrderDetailsModal from "./Shared/OrderDetailsModal";
import ShippingStatusModal from "./Shared/ShippingStatusModal";
import HelpDrawer from "./Shared/HelpDrawer";
import ReceiptModal from "./Shared/ReceiptModal";
import ReportIssueModal from "./Shared/ReportIssueModal";
import ProtectionInfoModal from "./Shared/ProtectionInfoModal";
import ReceiptIcon from "./Shared/ReceiptIcon";
import AgreeTermsModal from "./Shared/AgreeTermsModal";
import {
  SendMessageSlideUpModal,
  FaqSlideUpModal,
} from "./Shared/SupportSlideUpModals";
import { PayoutAccountModal } from "./Shared/ProfileModals.jsx";
import "../styles/mobile-awaiting-payment.css";
import "../styles/mobile-in-transit.css";
import "../styles/mobile-confirm-delivery.css";
import "../styles/mobile-dispute-ongoing.css";
import "../styles/mobile-completed.css";
import "../styles/desktop-payment-room-detail.css";

function HelpPhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.053 15.053 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1.01A11.36 11.36 0 0 1 8.5 3.9c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.52c0-.55-.45-1-.99-1z" />
    </svg>
  );
}

function HelpReportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

function HelpMessageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 12H7v-2h10v2zm0-3H7V9h10v2zm0-3H7V6h10v2z" />
    </svg>
  );
}

function HelpQuestionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
    </svg>
  );
}

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
  onDeliveryConfirmed,
}) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [toastText, setToastText] = useState(null);

  // Modals & Drawers state
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDetailsArrowUp, setIsDetailsArrowUp] = useState(false);
  const [isDetailsLifting, setIsDetailsLifting] = useState(false);

  const [isShippingOpen, setIsShippingOpen] = useState(false);
  const [isShippingArrowUp, setIsShippingArrowUp] = useState(false);
  const [isShippingLifting, setIsShippingLifting] = useState(false);

  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isChangeBankOpen, setIsChangeBankOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  // Confirm delivery & Payment confirmed states
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDeliveryConfirmed, setIsDeliveryConfirmed] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);

  // Dispute ongoing proof modal state
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);


  // Status flags
  const status = room.status || "awaiting_payment";
  const isAwaitingPayment = status === "awaiting_payment";
  const isPaymentReceived = status === "payment_received";
  const isInTransit = status === "in_transit";
  const isDelivered =
    status === "delivered" ||
    room.statusText === "Confirm delivery" ||
    room.statusText === "Confirm Delivery";
  const isDisputeOngoing =
    status === "dispute_ongoing" ||
    room.statusText === "Dispute Ongoing" ||
    room.statusText === "Dispute ongoing";
  const isCompleted =
    status === "completed" ||
    room.statusText === "Completed" ||
    room.statusText === "Payment Completed";

  const statusText =
    room.statusText ||
    (isDisputeOngoing
      ? "Dispute Ongoing"
      : isCompleted
      ? "Completed"
      : isDelivered
      ? "Confirm delivery"
      : isInTransit
      ? "In Transit"
      : isPaymentReceived
      ? "Payment Received"
      : "Awaiting Payment");

  const roomId = room.id || room.orderNumber || "ORD-603607";
  const storageKey = `pk_agreed_terms_${roomId}`;

  const [hasAgreedTerms, setHasAgreedTerms] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "true" || !!room.hasAgreedTerms;
    } catch {
      return false;
    }
  });

  const [isTermsModalOpen, setIsTermsModalOpen] = useState(
    (isAwaitingPayment || room.statusText === "Awaiting Payment") && !hasAgreedTerms
  );

  const handleAgreeTerms = ({ state, city, location }) => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch (e) {}
    setHasAgreedTerms(true);
    setIsTermsModalOpen(false);
    if (room) {
      room.deliveryState = state;
      room.deliveryCity = city;
      room.deliveryLocation = location;
      room.hasAgreedTerms = true;
    }
    showToast(`Terms agreed. Delivery to ${location || state}`);
  };

  const handleCloseTermsModal = () => {
    if (!hasAgreedTerms) {
      if (onBack) onBack();
    } else {
      setIsTermsModalOpen(false);
    }
  };

  // Timers
  const [seconds, setSeconds] = useState(119); // 1m 59s for Awaiting Payment
  const [cdSeconds, setCdSeconds] = useState(3597); // 59m 57s for Confirm Delivery
  const [disputeSeconds, setDisputeSeconds] = useState(1060); // 17m 40s for Dispute Ongoing

  useEffect(() => {
    if (!isAwaitingPayment || !hasAgreedTerms || seconds <= 0) return;
    const t = setInterval(() => setSeconds((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [isAwaitingPayment, hasAgreedTerms, seconds]);

  useEffect(() => {
    if (!isDelivered || cdSeconds <= 0) return;
    const t = setInterval(() => setCdSeconds((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [isDelivered, cdSeconds]);

  useEffect(() => {
    if (!isDisputeOngoing || disputeSeconds <= 0) return;
    const t = setInterval(() => setDisputeSeconds((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [isDisputeOngoing, disputeSeconds]);

  const formatTimer = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Derive order data matching all room states
  const orderNumber =
    room.id ||
    room.orderNumber ||
    (isCompleted ? "ORD-192834" : isDelivered ? "ORD-662819" : isDisputeOngoing ? "ORD-920144" : "ORD-992384");

  const orderAmount =
    room.amount ||
    room.price ||
    (isDisputeOngoing ? "₦920,000" : isCompleted ? "₦145,000" : "₦50,000");

  const priceNumeric =
    room.priceNumeric ||
    parseFloat(String(orderAmount).replace(/[^0-9.]/g, "")) ||
    50000;
  const txCharges = Math.round(priceNumeric * 0.015) + 300;
  const youPayAmount =
    room.youPaid ||
    room.totalAmount ||
    (priceNumeric ? `₦${(priceNumeric + txCharges).toLocaleString("en-US")}` : "₦51,050");

  const courierService = room.courier || "GIG Logistics";
  const trackingNumber =
    room.trackingNumber || (isDelivered ? "GIG2208471" : "KMLMLMMO");
  const estimatedArrival = room.estimatedArrival || "12-10-2024";
  const deliveryStatus = room.deliveryStatus || "Delivered Today";

  const bankName = room.bank || "Guaranteed Trust Bank (GTBank)";
  const [selectedBank, setSelectedBank] = useState(
    room.refundBank || (isPaymentReceived ? "Access Bank" : room.bank) || "Access Bank"
  );
  const sellerName =
    room.sellerName ||
    (isPaymentReceived
      ? "Amaka Obi"
      : isDisputeOngoing
      ? "Amaka Obi"
      : isCompleted
      ? "Sneaker Plug"
      : isDelivered
      ? "Emeka Tech Hub"
      : (room.counterparty || "Emeka Tech Hub"));

  const buyerName = room.buyerName || (isDelivered ? "Amaka Obi" : "Tunde Adeleke");
  const itemName =
    room.item ||
    room.title ||
    (isDelivered
      ? "Nike Air Max 2025"
      : isCompleted
      ? "Sneaker Plug High-Tops"
      : isDisputeOngoing
      ? "iPhone 15 Pro Max (1TB)"
      : "Sony WH-1000XM5");

  const [accountName, setAccountName] = useState(
    room.accountName || (isPaymentReceived ? "Marcus Vance" : `PayKudi(${sellerName})`)
  );
  const [accountNumber, setAccountNumber] = useState(
    room.accountNumber || (isPaymentReceived ? "0123456789" : "903370574")
  );

  const handleSavePayoutAccount = (updated) => {
    if (updated) {
      if (updated.bank) setSelectedBank(updated.bank);
      if (updated.accountName) setAccountName(updated.accountName);
      if (updated.accountNumber) setAccountNumber(updated.accountNumber);
      setToastText(`Payout account updated to ${updated.bank}`);
      setTimeout(() => setToastText(null), 3000);
    }
    setIsChangeBankOpen(false);
  };

  const isBuying = role === "Buyer" || role === "Buying";
  const counterpartyLabel = isBuying ? "Seller's Name" : "Buyer's Name";
  const counterpartyName = isBuying ? sellerName : buyerName;

  // Dispute Trails state
  const [trails, setTrails] = useState(() => [
    {
      id: 1,
      type: "buyer",
      author: room.disputeAuthor || sellerName || "Amaka Obi",
      time: "Today, 02:15 PM",
      reason: room.disputeReason || "Item arrived damaged",
      message:
        room.disputeMessage ||
        "The package delivered contains a different model than agreed upon in the order details. The serial number does not match the invoice.",
      photos: room.disputePhotos || [],
    },
    {
      id: 2,
      type: "cs",
      author: "PayKudi CS",
      time: "Today, 02:18 PM",
      reason: null,
      message:
        "We have received your report and we are awaiting response from counterparty.",
      photos: [],
    },
  ]);

  // Chat message state (uniform across all payment rooms)
  const [chatMessages, setChatMessages] = useState(() => [
    {
      id: 1,
      sender: "seller",
      senderName: sellerName,
      text: isDelivered
        ? "Hello! The courier just confirmed delivery of your package. Please inspect and confirm!"
        : isDisputeOngoing
        ? "Hello, I sent the exact item packed according to specifications."
        : isCompleted
        ? "Thanks for confirming delivery! Enjoy your purchase!"
        : "Hello! I have the package ready to ship once payment is secured.",
      time: "09:30 AM",
    },
    {
      id: 2,
      sender: "buyer",
      senderName: buyerName,
      text: isDelivered
        ? "Thanks! Just inspecting the package right now."
        : isDisputeOngoing
        ? "The serial number does not match the receipt and the seal was tampered with."
        : isCompleted
        ? "Item received in great condition. Pleasure doing business!"
        : "Thanks! Initiating payment now via bank transfer.",
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

  const showToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(null), 2500);
  };

  const handleCopy = (val, key) => {
    if (!val) return;
    try {
      navigator.clipboard?.writeText(val);
      setCopiedKey(key);
      showToast(`Copied ${key} to clipboard`);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      setCopiedKey(key);
      showToast(`Copied ${key}`);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleToggleDetails = () => {
    if (!isDetailsOpen) {
      setIsDetailsOpen(true);
      setIsDetailsArrowUp(true);
      setIsDetailsLifting(false);
    } else {
      setIsDetailsOpen(false);
      setIsDetailsArrowUp(false);
      setIsDetailsLifting(false);
    }
  };

  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setIsDetailsArrowUp(false);
    setIsDetailsLifting(false);
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

  const handlePaymentClick = () => {
    if (isPaymentLoading || isPaymentConfirmed) return;
    setIsPaymentLoading(true);
    setTimeout(() => {
      setIsPaymentLoading(false);
      setIsPaymentConfirmed(true);
      showToast("Payment confirmed.");
      if (onPaymentConfirmed) onPaymentConfirmed();
    }, 1200);
  };

  const handleConfirmDelivery = () => {
    setIsDeliveryConfirmed(true);
    setIsConfirmModalOpen(false);
    showToast("Delivery confirmed. Funds released.");
    if (onDeliveryConfirmed) onDeliveryConfirmed();
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
            LEFT COLUMN: ORDER / PAYMENT / DISPUTE DETAILS
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

            <div className="desktop-prd-header-right">
              <button
                type="button"
                className="desktop-prd-chat-btn"
                onClick={() => setIsChatModalOpen(true)}
                aria-label="Chat"
                title="Chat with counterparty"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  chat
                </span>
                <span>Chat</span>
              </button>
            </div>
          </div>

          {/* Order Details Card Tile */}
          <div className="desktop-prd-details-card">
            <div className={`desktop-prd-details-body ${isPaymentReceived ? "is-payment-received" : ""} ${isInTransit ? "is-in-transit" : ""}`}>
            {/* Banner Card */}
            <div
              className={`desktop-prd-banner-card ${
                isDisputeOngoing
                  ? "dispute-ongoing"
                  : isCompleted
                  ? "completed"
                  : isDelivered
                  ? "delivered"
                  : isInTransit
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
                    title="View Receipt"
                  >
                    <ReceiptIcon size={16} />
                    <span>Receipt</span>
                  </button>
                )}
              </div>

              <div className="desktop-prd-banner-divider" />

              {/* Stepper */}
              <div className="desktop-prd-stepper-wrap">
                <span className="desktop-prd-banner-label">
                  {isDisputeOngoing ? "DISPUTE STATUS" : "ORDER STATUS"}
                </span>

                {isDisputeOngoing ? (
                  /* ── DISPUTE STATUS 3-Step Stepper ── */
                  <div className="mdo-stepper-row">
                    <div className="mdo-step-col">
                      <div className="mdo-step-circle-checked">
                        <span className="material-symbols-outlined">check</span>
                      </div>
                      <span className="mdo-step-name active">Dispute Raised</span>
                    </div>

                    <div className="mdo-stepper-dots dots-active" aria-hidden="true">
                      <span></span><span></span><span></span><span></span>
                    </div>

                    <div className="mdo-step-col">
                      <div className="mdo-step-circle-active">2</div>
                      <span className="mdo-step-name active">CS Stepped In</span>
                    </div>

                    <div className="mdo-stepper-dots dots-inactive" aria-hidden="true">
                      <span></span><span></span><span></span><span></span>
                    </div>

                    <div className="mdo-step-col">
                      <div className="mdo-step-circle-inactive">3</div>
                      <span className="mdo-step-name muted">Dispute Closed</span>
                    </div>
                  </div>
                ) : (
                  /* ── ORDER STATUS 5-Step Stepper ── */
                  <div
                    className={`desktop-prd-stepper-row ${
                      isCompleted
                        ? "completed"
                        : isDelivered
                        ? "delivered"
                        : isInTransit
                        ? "in-transit"
                        : isPaymentReceived
                        ? "payment-received"
                        : "awaiting-payment"
                    }`}
                  >
                    {/* Step 1: Payment */}
                    <div className="desktop-prd-step-col">
                      <div
                        className={`desktop-prd-step-circle ${
                          isAwaitingPayment ? "active-step" : "checked-orange"
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
                      <span className={`desktop-prd-step-name ${isAwaitingPayment ? "active" : ""}`}>
                        Payment
                      </span>
                    </div>

                    {/* Dots 1 -> 2 */}
                    <div
                      className={`desktop-prd-stepper-dots ${
                        isCompleted
                          ? "dots-comp-white"
                          : isPaymentReceived
                          ? "dots-orange-to-white"
                          : (isInTransit || isDelivered)
                          ? "dots-orange-to-blue"
                          : "dots-muted"
                      }`}
                      aria-hidden="true"
                    >
                      <span></span><span></span><span></span><span></span>
                    </div>

                    {/* Step 2: Received */}
                    <div className="desktop-prd-step-col">
                      <div
                        className={`desktop-prd-step-circle ${
                          isPaymentReceived
                            ? "active-step"
                            : (isInTransit || isDelivered || isCompleted)
                            ? "checked-blue"
                            : "inactive"
                        }`}
                      >
                        {isPaymentReceived ? (
                          "2"
                        ) : (isInTransit || isDelivered || isCompleted) ? (
                          <span className="material-symbols-outlined" style={{ fontSize: 14, fontWeight: 800 }}>
                            check
                          </span>
                        ) : (
                          "2"
                        )}
                      </div>
                      <span className={`desktop-prd-step-name ${isPaymentReceived ? "active" : ""}`}>
                        Received
                      </span>
                    </div>

                    {/* Dots 2 -> 3 */}
                    <div
                      className={`desktop-prd-stepper-dots ${
                        isCompleted
                          ? "dots-comp-white"
                          : isInTransit
                          ? "dots-blue-to-white"
                          : isDelivered
                          ? "dots-blue-to-purple"
                          : "dots-muted"
                      }`}
                      aria-hidden="true"
                    >
                      <span></span><span></span><span></span><span></span>
                    </div>

                    {/* Step 3: In Transit */}
                    <div className="desktop-prd-step-col">
                      <div
                        className={`desktop-prd-step-circle ${
                          (isDelivered || isCompleted)
                            ? "checked-purple"
                            : isInTransit
                            ? "active-step"
                            : "inactive"
                        }`}
                      >
                        {(isDelivered || isCompleted) ? (
                          <span className="material-symbols-outlined" style={{ fontSize: 14, fontWeight: 800 }}>
                            check
                          </span>
                        ) : (
                          "3"
                        )}
                      </div>
                      <span className={`desktop-prd-step-name ${isInTransit ? "active" : ""}`}>
                        In Transit
                      </span>
                    </div>

                    {/* Dots 3 -> 4 */}
                    <div
                      className={`desktop-prd-stepper-dots ${
                        isCompleted
                          ? "dots-comp-white"
                          : isDelivered
                          ? "dots-purple-to-white"
                          : "dots-muted"
                      }`}
                      aria-hidden="true"
                    >
                      <span></span><span></span><span></span><span></span>
                    </div>

                    {/* Step 4: Delivered */}
                    <div className="desktop-prd-step-col">
                      <div
                        className={`desktop-prd-step-circle ${
                          isCompleted
                            ? "checked-teal"
                            : isDelivered
                            ? "active-step"
                            : "inactive"
                        }`}
                      >
                        {isCompleted ? (
                          <span className="material-symbols-outlined" style={{ fontSize: 14, fontWeight: 800 }}>
                            check
                          </span>
                        ) : (
                          "4"
                        )}
                      </div>
                      <span className={`desktop-prd-step-name ${isDelivered ? "active" : ""}`}>
                        Delivered
                      </span>
                    </div>

                    {/* Dots 4 -> 5 */}
                    <div
                      className={`desktop-prd-stepper-dots ${
                        isCompleted ? "dots-comp-white" : "dots-muted"
                      }`}
                      aria-hidden="true"
                    >
                      <span></span><span></span><span></span><span></span>
                    </div>

                    {/* Step 5: Completed */}
                    <div className="desktop-prd-step-col">
                      <div
                        className={`desktop-prd-step-circle ${
                          isCompleted ? "completed-active" : "inactive"
                        }`}
                      >
                        {isCompleted ? (
                          <span className="material-symbols-outlined" style={{ fontSize: 14, fontWeight: 800 }}>
                            check
                          </span>
                        ) : (
                          "5"
                        )}
                      </div>
                      <span className={`desktop-prd-step-name ${isCompleted ? "active" : ""}`}>
                        Completed
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section Title */}
            {isDisputeOngoing ? (
              <div className="mdo-trails-header-row">
                <h3 className="mdo-trails-title">DISPUTE TRAILS</h3>
                <div className="mdo-timer-pill" title="Time remaining for counterparty response">
                  <span className="material-symbols-outlined mdo-timer-icon">schedule</span>
                  <span>{formatTimer(disputeSeconds)}</span>
                </div>
              </div>
            ) : (
              <div
                className={`desktop-prd-section-title ${
                  isCompleted
                    ? "completed"
                    : isDelivered
                    ? "delivered"
                    : isInTransit
                    ? "in-transit"
                    : isPaymentReceived
                    ? "payment-received"
                    : "awaiting-payment"
                }`}
              >
                {isCompleted
                  ? "COMPLETED"
                  : isDelivered
                  ? "ORDER DELIVERED"
                  : isInTransit
                  ? "SHIPPING DETAILS"
                  : isPaymentReceived
                  ? "PAYMENT RECEIVED"
                  : "PROCEED TO MAKE PAYMENT"}
              </div>
            )}

            {/* Main Content Area: Dispute Timeline OR Fields List */}
            {isDisputeOngoing ? (
              /* ── BOXLESS DISPUTE TRAILS (Matching Mobile) ── */
              <div className="mdo-boxless-timeline">
                <div className="mdo-timeline-spine" />
                {trails.map((trail) => {
                  const isBuyer = trail.type === "buyer";
                  const isCS = trail.type === "cs";
                  return (
                    <div key={trail.id} className="mdo-boxless-item">
                      {/* Node circular icon on timeline */}
                      <div
                        className={`mdo-timeline-node ${
                          isBuyer ? "node-buyer" : isCS ? "node-cs" : "node-user"
                        }`}
                      >
                        <span className="material-symbols-outlined">
                          {isBuyer ? "flag" : isCS ? "support_agent" : "person"}
                        </span>
                      </div>

                      {/* Boxless Content Container */}
                      <div className="mdo-boxless-content">
                        <div className="mdo-sender-row">
                          <span
                            className={`mdo-sender-name ${isCS ? "cs" : ""}`}
                          >
                            {trail.sender || trail.author}
                          </span>
                          <span className="mdo-timestamp">{trail.time}</span>
                        </div>

                        {trail.reason && (
                          <div className="mdo-reason-row">
                            <span className="mdo-reason-label">REASON: </span>
                            <span className="mdo-reason-val">{trail.reason}</span>
                          </div>
                        )}

                        <p className="mdo-message-text">{trail.message}</p>

                        {trail.photos && trail.photos.length > 0 && (
                          <div className="mdo-trail-photos">
                            {trail.photos.map((photoUrl, idx) => (
                              <img
                                key={idx}
                                src={photoUrl}
                                alt={`Proof ${idx + 1}`}
                                className="mdo-trail-photo-img"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── DETAILS FIELDS LIST ── */
              <div className={`desktop-prd-fields-list ${isPaymentReceived ? "payment-received" : ""} ${isInTransit ? "in-transit" : ""}`}>
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

                {/* Field 2: You Pay / Courier Service / You Paid */}
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
                ) : isPaymentReceived || isCompleted ? (
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
                ) : isInTransit || isDelivered ? (
                  <div className="desktop-prd-field-row">
                    <div className="desktop-prd-field-left">
                      <span className="desktop-prd-field-label">Courier Service</span>
                      <span className="desktop-prd-field-val">{courierService}</span>
                    </div>
                    <button
                      type="button"
                      className={`desktop-prd-copy-btn ${copiedKey === "courier" ? "copied" : ""}`}
                      onClick={() => handleCopy(courierService, "courier")}
                      title="Copy Courier Service"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        {copiedKey === "courier" ? "check" : "content_copy"}
                      </span>
                    </button>
                  </div>
                ) : null}

                {/* Field 3: Bank / Tracking Number / Seller's Name */}
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
                ) : isInTransit || isDelivered ? (
                  <div className="desktop-prd-field-row">
                    <div className="desktop-prd-field-left">
                      <span className="desktop-prd-field-label">Tracking Number</span>
                      <span className="desktop-prd-field-val">{trackingNumber}</span>
                    </div>
                    <button
                      type="button"
                      className={`desktop-prd-copy-btn ${copiedKey === "tracking" ? "copied" : ""}`}
                      onClick={() => handleCopy(trackingNumber, "tracking")}
                      title="Copy Tracking Number"
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
                ) : isCompleted ? (
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

                {/* Field 4: Account Name / Estimated Arrival / Delivery Status / Item */}
                {isAwaitingPayment || isPaymentReceived ? (
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
                      <span className="desktop-prd-field-val">{estimatedArrival}</span>
                    </div>
                  </div>
                ) : isDelivered ? (
                  <div className="desktop-prd-field-row">
                    <div className="desktop-prd-field-left">
                      <span className="desktop-prd-field-label">Delivery Status</span>
                      <span className="desktop-prd-field-val" style={{ color: "#16a34a", fontWeight: 700 }}>
                        {deliveryStatus}
                      </span>
                    </div>
                  </div>
                ) : isCompleted ? (
                  <div className="desktop-prd-field-row">
                    <div className="desktop-prd-field-left">
                      <span className="desktop-prd-field-label">Item</span>
                      <span className="desktop-prd-field-val">{itemName}</span>
                    </div>
                  </div>
                ) : null}

                {/* Field 5: Account Number (payment) / Counterparty Name (in-transit, delivered) */}
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
                ) : isInTransit || isDelivered ? (
                  <div className="desktop-prd-field-row">
                    <div className="desktop-prd-field-left">
                      <span className="desktop-prd-field-label">{counterpartyLabel}</span>
                      <span className="desktop-prd-field-val">{counterpartyName}</span>
                    </div>
                    <button
                      type="button"
                      className={`desktop-prd-copy-btn ${copiedKey === "seller" ? "copied" : ""}`}
                      onClick={() => handleCopy(counterpartyName, "seller")}
                      title="Copy Counterparty Name"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                        {copiedKey === "seller" ? "check" : "content_copy"}
                      </span>
                    </button>
                  </div>
                ) : null}

                {/* Field 6: Seller's Name for payment screens */}
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
            )}

            {/* Accordions Row */}
            <div className="desktop-prd-accordions-row">
              <button
                type="button"
                className={`desktop-prd-accordion-trigger ${isDetailsArrowUp ? "active" : ""}`}
                onClick={handleToggleDetails}
                aria-expanded={isDetailsArrowUp}
              >
                <span>Order details</span>
                <span
                  className={`material-symbols-outlined desktop-prd-trigger-chevron ${
                    isDetailsArrowUp ? "expanded" : ""
                  }`}
                >
                  expand_more
                </span>
              </button>

              {(isInTransit || isDelivered) && (
                <button
                  type="button"
                  className={`desktop-prd-accordion-trigger purple ${isShippingArrowUp ? "active" : ""}`}
                  onClick={handleToggleShipping}
                  aria-expanded={isShippingArrowUp}
                  disabled={isShippingLifting}
                  style={{ cursor: isShippingLifting ? "default" : "pointer" }}
                >
                  <span>Shipping status</span>
                  <span
                    className={`material-symbols-outlined desktop-prd-trigger-chevron ${
                      isShippingArrowUp ? "expanded" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>
              )}
            </div>

            {/* Action Buttons */}
            {isAwaitingPayment ? (
              <button
                type="button"
                className={`desktop-prd-primary-btn ${isPaymentConfirmed ? "confirmed" : ""} ${isPaymentLoading ? "is-loading" : ""}`}
                onClick={handlePaymentClick}
                disabled={isPaymentLoading || isPaymentConfirmed}
                aria-busy={isPaymentLoading}
              >
                {isPaymentLoading ? (
                  <span className="desktop-prd-btn-spinner" aria-hidden="true" />
                ) : isPaymentConfirmed ? (
                  "Payment Confirmed"
                ) : (
                  "I Have Made Payment"
                )}
              </button>
            ) : isDelivered ? (
              <div className="desktop-prd-cd-actions">
                <button
                  type="button"
                  className={`desktop-prd-confirm-btn ${isDeliveryConfirmed ? "confirmed" : ""}`}
                  onClick={() => setIsConfirmModalOpen(true)}
                >
                  <span>{isDeliveryConfirmed ? "Delivery Confirmed" : "Confirm Delivery"}</span>
                  <div className="desktop-prd-timer-badge">
                    <span className="material-symbols-outlined">timer</span>
                    <span>{formatTimer(cdSeconds)}</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="desktop-prd-report-btn"
                  onClick={() => setIsReportOpen(true)}
                >
                  <span>Report an Issue</span>
                </button>
              </div>
            ) : isDisputeOngoing ? (
              <button
                type="button"
                className="desktop-prd-submit-proof-btn"
                onClick={() => setIsProofModalOpen(true)}
              >
                <span className="material-symbols-outlined">add_photo_alternate</span>
                <span>Submit More Proof</span>
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
      </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN: PERSISTENT CHAT BOX (Consistent Across All Rooms)
            ══════════════════════════════════════════════════════════════ */}
        <div className="desktop-prd-right-col">
          {/* Green Header */}
          <div className="desktop-prd-chat-header">
            <div className="desktop-prd-chat-header-text">
              <span className="desktop-prd-chat-header-user">{counterpartyName}</span>
              <span className="desktop-prd-chat-header-order">{orderNumber}</span>
            </div>
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
                attach_file
              </span>
            </button>
            <input
              type="text"
              className="desktop-prd-chat-input"
              placeholder="Type your message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button
              type="submit"
              className="desktop-prd-chat-send-btn"
              aria-label="Send message"
              title="Send message"
              disabled={!chatInput.trim()}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                send
              </span>
            </button>
          </form>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            3RD COLUMN: NEED HELP TILES
            ══════════════════════════════════════════════════════════════ */}
        <div className="desktop-prd-help-col">
          <h3 className="desktop-prd-help-heading">Need help?</h3>
          <div className="desktop-prd-help-card">
            <button
              type="button"
              className="desktop-prd-help-item"
              onClick={() => setIsReportOpen(true)}
              aria-label="Report an issue: Report a problem or dispute"
            >
              <div className="desktop-prd-help-icon-badge">
                <HelpReportIcon />
              </div>
              <div className="desktop-prd-help-text">
                <span className="desktop-prd-help-item-title">Report an issue</span>
                <span className="desktop-prd-help-item-sub">Report a problem or dispute</span>
              </div>
              <span className="material-symbols-outlined desktop-prd-help-chevron">
                chevron_right
              </span>
            </button>

            <button
              type="button"
              className="desktop-prd-help-item"
              onClick={() => setIsSendMessageOpen(true)}
              aria-label="Chat with us: Send an in-app message"
            >
              <div className="desktop-prd-help-icon-badge">
                <HelpMessageIcon />
              </div>
              <div className="desktop-prd-help-text">
                <span className="desktop-prd-help-item-title">Chat with us</span>
                <span className="desktop-prd-help-item-sub">Send an in-app message</span>
              </div>
              <span className="material-symbols-outlined desktop-prd-help-chevron">
                chevron_right
              </span>
            </button>

            <button
              type="button"
              className="desktop-prd-help-item"
              onClick={() => setIsFaqModalOpen(true)}
              aria-label="FAQs: Find answers to some frequently asked questions"
            >
              <div className="desktop-prd-help-icon-badge">
                <HelpQuestionIcon />
              </div>
              <div className="desktop-prd-help-text">
                <span className="desktop-prd-help-item-title">FAQs</span>
                <span className="desktop-prd-help-item-sub">Find answers to some frequently asked questions</span>
              </div>
              <span className="material-symbols-outlined desktop-prd-help-chevron">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Chat Modal Dialog for Mini Desktop Screens (<= 1024px) ── */}
      {isChatModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="desktop-prd-chat-modal-backdrop"
            onClick={() => setIsChatModalOpen(false)}
          >
            <div
              className="desktop-prd-chat-modal-dialog"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="desktop-prd-right-col as-modal">
                {/* Green Header with Close Button */}
                <div className="desktop-prd-chat-header">
                  <div className="desktop-prd-chat-header-text">
                    <span className="desktop-prd-chat-header-user">{counterpartyName}</span>
                    <span className="desktop-prd-chat-header-order">{orderNumber}</span>
                  </div>
                  <button
                    type="button"
                    className="desktop-prd-chat-modal-close-btn"
                    onClick={() => setIsChatModalOpen(false)}
                    aria-label="Close Chat"
                    title="Close Chat"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      close
                    </span>
                  </button>
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
                <div className="desktop-prd-chat-stream">
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
                      attach_file
                    </span>
                  </button>
                  <input
                    type="text"
                    className="desktop-prd-chat-input"
                    placeholder="Type your message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="desktop-prd-chat-send-btn"
                    aria-label="Send message"
                    title="Send message"
                    disabled={!chatInput.trim()}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      send
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Slide-up / Drawer Modals ── */}
      <OrderDetailsModal
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        isLifting={isDetailsLifting}
        onAnimationEnd={() => setIsDetailsLifting(false)}
        room={{
          ...room,
          id: orderNumber,
          amount: orderAmount,
          item: itemName,
          sellerName,
          buyerName,
          courier: courierService,
        }}
      />

      <ShippingStatusModal
        isOpen={isShippingOpen}
        onClose={handleCloseShipping}
        isLifting={isShippingLifting}
        onAnimationEnd={() => setIsShippingLifting(false)}
        room={{
          ...room,
          id: orderNumber,
          courier: courierService,
          trackingNumber,
        }}
      />

      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* ── Compulsory First-Time Agree to Transaction Terms Modal ── */}
      <AgreeTermsModal
        isOpen={isTermsModalOpen}
        onClose={handleCloseTermsModal}
        onAgree={handleAgreeTerms}
        room={room}
        sellerName={sellerName}
      />

      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        room={{
          ...room,
          id: orderNumber,
          amount: orderAmount,
          item: itemName,
          sellerName,
          buyerName,
          bank: selectedBank,
          date: room.date || "10 Aug 2026, 01:15 PM",
        }}
      />

      <ReportIssueModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        room={room}
        onSubmitIssue={(issueData) => {
          setIsReportOpen(false);
          if (issueData?.description) {
            setTrails((prev) => [
              ...prev,
              {
                id: Date.now(),
                type: "buyer",
                author: buyerName,
                time: "Just now",
                reason: issueData.reason || "Dispute Issue",
                message: issueData.description,
                photos: issueData.images || [],
              },
            ]);
          }
          showToast("Dispute reported. Team will review shortly.");
        }}
      />

      <ProtectionInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />

      {/* ── Confirm Delivery Confirmation Modal ── */}
      {isConfirmModalOpen &&
        createPortal(
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
                    background: "transparent",
                    color: "var(--ink)",
                    fontWeight: 600,
                    fontSize: 13.5,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelivery}
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 10,
                    border: "none",
                    background: "#16a34a",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: 13.5,
                    cursor: "pointer",
                  }}
                >
                  Confirm &amp; Release
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Submit More Proof Modal (Child of Report an issue modal) ── */}
      <ReportIssueModal.SubmitMoreProof
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        room={room}
        orderNumber={orderNumber}
        onSubmitProof={({ text, photos }) => {
          setIsProofModalOpen(false);
          const newTrailItem = {
            id: Date.now(),
            type: "user",
            author: role === "Seller" ? sellerName : buyerName,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            reason: "Additional Proof Submitted",
            message: text?.trim() || "Additional proof evidence submitted.",
            photos: (photos || []).map((p) => (typeof p === "string" ? p : p.url)),
          };
          setTrails((prev) => [...prev, newTrailItem]);
          showToast("Additional evidence submitted to PayKudi dispute team.");
        }}
      />


      {/* Change Refund Bank Modal */}
      {isChangeBankOpen &&
        createPortal(
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
                    showToast(`Refund bank changed to ${b}`);
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
        </div>,
        document.body
      )}

      {/* ── Call Us Support Modal ── */}
      {isCallModalOpen &&
        createPortal(
          <div
            className="desktop-prd-call-modal-backdrop"
            onClick={() => setIsCallModalOpen(false)}
          >
          <div
            className="desktop-prd-call-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="desktop-prd-call-header">
              <div className="desktop-prd-call-badge">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-2.2 2.2a15.053 15.053 0 0 1-6.59-6.59l2.2-2.21a.96.96 0 0 0 .25-1.01A11.36 11.36 0 0 1 8.5 3.9c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.52c0-.55-.45-1-.99-1z"/>
                </svg>
              </div>
              <div>
                <h4 className="desktop-prd-call-title">Call PayKudi Support</h4>
                <p className="desktop-prd-call-sub">Available 24/7 for urgent transaction assistance</p>
              </div>
              <button
                type="button"
                className="desktop-prd-call-close-btn"
                onClick={() => setIsCallModalOpen(false)}
                aria-label="Close"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="desktop-prd-call-body">
              <div className="desktop-prd-call-phone-box">
                <span className="desktop-prd-call-phone-num">+234 803 200 1585</span>
                <button
                  type="button"
                  className="desktop-prd-call-copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText("+2348032001585");
                    showToast("Phone number copied to clipboard!");
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                  <span>Copy</span>
                </button>
              </div>

              <div className="desktop-prd-call-actions">
                <a
                  href="tel:+2348032001585"
                  className="desktop-prd-call-dial-btn"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>call</span>
                  <span>Call Now</span>
                </a>
                <button
                  type="button"
                  className="desktop-prd-call-wa-btn"
                  onClick={() => {
                    window.open(
                      "https://wa.me/2348032001585?text=Hello%20PayKudi%20Support%2C%20I%20need%20assistance%20with%20order%20" +
                        (room.orderNumber || "ORD-603607"),
                      "_blank"
                    );
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.71 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.414z" />
                  </svg>
                  <span>WhatsApp Live</span>
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Slide-Up Support Modals for Chat & FAQs ── */}
      <SendMessageSlideUpModal
        isOpen={isSendMessageOpen}
        onClose={() => setIsSendMessageOpen(false)}
      />

      <FaqSlideUpModal
        isOpen={isFaqModalOpen}
        onClose={() => setIsFaqModalOpen(false)}
      />

      {/* ── Change Payout / Refund Account Modal ── */}
      <PayoutAccountModal
        isOpen={isChangeBankOpen}
        onClose={() => setIsChangeBankOpen(false)}
        currentData={{
          bank: selectedBank,
          accountNumber,
          accountName,
        }}
        onSave={handleSavePayoutAccount}
      />

      {/* Toast Feedback */}
      {toastText && <div className="desktop-prd-toast">{toastText}</div>}
    </div>
  );
}
