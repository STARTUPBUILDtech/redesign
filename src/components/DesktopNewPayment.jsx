import { useState, useRef, useEffect } from "react";
import {
  Check,
  Plus,
  X,
  LoaderCircle,
  ChevronLeft,
  Search,
  ShieldCheck,
  QrCode,
  ArrowRight,
  Copy,
  ExternalLink,
} from "lucide-react";
import "../styles/desktop-new-payment.css";

const PRESET_SPECS = ["Quantity", "Condition", "Color", "Size"];

export default function DesktopNewPayment({ onCancel, onSuccess }) {
  const [step, setStep] = useState("form"); // "form" | "confirm" | "success"

  // 1. Counterparty (WhatsApp Number or Username) + 11-digit verification
  const [counterparty, setCounterparty] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("idle"); // "idle" | "verifying" | "verified"
  const verificationTimerRef = useRef(null);

  // 2. What are you Buying / Selling?
  const [itemPurpose, setItemPurpose] = useState("");
  const [isSelling, setIsSelling] = useState(false); // false: buying, true: selling

  // 3. Add Specifications
  const [activeSpecs, setActiveSpecs] = useState({});
  const [customSpecKey, setCustomSpecKey] = useState("");
  const [customSpecValue, setCustomSpecValue] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // 4. Amount & Confirmation
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onCancel) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (verificationTimerRef.current) clearTimeout(verificationTimerRef.current);
    };
  }, [onCancel]);

  const handleCounterpartyChange = (e) => {
    const val = e.target.value;
    setCounterparty(val);
    if (errors.counterparty) {
      setErrors((prev) => ({ ...prev, counterparty: false }));
    }

    if (verificationTimerRef.current) {
      clearTimeout(verificationTimerRef.current);
    }

    const digitsOnly = val.replace(/\D/g, "");
    if (digitsOnly.length === 11) {
      setVerificationStatus("verifying");
      verificationTimerRef.current = setTimeout(() => {
        setVerificationStatus("verified");
      }, 900);
    } else {
      setVerificationStatus("idle");
    }
  };

  const handleToggleSpec = (spec) => {
    setActiveSpecs((prev) => {
      const next = { ...prev };
      if (next[spec] !== undefined) {
        delete next[spec];
      } else {
        next[spec] = "";
      }
      return next;
    });
  };

  const handleSpecValueChange = (spec, value) => {
    setActiveSpecs((prev) => ({
      ...prev,
      [spec]: value,
    }));
  };

  const handleAddCustomSpec = () => {
    if (customSpecKey.trim()) {
      setActiveSpecs((prev) => ({
        ...prev,
        [customSpecKey.trim()]: customSpecValue.trim(),
      }));
      setCustomSpecKey("");
      setCustomSpecValue("");
      setShowCustomInput(false);
    }
  };

  const handleProceed = () => {
    const errs = {};
    if (!counterparty.trim()) {
      errs.counterparty = true;
    }
    if (!itemPurpose.trim()) {
      errs.itemPurpose = true;
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setStep("confirm");
  };

  const handleCreateRoom = () => {
    if (!amount.trim() || isNaN(Number(amount.replace(/,/g, "")))) {
      setErrors((prev) => ({ ...prev, amount: true }));
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const generatedRoomId = "PK-" + Math.floor(100000 + Math.random() * 900000);
      setRoomId(generatedRoomId);
      setStep("success");
      if (onSuccess) onSuccess();
    }, 900);
  };

  const handleReset = () => {
    setCounterparty("");
    setVerificationStatus("idle");
    setItemPurpose("");
    setIsSelling(false);
    setActiveSpecs({});
    setAmount("");
    setErrors({});
    setStep("form");
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard?.writeText(`https://paykudi.com/room/${roomId}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="desktop-np-modal-overlay"
      onClick={() => {
        if (onCancel) onCancel();
      }}
    >
      <div
        className="desktop-np-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="desktop-modal-title"
      >
        {/* ── Modal Header ── */}
        <div className="desktop-np-modal-header">
          <div className="desktop-np-header-left">
            {step !== "form" && (
              <button
                type="button"
                onClick={() => setStep("form")}
                className="desktop-np-back-btn"
                title="Back to Edit Details"
                aria-label="Back to Edit Details"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            <div>
              <h2 id="desktop-modal-title" className="desktop-np-title">New Payment</h2>
              <p className="desktop-np-subtitle">Create Payment Room</p>
            </div>
          </div>
          <div className="desktop-np-header-right">
            <button
              type="button"
              onClick={onCancel}
              className="desktop-np-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* ── Modal Body ── */}
        <div className={`desktop-np-modal-body ${step === "form" ? "has-floating-btn" : ""}`}>
          {/* ── STEP 1: 2-COLUMN DESKTOP FORM & LIVE SUMMARY ── */}
      {step === "form" && (
        <div className="desktop-np-grid">
          {/* Left Column: Form Details */}
          <div className="desktop-np-form-col">
            {/* Counterparty Field */}
            <div className="desktop-np-field-group">
              <div className="desktop-np-field-header">
                <span className="desktop-np-label">
                  Counterparty <span className="desktop-np-star">*</span>
                </span>
              </div>
              <div className={`desktop-np-input-box ${errors.counterparty ? "error" : ""}`}>
                <Search className="desktop-np-search-icon" size={19} />
                <input
                  id="desktop-counterparty-input"
                  type="text"
                  value={counterparty}
                  onChange={handleCounterpartyChange}
                  placeholder="WhatsApp Number or Username"
                  autoComplete="off"
                  autoCapitalize="words"
                />
                <button
                  type="button"
                  className="desktop-np-scanner-btn"
                  title="Scan QR Code"
                  aria-label="Scan QR Code"
                >
                  <QrCode size={20} />
                </button>
              </div>

              {/* Verification Status (Left bottom outside field) */}
              {errors.counterparty ? (
                <p className="desktop-np-field-error">
                  Please enter a WhatsApp number or username
                </p>
              ) : verificationStatus === "verifying" ? (
                <div className="desktop-np-verification verifying">
                  <LoaderCircle className="animate-spin" size={13} />
                  <span>Verifying...</span>
                </div>
              ) : verificationStatus === "verified" ? (
                <div className="desktop-np-verification verified">
                  <span className="desktop-np-check-circle">
                    <Check size={10} strokeWidth={3} />
                  </span>
                  <span className="desktop-np-verified-name">Howard Ukah</span>
                </div>
              ) : null}
            </div>

            {/* Item/Service Description with Role Switcher */}
            <div className="desktop-np-field-group">
              <div className="desktop-np-field-header">
                <span className="desktop-np-label">
                  Item / Service Description <span className="desktop-np-star">*</span>
                </span>
              </div>
              <div className={`desktop-np-input-box ${errors.itemPurpose ? "error" : ""}`}>
                <input
                  id="desktop-item-input"
                  type="text"
                  value={itemPurpose}
                  onChange={(e) => {
                    setItemPurpose(e.target.value);
                    if (errors.itemPurpose) {
                      setErrors((prev) => ({ ...prev, itemPurpose: false }));
                    }
                  }}
                  placeholder={isSelling ? "What are you Selling?" : "What are you Buying?"}
                  autoComplete="off"
                  autoCapitalize="sentences"
                />
                <button
                  type="button"
                  onClick={() => setIsSelling(!isSelling)}
                  className={isSelling ? "desktop-np-role-btn-green" : "desktop-np-role-btn-red"}
                  title="Toggle Buying or Selling role"
                >
                  {isSelling ? "I am Buying" : "I am Selling"}
                </button>
              </div>
              {errors.itemPurpose && (
                <p className="desktop-np-field-error">
                  Please describe what is being bought or sold
                </p>
              )}
            </div>

            {/* Specifications Field Group (Keeping the inner specs box intact) */}
            <div className="desktop-np-field-group">
              <div className="desktop-np-field-header">
                <span className="desktop-np-label">Add Specifications</span>
              </div>

              <div className="desktop-np-specs-box">
                {/* Preset chips */}
                <div className="desktop-np-specs-grid">
                  {PRESET_SPECS.map((spec) => {
                    const isSelected = activeSpecs[spec] !== undefined;
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => handleToggleSpec(spec)}
                        className={`desktop-np-spec-chip ${isSelected ? "active" : ""}`}
                      >
                        <span>{spec}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom spec button */}
                <button
                  type="button"
                  onClick={() => setShowCustomInput(!showCustomInput)}
                  className={`desktop-np-custom-btn ${showCustomInput ? "active" : ""}`}
                >
                  <Plus size={15} />
                  <span>Custom</span>
                </button>

                {/* Inline custom spec inputs */}
                {showCustomInput && (
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <input
                      value={customSpecKey}
                      onChange={(e) => setCustomSpecKey(e.target.value)}
                      placeholder="Spec name (e.g. Warranty)"
                      className="desktop-np-input-box"
                      style={{ height: 38, fontSize: 13 }}
                      autoCapitalize="words"
                    />
                    <input
                      value={customSpecValue}
                      onChange={(e) => setCustomSpecValue(e.target.value)}
                      placeholder="Value (e.g. 1 Year)"
                      className="desktop-np-input-box"
                      style={{ height: 38, fontSize: 13 }}
                      autoCapitalize="words"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSpec}
                      className="desktop-np-custom-btn active"
                      style={{ height: 38, padding: "0 20px" }}
                    >
                      Add
                    </button>
                  </div>
                )}

                {/* Active specification fields */}
                {Object.keys(activeSpecs).length > 0 && (
                  <div className="desktop-np-active-specs">
                    {Object.entries(activeSpecs).map(([key, val]) => (
                      <div key={key} className="desktop-np-spec-row">
                        <span className="desktop-np-spec-tag">{key}</span>
                        <input
                          value={val}
                          onChange={(e) => handleSpecValueChange(key, e.target.value)}
                          placeholder={`Enter ${key.toLowerCase()}`}
                          className="desktop-np-spec-input"
                          autoCapitalize="words"
                        />
                        <button
                          type="button"
                          onClick={() => handleToggleSpec(key)}
                          className="desktop-np-spec-remove"
                          aria-label={`Remove ${key}`}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: ENTER AMOUNT & REVIEW ── */}
      {step === "confirm" && (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="desktop-np-step-card">
            <div>
              <button
                type="button"
                onClick={() => setStep("form")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: 0,
                  marginBottom: 12,
                }}
              >
                <ChevronLeft size={16} /> Back to Edit Details
              </button>
              <h2 style={{ margin: "0 0 6px 0", fontSize: 22, fontWeight: 700 }}>
                Set Payment Amount
              </h2>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                Enter the agreed transaction amount for {counterparty || "recipient"}.
              </p>
            </div>

            <div className="desktop-np-field-group">
              <label className="desktop-np-label" style={{ marginBottom: 8 }}>
                Transaction Amount (NGN) <span className="desktop-np-star">*</span>
              </label>
              <div className="desktop-np-amount-box">
                <span>₦</span>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9.]/g, "");
                    setAmount(raw);
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: false }));
                  }}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              {errors.amount && (
                <p className="desktop-np-field-error">Please enter a valid amount</p>
              )}
            </div>

            {/* Breakdown summary */}
            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: "color-mix(in srgb, var(--ink) 2%, transparent)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                <span style={{ color: "var(--muted)" }}>Room Escrow Fee</span>
                <span style={{ fontWeight: 600, color: "#16a34a" }}>Free (Promo)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                <span style={{ color: "var(--muted)" }}>Fulfillment Method</span>
                <span style={{ fontWeight: 600 }}>PayKudi Guaranteed Delivery</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={isLoading}
                className="desktop-np-primary-btn"
                style={{ flex: 1.5 }}
              >
                {isLoading ? (
                  <>
                    <LoaderCircle className="animate-spin" size={18} />
                    <span>Creating Payment Room...</span>
                  </>
                ) : (
                  <span>Create Payment Room</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStep("form")}
                className="desktop-np-secondary-btn"
                style={{ flex: 1 }}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: SUCCESS CONFIRMATION ── */}
      {step === "success" && (
        <div className="desktop-np-success-card">
          <div className="desktop-np-success-icon">
            <Check size={36} strokeWidth={2.8} />
          </div>

          <div>
            <h2 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 8px 0" }}>
              Payment Room Created!
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 15, margin: 0 }}>
              Payment Room <strong>#{roomId}</strong> is ready for <strong>{counterparty}</strong>.
            </p>
          </div>

          <div
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "color-mix(in srgb, var(--ink) 4%, transparent)",
              border: "1px solid var(--line)",
              borderRadius: 10,
            }}
          >
            <span style={{ fontSize: 14, fontFamily: "monospace", color: "var(--ink)", fontWeight: 600 }}>
              https://paykudi.com/room/{roomId}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Copy size={15} />
              <span>{copied ? "Copied!" : "Copy Link"}</span>
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, width: "100%", marginTop: 8 }}>
            <button
              type="button"
              onClick={onCancel}
              className="desktop-np-primary-btn"
              style={{ flex: 1.2 }}
            >
              <ExternalLink size={16} />
              <span>Open Payment Room</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="desktop-np-secondary-btn"
              style={{ flex: 1 }}
            >
              Create Another Payment
            </button>
          </div>
        </div>
      )}
        </div>

        {/* ── Floating Proceed to Payment Button Dock ── */}
        {step === "form" && (
          <div className="desktop-np-floating-dock">
            <button
              type="button"
              id="desktop-proceed-btn"
              onClick={handleProceed}
              className="desktop-np-primary-btn"
            >
              <span>Proceed to Payment</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
