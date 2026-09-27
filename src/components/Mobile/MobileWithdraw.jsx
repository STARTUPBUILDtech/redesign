import { useState, useRef } from "react";
import { X, ChevronDown, Check, LoaderCircle, ChevronLeft, Wallet, ArrowDown } from "lucide-react";
import BankLogo from "../BankLogo.jsx";
import "../../styles/mobile-new-payment.css";
import "../../styles/withdraw.css";

const DEFAULT_ACCOUNTS = [
  {
    id: "acc-1",
    bank: "KUDA",
    bankCode: "kuda",
    name: "Ukah-Columba Chinaza Howard",
    number: "08032001585",
  },
  {
    id: "acc-2",
    bank: "ACCESS",
    bankCode: "access",
    name: "Ukah-Columba Chinaza Howard",
    number: "0123456789",
  },
  {
    id: "acc-3",
    bank: "GTB",
    bankCode: "gtbank",
    name: "Chinaza Howard",
    number: "0234567891",
  },
  {
    id: "acc-4",
    bank: "ZENITH",
    bankCode: "zenith",
    name: "Ukah-Columba Chinaza Howard",
    number: "2201948291",
  },
];

export default function MobileWithdraw({
  onCancel,
  onSuccess,
  availableBalance = 1700000,
}) {
  const [amount, setAmount] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(DEFAULT_ACCOUNTS[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [hasAgreedTerms, setHasAgreedTerms] = useState(false);
  const [txRef, setTxRef] = useState("");

  const inputRef = useRef(null);
  const fee = 50;

  // Strip non-digits and format with commas
  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setAmount("");
      return;
    }
    const num = parseInt(raw, 10);
    setAmount(num.toLocaleString("en-US"));
  };

  const handleWithdrawAll = () => {
    setAmount(availableBalance.toLocaleString("en-US"));
  };

  const numericAmount = parseInt(amount.replace(/,/g, "") || "0", 10);
  const isOverBalance = numericAmount > availableBalance;
  const isInvalid = numericAmount <= 0 || isOverBalance;

  const totalPayout = numericAmount > fee ? numericAmount - fee : 0;

  const handleContinue = (e) => {
    if (e) e.preventDefault();
    if (isInvalid) {
      if (inputRef.current) inputRef.current.focus();
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleFinalPayout = () => {
    if (!hasAgreedTerms || isSubmitting) return;

    setIsSubmitting(true);
    const ref = "PO-" + Math.floor(100000 + Math.random() * 900000);
    setTxRef(ref);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsConfirmModalOpen(false);
      setIsSuccess(true);
      if (onSuccess) {
        onSuccess({
          amount: numericAmount,
          account: selectedAccount,
          ref,
        });
      }
    }, 1000);
  };

  return (
    <div role="main" className="mobile-withdraw-page">
      {/* ── 1. Top Header Row: Sticky Payout / Subtitle + Cancel Button ── */}
      <div className="new-payment-top-row payout-top-row">
        <div className="new-payment-top-row-inner payout-top-row-inner">
          <div className="new-payment-title-wrap payout-title-wrap">
            <h1 className="new-payment-title payout-title">Withdraw Payout</h1>
            <p className="new-payment-subtitle payout-subtitle">Withdraw payout to your bank account.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="new-payment-cancel-btn payout-cancel-btn"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* ── 2. Scrollable Body ── */}
      <div className="mobile-withdraw-scroll-body">
        <div className="mobile-withdraw-inner">
          {isSuccess ? (
            <div className="payout-success-state" style={{ marginTop: 20 }}>
              <div className="payout-success-badge">
                <Check size={36} strokeWidth={2.8} />
              </div>
              <div>
                <h2 className="payout-success-title">Payout Initiated!</h2>
                <p className="payout-success-desc">
                  ₦{numericAmount.toLocaleString("en-US")} has been sent to your{" "}
                  <strong>{selectedAccount.bank}</strong> account.
                </p>
              </div>

              <div className="payout-success-card">
                <div className="payout-receipt-row">
                  <span className="payout-receipt-label">Reference</span>
                  <span className="payout-receipt-value">{txRef}</span>
                </div>
                <div className="payout-receipt-row">
                  <span className="payout-receipt-label">Beneficiary</span>
                  <span className="payout-receipt-value">
                    {selectedAccount.name}
                  </span>
                </div>
                <div className="payout-receipt-row">
                  <span className="payout-receipt-label">Account</span>
                  <span className="payout-receipt-value">
                    {selectedAccount.number}
                  </span>
                </div>
                <div className="payout-receipt-row">
                  <span className="payout-receipt-label">Net Received</span>
                  <span
                    className="payout-receipt-value"
                    style={{ color: "var(--payout-green)" }}
                  >
                    ₦{totalPayout.toLocaleString("en-US")}
                  </span>
                </div>
              </div>

              <div className="payout-actions" style={{ width: "100%", marginTop: 24 }}>
                <button
                  type="button"
                  className="payout-submit-btn"
                  onClick={onCancel}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleContinue} className="payout-body">
              {/* FLOW GROUP: 1. POCKET BALANCE + CONNECTOR + 2. PAYOUT BANK ACCOUNT */}
              <div className="payout-flow-group">
                {/* 1. Available Pocket Balance */}
                <div className="payout-pocket-card">
                  <div className="payout-pocket-left">
                    <div className="payout-pocket-icon-badge">
                      <Wallet size={16} strokeWidth={2.2} />
                    </div>
                    <div className="payout-pocket-details">
                      <span className="payout-pocket-name">Available Pocket Balance</span>
                    </div>
                  </div>
                  <div className="payout-pocket-balance">
                    ₦{availableBalance.toLocaleString("en-US")}
                  </div>
                </div>

                {/* Transfer Arrow Connector */}
                <div className="payout-flow-connector">
                  <div className="payout-flow-arrow" title="Transfer direction">
                    <ArrowDown size={14} strokeWidth={3.2} />
                  </div>
                </div>

                {/* 2. Selected Payout Bank Account */}
                <div className="payout-account-card">
                  <div className="payout-account-card-left">
                    <BankLogo bankCode={selectedAccount.bankCode} bankName={selectedAccount.bank} />
                    <div className="payout-account-details">
                      <p className="payout-account-name">
                        {selectedAccount.name}
                      </p>
                      <p className="payout-account-number">
                        {selectedAccount.bank} Bank · <span className="payout-account-num-val">{selectedAccount.number}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`payout-account-chevron-btn ${isDropdownOpen ? "is-open" : ""}`}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    aria-label="Change payout account"
                  >
                    <ChevronDown size={18} strokeWidth={2.4} />
                  </button>
                </div>

                {isDropdownOpen && (
                  <div className="payout-account-dropdown">
                    {DEFAULT_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        className={`payout-dropdown-item ${acc.id === selectedAccount.id ? "is-selected" : ""}`}
                        onClick={() => {
                          setSelectedAccount(acc);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <BankLogo bankCode={acc.bankCode} bankName={acc.bank} />
                        <div className="payout-dropdown-item-info">
                          <span className="payout-dropdown-item-name">
                            {acc.name}
                          </span>
                          <span className="payout-dropdown-item-sub">
                            {acc.bank} · <span className="payout-account-num-val">{acc.number}</span>
                          </span>
                        </div>
                        {acc.id === selectedAccount.id && (
                          <Check size={16} strokeWidth={2.5} style={{ color: "var(--payout-green)" }} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. AMOUNT SECTION */}
              <div className="payout-amount-section">
                <div className="payout-section-header">
                  <label
                    htmlFor="mobile-withdraw-amount-input"
                    className="payout-amount-label"
                  >
                    Amount<span className="payout-label-star">*</span>
                  </label>
                  <button
                    type="button"
                    className="payout-withdraw-all-btn"
                    onClick={handleWithdrawAll}
                  >
                    Withdraw All
                  </button>
                </div>

                <div className={`payout-amount-box-card ${isOverBalance ? "has-error" : ""}`}>
                  <span className="payout-currency-prefix">NGN</span>
                  <input
                    ref={inputRef}
                    id="mobile-withdraw-amount-input"
                    type="text"
                    inputMode="numeric"
                    className="payout-amount-input"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    autoComplete="off"
                  />
                </div>

                {isOverBalance && (
                  <p className="payout-amount-error">
                    Amount exceeds available balance of ₦
                    {availableBalance.toLocaleString("en-US")}
                  </p>
                )}
              </div>

            </form>
          )}
        </div>
      </div>

      {/* ── 3. Bottom Pinned CTA Dock on Mobile ── */}
      {!isSuccess && (
        <div className="mobile-withdraw-bottom-dock">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleContinue}
            className="payout-submit-btn"
          >
            {isSubmitting ? (
              <LoaderCircle size={20} className="animate-spin" />
            ) : (
              "Continue to Payout"
            )}
          </button>
        </div>
      )}

      {/* ── CONFIRM PAYOUT SLIDE-UP BOTTOM SHEET ── */}
      {isConfirmModalOpen && (
        <div
          className="payout-sheet-backdrop"
          onClick={() => setIsConfirmModalOpen(false)}
        >
          <div
            className="payout-confirm-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="payout-sheet-handle-wrap">
              <div className="payout-sheet-grab-bar" />
            </div>

            <div className="payout-sheet-header">
              <div className="payout-sheet-title-wrap">
                <h3 className="payout-sheet-title">Confirm Payout</h3>
              </div>
              <button
                type="button"
                className="payout-sheet-close-btn"
                onClick={() => setIsConfirmModalOpen(false)}
                aria-label="Close"
              >
                <X size={18} strokeWidth={2.4} />
              </button>
            </div>

            <div className="payout-sheet-dest-card">
              <BankLogo bankCode={selectedAccount.bankCode} bankName={selectedAccount.bank} />
              <div className="payout-sheet-dest-info">
                <span className="payout-sheet-dest-name">
                  {selectedAccount.name}
                </span>
                <span className="payout-sheet-dest-sub">
                  {selectedAccount.bank} Bank · <span className="payout-account-num-val">{selectedAccount.number}</span>
                </span>
              </div>
            </div>

            {/* PAYOUT BREAKDOWN */}
            <div className="payout-breakdown-section" style={{ marginTop: 6 }}>
              <div className="payout-section-header">
                <span className="payout-section-label">PAYOUT BREAKDOWN</span>
              </div>

              <div className="payout-breakdown-rows">
                <div className="payout-breakdown-row">
                  <span className="payout-breakdown-label">Requested Amount</span>
                  <span className="payout-breakdown-value">
                    ₦{numericAmount.toLocaleString("en-US")}
                  </span>
                </div>

                <div className="payout-breakdown-row fee">
                  <span className="payout-breakdown-label">Payout fee</span>
                  <span className="payout-breakdown-value">₦{fee}</span>
                </div>

                <div className="payout-breakdown-row total">
                  <span className="payout-breakdown-label">Total Payout</span>
                  <span className="payout-breakdown-value">
                    ₦{totalPayout.toLocaleString("en-US")}
                  </span>
                </div>
              </div>
            </div>

            {/* TERMS CHECKBOX */}
            <label className="payout-terms-label">
              <input
                type="checkbox"
                checked={hasAgreedTerms}
                onChange={(e) => setHasAgreedTerms(e.target.checked)}
                className="payout-terms-checkbox"
              />
              <span className="payout-terms-text">
                I agree to the terms and authorize this payout
              </span>
            </label>

            {/* FINAL PAYOUT ACTION */}
            <div className="payout-sheet-action">
              <button
                type="button"
                disabled={!hasAgreedTerms || isSubmitting}
                onClick={handleFinalPayout}
                className="payout-submit-btn"
              >
                {isSubmitting ? (
                  <LoaderCircle size={20} className="animate-spin" />
                ) : (
                  "Payout"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
