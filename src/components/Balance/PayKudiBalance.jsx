import { useState } from "react";
import { useDashboard } from "../../context/DashboardContext";

export default function PayKudiBalance() {
  const { visible, toggleBalance } = useDashboard();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard?.writeText("2032614152");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="cardless-balance">
      {/* Top Meta: Bank icon · Nigerian Naira · Account Number · Copy Icon */}
      <div className="balance-account-bar">
        <span className="material-symbols-outlined balance-bank-icon">account_balance</span>
        <span className="balance-account-text">Nigerian Naira · 2032614152</span>
        <button
          type="button"
          onClick={handleCopy}
          className="balance-copy-btn"
          title={copied ? "Copied!" : "Copy account number"}
          aria-label="Copy account number"
        >
          <span className="material-symbols-outlined balance-copy-icon">
            {copied ? "check" : "content_copy"}
          </span>
        </button>
      </div>

      {/* Main Balance Row: Centered Amount + Action Toggle Button */}
      <div className="balance-main-row">
        <div className="balance-amount-wrapper">
          <h2 className="balance-amount-text">
            {visible ? "₦182,000.00" : "••••••••"}
          </h2>
          <button
            type="button"
            onClick={toggleBalance}
            className="balance-eye-btn"
            aria-label={visible ? "Hide balance" : "Show balance"}
            title={visible ? "Hide balance" : "Show balance"}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 19 }}>
              {visible ? "visibility" : "visibility_off"}
            </span>
          </button>
        </div>
      </div>

      {/* Timestamp */}
      <p className="balance-timestamp">Last updated 28 sec. ago</p>
    </div>
  );
}
