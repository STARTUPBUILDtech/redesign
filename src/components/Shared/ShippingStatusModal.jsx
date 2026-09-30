import { createPortal } from "react-dom";
import "../../styles/mobile-awaiting-payment.css";
import "../../styles/mobile-in-transit.css";

/* ── Proof-of-shipping real images ── */
const PROOF_IMAGES = [
  {
    label: "Package Box",
    url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&h=200&fit=crop&auto=format",
  },
  {
    label: "Waybill Slip",
    url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200&h=200&fit=crop&auto=format",
  },
  {
    label: "Packaging",
    url: "https://images.unsplash.com/photo-1530982011887-3cc11cc85693?w=200&h=200&fit=crop&auto=format",
  },
  {
    label: "Security S...",
    url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop&auto=format",
  },
];

export default function ShippingStatusModal({
  isOpen,
  onClose,
  isLifting = false,
  onAnimationEnd = () => {},
  room = {},
}) {
  if (!isOpen) return null;

  const orderNumber    = room.id || room.orderNumber || "ORD-771920";
  const courierService = room.courier || "GIG Logistics";
  const trackingNumber = room.trackingNumber || "KMLMLMMO";

  /* ── Timeline steps ── */
  const steps = [
    {
      state: "completed",
      icon: "check_circle",
      title: "Package Picked Up",
      desc: "Collected by courier from seller facility",
      time: "11:30 AM",
    },
    {
      state: "completed",
      icon: "check_circle",
      title: "Sorted at Origin Hub",
      desc: "Processed at main regional sorting facility",
      time: "03:45 PM",
    },
    {
      state: "active",
      icon: "local_shipping",
      title: "In Transit to Destination",
      desc: "En route to destination delivery hub",
      badge: "Active",
    },
    {
      state: "pending",
      icon: "domain",
      title: "Arrived at Local Facility",
      desc: "Sorting for local dispatch rider allocation",
      badge: "Pending",
    },
    {
      state: "pending",
      icon: "two_wheeler",
      title: "Out for Delivery",
      desc: "Courier rider on the way to delivery address",
      badge: "Pending",
    },
  ];

  return createPortal(
    <div
      className={`ap-bottom-sheet-backdrop ${isLifting ? "lifting" : ""}`}
      onClick={onClose}
    >
      <div
        className="ap-bottom-sheet ssm-sheet"
        onClick={(e) => e.stopPropagation()}
        onAnimationEnd={onAnimationEnd}
      >
        {/* Drag handle */}
        <div className="ap-sheet-handle" />

        {/* ── Header ── */}
        <div className="ap-sheet-header">
          <div className="ap-sheet-title-group">
            <h3 className="ap-sheet-title">Shipping Status</h3>
            {/* Green pill matching Order Details modal */}
            <span className="ap-sheet-ord-pill">{orderNumber}</span>
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

        {/* ── Body ── */}
        <div className="ssm-body">

          {/* ── ORDER TRACKING ── */}
          <div className="ssm-section-label">ORDER TRACKING</div>

          <div className="ssm-timeline">
            {/* vertical connector line */}
            <div className="ssm-timeline-line" />

            {steps.map((step, i) => (
              <div key={i} className={`ssm-step ssm-step--${step.state}`}>
                {/* dot */}
                <div className={`ssm-dot ssm-dot--${step.state}`}>
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: step.state === "completed" ? 14 : 13,
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    {step.state === "completed" ? "check_circle" : step.icon}
                  </span>
                </div>

                {/* content */}
                <div className="ssm-step-content">
                  <div className="ssm-step-row">
                    <span className={`ssm-step-title ssm-step-title--${step.state}`}>
                      {step.title}
                    </span>
                    {step.time && (
                      <span
                        className={`ssm-step-time${step.state === "completed" ? " ssm-step-time--completed" : ""}`}
                      >
                        {step.time}
                      </span>
                    )}
                    {step.badge && (
                      <span className={`ssm-step-badge ssm-step-badge--${step.state}`}>
                        {step.badge}
                      </span>
                    )}
                  </div>
                  <p className="ssm-step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── PROOF OF SHIPPING ── */}
          <div className="ssm-proof-header">
            <span className="ssm-section-label">PROOF OF SHIPPING</span>
            <button type="button" className="ssm-view-all-btn">
              View All (5)
            </button>
          </div>

          <div className="ssm-proof-grid">
            {PROOF_IMAGES.map((img, i) => (
              <div key={i} className="ssm-proof-thumb">
                <div className="ssm-proof-img">
                  <img
                    src={img.url}
                    alt={img.label}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: 8,
                      display: "block",
                    }}
                    loading="lazy"
                  />
                </div>
                <span className="ssm-proof-label">{img.label}</span>
              </div>
            ))}

            {/* +1 badge */}
            <button type="button" className="ssm-proof-more-btn" aria-label="View 1 more photo">
              +1
            </button>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
