import { useState } from "react";

export default function ReceiptModal({ isOpen, onClose, room = {} }) {
  const [downloaded, setDownloaded] = useState(false);

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
    return hasNaira ? `₦${res}` : res;
  };

  const orderNumber = room.id || room.orderNumber || "ORD-533666";
  const orderAmount = formatNaira(room.amount || room.price || "₦2,345,680");
  const itemName = room.item || room.title || "Standard Item";
  const courierService = room.courier || "GIG Logistics";
  const trackingNumber = room.trackingNumber || "KMLMLMMO";
  const statusText = room.statusText || (room.status === "in_transit" ? "In Transit" : room.status === "payment_received" ? "Payment Received" : "Awaiting Payment");

  const handleDownload = () => {
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  };

  return (
    <div
      className="ap-bottom-sheet-backdrop"
      onClick={onClose}
    >
      <div
        className="ap-bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "85vh" }}
      >
        <div className="ap-sheet-handle" />
        <div className="ap-sheet-header">
          <div className="ap-sheet-title-group">
            <h3 className="ap-sheet-title">Payment Receipt</h3>
            <span className="ap-sheet-order-id">Official</span>
          </div>
          <button
            type="button"
            className="ap-sheet-close-btn"
            onClick={onClose}
            aria-label="Close receipt"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="ap-sheet-body" style={{ padding: "16px 20px 24px" }}>
          <div
            style={{
              background: "var(--surface)",
              border: "1px dashed var(--line)",
              borderRadius: "14px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ textAlign: "center", borderBottom: "1px solid var(--line)", paddingBottom: "12px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase" }}>
                ✓ Escrow Payment Secured
              </span>
              <h3 style={{ fontSize: "22px", fontWeight: 800, margin: "4px 0", color: "var(--ink)" }}>
                {orderAmount}
              </h3>
              <p style={{ fontSize: "11px", color: "var(--muted)" }}>{orderNumber}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Item</span>
                <span style={{ fontWeight: 700, color: "var(--ink)" }}>{itemName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Courier</span>
                <span style={{ fontWeight: 700, color: "var(--ink)" }}>{courierService}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Reference</span>
                <span style={{ fontWeight: 700, color: "var(--ink)" }}>{trackingNumber}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Status</span>
                <span style={{ fontWeight: 700, color: "#16a34a" }}>{statusText}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              style={{
                marginTop: "8px",
                width: "100%",
                height: "40px",
                borderRadius: "10px",
                background: "var(--ink)",
                color: "var(--page)",
                border: "none",
                fontWeight: 700,
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {downloaded ? "check" : "download"}
              </span>
              {downloaded ? "Receipt Downloaded!" : "Download PDF Receipt"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
