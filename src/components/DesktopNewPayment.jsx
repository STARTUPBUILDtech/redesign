import { useState, useRef, useEffect } from "react";
import {
  Check,
  Plus,
  X,
  LoaderCircle,
  ChevronLeft,
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

  // 3. Add Specifications (Loaded dynamically on keyword like iPhone with 5s delay)
  const [availableSpecs, setAvailableSpecs] = useState([]);
  const [isSpecsLoading, setIsSpecsLoading] = useState(false);
  const specsTimerRef = useRef(null);
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
      if (specsTimerRef.current) clearTimeout(specsTimerRef.current);
    };
  }, [onCancel]);

  const applyCounterparty = (val) => {
    setCounterparty(val);
    if (errors.counterparty) {
      setErrors((prev) => ({ ...prev, counterparty: false }));
    }

    if (verificationTimerRef.current) {
      clearTimeout(verificationTimerRef.current);
    }

    const trimmed = val.trim();
    const digitsOnly = val.replace(/\D/g, "");
    if (digitsOnly.length >= 11 || (trimmed.length >= 4 && !/^\d+$/.test(trimmed))) {
      setVerificationStatus("verifying");
      verificationTimerRef.current = setTimeout(() => {
        setVerificationStatus("verified");
      }, 700);
    } else {
      setVerificationStatus("idle");
    }
  };

  const handleCounterpartyChange = (e) => {
    applyCounterparty(e.target.value);
  };

  const handlePaste = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          applyCounterparty(text.trim());
          return;
        }
      }
    } catch (err) {
      console.warn("Clipboard read unavailable, using sample counterparty", err);
    }
    applyCounterparty("09033705741");
  };

  const handleItemPurposeChange = (e) => {
    const val = e.target.value;
    setItemPurpose(val);
    if (errors.itemPurpose) {
      setErrors((prev) => ({ ...prev, itemPurpose: false }));
    }

    if (specsTimerRef.current) {
      clearTimeout(specsTimerRef.current);
    }

    const lower = val.toLowerCase().trim();
    if (lower.includes("iphone") || lower.includes("i phone")) {
      if (availableSpecs.length === 0) {
        setIsSpecsLoading(true);
        specsTimerRef.current = setTimeout(() => {
          setAvailableSpecs(["Color", "RAM", "Storage"]);
          setIsSpecsLoading(false);
        }, 5000); // 5 sec delay as requested
      }
    } else {
      if (availableSpecs.length > 0) {
        setAvailableSpecs([]);
        setActiveSpecs({});
      }
      setIsSpecsLoading(false);
    }
  };

  const isStep1Done = verificationStatus === "verified";
  const isStep2Done = isStep1Done && itemPurpose.trim().length > 0;

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
    if (!counterparty.trim() || verificationStatus !== "verified") {
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
    setAvailableSpecs([]);
    setIsSpecsLoading(false);
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
              <p className="desktop-np-subtitle">A few steps to create payment room.</p>
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
        <div className="new-payment-timeline-form desktop-np-timeline-form">
          {/* ── 1. Counterparty Step ── */}
          <div className="new-payment-timeline-step">
            <div className="new-payment-timeline-rail">
              <div className="new-payment-timeline-diamond is-filled" aria-hidden="true">
                <span>1</span>
              </div>
              <div className="new-payment-timeline-line" aria-hidden="true" />
            </div>
            <div className="new-payment-timeline-content">
              <div className="new-payment-field-group">
                <label htmlFor="desktop-counterparty-input" className="new-payment-label">
                  Invite counterparty<span className="new-payment-star">*</span>
                </label>
                <div className="new-payment-counterparty-row">
                  <div className={`new-payment-field-box new-payment-counterparty-box ${errors.counterparty ? "error" : ""}`}>
                    <input
                      id="desktop-counterparty-input"
                      type="text"
                      value={counterparty}
                      onChange={handleCounterpartyChange}
                      placeholder="WhatsApp number or username"
                      autoComplete="off"
                      autoCapitalize="words"
                    />
                    <button
                      type="button"
                      className="new-payment-paste-btn"
                      onClick={handlePaste}
                      title="Paste from clipboard"
                      aria-label="Paste from clipboard"
                    >
                      <Copy size={17} strokeWidth={2.1} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="new-payment-scanner-box-btn"
                    title="Scan QR Code"
                    aria-label="Scan QR Code"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      qr_code_scanner
                    </span>
                  </button>
                </div>

                {/* Error or Verification Status (Verifying / Howard Ukah) at left bottom outside */}
                {errors.counterparty ? (
                  <p className="new-payment-field-error">
                    Please enter a WhatsApp number or username
                  </p>
                ) : verificationStatus === "verifying" ? (
                  <div className="new-payment-verification-status verifying">
                    <LoaderCircle className="animate-spin" size={13} />
                    <span>Verifying...</span>
                  </div>
                ) : verificationStatus === "verified" ? (
                  <div className="new-payment-verification-status verified">
                    <span className="verified-check-circle">
                      <Check size={9} strokeWidth={3.2} />
                    </span>
                    <span className="verified-name">Howard Ukah</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── 2. What are you Buying / Selling? with red/green toggle button ── */}
          <div className={`new-payment-timeline-step ${!isStep1Done ? "is-disabled" : ""}`}>
            <div className="new-payment-timeline-rail">
              <div className={`new-payment-timeline-diamond ${isStep1Done ? "is-filled" : ""}`} aria-hidden="true">
                <span>2</span>
              </div>
              <div className={`new-payment-timeline-line ${!isStep2Done ? "is-dimmed" : ""}`} aria-hidden="true" />
            </div>
            <div className="new-payment-timeline-content">
              <div className="new-payment-field-group">
                <label htmlFor="desktop-item-input" className="new-payment-label">
                  Item/Service description<span className="new-payment-star">*</span>
                </label>
                <div className={`new-payment-field-box ${errors.itemPurpose ? "error" : ""}`}>
                  <input
                    id="desktop-item-input"
                    type="text"
                    disabled={!isStep1Done}
                    value={itemPurpose}
                    onChange={handleItemPurposeChange}
                    placeholder={isSelling ? "What are you Selling?" : "What are you Buying?"}
                    autoComplete="off"
                    autoCapitalize="sentences"
                  />
                  <button
                    type="button"
                    disabled={!isStep1Done}
                    onClick={() => setIsSelling(!isSelling)}
                    className={`field-action-btn ${isSelling ? "new-payment-role-btn-green" : "new-payment-role-btn-red"}`}
                    title="Click to switch role"
                  >
                    {isSelling ? "I am Buying" : "I am Selling"}
                  </button>
                </div>
                {errors.itemPurpose && (
                  <p className="new-payment-field-error">
                    Please enter what you are buying or selling
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── 3. Add Specifications Boxed Field ── */}
          <div className={`new-payment-timeline-step is-last ${!isStep2Done ? "is-disabled" : ""}`}>
            <div className="new-payment-timeline-rail">
              <div className={`new-payment-timeline-diamond ${isStep2Done ? "is-filled" : ""}`} aria-hidden="true">
                <span>3</span>
              </div>
              <div className={`new-payment-timeline-line is-last ${!isStep2Done ? "is-dimmed" : ""}`} aria-hidden="true" />
            </div>
            <div className="new-payment-timeline-content">
              <div className="new-payment-field-group">
                <div className="new-payment-specs-label-row">
                  <label className="new-payment-label">
                    Add Specifications
                  </label>
                  {isSpecsLoading && (
                    <div className="new-payment-specs-loading" title="Loading...">
                      <LoaderCircle className="animate-spin" size={13} />
                    </div>
                  )}
                </div>

                {/* By default no component, loads on keyword (e.g. iPhone) after 5 seconds */}
                {availableSpecs.length > 0 && (
                  <div className="new-payment-specs-box">
                    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Dynamic preset boxes: Color, RAM, Storage size */}
                      <div className="new-payment-specs-grid">
                        {availableSpecs.map((spec) => {
                          const isSelected = activeSpecs[spec] !== undefined;
                          return (
                            <button
                              key={spec}
                              type="button"
                              onClick={() => handleToggleSpec(spec)}
                              className={`new-payment-spec-box ${isSelected ? "active" : ""}`}
                            >
                              <span>{spec}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* "Custom" box button below */}
                      <button
                        type="button"
                        onClick={() => setShowCustomInput(!showCustomInput)}
                        className={`new-payment-custom-btn ${showCustomInput ? "active" : ""}`}
                      >
                        <Plus size={12} />
                        <span>Custom</span>
                      </button>

                      {/* Inline Custom spec creator */}
                      {showCustomInput && (
                        <div className="new-payment-active-specs-panel new-payment-custom-creator-panel">
                          <div className="new-payment-custom-inputs-grid">
                            <input
                              value={customSpecKey}
                              onChange={(e) => setCustomSpecKey(e.target.value)}
                              placeholder="Spec name (e.g. Model)"
                              className="new-payment-spec-input"
                              autoCapitalize="words"
                            />
                            <input
                              value={customSpecValue}
                              onChange={(e) => setCustomSpecValue(e.target.value)}
                              placeholder="Value (e.g. Pro Max)"
                              className="new-payment-spec-input"
                              autoCapitalize="words"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleAddCustomSpec}
                            className="new-payment-custom-btn active new-payment-custom-submit-btn"
                          >
                            Add Specification
                          </button>
                        </div>
                      )}

                      {/* Active specification input fields */}
                      {Object.keys(activeSpecs).length > 0 && (
                        <div className="new-payment-active-specs-panel">
                          {Object.entries(activeSpecs).map(([key, val]) => (
                            <div key={key} className="new-payment-spec-row">
                              <span className="new-payment-spec-tag">{key}</span>
                              <input
                                value={val}
                                onChange={(e) => handleSpecValueChange(key, e.target.value)}
                                placeholder={`Enter ${key.toLowerCase()} value`}
                                className="new-payment-spec-input"
                                autoCapitalize="words"
                              />
                              <button
                                type="button"
                                onClick={() => handleToggleSpec(key)}
                                className="new-payment-spec-remove"
                                aria-label={`Remove ${key}`}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
