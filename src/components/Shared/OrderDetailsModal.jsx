import "../../styles/mobile-awaiting-payment.css";

export default function OrderDetailsModal({
  isOpen,
  onClose,
  isLifting = false,
  onAnimationEnd = () => {},
  room = {},
}) {
  if (!isOpen) return null;

  // Format currency with standard international formatting
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

  const orderNumber = room.id || room.orderNumber || "ORD-302914";
  const orderAmount = formatNaira(room.amount || room.price || "₦2,450,000");
  const itemName = room.item || room.title || 'MacBook Pro M3 Max 16"';
  const variantText = room.variant || "Space Black, 36GB RAM, 1TB SSD";
  const sellerName = room.sellerName || room.counterparty || "Amaka Obi";
  const youPaidAmount = room.youPaid || "₦2,381,165";
  const txFee = room.txFee || "₦35,185";
  const convenienceFee = room.convenienceFee || "₦300";
  const deliveryTerms = room.deliveryTerms || "GIG Logistics";
  const deliveryDuration = room.deliveryDuration || "3–5 business days";
  const inspectionWindow = room.inspectionWindow || "24 Hours post-delivery";
  const inspectionNote = room.inspectionNote || "To confirm or dispute";

  const avatarText =
    room.avatarText ||
    (itemName.toLowerCase().includes("macbook")
      ? "MACBOOK"
      : itemName.split(" ")[0]?.toUpperCase() || "ITEM");

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
            <h3 className="ap-sheet-title">Order Details</h3>
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
                <span>{avatarText}</span>
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
                <span className="ap-sheet-row-val">{txFee}</span>
              </div>
              <div className="ap-sheet-row fee-row">
                <span className="ap-sheet-row-label">Convenience fee</span>
                <span className="ap-sheet-row-val">{convenienceFee}</span>
              </div>
              <div className="ap-sheet-divider" />
              <div className="ap-sheet-row total-row">
                <span className="ap-sheet-row-label">Total</span>
                <span className="ap-sheet-row-val">{youPaidAmount}</span>
              </div>
            </div>
          </div>

          {/* Terms Agreed Section */}
          <div className="ap-sheet-section">
            <div className="ap-sheet-section-title">TERMS AGREED</div>
            <div className="ap-sheet-terms-list">
              {/* Term 1: Delivery Terms */}
              <div className="ap-sheet-term-item">
                <div className="ap-sheet-term-icon delivery">
                  <span className="material-symbols-outlined">local_shipping</span>
                </div>
                <div className="ap-sheet-term-content">
                  <div className="ap-sheet-term-label">Delivery Terms</div>
                  <div className="ap-sheet-term-val">
                    {deliveryTerms}{" "}
                    <span className="ap-sheet-term-sub">({deliveryDuration})</span>
                  </div>
                </div>
              </div>

              {/* Term 2: Inspection Window */}
              <div className="ap-sheet-term-item">
                <div className="ap-sheet-term-icon inspection">
                  <span className="material-symbols-outlined">timer</span>
                </div>
                <div className="ap-sheet-term-content">
                  <div className="ap-sheet-term-label">Inspection Window</div>
                  <div className="ap-sheet-term-val">
                    {inspectionWindow}{" "}
                    <span className="ap-sheet-term-sub">({inspectionNote})</span>
                  </div>
                </div>
              </div>

              {/* Term 3: Seller's Name */}
              <div className="ap-sheet-term-item">
                <div className="ap-sheet-term-icon seller">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div className="ap-sheet-term-content">
                  <div className="ap-sheet-term-label">Seller's Name</div>
                  <div className="ap-sheet-term-val">{sellerName}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
