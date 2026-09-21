import React from "react";

export default function OrderDetailsModal({
  isOpen,
  onClose,
  isLifting = false,
  onAnimationEnd = () => {},
  room = {},
}) {
  if (!isOpen) return null;

  // Format currency with standard international formatting (never Indian format)
  const formatNaira = (val) => {
    if (!val) return "";
    const str = String(val);
    const hasNaira = str.includes("₦");
    const rawNum = str.replace(/[^0-9.]/g, "");
    if (!rawNum) return str;
    const parts = rawNum.split(".");
    const intFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const res = parts.length > 1 ? `${intFormatted}.${parts[1]}` : intFormatted;
    return hasNaira ? `₦${res}` : res;
  };

  const orderNumber = room.id || room.orderNumber || "ORD-603607";
  const orderAmount = formatNaira(room.amount || room.price || "₦1,000,000");
  const itemName = room.item || room.title || "Iphone 18 Pro Max";
  const variantText = room.variant || "Standard Edition";
  const statusText =
    room.statusText ||
    (room.status === "in_transit"
      ? "In Transit"
      : room.status === "payment_received"
      ? "Payment Received"
      : "Awaiting Payment");

  return (
    <div
      className={`ap-bottom-sheet-backdrop ${isLifting ? "lifting" : ""}`}
      onClick={onClose}
    >
      <div
        className="ap-bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={onAnimationEnd}
      >
        {/* Drag Handle */}
        <div className="ap-sheet-handle" />

        {/* Header: Title + Order ID Pill + Close */}
        <div className="ap-sheet-header">
          <div className="ap-sheet-title-group">
            <h3 className="ap-sheet-title">Order details</h3>
            <span className="ap-sheet-ord-pill">{orderNumber}</span>
          </div>
          <button
            type="button"
            className="ap-sheet-close-btn"
            onClick={onClose}
            disabled={isLifting}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              close
            </span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="ap-sheet-body">
          {/* Product Info Card */}
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

          {/* Payment Breakdown Section */}
          <div className="ap-sheet-section">
            <div className="ap-sheet-section-title">PAYMENT BREAKDOWN</div>
            <div className="ap-sheet-breakdown-list">
              <div className="ap-sheet-row">
                <span className="ap-sheet-row-label">Item Amount</span>
                <span className="ap-sheet-row-val">{orderAmount}</span>
              </div>
              <div className="ap-sheet-row fee-row">
                <span className="ap-sheet-row-label">Transaction fee (1.5%)</span>
                <span className="ap-sheet-row-val">Included</span>
              </div>
              <div className="ap-sheet-row fee-row">
                <span className="ap-sheet-row-label">Delivery fee</span>
                <span className="ap-sheet-row-val" style={{ color: "#16a34a" }}>Free</span>
              </div>
              <div className="ap-sheet-divider" />
              <div className="ap-sheet-row total-row">
                <span className="ap-sheet-row-label">Total Escrow Amount</span>
                <span className="ap-sheet-row-val">{orderAmount}</span>
              </div>
            </div>
          </div>

          {/* Terms Agreed Section */}
          <div className="ap-sheet-section">
            <div className="ap-sheet-section-title">TERMS & ESCROW STATUS</div>
            <div className="ap-sheet-terms-list">
              {/* Term 1: Delivery Status */}
              <div className="ap-sheet-term-item">
                <div className="ap-sheet-term-icon delivery">
                  <span className="material-symbols-outlined">local_shipping</span>
                </div>
                <div className="ap-sheet-term-content">
                  <div className="ap-sheet-term-title">Delivery Status</div>
                  <div className="ap-sheet-term-desc">{statusText} via Verified Courier</div>
                </div>
              </div>

              {/* Term 2: Inspection Window */}
              <div className="ap-sheet-term-item">
                <div className="ap-sheet-term-icon inspection">
                  <span className="material-symbols-outlined">schedule</span>
                </div>
                <div className="ap-sheet-term-content">
                  <div className="ap-sheet-term-title">Inspection Window</div>
                  <div className="ap-sheet-term-desc">24 hours inspection period upon delivery</div>
                </div>
              </div>

              {/* Term 3: Escrow Lock */}
              <div className="ap-sheet-term-item">
                <div className="ap-sheet-term-icon return">
                  <span className="material-symbols-outlined">lock</span>
                </div>
                <div className="ap-sheet-term-content">
                  <div className="ap-sheet-term-title">Escrow Protection</div>
                  <div className="ap-sheet-term-desc">100% money-back guarantee by PayKudi</div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Shield Note */}
          <div className="ap-sheet-escrow-badge">
            <span className="material-symbols-outlined">verified_user</span>
            <span>PayKudi Escrow Protection Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
