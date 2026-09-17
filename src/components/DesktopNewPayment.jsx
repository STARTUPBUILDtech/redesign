import { useState, useRef, useEffect } from "react";
import {
  Check,
  LoaderCircle,
  Copy,
  ExternalLink,
} from "lucide-react";
import "../styles/desktop-new-payment.css";

export default function DesktopNewPayment({ onCancel, onSuccess }) {
  const [step, setStep] = useState("form"); // "form" | "confirm" | "success"

  // 1. Counterparty (WhatsApp Number or Username) + 11-digit verification
  const [counterparty, setCounterparty] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("idle"); // "idle" | "verifying" | "verified"
  const verificationTimerRef = useRef(null);

  // 2. What are you Buying / Selling?
  const [itemPurpose, setItemPurpose] = useState("");
  const [isSelling, setIsSelling] = useState(false); // false: buying, true: selling

  // 3. Amount & Confirmation
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
  };

  const handleAmountChange = (e) => {
    // Strip everything except digits and one decimal point
    let raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    if (parts.length > 2) {
      raw = parts[0] + "." + parts.slice(1).join("");
    }
    // Format integer part with commas
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const formatted = parts.length === 2 ? intPart + "." + parts[1] : intPart;
    setAmount(formatted);
    if (errors.amount) {
      const num = parseFloat(raw);
      if (!isNaN(num) && num > 0) {
        setErrors((prev) => ({ ...prev, amount: false }));
      }
    }
  };

  const isStep1Done = verificationStatus === "verified";
  const isStep2Done = isStep1Done && itemPurpose.trim().length > 0;
  const numAmount = parseFloat((amount || "").replace(/,/g, ""));
  const isStep3Done = isStep2Done && !isNaN(numAmount) && numAmount > 0;

  const handleProceed = () => {
    const errs = {};
    if (!counterparty.trim() || verificationStatus !== "verified") {
      errs.counterparty = true;
    }
    if (!itemPurpose.trim()) {
      errs.itemPurpose = true;
    }
    const parsedAmount = parseFloat((amount || "").replace(/,/g, ""));
    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      errs.amount = true;
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    // Skip confirm — go straight to creating the room
    setErrors({});
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

          {/* ── 3. Amount Field (Replaced Add Specifications) ── */}
          <div className={`new-payment-timeline-step is-last ${!isStep2Done ? "is-disabled" : ""}`}>
            <div className="new-payment-timeline-rail">
              <div className={`new-payment-timeline-diamond ${isStep2Done ? "is-filled" : ""}`} aria-hidden="true">
                <span>3</span>
              </div>
              <div className={`new-payment-timeline-line is-last ${!isStep3Done ? "is-dimmed" : ""}`} aria-hidden="true" />
            </div>
            <div className="new-payment-timeline-content">
              <div className="flex flex-col gap-2 new-payment-field-group">
                <label htmlFor="amount" className="font-medium text-sm new-payment-label">
                  Amount<span className="text-destructive new-payment-star">*</span>
                </label>
                <div className={`rounded-md bg-background border-t border-t-input border-r border-r-input border-b border-b-input border-l border-l-input flex items-center h-11 new-payment-field-box new-payment-amount-box ${errors.amount ? "error" : ""}`}>
                  <span className="text-muted-foreground text-sm pr-3 pl-3 new-payment-currency-prefix">NGN</span>
                  <input
                    id="amount"
                    placeholder="0.00"
                    inputMode="decimal"
                    className="bg-transparent text-sm border-t-0 border-r-0 border-b-0 border-l-0 outline-none pr-3 flex-1 h-full min-w-0"
                    value={amount}
                    onChange={handleAmountChange}
                    disabled={!isStep2Done}
                    autoComplete="off"
                  />
                </div>
                <p className={`text-destructive text-xs ${errors.amount ? "" : "hidden"} new-payment-field-error`}>
                  Enter an amount greater than ₦0.00
                </p>
              </div>
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
              disabled={isLoading}
              className="desktop-np-primary-btn"
            >
              {isLoading ? (
                <LoaderCircle className="animate-spin" size={20} />
              ) : (
                <span>Proceed to Payment</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
