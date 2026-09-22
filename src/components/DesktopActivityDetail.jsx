import { useState } from "react";
import { ArrowLeft, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import "../styles/desktop-activity-detail.css";

export default function DesktopActivityDetail({ item = {}, onBack }) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(item.refundBank || "Access Bank");

  const handleCopy = (text, key) => {
    try { navigator.clipboard?.writeText(String(text)); } catch {}
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isReceived = item.typeKey === "received";
  const isSent     = item.typeKey === "sent";
  const isRefund   = item.typeKey === "refund";
  const isPayout   = item.typeKey === "payout";

  const statusLabel = isReceived ? "PAYMENT RECEIVED"
    : isSent   ? "PAYMENT SENT"
    : isRefund ? "REFUND SENT"
    : isPayout ? "PAYOUT SENT"
    : item.title?.toUpperCase() || "ACTIVITY";

  const statusClass = isReceived ? "received"
    : isSent   ? "sent"
    : isRefund ? "refund"
    : "payout";

  // Fields shown for payment received
  const receivedFields = [
    { label: "Order Number",       value: item.orderNumber  || "ORD-302914",    key: "orderNumber" },
    { label: "You Paid",           value: item.youPaid      || item.amount,     key: "youPaid",   highlight: true, inclCharges: true },
    { label: "Bank (Refund Account)", value: selectedBank,                      key: "bank",      hasChange: true },
    { label: "Account Name",       value: item.accountName  || "Marcus Vance",  key: "accountName" },
    { label: "Account Number",     value: item.accountNumber|| "0123456789",    key: "accountNumber" },
    { label: "Seller's Name",      value: item.sellerName   || "Amaka Obi",     key: "sellerName" },
  ];

  // Fields shown for other types
  const otherFields = [
    { label: "Transaction ID", value: item.txId || item.id || "TXN-001",        key: "txId" },
    { label: "Amount",         value: item.amount,                               key: "amount", highlight: isSent || isRefund },
    { label: "Date & Time",    value: item.time,                                 key: "time" },
    ...(item.recipient ? [{ label: "Recipient", value: item.recipient, key: "recipient" }] : []),
    ...(item.bank      ? [{ label: "Bank",      value: item.bank,      key: "bank" }]      : []),
  ];

  const fields = isReceived ? receivedFields : otherFields;

  return (
    <div className="dact-wrapper">
      <div className="dact-container">
        {/* Back button */}
        <button className="dact-back-btn" onClick={onBack}>
          <ArrowLeft size={15} />
          Back to Activities
        </button>

        {/* Main detail card */}
        <div className="dact-card">
          {/* Status header */}
          <h3 className={`dact-status-header ${statusClass}`}>{statusLabel}</h3>

          {/* Fields */}
          {fields.map((field) => (
            <div className="dact-field-row" key={field.key}>
              <div className="dact-field-info">
                <span className="dact-field-label">{field.label}</span>
                <span className={`dact-field-value${field.highlight ? " dact-highlight" : ""}`}>
                  {field.value}
                  {field.inclCharges && (
                    <span className="dact-incl">(Incl Charges)</span>
                  )}
                </span>
              </div>

              {field.hasChange ? (
                <button className="dact-change-btn">Change</button>
              ) : (
                <button
                  className="dact-copy-btn"
                  title={`Copy ${field.label}`}
                  onClick={() => handleCopy(field.value, field.key)}
                >
                  {copiedKey === field.key
                    ? <Check size={13} strokeWidth={2.5} />
                    : <Copy size={13} />}
                </button>
              )}
            </div>
          ))}

          {/* Order details accordion — only for payment received */}
          {isReceived && (
            <>
              <button
                className="dact-order-details-btn"
                onClick={() => setIsDetailsOpen((v) => !v)}
              >
                Order details
                {isDetailsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {isDetailsOpen && (
                <div className="dact-order-details-body">
                  <div className="dact-order-detail-item">
                    <span>Item</span>
                    <span>{item.itemName || 'MacBook Pro M3 Max 16"'}</span>
                  </div>
                  <div className="dact-order-detail-item">
                    <span>Variant</span>
                    <span>{item.variant || "Space Black, 36GB RAM, 1TB SSD"}</span>
                  </div>
                  <div className="dact-order-detail-item">
                    <span>Date</span>
                    <span>{item.time}</span>
                  </div>
                  <div className="dact-order-detail-item">
                    <span>Status</span>
                    <span style={{ color: "#16a34a", fontWeight: 600 }}>Completed</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
