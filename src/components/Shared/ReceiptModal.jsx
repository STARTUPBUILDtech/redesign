import { useState } from "react";
import "../../styles/receipt-modal.css";

function PaperAirplaneIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: "translate(-1px, 1px)" }}
      aria-hidden="true"
    >
      <path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        fill="#ffffff"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M22 2L11 13"
        stroke="#2563eb"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" fill="currentColor" />
      <circle cx="6" cy="12" r="3" fill="currentColor" />
      <circle cx="18" cy="19" r="3" fill="currentColor" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export default function ReceiptModal({ isOpen, onClose, room = {} }) {
  const [downloaded, setDownloaded] = useState(false);
  const [shared, setShared] = useState(false);

  if (!isOpen) return null;

  const formatNaira = (val) => {
    if (!val) return "";
    const str = String(val);
    const hasNaira = str.includes("₦");
    const rawNum = str.replace(/[^0-9.]/g, "");
    if (!rawNum) return str;
    const parts = rawNum.split(".");
    const intFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const res = parts.length > 1 ? `${intFormatted}.${parts[1]}` : intFormatted;
    return hasNaira ? `₦${res}` : `₦${res}`;
  };

  const receiptTitle =
    room.receiptTitle ||
    (room.status === "completed" || room.statusText === "Completed"
      ? "Payout sent"
      : room.role === "Selling"
      ? "Payout sent"
      : "Payout sent");

  const rawAmount = room.amount || room.price || "₦50,000";
  const orderAmount = formatNaira(rawAmount);

  const dateValue =
    room.receiptDate ||
    (room.date && room.date.includes("·") ? room.date.replace("·", ",") : room.date) ||
    "10 Aug 2026, 01:15 PM";

  const paymentMethod = room.paymentMethod || "**** 4242";

  const paymentReference =
    room.paymentReference ||
    room.referenceNumber ||
    (room.id && room.id.startsWith("ORD-")
      ? `32349200${room.id.replace(/\D/g, "") || "93488840"}`
      : "3234920093488840");

  const handleDownload = () => {
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2200);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Receipt - ${orderAmount}`,
          text: `PayKudi ${receiptTitle} receipt of ${orderAmount}. Ref: ${paymentReference}`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <div className="pk-receipt-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pk-receipt-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Floating Top Drag Handle */}
        <div className="pk-receipt-handle" />

        {/* Circular Close Button (Top-Right) */}
        <button
          type="button"
          className="pk-receipt-close-btn"
          onClick={onClose}
          aria-label="Close receipt"
          title="Close receipt"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, lineHeight: 1 }}>
            close
          </span>
        </button>

        {/* Hero Section: Blue circle with white paper plane + Title */}
        <div className="pk-receipt-hero">
          <div className="pk-receipt-hero-circle">
            <PaperAirplaneIcon />
          </div>
          <h2 className="pk-receipt-title">{receiptTitle}</h2>
        </div>

        {/* Amount Section */}
        <div className="pk-receipt-amount-wrap">
          <span className="pk-receipt-amount-label">Total Amount</span>
          <h3 className="pk-receipt-amount-val">{orderAmount}</h3>
        </div>

        {/* Dotted Divider */}
        <hr className="pk-receipt-dotted-divider" />

        {/* Details Key-Value List */}
        <div className="pk-receipt-details-list">
          {/* Row 1: Date */}
          <div className="pk-receipt-row">
            <span className="pk-receipt-label">Date</span>
            <span className="pk-receipt-val">{dateValue}</span>
          </div>

          {/* Row 2: Payment Method */}
          <div className="pk-receipt-row">
            <span className="pk-receipt-label">Payment Method</span>
            <span className="pk-receipt-val">{paymentMethod}</span>
          </div>

          {/* Row 3: Payment Reference */}
          <div className="pk-receipt-row">
            <span className="pk-receipt-label">Payment Reference</span>
            <span className="pk-receipt-val">{paymentReference}</span>
          </div>
        </div>

        {/* Actions Buttons */}
        <div className="pk-receipt-actions">
          <button
            type="button"
            className="pk-receipt-download-btn"
            onClick={handleDownload}
          >
            {downloaded ? "Receipt Downloaded!" : "Download Receipt"}
          </button>

          <button
            type="button"
            className="pk-receipt-share-btn"
            onClick={handleShare}
          >
            <ShareIcon />
            <span>{shared ? "Receipt Link Copied!" : "Share"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
