import React from "react";

export default function ProtectionInfoModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="ap-bottom-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="ap-bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "60vh" }}
      >
        <div className="ap-sheet-handle" />
        <div className="ap-sheet-header">
          <h3 className="ap-sheet-title">PayKudi Protection</h3>
          <button
            type="button"
            className="ap-sheet-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="ap-sheet-body" style={{ padding: "16px 20px 24px" }}>
          <p style={{ fontSize: "13px", lineHeight: "1.6", color: "var(--ink)" }}>
            Every transaction on PayKudi is safeguarded by our automated escrow system. Funds are securely locked from deposit until physical delivery is confirmed, protecting both buyer and seller against fraud, delays, or disputes.
          </p>
        </div>
      </div>
    </div>
  );
}
