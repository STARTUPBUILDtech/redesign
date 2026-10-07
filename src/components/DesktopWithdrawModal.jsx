import { useState, useEffect, useRef } from "react";
import { X, ChevronDown, Check, LoaderCircle, Wallet, ArrowDown } from "lucide-react";
import BankLogo from "./BankLogo.jsx";
import "../styles/withdraw.css";

const DEFAULT_ACCOUNTS = [
  {
    id: "acc-1",
    bank: "KUDA",
    bankCode: "kuda",
    name: "Ukah-Columba Chinaza Howard",
    number: "8032001585",
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

import {
  getStoredPocketBalanceKobo,
  saveStoredPocketBalanceKobo,
  koboToNaira,
  nairaToKobo,
} from "../utils/balanceUtils.js";

export default function DesktopWithdrawModal({
  onClose,
  onSuccess,
  availableBalance = koboToNaira(getStoredPocketBalanceKobo()),
  dark,
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
  const dropdownRef = useRef(null);
  const fee = 50;

  // Close dropdown on outside click
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isDropdownOpen]);

  useEffect(() => {
    // Focus input on open
    inputRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) {
        if (isConfirmModalOpen) {
          setIsConfirmModalOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isConfirmModalOpen]);

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
    e.preventDefault();
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
      const currentKobo = getStoredPocketBalanceKobo();
      const deductKobo = nairaToKobo(numericAmount);
      const nextKobo = Math.max(0, currentKobo - deductKobo);
      saveStoredPocketBalanceKobo(nextKobo);

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
    <div
      className="desktop-withdraw-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="desktop-withdraw-title"
    >
      <div
        className="desktop-withdraw-modal-container"
        data-appearance={dark ? "dark" : "light"}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="payout-header">
          <div className="payout-title-wrap">
            <h2 id="desktop-withdraw-title" className="payout-title">
              Withdraw Payout
            </h2>
            <p className="payout-subtitle">Withdraw payout to your bank account.</p>
          </div>
          <button
            type="button"
            className="payout-cancel-btn"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>

        {/* Modal Body */}
        <div className="payout-body">
          {isSuccess ? (
            <div className="payout-success-state">
              <div className="payout-success-badge">
                <Check size={32} strokeWidth={2.8} />
              </div>
              <div>
                <h3 className="payout-success-title">Payout Initiated!</h3>
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

              <div className="payout-actions" style={{ width: "100%" }}>
                <button
                  type="button"
                  className="payout-submit-btn"
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleContinue}>
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
                <div className="payout-account-card-wrapper" ref={dropdownRef}>
                  <div
                    className="payout-account-card"
                    onClick={() => setIsDropdownOpen((prev) => !prev)}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isDropdownOpen}
                    aria-label="Change payout account"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsDropdownOpen((prev) => !prev);
                      }
                    }}
                  >
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDropdownOpen(!isDropdownOpen);
                      }}
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
                          ref={(el) => {
                            if (el && acc.id === selectedAccount.id) {
                              el.scrollIntoView({ block: "nearest" });
                            }
                          }}
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
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. AMOUNT SECTION */}
              <div className="payout-amount-section">
                <div className="payout-section-header">
                  <label
                    htmlFor="withdraw-amount-input"
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
                    id="withdraw-amount-input"
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

              {/* ACTION BUTTON */}
              <div className="payout-actions" style={{ marginTop: 22 }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="payout-submit-btn"
                >
                  {isSubmitting ? (
                    <LoaderCircle size={20} className="animate-spin" />
                  ) : (
                    "Continue to Payout"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── CONFIRM PAYOUT SLIDE-UP MODAL ── */}
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
