import { useState, useRef, useEffect } from "react";
import OrderDetailsModal from "./Shared/OrderDetailsModal";
import ShippingStatusModal from "./Shared/ShippingStatusModal";
import HelpDrawer from "./Shared/HelpDrawer";
import ReceiptModal from "./Shared/ReceiptModal";
import ReportIssueModal from "./Shared/ReportIssueModal";
import ProtectionInfoModal from "./Shared/ProtectionInfoModal";
import ReceiptIcon from "./Shared/ReceiptIcon";
import "../styles/mobile-awaiting-payment.css";
import "../styles/mobile-in-transit.css";
import "../styles/mobile-confirm-delivery.css";
import "../styles/mobile-dispute-ongoing.css";
import "../styles/mobile-completed.css";
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

  // Confirm delivery & Payment confirmed states
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDeliveryConfirmed, setIsDeliveryConfirmed] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);

  // Dispute ongoing proof modal state
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [proofText, setProofText] = useState("");
  const [proofPhotos, setProofPhotos] = useState([]);
  const fileInputRef = useRef(null);

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

  // Timers
  const [seconds, setSeconds] = useState(119); // 1m 59s for Awaiting Payment
  const [cdSeconds, setCdSeconds] = useState(3597); // 59m 57s for Confirm Delivery
  const [disputeSeconds, setDisputeSeconds] = useState(1060); // 17m 40s for Dispute Ongoing

  useEffect(() => {
    if (!isAwaitingPayment || seconds <= 0) return;
    const t = setInterval(() => setSeconds((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [isAwaitingPayment, seconds]);

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

  const accountName =
    room.accountName || (isPaymentReceived ? "Marcus Vance" : `PayKudi(${sellerName})`);
  const accountNumber =
    room.accountNumber || (isPaymentReceived ? "0123456789" : "903370574");

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

  const handlePaymentClick = () => {
    setIsPaymentConfirmed(true);
    showToast("Payment confirmed.");
    if (onPaymentConfirmed) onPaymentConfirmed();
  };

  const handleConfirmDelivery = () => {
    setIsDeliveryConfirmed(true);
    setIsConfirmModalOpen(false);
    showToast("Delivery confirmed. Funds released.");
    if (onDeliveryConfirmed) onDeliveryConfirmed();
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remainingSlots = 4 - proofPhotos.length;
    const toAdd = files.slice(0, remainingSlots).map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setProofPhotos((prev) => [...prev, ...toAdd]);
  };

  const handleRemovePhoto = (index) => {
    setProofPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitProof = () => {
    if (!proofText.trim() && proofPhotos.length === 0) return;
    const newTrailItem = {
      id: Date.now(),
      type: "user",
      author: role === "Seller" ? sellerName : buyerName,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      reason: null,
      message: proofText.trim() || "Additional proof evidence submitted.",
      photos: proofPhotos.map((p) => p.url),
    };
    setTrails((prev) => [...prev, newTrailItem]);
    setProofText("");
    setProofPhotos([]);
    setIsProofModalOpen(false);
    showToast("Additional evidence submitted to PayKudi dispute team.");
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
                disabled={isDetailsLifting}
                style={{ cursor: isDetailsLifting ? "default" : "pointer" }}
              >
                <span>Order details</span>
                <span
                  className={`material-symbols-outlined desktop-prd-trigger-chevron ${
                    isDetailsArrowUp ? "expanded" : ""
                  }`}
                  style={{ fontSize: 18 }}
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
                    style={{ fontSize: 18 }}
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

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN: PERSISTENT CHAT BOX (Consistent Across All Rooms)
            ══════════════════════════════════════════════════════════════ */}
        <div className="desktop-prd-right-col">
          {/* Green Header */}
          <div className="desktop-prd-chat-header">
            <span className="desktop-prd-chat-header-user">{counterpartyName}</span>
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
        </div>
      )}

      {/* ── Submit More Proof Modal ── */}
      {isProofModalOpen && (
        <div
          className="ap-bottom-sheet-backdrop"
          onClick={() => setIsProofModalOpen(false)}
        >
          <div
            className="ap-bottom-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="ap-sheet-handle" />
            <div className="ap-sheet-header">
              <div className="ap-sheet-title-group">
                <h3 className="ap-sheet-title" style={{ color: "#dc2626" }}>
                  Submit More Proof
                </h3>
                <span className="ap-sheet-ord-pill">{orderNumber}</span>
              </div>
              <button
                type="button"
                className="ap-sheet-close-btn"
                onClick={() => setIsProofModalOpen(false)}
                aria-label="Close"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  close
                </span>
              </button>
            </div>

            <div className="mdo-proof-modal-body">
              <label className="cd-issue-label" htmlFor="proof-desc">
                Additional Notes / Explanation
              </label>
              <textarea
                id="proof-desc"
                className="mdo-proof-textarea"
                placeholder="Provide further details or context for the dispute resolution team..."
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
              />

              <div className="cd-issue-upload-header">
                <label className="cd-issue-label">
                  Attach Photos <span className="cd-issue-label-sub">(up to 4)</span>
                </label>
                <span className="cd-issue-photo-counter">
                  {proofPhotos.length}/4 uploaded
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={handlePhotoUpload}
              />

              {proofPhotos.length < 4 && (
                <div
                  className="mdo-proof-upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: "#9ca3af" }}>
                    photo_camera
                  </span>
                  <span style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>
                    Click to add image proof
                  </span>
                </div>
              )}

              {proofPhotos.length > 0 && (
                <div className="mdo-proof-preview-row">
                  {proofPhotos.map((photo, i) => (
                    <div key={i} className="mdo-proof-preview-thumb">
                      <img src={photo.url} alt={`Upload ${i + 1}`} />
                      <button
                        type="button"
                        className="mdo-proof-remove-btn"
                        onClick={() => handleRemovePhoto(i)}
                        aria-label="Remove photo"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          close
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="mdo-proof-submit-btn"
                onClick={handleSubmitProof}
              >
                Submit Evidence
              </button>
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
        </div>
      )}

      {/* Toast Feedback */}
      {toastText && <div className="desktop-prd-toast">{toastText}</div>}
    </div>
  );
}
