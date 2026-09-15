import { useState, useRef, useEffect } from "react";
import {
  Check,
  CheckCircle2,
  Plus,
  X,
  LoaderCircle,
  ChevronLeft,
  Search,
} from "lucide-react";
import "../../styles/mobile-new-payment.css";

const PRESET_SPECS = ["Quantity", "Condition", "Color", "Size"];

export default function MobileNewPayment({ onCancel, onSuccess }) {
  const [step, setStep] = useState("form"); // "form" | "confirm" | "success"

  // 1. WhatsApp Number or User Name & 11-digit verification state
  const [counterparty, setCounterparty] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("idle"); // "idle" | "verifying" | "verified"
  const verificationTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (verificationTimerRef.current) clearTimeout(verificationTimerRef.current);
    };
  }, []);

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
    if (digitsOnly.length >= 11) {
      setVerificationStatus("verifying");
      verificationTimerRef.current = setTimeout(() => {
        setVerificationStatus("verified");
      }, 900);
    } else {
      setVerificationStatus("idle");
    }
  };

  // 2. What are you Buying / Selling? & Role toggle ("I am Selling" / "I am Buying")
  const [itemPurpose, setItemPurpose] = useState("");
  const [isSelling, setIsSelling] = useState(false); // false: buying (default), true: selling

  // 3. Add Specifications
  const [activeSpecs, setActiveSpecs] = useState({});
  const [customSpecKey, setCustomSpecKey] = useState("");
  const [customSpecValue, setCustomSpecValue] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // 4. Amount & Confirmation Step
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [roomId, setRoomId] = useState("");

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

    setErrors(errs);
    if (Object.keys(errs).length === 0) {
      setStep("confirm");
    }
  };

  const handleCreateRoom = () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setErrors({ amount: true });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setRoomId("PR-" + Math.floor(100000 + Math.random() * 900000));
      setStep("success");
      if (onSuccess) onSuccess();
    }, 850);
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

  return (
    <main className="mobile-new-payment-container">
      {/* ── Floating Cancel Button at Top Right ── */}
      <div className="new-payment-cancel-float-wrap">
        <div className="new-payment-cancel-float-inner">
          <button
            type="button"
            onClick={() => {
              if (onCancel) onCancel();
            }}
            className="new-payment-cancel-btn"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* ── 1. Top Header Row: New Payment / Create Payment Room ── */}
      <div className="new-payment-top-row">
        <div className="new-payment-title-wrap">
          <h1 className="new-payment-title">New Payment</h1>
          <p className="new-payment-subtitle">Create Payment Room</p>
        </div>
        <div style={{ width: 62, height: 28, flexShrink: 0 }} aria-hidden="true" />
      </div>

      {/* ── STEP 1: FORM (Exact match to dashboard.html & user screenshot) ── */}
      {step === "form" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* ── 1. Whatsap Number or User Name (Search Bar Style Box) ── */}
          <div className="new-payment-field-group">
            <div className="new-payment-field-header">
              <span className="new-payment-counterparty-label">
                Counterparty <span className="new-payment-star">*</span>
              </span>
            </div>
            <div className={`new-payment-field-box ${errors.counterparty ? "error" : ""}`}>
              <Search className="new-payment-search-icon" size={17} />
              <input
                id="new-payment-recipient-input"
                type="text"
                value={counterparty}
                onChange={handleCounterpartyChange}
                placeholder="WhatsApp Number or Username"
                autoComplete="off"
                autoCapitalize="words"
              />
              <button
                type="button"
                className="field-action-btn new-payment-scanner-btn"
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

          {/* ── 2. What are you Buying / Selling? with red/green toggle button ── */}
          <div className="new-payment-field-group">
            <div className="new-payment-field-header">
              <span className="new-payment-counterparty-label">
                Item/Service description <span className="new-payment-star">*</span>
              </span>
            </div>
            <div className={`new-payment-field-box ${errors.itemPurpose ? "error" : ""}`}>
              <input
                id="new-payment-item-input"
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
                id="new-payment-role-toggle-btn"
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

          {/* ── 3. Add Specifications Boxed Field ── */}
          <div className="new-payment-field-group">
            <div className="new-payment-field-header">
              <span className="new-payment-counterparty-label">
                Add Specifications
              </span>
            </div>
            <div className="new-payment-specs-box">
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
                {/* 4 horizontal preset boxes */}
                <div className="new-payment-specs-grid">
                  {PRESET_SPECS.map((spec) => {
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
                  <Plus size={14} />
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
                          placeholder={`Enter ${key.toLowerCase()}`}
                          className="new-payment-spec-input"
                          autoCapitalize="words"
                        />
                        <button
                          type="button"
                          onClick={() => handleToggleSpec(key)}
                          className="new-payment-spec-remove"
                          aria-label={`Remove ${key}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── 4. Floating Proceed to Payment CTA Button ── */}
          <div className="new-payment-floating-dock">
            <div className="new-payment-floating-inner">
              <button
                type="button"
                id="new-payment-proceed-btn"
                onClick={handleProceed}
                className="new-payment-proceed-btn"
              >
                <span>Proceed to Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: ENTER AMOUNT & REVIEW ── */}
      {step === "confirm" && (
        <div className="new-payment-step-card">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => setStep("form")}
              className="new-payment-spec-remove"
              title="Back"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="new-payment-step-title">Payment & Room Details</h2>
          </div>

          {/* Amount input */}
          <div>
            <label className="new-payment-step-label">
              Transaction Amount *
            </label>
            <div className={`new-payment-amount-input-row ${errors.amount ? "error" : ""}`} style={{ marginTop: 6 }}>
              <span className="new-payment-amount-currency">NGN (₦)</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) {
                    setErrors((prev) => ({ ...prev, amount: false }));
                  }
                }}
                placeholder="0.00"
                className="new-payment-amount-field"
              />
            </div>
            {errors.amount && (
              <p className="new-payment-field-error">Please enter a valid payment amount</p>
            )}
          </div>

          {/* Summary */}
          <div className="new-payment-details-list">
            <span className="new-payment-details-label">Counterparty</span>
            <span className="new-payment-details-value">{counterparty}</span>

            <span className="new-payment-details-label">Item / Deal</span>
            <span className="new-payment-details-value">{itemPurpose}</span>

            <span className="new-payment-details-label">Role</span>
            <span className="new-payment-details-value">
              {isSelling ? "Seller (I am Selling)" : "Buyer (I am Buying)"}
            </span>

            {Object.keys(activeSpecs).length > 0 && (
              <>
                <span className="new-payment-details-label">Specifications</span>
                <span className="new-payment-details-value">
                  {Object.entries(activeSpecs)
                    .map(([k, v]) => `${k}: ${v || "—"}`)
                    .join(", ")}
                </span>
              </>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={isLoading}
              className="new-payment-proceed-btn"
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
              className="new-payment-back-btn"
            >
              Back to edit
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: PAYMENT ROOM CREATED (SUCCESS) ── */}
      {step === "success" && (
        <div className="new-payment-step-card" style={{ textAlign: "center", alignItems: "center", gap: 20 }}>
          <div className="new-payment-success-badge">
            <Check size={30} />
          </div>

          <div>
            <h2 className="new-payment-step-title" style={{ fontSize: 21, marginBottom: 6 }}>
              Payment Room Created!
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
              Room <strong>#{roomId}</strong> is ready for <strong>{counterparty}</strong>.
            </p>
          </div>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                if (onCancel) onCancel();
              }}
              className="new-payment-proceed-btn"
            >
              Open Payment Room
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="new-payment-back-btn"
            >
              Create another payment
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
