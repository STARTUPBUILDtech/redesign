import React from "react";
import "../../styles/mobile-awaiting-payment.css";
import "../../styles/mobile-in-transit.css";

export default function ShippingStatusModal({
  isOpen,
  onClose,
  isLifting = false,
  onAnimationEnd = () => {},
  room = {},
}) {
  if (!isOpen) return null;

  const courierService = room.courier || "GIG Logistics";
  const trackingNumber = room.trackingNumber || "KMLMLMMO";
  const estimatedArrival = room.estimatedArrival || "12-10-2024";

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
        <div className="ap-sheet-handle" />

        <div className="ap-sheet-header">
          <div className="ap-sheet-title-group">
            <h3 className="ap-sheet-title">Shipping Status</h3>
            <span className="it-tracking-pill">{trackingNumber}</span>
          </div>
          <button
            type="button"
            className="ap-sheet-close-btn"
            onClick={onClose}
            disabled={isLifting}
            aria-label="Close shipping status"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              close
            </span>
          </button>
        </div>

        <div className="it-shipping-sheet-body">
          <div className="it-courier-summary-card">
            <div className="it-courier-summary-top">
              <div className="it-courier-badge">
                <span className="material-symbols-outlined" style={{ color: "#7c3aed" }}>
                  local_shipping
                </span>
                <span>{courierService}</span>
              </div>
              <span
                style={{
                  background: "rgba(124, 58, 237, 0.12)",
                  color: "#7c3aed",
                  fontWeight: 700,
                  fontSize: "12px",
                  padding: "2px 8px",
                  borderRadius: "6px",
                }}
              >
                On Schedule
              </span>
            </div>
            <div className="it-eta-row">
              <span>Estimated Delivery:</span>
              <span className="it-eta-val">{estimatedArrival}</span>
            </div>
          </div>

          <div className="it-timeline">
            <div className="it-timeline-item">
              <div className="it-timeline-dot completed">
                <span className="material-symbols-outlined" style={{ fontSize: 13, fontWeight: 800 }}>
                  check
                </span>
              </div>
              <h4 className="it-timeline-title">Escrow Payment Confirmed</h4>
              <p className="it-timeline-desc">Funds locked securely in PayKudi escrow.</p>
              <span className="it-timeline-time">10-10-2024 · 10:42 AM</span>
            </div>

            <div className="it-timeline-item">
              <div className="it-timeline-dot completed">
                <span className="material-symbols-outlined" style={{ fontSize: 13, fontWeight: 800 }}>
                  check
                </span>
              </div>
              <h4 className="it-timeline-title">Dispatched with {courierService}</h4>
              <p className="it-timeline-desc">Package registered under Waybill #{trackingNumber}.</p>
              <span className="it-timeline-time">11-10-2024 · 02:15 PM</span>
            </div>

            <div className="it-timeline-item">
              <div className="it-timeline-dot active">
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                  directions_transit
                </span>
              </div>
              <h4 className="it-timeline-title" style={{ color: "#7c3aed" }}>
                In Transit to Delivery Hub
              </h4>
              <p className="it-timeline-desc">Package is on route to the regional sorting facility.</p>
              <span className="it-timeline-time">11-10-2024 · 06:40 PM</span>
            </div>

            <div className="it-timeline-item">
              <div className="it-timeline-dot">
                <span>4</span>
              </div>
              <h4 className="it-timeline-title" style={{ color: "var(--muted)" }}>
                Out for Delivery
              </h4>
              <p className="it-timeline-desc">Courier assigned for destination dispatch.</p>
            </div>

            <div className="it-timeline-item">
              <div className="it-timeline-dot">
                <span>5</span>
              </div>
              <h4 className="it-timeline-title" style={{ color: "var(--muted)" }}>
                Delivered & Escrow Release
              </h4>
              <p className="it-timeline-desc">Buyer confirms package inspection and payout is released.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
