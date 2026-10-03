import { useState, useEffect, useRef } from "react";
import "../../styles/mobile-awaiting-payment.css";
import "../../styles/mobile-in-transit.css";
import "../../styles/mobile-confirm-delivery.css";
import "../../styles/mobile-dispute-ongoing.css";
import OrderDetailsModal from "../Shared/OrderDetailsModal";
import ReceiptModal from "../Shared/ReceiptModal";
import HelpDrawer from "../Shared/HelpDrawer";
import ProtectionInfoModal from "../Shared/ProtectionInfoModal";
import ChatDrawer from "../Shared/ChatDrawer";
import ReceiptIcon from "../Shared/ReceiptIcon";
import ReportIssueModal from "../Shared/ReportIssueModal";

export default function MobileDisputeOngoing({
  room = {},
  onBack,
  role = "Buying",
  isPaymentRoomWhite,
}) {
  const safeRoom = room || {};
  // Countdown timer for dispute response (starts at 29m 30s as in reference design)
  const [seconds, setSeconds] = useState(1770);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isArrowUp, setIsArrowUp] = useState(false);
  const [isLifting, setIsLifting] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [toastText, setToastText] = useState(null);
  const screenRef = useRef(null);

  useEffect(() => {
    if (isChatOpen || isHelpOpen) {
      if (screenRef.current) {
        screenRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    }
  }, [isChatOpen, isHelpOpen]);

  // Dynamic dispute trails list matching reference design with boxless appearance
  const [trails, setTrails] = useState([
    {
      id: 1,
      type: "buyer",
      sender: safeRoom.buyerName || "Tunde Adeleke",
      time: "Today, 02:15 PM",
      reason: safeRoom.disputeReason || "Item arrived damaged",
      message:
        safeRoom.disputeMessage ||
        "The package delivered contains a different model than agreed upon in the order details. The serial number does not match the invoice.",
      photos: safeRoom.disputePhotos || [],
    },
    {
      id: 2,
      type: "cs",
      sender: "PayKudi CS",
      time: "Today, 02:18 PM",
      reason: null,
      message:
        "We have received your report and we are awaiting response from counterparty.",
      photos: [],
    },
  ]);


  // Chat message state matching dispute context
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      sender: "system",
      text: "Dispute opened by buyer. Escrow funds placed on hold.",
      time: "Today 2:15 PM",
    },
    {
      id: 2,
      sender: "buyer",
      text: "I received a wrong model. It doesn't match the listing or serial number.",
      time: "Today 2:16 PM",
    },
    {
      id: 3,
      sender: "cs",
      text: "PayKudi dispute specialist is reviewing the case. Both parties have 24 hours to respond.",
      time: "Today 2:18 PM",
    },
  ]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const showToast = (msg) => {
    setToastText(msg);
    setTimeout(() => setToastText(null), 3500);
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

  const orderNumber = safeRoom.id || safeRoom.orderNumber || "ORD-884102";
  const orderAmount = safeRoom.amount || safeRoom.price || "₦50,000";
  const counterpartyName = safeRoom.sellerName || safeRoom.counterparty || "Marcus Vance";


  return (
    <div
      ref={screenRef}
      className={`mobile-awaiting-payment-screen mobile-dispute-ongoing-screen ${
        isChatOpen ? "chat-open" : ""
      } ${isHelpOpen || isProofModalOpen ? "modal-open" : ""}`}
    >
      {/* ── Top Header (Hidden when chat, help, or proof modal is open) ── */}
      {!isChatOpen && !isHelpOpen && !isProofModalOpen && (
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
            <h1 className="ap-header-title">Dispute Ongoing</h1>
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

      {/* ── Main Content Body ── */}
      <div className="ap-content-body">
        {/* ── RED ORDER AMOUNT & DISPUTE STATUS BANNER CARD ── */}
        <section className="ap-banner-card mdo-banner-card" aria-label="Dispute summary">
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
              <ReceiptIcon size={15} />
              <span>Receipt</span>
            </button>
          </div>

          {/* Divider */}
          <div className="ap-banner-divider" />

          {/* Bottom Row: DISPUTE STATUS 3-Step Stepper */}
          <div className="ap-stepper-wrap">
            <span className="ap-sublabel">DISPUTE STATUS</span>
            <div className="mdo-stepper-row">
              {/* Step 1: Dispute Raised (Checked Yellow) */}
              <div className="mdo-step-col">
                <div className="mdo-step-circle-checked">
                  <span className="material-symbols-outlined">check</span>
                </div>
                <span className="mdo-step-name active">Dispute Raised</span>
              </div>

              {/* Dotted Line 1 -> 2 */}
              <div className="mdo-stepper-dots dots-active" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>

              {/* Step 2: CS Stepped In (Active White) */}
              <div className="mdo-step-col">
                <div className="mdo-step-circle-active">2</div>
                <span className="mdo-step-name active">CS Stepped In</span>
              </div>

              {/* Dotted Line 2 -> 3 */}
              <div className="mdo-stepper-dots dots-inactive" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
              </div>

              {/* Step 3: Dispute Closed (Inactive Translucent Red) */}
              <div className="mdo-step-col">
                <div className="mdo-step-circle-inactive">3</div>
                <span className="mdo-step-name muted">Dispute Closed</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── DISPUTE TRAILS SECTION HEADER + COUNTDOWN TIMER ── */}
        <div className="mdo-trails-header-row">
          <h3 className="mdo-trails-title">DISPUTE TRAILS</h3>
          <div className="mdo-timer-pill" title="Time remaining for counterparty response">
            <span className="material-symbols-outlined mdo-timer-icon">schedule</span>
            <span>{formatTimer(seconds)}</span>
          </div>
        </div>

        {/* ── BOXLESS DISPUTE TRAILS (No card box, open timeline design) ── */}
        <div className="mdo-boxless-timeline">
          {/* Continuous Vertical Timeline Line */}
          <div className="mdo-timeline-spine" />

          {trails.map((trail) => {
            const isBuyer = trail.type === "buyer";
            return (
              <div key={trail.id} className="mdo-boxless-item">
                {/* Node circular icon on timeline */}
                <div
                  className={`mdo-timeline-node ${
                    isBuyer ? "node-buyer" : "node-cs"
                  }`}
                >
                  <span className="material-symbols-outlined">
                    {isBuyer ? "flag" : "support_agent"}
                  </span>
                </div>

                {/* Boxless Content (transparent, no box, no border) */}
                <div className="mdo-boxless-content">
                  <div className="mdo-sender-row">
                    <span
                      className={`mdo-sender-name ${isBuyer ? "" : "cs"}`}
                    >
                      {trail.sender}
                    </span>
                    <span className="mdo-timestamp">{trail.time}</span>
                  </div>

                  {/* Reason (if present) */}
                  {trail.reason && (
                    <div className="mdo-reason-row">
                      <span className="mdo-reason-label">REASON: </span>
                      <span className="mdo-reason-val">{trail.reason}</span>
                    </div>
                  )}

                  {/* Message Text */}
                  <p className="mdo-message-text">{trail.message}</p>

                  {/* Evidence Photos (if attached) */}
                  {trail.photos && trail.photos.length > 0 && (
                    <div className="mdo-trail-photos">
                      {trail.photos.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt="Dispute evidence"
                          className="mdo-trail-photo-thumb"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Order details dropdown trigger ── */}
        <div className="ap-accordion-wrap">
          <button
            type="button"
            className={`ap-order-details-trigger mdo-order-details-trigger ${isArrowUp ? "active" : ""}`}
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

        {/* ── Primary CTA: Submit More Proof ── */}
        <div className="ap-cta-container">
          <button
            type="button"
            className="mdo-submit-proof-btn"
            onClick={() => setIsProofModalOpen(true)}
          >
            <span className="material-symbols-outlined">add_photo_alternate</span>
            <span>Submit More Proof</span>
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

      {/* ── Submit More Proof Modal (Child of Report an issue modal) ── */}
      <ReportIssueModal.SubmitMoreProof
        isOpen={isProofModalOpen}
        onClose={() => setIsProofModalOpen(false)}
        room={room}
        orderNumber={orderNumber}
        onSubmitProof={({ text, photos }) => {
          setIsProofModalOpen(false);
          if (text || (photos && photos.length)) {
            setTrails((prev) => [
              ...prev,
              {
                id: Date.now(),
                type: "buyer",
                sender: room.buyerName || "Tunde Adeleke",
                time: "Just now",
                reason: "Additional Proof Submitted",
                message: text || "Uploaded additional evidence for dispute review.",
                photos: (photos || []).map((p) => (typeof p === "string" ? p : p.url)),
              },
            ]);
            showToast("Additional evidence submitted to PayKudi dispute team.");
          }
        }}
      />


      {/* ── Order Details Slide-Up Modal ── */}
      <OrderDetailsModal
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        room={{ ...room, id: orderNumber, amount: orderAmount }}
      />

      {/* ── Receipt Modal ── */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        isPaymentRoomWhite={isPaymentRoomWhite}
        room={{ ...room, id: orderNumber, amount: orderAmount }}
      />

      {/* ── Help & FAQ Drawer ── */}
      <HelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        onOpenChat={() => {
          setIsHelpOpen(false);
          setIsChatOpen(true);
        }}
      />

      {/* ── PayKudi Protection Info Modal ── */}
      <ProtectionInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />

      {/* ── Chat Slide-In Modal (Stops right under PayKudi header) ── */}
      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        room={room}
        role={role}
        sellerName={counterpartyName}
        counterpartyName={counterpartyName}
        orderNumber={orderNumber}
        initialMessages={chatMessages}
      />

      {/* ── Toast Notification ── */}
      {toastText && (
        <div className="mdo-toast">
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#22c55e" }}>
            check_circle
          </span>
          <span>{toastText}</span>
        </div>
      )}
    </div>
  );
}
