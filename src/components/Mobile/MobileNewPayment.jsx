import { useState, useRef, useEffect } from "react";
import {
  Check,
  LoaderCircle,
  Copy,
  Upload,
  SlidersHorizontal,
} from "lucide-react";
import MobilePaymentInvitation from "./MobilePaymentInvitation";
import "../../styles/mobile-new-payment.css";

export default function MobileNewPayment({ onCancel, onSuccess }) {
  const [step, setStep] = useState("form"); // "form" | "confirm" | "success" | "invitation"
  const [createdRoom, setCreatedRoom] = useState(null);
  const [pendingRoom, setPendingRoom] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // 1. WhatsApp Number or User Name & 11-digit verification state
  const [counterparty, setCounterparty] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("idle"); // "idle" | "verifying" | "verified"
  const verificationTimerRef = useRef(null);

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

  // 2. What are you Buying / Selling? & Role toggle ("I am Selling" / "I am Buying")
  const [itemPurpose, setItemPurpose] = useState("");
  const [isSelling, setIsSelling] = useState(false); // false: buying (default), true: selling

  // 3. Amount Field
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    return () => {
      if (verificationTimerRef.current) clearTimeout(verificationTimerRef.current);
    };
  }, []);

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

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const cleanAmt = amount.trim();
      const formattedAmount = cleanAmt.startsWith("₦") ? cleanAmt : `₦${cleanAmt}`;
      const newRoom = {
        id: "PK-" + Math.floor(100000 + Math.random() * 900000),
        counterparty:
          verificationStatus === "verified"
            ? "Howard Ukah"
            : (counterparty.trim() || "Alex Morgan"),
        item: (() => {
          const trimmed = itemPurpose.trim();
          if (!trimmed || trimmed.toLowerCase() === "iphone 18 pro max") return "Iphone 18 Pro Max";
          return trimmed.replace(/\b[a-z]/g, (c) => c.toUpperCase());
        })(),
        amount: formattedAmount || "₦89,000",
        role: isSelling ? "Seller" : "Buyer",
      };

      setPendingRoom(newRoom);
      setCreatedRoom(newRoom);
      setShowInfoModal(true);
    }, 450);
  };

  const handleConfirmProceed = () => {
    setShowInfoModal(false);
    const targetRoom = pendingRoom || createdRoom;
    if (onSuccess) {
      onSuccess(targetRoom);
    } else {
      setStep("invitation");
    }
  };

  const handleReset = () => {
    setCounterparty("");
    setVerificationStatus("idle");
    setItemPurpose("");
    setIsSelling(false);
    setAmount("");
    setErrors({});
    setStep("form");
    setCreatedRoom(null);
    setPendingRoom(null);
    setShowInfoModal(false);
  };

  if (step === "invitation" && createdRoom) {
    return (
      <MobilePaymentInvitation
        room={createdRoom}
        onCancel={onCancel || handleReset}
        onProceed={onCancel || handleReset}
      />
    );
  }

  return (
    <main className="mobile-new-payment-container">
      {/* ── 1. Top Header Row: Sticky New Payment / Subtitle + Cancel Button ── */}
      <div className="new-payment-top-row">
        <div className="new-payment-top-row-inner">
          <div className="new-payment-title-wrap">
            <h1 className="new-payment-title">New Payment</h1>
            <p className="new-payment-subtitle">A few steps to create payment room.</p>
          </div>
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

      {/* ── 2. Scrollable Middle Body (Scrolls IF needed) ── */}
      <div className="new-payment-scroll-body">
        {/* ── STEP 1: FORM (Timeline with diamond badges matching user mockup) ── */}
        {step === "form" && (
          <div className="new-payment-timeline-form">
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
                <label htmlFor="new-payment-recipient-input" className="new-payment-label">
                  Invite counterparty<span className="new-payment-star">*</span>
                </label>
                <div className="new-payment-counterparty-row">
                  <div className={`new-payment-field-box new-payment-counterparty-box ${errors.counterparty ? "error" : ""}`}>
                    <input
                      id="new-payment-recipient-input"
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
                <label htmlFor="new-payment-item-input" className="new-payment-label">
                  Item/Service description<span className="new-payment-star">*</span>
                </label>
                <div className={`new-payment-field-box ${errors.itemPurpose ? "error" : ""}`}>
                  <input
                    id="new-payment-item-input"
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
                    id="new-payment-role-toggle-btn"
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
      </div>

      {/* ── 3. Floating Proceed to Payment CTA Button at Bottom ── */}
      {step === "form" && (
        <div className="new-payment-floating-dock">
          <div className="new-payment-floating-inner">
            <button
              type="button"
              id="new-payment-proceed-btn"
              onClick={handleProceed}
              disabled={isLoading}
              className="new-payment-proceed-btn"
            >
              {isLoading ? (
                <LoaderCircle className="animate-spin" size={20} />
              ) : (
                <span>Proceed to Payment</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Middle Modal: Inform users to upload reference image & add specifications ── */}
      {showInfoModal && (
        <div
          className="new-payment-modal-backdrop"
          role="dialog"
          aria-modal="true"
        >
          <div className="new-payment-info-modal">
            <div className="np-modal-header">
              <div className="np-modal-icon-badge">
                <span className="material-symbols-outlined">info</span>
              </div>
            </div>

            <div className="np-modal-text-wrap">
              <h2 className="np-modal-title">Important Step Ahead</h2>
              <p className="np-modal-subtitle">
                Before proceeding to payment, you will need to provide these details on the next page:
              </p>
            </div>

            <div className="np-modal-cards-list">
              <div className="np-modal-step-card">
                <div className="np-modal-step-icon">
                  <Upload size={17} strokeWidth={2.2} />
                </div>
                <div className="np-modal-step-content">
                  <h3 className="np-modal-step-title">Upload Reference Image</h3>
                  <p className="np-modal-step-desc">
                    Add a clear photo of the item for counterparty verification.
                  </p>
                </div>
              </div>

              <div className="np-modal-step-card">
                <div className="np-modal-step-icon">
                  <SlidersHorizontal size={17} strokeWidth={2.2} />
                </div>
                <div className="np-modal-step-content">
                  <h3 className="np-modal-step-title">Add Item Specifications</h3>
                  <p className="np-modal-step-desc">
                    Fill in specifications such as Color, Storage, and RAM.
                  </p>
                </div>
              </div>
            </div>

            <div className="np-modal-footer">
              <button
                type="button"
                className="np-modal-btn-proceed"
                onClick={handleConfirmProceed}
              >
                <span>I understand</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
