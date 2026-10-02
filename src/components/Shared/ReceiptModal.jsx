import { useState } from "react";
import { createPortal } from "react-dom";
import BankLogo from "../BankLogo.jsx";
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

function getReceiptBadgeConfig(typeKey) {
  const t = (typeKey || "").toLowerCase();
  if (t.includes("refund")) {
    return {
      badgeClass: "refund",
      badgeIcon: (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14L4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
        </svg>
      ),
    };
  }
  if (t.includes("payout") || t.includes("withdrawn") || t.includes("withdraw")) {
    return {
      badgeClass: "payout",
      badgeIcon: (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "translate(-0.5px, 0.5px)" }}>
          <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
        </svg>
      ),
    };
  }
  if (t.includes("received")) {
    return {
      badgeClass: "received",
      badgeIcon: (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v16m0 0l-6-6m6 6l6-6" />
        </svg>
      ),
    };
  }
  return {
    badgeClass: "sent",
    badgeIcon: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "translate(-0.5px, 0.5px)" }}>
        <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
      </svg>
    ),
  };
}

export default function ReceiptModal({
  isOpen,
  onClose,
  room = {},
  item = null,
  appearance: propAppearance,
  isPaymentRoomWhite,
}) {
  const [downloaded, setDownloaded] = useState(false);
  const [shared, setShared] = useState(false);

  // Sync appearance with the current payment room color:
  // If payment room is white -> "light". If payment room is black -> "dark".
  const resolvePaymentRoomAppearance = () => {
    if (typeof isPaymentRoomWhite === "boolean") {
      return isPaymentRoomWhite ? "light" : "dark";
    }
    if (propAppearance) return propAppearance;
    if (typeof document !== "undefined") {
      const appEl = document.querySelector(".app[data-appearance='dark']");
      const bodyApp = document.body.getAttribute("data-appearance");
      const docApp = document.documentElement.getAttribute("data-appearance");
      return (appEl || bodyApp === "dark" || docApp === "dark") ? "dark" : "light";
    }
    return "light";
  };

  const effectiveAppearance = resolvePaymentRoomAppearance();
  const isWhite = effectiveAppearance === "light";

  if (!isOpen) return null;

  const target = item || room || {};
  const tKey = (target.typeKey || target.type || "").toLowerCase();

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

  let receiptTitle = target.receiptTitle;
  if (!receiptTitle) {
    if (tKey.includes("received")) receiptTitle = "Payment received";
    else if (tKey.includes("refund")) receiptTitle = "Refund sent";
    else if (tKey.includes("sent")) receiptTitle = "Payment sent";
    else if (tKey.includes("payout") || tKey.includes("withdrawn")) receiptTitle = "Payout sent";
    else if (target.status === "completed" || target.statusText === "Completed" || target.role === "Selling") {
      receiptTitle = "Payout sent";
    } else {
      receiptTitle = "Payment receipt";
    }
  }

  const rawAmount = target.amount || target.price || target.youPaid || "₦50,000";
  const orderAmount = rawAmount.startsWith("+") || rawAmount.startsWith("−") || rawAmount.startsWith("-")
    ? rawAmount
    : formatNaira(rawAmount);

  const dateValue =
    target.time ||
    target.receiptDate ||
    (target.date && target.date.includes("·") ? target.date.replace("·", ",") : target.date) ||
    "Today, 10:42 AM";

  // Counterparty mapping
  let counterpartyLabel = "Beneficiary";
  if (tKey.includes("received")) {
    counterpartyLabel = "Sender";
  } else if (tKey.includes("sent") || tKey.includes("refund")) {
    counterpartyLabel = "Recipient";
  } else if (tKey.includes("payout")) {
    counterpartyLabel = "Beneficiary";
  }
  const counterpartyName = target.title || target.recipient || target.sellerName || target.accountName || null;

  // Bank code resolution
  const bankCode = target.bankCode || (target.bank ? target.bank.toLowerCase().replace(/\s+bank/g, "").trim() : null);
  const bankName = target.bank || (bankCode ? bankCode.charAt(0).toUpperCase() + bankCode.slice(1) + " Bank" : null);

  const paymentMethod = target.paymentMethod || (bankName ? `${bankName} Transfer` : "**** 4242");

  const paymentReference =
    target.paymentReference ||
    target.orderNumber ||
    target.referenceNumber ||
    target.txId ||
    (target.id && String(target.id).startsWith("ORD-")
      ? `32349200${target.id.replace(/\D/g, "") || "93488840"}`
      : target.id ? `PK-${String(target.id).toUpperCase().replace(/[^A-Z0-9]/g, "")}-93488840` : "3234920093488840");

  const badgeCfg = tKey ? getReceiptBadgeConfig(tKey) : null;

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

  return createPortal(
    <div
      className={`pk-receipt-backdrop ${isWhite ? "receipt-white-mode" : "receipt-dark-mode"}`}
      data-appearance={effectiveAppearance}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`pk-receipt-sheet ${isWhite ? "receipt-white-mode" : "receipt-dark-mode"}`}
        data-appearance={effectiveAppearance}
        onClick={(e) => e.stopPropagation()}
      >
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

        {/* Hero Section: Bank Logo or Paper Airplane Hero + Title */}
        <div className="pk-receipt-hero">
          {bankCode ? (
            <div className="pk-receipt-bank-circle-wrap">
              <BankLogo bankCode={bankCode} size={64} />
              {badgeCfg && (
                <span className={`activity-direction-badge ${badgeCfg.badgeClass}`}>
                  {badgeCfg.badgeIcon}
                </span>
              )}
            </div>
          ) : (
            <div className="pk-receipt-hero-circle">
              <PaperAirplaneIcon />
            </div>
          )}
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

          {/* Row 2: Counterparty (if available) */}
          {counterpartyName && (
            <div className="pk-receipt-row">
              <span className="pk-receipt-label">{counterpartyLabel}</span>
              <span className="pk-receipt-val">{counterpartyName}</span>
            </div>
          )}

          {/* Row 3: Bank (if available) */}
          {bankName && (
            <div className="pk-receipt-row">
              <span className="pk-receipt-label">Bank</span>
              <span className="pk-receipt-val">{bankName}</span>
            </div>
          )}

          {/* Row 4: Payment Method */}
          <div className="pk-receipt-row">
            <span className="pk-receipt-label">Payment Method</span>
            <span className="pk-receipt-val">{paymentMethod}</span>
          </div>

          {/* Row 5: Payment Reference */}
          <div className="pk-receipt-row">
            <span className="pk-receipt-label">Payment Reference</span>
            <span className="pk-receipt-val">{paymentReference}</span>
          </div>

          {/* Row 6: Status */}
          <div className="pk-receipt-row">
            <span className="pk-receipt-label">Status</span>
            <span className="pk-receipt-val" style={{ color: "#10b981", fontWeight: 700 }}>
              Successful
            </span>
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
    </div>,
    document.body
  );
}
