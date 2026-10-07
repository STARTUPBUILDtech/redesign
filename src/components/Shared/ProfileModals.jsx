import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import BankLogo from "../BankLogo.jsx";
import { Select, SelectContent, SelectItem } from "../ui/select.jsx";
import "../../styles/profile-modals.css";

export function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.71 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.414z" />
    </svg>
  );
}

export function BvnIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: "block" }}
    >
      <rect x="3" y="5" width="18" height="15" rx="3" />
      <path d="M7 9h10" />
      <circle cx="8.5" cy="13.5" r="1" fill="currentColor" />
      <circle cx="12" cy="13.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="13.5" r="1" fill="currentColor" />
      <circle cx="8.5" cy="16.5" r="1" fill="currentColor" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
      <circle cx="15.5" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function NinIcon({ size = 20, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: "block" }}
    >
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <rect x="6" y="8" width="5" height="5" rx="1" />
      <line x1="14" y1="9" x2="18" y2="9" />
      <line x1="14" y1="12" x2="18" y2="12" />
      <line x1="6" y1="15.5" x2="18" y2="15.5" />
    </svg>
  );
}

export function useModalAppearance(darkProp) {
  const [appearance, setAppearance] = useState(() => {
    if (typeof darkProp === "boolean") return darkProp ? "dark" : "light";
    if (typeof document === "undefined") return "light";
    const bodyAttr = document.body.getAttribute("data-appearance");
    const docAttr = document.documentElement.getAttribute("data-appearance");
    const hasDarkClass =
      document.body.classList.contains("dark") ||
      document.documentElement.classList.contains("dark");
    const dashDark = document.querySelector('[data-appearance="dark"]') !== null;
    return (bodyAttr === "dark" || docAttr === "dark" || hasDarkClass || dashDark) ? "dark" : "light";
  });

  useEffect(() => {
    if (typeof darkProp === "boolean") {
      setAppearance(darkProp ? "dark" : "light");
      return;
    }
    if (typeof document === "undefined") return;
    const checkDark = () => {
      const isDark =
        document.body.getAttribute("data-appearance") === "dark" ||
        document.documentElement.getAttribute("data-appearance") === "dark" ||
        document.body.classList.contains("dark") ||
        document.documentElement.classList.contains("dark") ||
        document.querySelector('.mobile-dashboard[data-appearance="dark"]') !== null ||
        document.querySelector('.app[data-appearance="dark"]') !== null;
      setAppearance(isDark ? "dark" : "light");
    };

    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-appearance", "class"] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-appearance", "class"] });
    return () => observer.disconnect();
  }, [darkProp]);

  return appearance;
}

/* ── Shared shell: renders as a portal overlay modal, or embedded inline (desktop split-pane) ── */
function ModalShell({ inline, appearance, onClose, cardClassName = "", labelledBy, children }) {
  const cardClass = `profile-modal-card${cardClassName ? ` ${cardClassName}` : ""}`;
  if (inline) {
    return (
      <div className="profile-modal-inline" data-appearance={appearance}>
        <div className={`${cardClass} is-inline`} data-appearance={appearance}>
          {children}
        </div>
      </div>
    );
  }
  return createPortal(
    <div
      className="profile-modal-overlay"
      data-appearance={appearance}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div className={cardClass} data-appearance={appearance}>
        {children}
      </div>
    </div>,
    document.body
  );
}

function extractLocalPhone(phoneStr) {
  if (!phoneStr) return "";
  let cleaned = phoneStr.trim();
  if (cleaned.startsWith("+234")) {
    cleaned = cleaned.substring(4).trim();
  } else if (cleaned.startsWith("234")) {
    cleaned = cleaned.substring(3).trim();
  }
  if (cleaned.startsWith("0") && cleaned.length > 1) {
    cleaned = cleaned.substring(1).trim();
  }
  return cleaned;
}

// ── 1. Edit Field Modal (Email, Name, Address, Phone, or Full Profile) ──
export function EditFieldModal({
  isOpen,
  onClose,
  fieldType = "email", // 'email' | 'name' | 'address' | 'phone' | 'profile'
  currentData,
  onSave,
  dark,
  inline = false,
}) {
  const appearance = useModalAppearance(dark);
  const isDark = appearance === "dark";

  const [formData, setFormData] = useState({
    name: currentData?.name || "",
    email: currentData?.email || "",
    phone: extractLocalPhone(currentData?.phone || ""),
    address: currentData?.address || "",
  });
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: currentData?.name || "",
        email: currentData?.email || "",
        phone: extractLocalPhone(currentData?.phone || ""),
        address: currentData?.address || "",
      });
      setError("");
      // Intentionally do not auto-focus input so keyboard is not prompted on mobile until user taps
    }
  }, [isOpen, currentData, fieldType]);

  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (val.startsWith("+234")) val = val.substring(4).trim();
    else if (val.startsWith("234")) val = val.substring(3).trim();
    else if (val.startsWith("0") && val.length > 1) val = val.substring(1).trim();
    setFormData((prev) => ({ ...prev, phone: val }));
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    setError("");

    if (fieldType === "email") {
      const emailVal = formData.email.trim();
      if (!emailVal) {
        setError("Please enter an email address.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        setError("Please enter a valid email address (e.g. name@example.com).");
        return;
      }
      onSave({ email: emailVal });
    } else if (fieldType === "name") {
      const nameVal = formData.name.trim();
      if (!nameVal) {
        setError("Please enter your name.");
        return;
      }
      onSave({ name: nameVal });
    } else if (fieldType === "phone") {
      const rawDigits = formData.phone.trim();
      if (!rawDigits) {
        setError("Please enter your phone number.");
        return;
      }
      const cleanNumber = rawDigits.replace(/^\+?234\s*/, "").replace(/^0/, "");
      onSave({ phone: `+234 ${cleanNumber}` });
    } else if (fieldType === "address") {
      const addrVal = formData.address.trim();
      if (!addrVal) {
        setError("Please enter your address.");
        return;
      }
      onSave({ address: addrVal });
    } else if (fieldType === "profile") {
      if (!formData.name.trim()) {
        setError("Name cannot be empty.");
        return;
      }
      const rawDigits = formData.phone.trim();
      const fullPhone = rawDigits ? `+234 ${rawDigits.replace(/^\+?234\s*/, "").replace(/^0/, "")}` : "";
      onSave({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: fullPhone,
        address: formData.address.trim(),
      });
    }
    onClose();
  };

  const getHeaderConfig = () => {
    switch (fieldType) {
      case "email":
        return {
          title: formData.email ? "Edit Bound Email Address" : "Bind Email Address",
          icon: "mail",
          badgeClass: "email",
          badgeBg: isDark ? "rgba(168, 85, 247, 0.22)" : "#eedffe",
          badgeColor: isDark ? "#c084fc" : "#7e22ce",
        };
      case "address":
        return {
          title: "Edit Address",
          icon: "location_on",
          badgeClass: "address",
          badgeBg: isDark ? "rgba(249, 115, 22, 0.22)" : "#fce8d3",
          badgeColor: isDark ? "#fb923c" : "#c76016",
        };
      case "phone":
        return {
          title: "Edit Phone Number",
          icon: "phone",
          badgeClass: "whatsapp",
          badgeBg: isDark ? "rgba(34, 197, 94, 0.22)" : "#dcf2e4",
          badgeColor: isDark ? "#4ade80" : "#1b7347",
        };
      case "name":
        return {
          title: "Edit Account Name",
          icon: "person",
          badgeClass: "user",
          badgeBg: isDark ? "rgba(59, 130, 246, 0.22)" : "#dde7f2",
          badgeColor: isDark ? "#60a5fa" : "#234872",
        };
      case "profile":
      default:
        return {
          title: "Edit Profile Details",
          icon: "manage_accounts",
          badgeClass: "user",
          badgeBg: isDark ? "rgba(59, 130, 246, 0.22)" : "#dde7f2",
          badgeColor: isDark ? "#60a5fa" : "#234872",
        };
    }
  };

  const cfg = getHeaderConfig();

  return (
    <ModalShell
      inline={inline}
      appearance={appearance}
      onClose={onClose}
      labelledBy="profile-modal-title"
    >
        {/* Header without subtitle */}
        <div className="profile-modal-header">
          <div className="profile-modal-header-left">
            <div
              className={`profile-modal-icon-badge ${cfg.badgeClass}`}
              style={{ backgroundColor: cfg.badgeBg, color: cfg.badgeColor }}
            >
              {fieldType === "phone" ? (
                <WhatsAppIcon size={20} />
              ) : (
                <span className="material-symbols-outlined">{cfg.icon}</span>
              )}
            </div>
            <div className="profile-modal-header-titles">
              <h2 id="profile-modal-title" className="profile-modal-title">
                {cfg.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="profile-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="profile-modal-body">
            {error && (
              <div className="profile-form-error">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  error
                </span>
                <span>{error}</span>
              </div>
            )}

            {fieldType === "email" && (
              <div className="profile-form-group">
                <label className="profile-form-label" htmlFor="profile-email-input">
                  <span>Email Address</span>
                </label>
                <div className="profile-input-wrap has-icon">
                  <span className="profile-input-icon">
                    <span className="material-symbols-outlined">mail</span>
                  </span>
                  <input
                    ref={inputRef}
                    id="profile-email-input"
                    type="email"
                    className="profile-input-field"
                    placeholder="e.g. amaka.obi@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    autoComplete="email"
                  />
                </div>
                <div style={{ marginTop: "7px", fontSize: "12px", color: "var(--muted, #71717a)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "#10b981" }}>verified</span>
                  <span>Binding an email allows you to sign in with your email & password.</span>
                </div>
              </div>
            )}

            {fieldType === "name" && (
              <div className="profile-form-group">
                <label className="profile-form-label" htmlFor="profile-name-input">
                  <span>Account Name</span>
                </label>
                <div className="profile-input-wrap has-icon">
                  <span className="profile-input-icon">
                    <span className="material-symbols-outlined">person</span>
                  </span>
                  <input
                    ref={inputRef}
                    id="profile-name-input"
                    type="text"
                    className="profile-input-field"
                    placeholder="e.g. Amaka Obi"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {fieldType === "phone" && (
              <div className="profile-form-group">
                <label className="profile-form-label" htmlFor="profile-phone-input">
                  <span>WhatsApp Phone Number</span>
                </label>
                <div className="profile-input-wrap profile-phone-wrap has-icon">
                  <span className="profile-input-icon" style={{ color: "#10b981" }}>
                    <WhatsAppIcon size={18} />
                  </span>
                  <span className="profile-country-code-badge" title="Constant Country Code">
                    <svg
                      width="18"
                      height="13"
                      viewBox="0 0 20 14"
                      style={{ borderRadius: "2px", display: "inline-block", flexShrink: 0 }}
                    >
                      <rect width="20" height="14" fill="#008751" />
                      <rect x="6.67" width="6.66" height="14" fill="#ffffff" />
                    </svg>
                    <span className="profile-country-code-text">+234</span>
                  </span>
                  <span className="profile-phone-divider" />
                  <input
                    ref={inputRef}
                    id="profile-phone-input"
                    type="tel"
                    className="profile-input-field profile-phone-input-field"
                    placeholder="803 200 1585"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    autoComplete="tel-national"
                  />
                </div>
              </div>
            )}

            {fieldType === "address" && (
              <div className="profile-form-group">
                <label className="profile-form-label" htmlFor="profile-address-input">
                  <span>Enter your address</span>
                </label>
                <textarea
                  ref={inputRef}
                  id="profile-address-input"
                  className="profile-textarea-field"
                  placeholder="Street, city and state"
                  rows={3}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            )}

            {fieldType === "profile" && (
              <>
                <div className="profile-form-group">
                  <label className="profile-form-label" htmlFor="profile-all-name">
                    Account Name
                  </label>
                  <div className="profile-input-wrap has-icon">
                    <span className="profile-input-icon">
                      <span className="material-symbols-outlined">person</span>
                    </span>
                    <input
                      ref={inputRef}
                      id="profile-all-name"
                      type="text"
                      className="profile-input-field"
                      placeholder="e.g. Amaka Obi"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label" htmlFor="profile-all-email">
                    Email Address
                  </label>
                  <div className="profile-input-wrap has-icon">
                    <span className="profile-input-icon">
                      <span className="material-symbols-outlined">mail</span>
                    </span>
                    <input
                      id="profile-all-email"
                      type="email"
                      className="profile-input-field"
                      placeholder="e.g. amaka@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label" htmlFor="profile-all-phone">
                    WhatsApp Phone
                  </label>
                  <div className="profile-input-wrap profile-phone-wrap has-icon">
                    <span className="profile-input-icon" style={{ color: "#10b981" }}>
                      <WhatsAppIcon size={18} />
                    </span>
                    <span className="profile-country-code-badge" title="Constant Country Code">
                      <svg
                        width="18"
                        height="13"
                        viewBox="0 0 20 14"
                        style={{ borderRadius: "2px", display: "inline-block", flexShrink: 0 }}
                      >
                        <rect width="20" height="14" fill="#008751" />
                        <rect x="6.67" width="6.66" height="14" fill="#ffffff" />
                      </svg>
                      <span className="profile-country-code-text">+234</span>
                    </span>
                    <span className="profile-phone-divider" />
                    <input
                      id="profile-all-phone"
                      type="tel"
                      className="profile-input-field profile-phone-input-field"
                      placeholder="803 200 1585"
                      value={formData.phone}
                      onChange={handlePhoneChange}
                    />
                  </div>
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label" htmlFor="profile-all-address">
                    Enter your address
                  </label>
                  <textarea
                    id="profile-all-address"
                    className="profile-textarea-field"
                    placeholder="Street, city and state"
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="profile-modal-footer">
            <button
              type="button"
              className="profile-btn profile-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="profile-btn profile-btn-primary">
              Save Changes
            </button>
          </div>
        </form>
    </ModalShell>
  );
}

// ── 2. Payout Account Modal ──
const PRIMARY_SUGGESTED_BANKS = [
  { code: "kuda", name: "Kuda Bank" },
  { code: "gtbank", name: "GTBank" },
  { code: "access", name: "Access Bank" },
];

const OTHER_BANKS = [
  { code: "zenith", name: "Zenith Bank" },
  { code: "firstbank", name: "First Bank" },
  { code: "uba", name: "UBA" },
  { code: "palmpay", name: "PalmPay" },
];

export function PayoutAccountModal({ isOpen, onClose, currentData, onSave, dark, inline = false }) {
  const appearance = useModalAppearance(dark);
  const isDark = appearance === "dark";

  // Modal view: 'list' (default view showing added accounts) | 'add' (add new account flow)
  const [view, setView] = useState("list");

  // Helper to detect generic/dummy accounts
  const isGenericAccount = (acc) => {
    if (!acc) return true;
    const name = String(acc.accountName || "").toLowerCase();
    const num = String(acc.accountNumber || "");
    const genericNums = ["1234567653", "2345678900", "0234567891", "0123456789", "2001948291"];
    return name.includes("amaka") || genericNums.includes(num);
  };

  // Initial accounts seed helper
  const getInitialAccounts = () => {
    try {
      const saved = localStorage.getItem("paykudi_payout_accounts");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter((a) => !isGenericAccount(a));
          if (clean.length !== parsed.length) {
            localStorage.setItem("paykudi_payout_accounts", JSON.stringify(clean));
          }
          return clean;
        }
      }
    } catch (e) {}

    // Check if currentData has a real, non-generic bank account
    if (
      currentData?.bank &&
      currentData?.accountNumber &&
      !isGenericAccount({
        accountName: currentData.accountName || currentData.name,
        accountNumber: currentData.accountNumber,
      })
    ) {
      return [
        {
          id: "payout-acc-" + Date.now(),
          bank: currentData.bank,
          bankCode: currentData.bankCode || "kuda",
          accountNumber: currentData.accountNumber,
          accountName: currentData.accountName || currentData.name || "",
          isDefault: true,
        },
      ];
    }

    return [];
  };

  const [accounts, setAccounts] = useState(getInitialAccounts);
  const [selectedDefaultId, setSelectedDefaultId] = useState(() => {
    const initial = getInitialAccounts();
    const def = initial.find((a) => a.isDefault);
    return def ? def.id : initial[0]?.id || "";
  });

  // State for Add Account flow
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [isMatchingBank, setIsMatchingBank] = useState(false);
  const [showSuggestedBanks, setShowSuggestedBanks] = useState(false);
  const [showAllBanks, setShowAllBanks] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [isMatchingName, setIsMatchingName] = useState(false);
  const [matchedAccountName, setMatchedAccountName] = useState("");
  const [setAsDefaultNew, setSetAsDefaultNew] = useState(true);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const accountInputRef = useRef(null);
  const bankDropdownRef = useRef(null);

  // Sync state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setView("list");
      setError("");
      setListError("");
      setNewAccountNumber("");
      setIsMatchingBank(false);
      setShowSuggestedBanks(false);
      setShowAllBanks(false);
      setIsBankDropdownOpen(false);
      setSelectedBank(null);
      setIsMatchingName(false);
      setMatchedAccountName("");
      try {
        const saved = localStorage.getItem("paykudi_payout_accounts");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const clean = parsed.filter((a) => !isGenericAccount(a));
            if (clean.length !== parsed.length) {
              localStorage.setItem("paykudi_payout_accounts", JSON.stringify(clean));
            }
            setAccounts(clean);
            const def = clean.find((a) => a.isDefault) || clean[0];
            setSelectedDefaultId(def ? def.id : "");
            return;
          }
        }
      } catch (e) {}
      setAccounts([]);
      setSelectedDefaultId("");
    }
  }, [isOpen]);

  // Intentionally do not auto-focus input so keyboard is not prompted until user taps the input box

  // When user enters 10 digits: show small loading state under Select Bank drop down box, then auto open dropdown
  useEffect(() => {
    if (newAccountNumber.length === 10) {
      setIsMatchingBank(true);
      setShowSuggestedBanks(false);
      setIsBankDropdownOpen(false);
      setSelectedBank(null);
      setIsMatchingName(false);
      setMatchedAccountName("");

      const timer = setTimeout(() => {
        setIsMatchingBank(false);
        setShowSuggestedBanks(true);
        setIsBankDropdownOpen(true);
      }, 450);

      return () => clearTimeout(timer);
    } else {
      setIsMatchingBank(false);
      setShowSuggestedBanks(false);
      setIsBankDropdownOpen(false);
      setShowAllBanks(false);
      setSelectedBank(null);
      setIsMatchingName(false);
      setMatchedAccountName("");
    }
  }, [newAccountNumber]);

  // Click outside listener to close bank dropdown
  useEffect(() => {
    if (!isBankDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(e.target)) {
        setIsBankDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isBankDropdownOpen]);

  if (!isOpen) return null;

  // Handle selecting an account as default
  const handleSelectDefault = (id) => {
    setSelectedDefaultId(id);
    const updated = accounts.map((acc) => ({
      ...acc,
      isDefault: acc.id === id,
    }));
    setAccounts(updated);
    try {
      localStorage.setItem("paykudi_payout_accounts", JSON.stringify(updated));
    } catch (e) {}

    const chosen = updated.find((a) => a.id === id);
    if (chosen && onSave) {
      onSave({
        bank: chosen.bank,
        accountNumber: chosen.accountNumber,
        accountName: chosen.accountName,
        bankCode: chosen.bankCode,
      });
    }
  };

  const handleConfirmDefaultAndClose = () => {
    const chosen = accounts.find((a) => a.id === selectedDefaultId) || accounts[0];
    if (chosen && onSave) {
      onSave({
        bank: chosen.bank,
        accountNumber: chosen.accountNumber,
        accountName: chosen.accountName,
        bankCode: chosen.bankCode,
      });
    }
    onClose();
  };

  // Handle attempting to open Add Bank Account flow
  const handleOpenAddFlow = () => {
    if (accounts.length >= 3) {
      setListError("Maximum limit of 3 payout accounts reached.");
      return;
    }
    setListError("");
    setView("add");
    setNewAccountNumber("");
    setSelectedBank(null);
    setIsBankDropdownOpen(false);
    setMatchedAccountName("");
    setError("");
  };

  // Handle account number input (taking only account number)
  const handleAccountNumberChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
    setNewAccountNumber(val);
    setError("");

    if (val.length < 10) {
      setIsMatchingBank(false);
      setShowSuggestedBanks(false);
      setShowAllBanks(false);
      setSelectedBank(null);
      setIsMatchingName(false);
      setMatchedAccountName("");
    }
  };

  // Handle selecting a suggested bank -> triggers name matching
  const handleBankSelect = (bankObj) => {
    setSelectedBank(bankObj);
    setIsBankDropdownOpen(false);
    setError("");
    setIsMatchingName(true);
    setMatchedAccountName("");

    const timer = setTimeout(() => {
      const userFullName = currentData?.name || currentData?.accountName || "Howard Ukah";
      setMatchedAccountName(userFullName.toUpperCase());
      setIsMatchingName(false);
    }, 400);
  };

  // Handle adding the new account
  const handleSaveNewAccount = (e) => {
    e.preventDefault();
    if (accounts.length >= 3) {
      setError("Maximum limit of 3 payout accounts reached.");
      return;
    }
    if (newAccountNumber.length !== 10) {
      setError("Please enter a valid 10-digit account number.");
      return;
    }
    if (!selectedBank) {
      setError("Please choose a suggested bank for this account.");
      return;
    }
    if (!matchedAccountName || isMatchingName) {
      setError("Waiting for account name verification.");
      return;
    }

    const newAcc = {
      id: "payout-acc-" + Date.now(),
      bank: selectedBank.name,
      bankCode: selectedBank.code,
      accountNumber: newAccountNumber,
      accountName: matchedAccountName,
      isDefault: setAsDefaultNew,
    };

    let updatedList;
    if (setAsDefaultNew) {
      updatedList = [
        newAcc,
        ...accounts.map((a) => ({ ...a, isDefault: false })),
      ];
      setSelectedDefaultId(newAcc.id);
      if (onSave) {
        onSave({
          bank: newAcc.bank,
          accountNumber: newAcc.accountNumber,
          accountName: newAcc.accountName,
          bankCode: newAcc.bankCode,
        });
      }
    } else {
      updatedList = [...accounts, newAcc];
    }

    setAccounts(updatedList);
    try {
      localStorage.setItem("paykudi_payout_accounts", JSON.stringify(updatedList));
    } catch (e) {}

    // Reset and return to list view
    setNewAccountNumber("");
    setSelectedBank(null);
    setMatchedAccountName("");
    setIsMatchingBank(false);
    setShowSuggestedBanks(false);
    setShowAllBanks(false);
    setView("list");
  };

  // Delete an account
  const handleDeleteAccount = (e, accId) => {
    e.stopPropagation();
    const filtered = accounts.filter((a) => a.id !== accId);
    setAccounts(filtered);
    setListError("");
    try {
      localStorage.setItem("paykudi_payout_accounts", JSON.stringify(filtered));
    } catch (e) {}
    if (selectedDefaultId === accId) {
      const nextDef = filtered[0];
      setSelectedDefaultId(nextDef ? nextDef.id : "");
      if (onSave) {
        onSave({
          bank: nextDef ? nextDef.bank : "",
          accountNumber: nextDef ? nextDef.accountNumber : "",
          accountName: nextDef ? nextDef.accountName : "",
          bankCode: nextDef ? nextDef.bankCode : "",
        });
      }
    }
  };

  const isFieldUneditable = Boolean(selectedBank);

  return (
    <ModalShell
      inline={inline}
      appearance={appearance}
      onClose={onClose}
      cardClassName="payout-dialog-card"
    >
        {/* ════ VIEW 1: Added Payout Banks List (Default) ════ */}
        {view === "list" && (
          <>
            <div className="profile-modal-header">
              <div className="profile-modal-header-left">
                <div
                  className="profile-modal-icon-badge payout"
                  style={{
                    backgroundColor: isDark ? "rgba(34, 197, 94, 0.22)" : "#dcf2e4",
                    color: isDark ? "#4ade80" : "#1b7347",
                  }}
                >
                  <span className="material-symbols-outlined">account_balance</span>
                </div>
                <div className="profile-modal-header-titles">
                  <h2 className="profile-modal-title">Payout Bank Accounts</h2>
                </div>
              </div>
              <button
                type="button"
                className="profile-modal-close-btn"
                onClick={onClose}
                aria-label="Close"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div className="profile-modal-body payout-modal-scrollable">
              <p className="payout-modal-desc">
                {accounts.length > 0
                  ? "Select your default Payout Bank Account."
                  : "No payout bank accounts linked yet."}
              </p>

              {/* Added Payout Banks List */}
              {accounts.length > 0 && (
                <div className="payout-accounts-list">
                {accounts.map((acc) => {
                  const isDefaultSelected = acc.id === selectedDefaultId;
                  return (
                    <div
                      key={acc.id}
                      className={`payout-account-select-card ${
                        isDefaultSelected ? "is-default-selected" : ""
                      }`}
                      onClick={() => handleSelectDefault(acc.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectDefault(acc.id);
                        }
                      }}
                    >
                      <div className="payout-account-card-left">
                        <BankLogo bankCode={acc.bankCode} bankName={acc.bank} size={48} />
                        <div className="payout-account-details">
                          <span className="payout-account-bank-name">{acc.bank}</span>
                          <span className="payout-account-number-mono">
                            {acc.accountNumber}
                          </span>
                          <span className="payout-account-holder">
                            {acc.accountName}
                          </span>
                        </div>
                      </div>

                      <div className="payout-account-card-right">
                        {isDefaultSelected && (
                          <span className="payout-default-pill">Default</span>
                        )}

                        {/* Selector for default payout account */}
                        <div
                          className={`payout-radio-selector ${
                            isDefaultSelected ? "is-checked" : ""
                          }`}
                          title={isDefaultSelected ? "Default Payout Account" : "Click to set as default"}
                        >
                          <span className="material-symbols-outlined payout-radio-icon">
                            {isDefaultSelected ? "radio_button_checked" : "radio_button_unchecked"}
                          </span>
                        </div>

                        {accounts.length > 1 && !isDefaultSelected && (
                          <button
                            type="button"
                            className="payout-delete-acc-btn"
                            title="Remove account"
                            onClick={(e) => handleDeleteAccount(e, acc.id)}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                              delete
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}

              {/* Error warning if user tries adding and 3 accounts are already saved */}
              {listError && (
                <div className="payout-list-inline-error">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    error
                  </span>
                  <span>{listError}</span>
                </div>
              )}

              {/* Add Bank Account Trigger Button */}
              <button
                type="button"
                className="payout-add-trigger-btn"
                onClick={handleOpenAddFlow}
              >
                <div className="payout-add-trigger-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    add
                  </span>
                </div>
                <div className="payout-add-trigger-text">
                  <span className="payout-add-trigger-title">Add Bank Account</span>
                  <span className="payout-add-trigger-sub">Enter account number to link payout bank</span>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ════ VIEW 2: Add Payout Bank Account Flow ════ */}
        {view === "add" && (
          <form onSubmit={handleSaveNewAccount}>
            <div className="profile-modal-header">
              <div className="profile-modal-header-left">
                <button
                  type="button"
                  className="payout-back-arrow-btn"
                  onClick={() => setView("list")}
                  aria-label="Back to payout accounts list"
                  title="Back to accounts"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    arrow_back
                  </span>
                </button>
                <div className="profile-modal-header-titles">
                  <h2 className="profile-modal-title">Add Payout Account</h2>
                </div>
              </div>
              <button
                type="button"
                className="profile-modal-close-btn"
                onClick={onClose}
                aria-label="Close"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <div
              className="profile-modal-body payout-modal-scrollable"
              onClick={(e) => {
                if (
                  !isFieldUneditable &&
                  accountInputRef.current &&
                  e.target !== accountInputRef.current &&
                  !e.target.closest("button") &&
                  !e.target.closest("input")
                ) {
                  accountInputRef.current.focus({ preventScroll: true });
                }
              }}
            >
              {error && (
                <div className="profile-form-error">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    error
                  </span>
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Account Number input - text box uneditable once bank is selected / matched */}
              <div className="new-payment-field-group">
                <label className="new-payment-label" htmlFor="payout-new-acc-number">
                  Account Number
                </label>
                <div
                  className={`new-payment-field-box ${error ? "error" : ""} ${isFieldUneditable ? "is-uneditable" : ""}`}
                  onClick={() => {
                    if (!isFieldUneditable) {
                      accountInputRef.current?.focus({ preventScroll: true });
                    }
                  }}
                >
                  <input
                    id="payout-new-acc-number"
                    ref={accountInputRef}
                    type="text"
                    inputMode={isFieldUneditable ? "none" : "numeric"}
                    pattern="[0-9]*"
                    maxLength={10}
                    placeholder="1234567890"
                    value={newAccountNumber}
                    onChange={handleAccountNumberChange}
                    readOnly={isFieldUneditable}
                    tabIndex={isFieldUneditable ? -1 : 0}
                    aria-readonly={isFieldUneditable}
                    onFocus={() => {
                      if (typeof window !== "undefined") {
                        window.scrollTo(0, 0);
                      }
                    }}
                    autoComplete="off"
                  />
                  {newAccountNumber.length === 10 && !isMatchingBank && (
                    <span className="payout-acc-valid-badge">
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#10b981" }}>
                        check_circle
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Select Bank Dropdown (unclickable until account number input is 10 digits complete) */}
              {(() => {
                const isDropdownDisabled = newAccountNumber.length < 10 || isMatchingBank;
                return (
                  <div className="new-payment-field-group" style={{ position: "relative" }}>
                    <label className="new-payment-label" htmlFor="payout-select-bank-trigger">
                      Select Bank
                    </label>
                    <div
                      ref={bankDropdownRef}
                      className={`payout-bank-select-container ${isDropdownDisabled ? "is-disabled" : ""} ${isBankDropdownOpen ? "is-open" : ""}`}
                    >
                      <button
                        id="payout-select-bank-trigger"
                        type="button"
                        className={`new-payment-field-box payout-bank-select-trigger ${isDropdownDisabled ? "is-disabled" : ""} ${isBankDropdownOpen ? "is-open" : ""} ${selectedBank ? "has-bank" : ""}`}
                        disabled={isDropdownDisabled}
                        onClick={() => {
                          if (!isDropdownDisabled) {
                            setIsBankDropdownOpen((prev) => !prev);
                          }
                        }}
                        aria-haspopup="listbox"
                        aria-expanded={isBankDropdownOpen}
                        title={isDropdownDisabled ? "Enter complete 10-digit account number first" : "Choose bank"}
                      >
                        <div className="payout-bank-trigger-left">
                          {selectedBank ? (
                            <>
                              <BankLogo bankCode={selectedBank.code} bankName={selectedBank.name} size={22} />
                              <span className="payout-bank-trigger-name">{selectedBank.name}</span>
                            </>
                          ) : (
                            <span className="payout-bank-trigger-placeholder">Select Bank</span>
                          )}
                        </div>
                        <span className={`material-symbols-outlined payout-bank-chevron ${isBankDropdownOpen ? "rotate" : ""}`}>
                          keyboard_arrow_down
                        </span>
                      </button>

                      {/* Dropdown Menu popover that drops down auto when matching finishes */}
                      {isBankDropdownOpen && !isDropdownDisabled && (
                        <div className="payout-bank-dropdown-menu" role="listbox">
                          <div className="payout-bank-dropdown-header">Choose your bank</div>
                          <div className="payout-bank-dropdown-list">
                            {PRIMARY_SUGGESTED_BANKS.map((b) => {
                              const isChosen = selectedBank?.code === b.code;
                              return (
                                <button
                                  key={b.code}
                                  type="button"
                                  className={`payout-bank-dropdown-item ${isChosen ? "is-selected" : ""}`}
                                  onClick={() => handleBankSelect(b)}
                                >
                                  <div className="payout-bank-dropdown-item-left">
                                    <BankLogo bankCode={b.code} bankName={b.name} size={26} />
                                    <span className="payout-bank-dropdown-item-name">{b.name}</span>
                                  </div>
                                  {isChosen && (
                                    <span className="material-symbols-outlined payout-bank-dropdown-check">
                                      check
                                    </span>
                                  )}
                                </button>
                              );
                            })}

                            {!showAllBanks ? (
                              <button
                                type="button"
                                className="payout-bank-dropdown-more-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowAllBanks(true);
                                }}
                              >
                                <span>Other banks</span>
                                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>expand_more</span>
                              </button>
                            ) : (
                              OTHER_BANKS.map((b) => {
                                const isChosen = selectedBank?.code === b.code;
                                return (
                                  <button
                                    key={b.code}
                                    type="button"
                                    className={`payout-bank-dropdown-item ${isChosen ? "is-selected" : ""}`}
                                    onClick={() => handleBankSelect(b)}
                                  >
                                    <div className="payout-bank-dropdown-item-left">
                                      <BankLogo bankCode={b.code} bankName={b.name} size={26} />
                                      <span className="payout-bank-dropdown-item-name">{b.name}</span>
                                    </div>
                                    {isChosen && (
                                      <span className="material-symbols-outlined payout-bank-dropdown-check">
                                        check
                                      </span>
                                    )}
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Small loading state right under the select Bank dropdown box */}
                    {isMatchingBank && (
                      <div className="payout-matching-bank-loading">
                        <span className="payout-spinner-sm"></span>
                        <span>Matching bank...</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 3. Small loading state when user chooses a bank matching name */}
              {isMatchingName && (
                <div className="payout-matching-bank-loading" style={{ marginTop: 2 }}>
                  <span className="payout-spinner-sm"></span>
                  <span>Matching account name...</span>
                </div>
              )}

              {/* 4. Full account details card rendered under the select bank dropdown */}
              {selectedBank && matchedAccountName && !isMatchingName && (
                <div className="payout-match-result-container">
                  <div className="payout-match-card">
                    <div className="payout-account-card-left">
                      <BankLogo bankCode={selectedBank.code} bankName={selectedBank.name} size={48} />
                      <div className="payout-account-details">
                        <span className="payout-account-bank-name">{selectedBank.name}</span>
                        <span className="payout-account-number-mono">{newAccountNumber}</span>
                        <span className="payout-account-holder">{matchedAccountName}</span>
                      </div>
                    </div>
                    <div className="payout-match-right-group">
                      <button
                        type="button"
                        className="payout-change-bank-btn"
                        onClick={() => {
                          setSelectedBank(null);
                          setMatchedAccountName("");
                          setIsBankDropdownOpen(true);
                        }}
                        title="Choose another bank"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="profile-modal-footer payout-single-footer">
              <div className="payout-set-default-wrap">
                <label className="payout-default-checkbox-label">
                  <input
                    type="checkbox"
                    checked={setAsDefaultNew}
                    onChange={(e) => setSetAsDefaultNew(e.target.checked)}
                    className="payout-default-checkbox"
                  />
                  <span className="payout-default-checkbox-text">
                    Set this as my default payout account
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="profile-btn profile-btn-primary payout-full-btn"
                disabled={newAccountNumber.length !== 10 || !selectedBank || !matchedAccountName || isMatchingName || isMatchingBank}
              >
                Save Payout Account
              </button>
            </div>
          </form>
        )}
    </ModalShell>
  );
}

// ── 3. Seller Verification Modal ──
export function VerifiedSellerModal({ isOpen, onClose, currentStatus, onVerified, dark, inline = false }) {
  const appearance = useModalAppearance(dark);
  const isDark = appearance === "dark";

  const [legalName, setLegalName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [idType, setIdType] = useState("National Identification Number (NIN)");
  const [idNumber, setIdNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(currentStatus === "verified" || currentStatus === "pending");

  useEffect(() => {
    if (isOpen) {
      setSubmitted(currentStatus === "verified" || currentStatus === "pending");
    }
  }, [isOpen, currentStatus]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      if (onVerified) onVerified("verified");
    }, 900);
  };

  return (
    <ModalShell inline={inline} appearance={appearance} onClose={onClose}>
        <div className="profile-modal-header">
          <div className="profile-modal-header-left">
            <div
              className="profile-modal-icon-badge verified"
              style={{
                backgroundColor: isDark ? "rgba(59, 130, 246, 0.22)" : "#e0ebf5",
                color: isDark ? "#60a5fa" : "#275b8a",
              }}
            >
              <span className="material-symbols-outlined">verified</span>
            </div>
            <div className="profile-modal-header-titles">
              <h2 className="profile-modal-title">Become a Verified Seller</h2>
            </div>
          </div>
          <button
            type="button"
            className="profile-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {submitted ? (
          <div className="profile-modal-body" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                backgroundColor: isDark ? "rgba(22, 163, 74, 0.22)" : "#dcf2e4",
                color: isDark ? "#4ade80" : "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 32 }}>
                check_circle
              </span>
            </div>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 18, fontWeight: 700 }}>
              Verification Approved!
            </h3>
            <p style={{ margin: "0 0 20px 0", fontSize: 13.5, color: "var(--muted)" }}>
              Your account is now a Verified Seller. Your profile badge and payment room trust indicators are active.
            </p>
            <button
              type="button"
              className="profile-btn profile-btn-primary"
              style={{ width: "100%" }}
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="profile-modal-body">
              <div className="profile-form-group">
                <label className="profile-form-label" htmlFor="verify-legal-name">
                  Legal Full Name
                </label>
                <div className="profile-input-wrap">
                  <input
                    id="verify-legal-name"
                    type="text"
                    required
                    className="profile-input-field"
                    placeholder="As shown on official ID"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                  />
                </div>
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label" htmlFor="verify-store-name">
                  Store or Brand Name
                </label>
                <div className="profile-input-wrap">
                  <input
                    id="verify-store-name"
                    type="text"
                    required
                    className="profile-input-field"
                    placeholder="e.g. Amaka Fashion Hub"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                  />
                </div>
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label" htmlFor="verify-id-type">
                  Identity Document Type
                </label>
                <select
                  id="verify-id-type"
                  className="profile-select-field"
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                >
                  <option value="National Identification Number (NIN)">
                    National Identification Number (NIN)
                  </option>
                  <option value="Voter's Card">Permanent Voter's Card (PVC)</option>
                  <option value="Driver's License">Driver's License</option>
                  <option value="International Passport">International Passport</option>
                </select>
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label" htmlFor="verify-id-number">
                  ID Number
                </label>
                <div className="profile-input-wrap">
                  <input
                    id="verify-id-number"
                    type="text"
                    required
                    className="profile-input-field"
                    placeholder="Enter 11-digit NIN or ID number"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="profile-modal-footer">
              <button
                type="button"
                className="profile-btn profile-btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="profile-btn profile-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Verification"}
              </button>
            </div>
          </form>
        )}
    </ModalShell>
  );
}

// ── 4. Statements & Reports Modal ──
export function StatementsModal({ isOpen, onClose, userEmail, onSend, dark, inline = false }) {
  const appearance = useModalAppearance(dark);
  const isDark = appearance === "dark";

  const [range, setRange] = useState("Last 30 Days");
  const [format, setFormat] = useState("PDF Document");
  const [email, setEmail] = useState(userEmail || "amaka.obi@gmail.com");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail(userEmail || "amaka.obi@gmail.com");
      setSent(false);
    }
  }, [isOpen, userEmail]);

  if (!isOpen) return null;

  const handleDownload = () => {
    setSent(true);
    if (onSend) onSend("Statement generated and sent to " + email);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <ModalShell
      inline={inline}
      appearance={appearance}
      onClose={onClose}
      cardClassName="statements-dialog-card"
    >
        <div className="profile-modal-header">
          <div className="profile-modal-header-left">
            <div
              className="profile-modal-icon-badge statements"
              style={{
                backgroundColor: isDark ? "rgba(20, 184, 166, 0.22)" : "#dcf4f2",
                color: isDark ? "#5eead4" : "#0f766e",
              }}
            >
              <span className="material-symbols-outlined">receipt_long</span>
            </div>
            <div className="profile-modal-header-titles">
              <h2 className="profile-modal-title">Statements & Reports</h2>
            </div>
          </div>
          <button
            type="button"
            className="profile-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        <div className="profile-modal-body">
          {sent ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 44, color: "#10b981", marginBottom: 8 }}
              >
                check_circle
              </span>
              <h3 style={{ margin: 0, fontSize: 16 }}>Statement Sent Successfully!</h3>
              <p style={{ margin: "6px 0 0 0", fontSize: 13, color: "var(--muted)" }}>
                Check your inbox at {email} for the report.
              </p>
            </div>
          ) : (
            <>
              <div className="profile-form-group">
                <label className="profile-form-label">
                  Time Period
                </label>
                <Select
                  value={range}
                  onValueChange={setRange}
                  className="profile-modal-select"
                  placeholder="Last 30 Days"
                >
                  <SelectContent>
                    <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
                    <SelectItem value="Last 90 Days">Last 90 Days</SelectItem>
                    <SelectItem value="This Year (2026)">This Year (2026)</SelectItem>
                    <SelectItem value="All Time">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label">
                  File Format
                </label>
                <Select
                  value={format}
                  onValueChange={setFormat}
                  className="profile-modal-select"
                  placeholder="PDF Document (.pdf)"
                >
                  <SelectContent>
                    <SelectItem value="PDF Document">PDF Document (.pdf)</SelectItem>
                    <SelectItem value="CSV / Excel Spreadsheet">CSV / Excel Spreadsheet (.csv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label" htmlFor="statement-email">
                  Send to Email
                </label>
                <div className="profile-input-wrap has-icon is-uneditable">
                  <span className="profile-input-icon">
                    <span className="material-symbols-outlined">mail</span>
                  </span>
                  <input
                    id="statement-email"
                    type="email"
                    className="profile-input-field"
                    value={email}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                    autoComplete="off"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {!sent && (
          <div className="profile-modal-footer">
            <button
              type="button"
              className="profile-btn profile-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="profile-btn profile-btn-primary"
              onClick={handleDownload}
            >
              Export Statement
            </button>
          </div>
        )}
    </ModalShell>
  );
}

// ── 5. Cashback & Referral Rewards Modal ──
export function RewardsModal({ isOpen, onClose, onCopy, dark, inline = false }) {
  const appearance = useModalAppearance(dark);
  const isDark = appearance === "dark";

  const [copied, setCopied] = useState(false);
  const referralCode = "PAYKUDI-AMAKA-82";

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(referralCode);
    setCopied(true);
    if (onCopy) onCopy("Referral code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ModalShell inline={inline} appearance={appearance} onClose={onClose}>
        <div className="profile-modal-header">
          <div className="profile-modal-header-left">
            <div
              className="profile-modal-icon-badge rewards"
              style={{
                backgroundColor: isDark ? "rgba(245, 158, 11, 0.22)" : "#fef0d9",
                color: isDark ? "#fcd34d" : "#b45309",
              }}
            >
              <span className="material-symbols-outlined">card_giftcard</span>
            </div>
            <div className="profile-modal-header-titles">
              <h2 className="profile-modal-title">Cashback & Rewards</h2>
            </div>
          </div>
          <button
            type="button"
            className="profile-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        <div className="profile-modal-body">
          <div className="rewards-stat-grid">
            <div className="rewards-stat-card">
              <span className="rewards-stat-label">Total Earned</span>
              <span className="rewards-stat-value">₦15,000</span>
            </div>
            <div className="rewards-stat-card">
              <span className="rewards-stat-label">Successful Referrals</span>
              <span className="rewards-stat-value">6 Users</span>
            </div>
          </div>

          <div className="profile-form-group">
            <label className="profile-form-label">Your Referral Code</label>
            <div className="rewards-copy-box">
              <span>{referralCode}</span>
              <button
                type="button"
                className="profile-btn profile-btn-secondary"
                style={{ height: 32, padding: "0 10px", fontSize: 12.5 }}
                onClick={handleCopyCode}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>

        <div className="profile-modal-footer">
          <button
            type="button"
            className="profile-btn profile-btn-primary"
            style={{ width: "100%" }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
    </ModalShell>
  );
}

// ── 6. Profile Toast ──
export function ProfileToast({ message, isVisible, dark }) {
  const appearance = useModalAppearance(dark);

  if (!isVisible || !message) return null;

  return createPortal(
    <div
      className="profile-toast-container"
      data-appearance={appearance}
      role="status"
      aria-live="polite"
    >
      <span className="material-symbols-outlined">check_circle</span>
      <span>{message}</span>
    </div>,
    document.body
  );
}

// ── 7. Seller Verification Step Modal (BVN, NIN, or Business Info) ──
export function SellerStepModal({ isOpen, onClose, step, onSave, dark, inline = false }) {
  const appearance = useModalAppearance(dark);
  const isDark = appearance === "dark";

  const [bvn, setBvn] = useState("");
  const [nin, setNin] = useState("");
  const [storeName, setStoreName] = useState("");
  const [category, setCategory] = useState("Fashion & Apparel");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      setBvn("");
      setNin("");
      setStoreName("");
    }
  }, [isOpen]);

  if (!isOpen || !step) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (step === "bvn") {
      if (bvn.trim().length !== 11) {
        setError("Please enter a valid 11-digit BVN.");
        return;
      }
      if (onSave) onSave("bvn", { bvn });
      onClose();
    } else if (step === "nin") {
      if (nin.trim().length !== 11) {
        setError("Please enter a valid 11-digit NIN.");
        return;
      }
      if (onSave) onSave("nin", { nin });
      onClose();
    } else if (step === "business") {
      if (!storeName.trim()) {
        setError("Please enter your store or brand name.");
        return;
      }
      if (onSave) onSave("business", { storeName, category });
      onClose();
    }
  };

  return (
    <ModalShell inline={inline} appearance={appearance} onClose={onClose}>
        <div className="profile-modal-header">
          <div className="profile-modal-header-left">
            <div
              className={`profile-modal-icon-badge ${step === "business" ? "business" : step === "nin" ? "nin" : "bvn"}`}
              style={{
                borderRadius: "10px",
                backgroundColor:
                  step === "business"
                    ? (isDark ? "rgba(34, 197, 94, 0.2)" : "#dcf2e4")
                    : (isDark ? "rgba(66, 126, 196, 0.22)" : "#dde6f0"),
                color:
                  step === "business"
                    ? (isDark ? "#86efac" : "#15803d")
                    : (isDark ? "#93c5fd" : "#2b496e"),
              }}
            >
              {step === "bvn" && <BvnIcon size={22} />}
              {step === "nin" && <NinIcon size={22} />}
              {step === "business" && (
                <span className="material-symbols-outlined" style={{ fontSize: 22, display: "inline-flex" }}>
                  storefront
                </span>
              )}
            </div>
            <div className="profile-modal-header-titles">
              <h2 className="profile-modal-title">
                {step === "bvn" ? "BVN Verification" : step === "nin" ? "NIN Verification" : "Business Info"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            className="profile-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="profile-modal-body">
            {error && (
              <div className="profile-form-error">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
                <span>{error}</span>
              </div>
            )}

            {step === "bvn" && (
              <div className="profile-form-group">
                <label className="profile-form-label" htmlFor="bvn-input">
                  Bank Verification Number (BVN)
                </label>
                <div className="profile-input-wrap">
                  <input
                    id="bvn-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    className="profile-input-field"
                    placeholder="Enter 11-digit BVN"
                    value={bvn}
                    onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {step === "nin" && (
              <div className="profile-form-group">
                <label className="profile-form-label" htmlFor="nin-input">
                  National Identity Number (NIN)
                </label>
                <div className="profile-input-wrap">
                  <input
                    id="nin-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    className="profile-input-field"
                    placeholder="Enter 11-digit NIN"
                    value={nin}
                    onChange={(e) => setNin(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {step === "business" && (
              <>
                <div className="profile-form-group">
                  <label className="profile-form-label" htmlFor="store-name-input">
                    Store or Brand Name
                  </label>
                  <div className="profile-input-wrap">
                    <input
                      id="store-name-input"
                      type="text"
                      className="profile-input-field"
                      placeholder="e.g. Amaka Fashion Hub"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label" htmlFor="category-input">
                    Business Category
                  </label>
                  <div className="profile-input-wrap">
                    <input
                      id="category-input"
                      type="text"
                      className="profile-input-field"
                      placeholder="e.g. Fashion & Apparel, Electronics, etc."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="profile-modal-footer">
            <button
              type="button"
              className="profile-btn profile-btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="profile-btn profile-btn-primary"
            >
              {step === "business" ? "Save Business Info" : "Verify Now"}
            </button>
          </div>
        </form>
    </ModalShell>
  );
}

export function PocketBalanceModal({
  isOpen,
  onClose,
  currentBalanceKobo = 0,
  onSave,
  dark,
  inline = false,
}) {
  const appearance = useModalAppearance(dark);
  const [balanceNairaInput, setBalanceNairaInput] = useState(() => (currentBalanceKobo / 100).toString());
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setBalanceNairaInput((currentBalanceKobo / 100).toString());
      setError("");
    }
  }, [isOpen, currentBalanceKobo]);

  if (!isOpen) return null;

  const parsedNaira = parseFloat(balanceNairaInput) || 0;
  const computedKobo = Math.round(parsedNaira * 100);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (isNaN(parsedNaira) || parsedNaira < 0) {
      setError("Please enter a valid positive balance amount.");
      return;
    }
    onSave?.(computedKobo);
    onClose();
  };

  const handleQuickAdd = (amountNaira) => {
    const nextNaira = Math.max(0, parsedNaira + amountNaira);
    setBalanceNairaInput(nextNaira.toString());
  };

  return (
    <ModalShell
      inline={inline}
      appearance={appearance}
      onClose={onClose}
      cardClassName="edit-balance-modal"
      labelledBy="edit-pocket-balance-title"
    >
      <div className="profile-modal-header">
        <div className="profile-modal-header-left">
          <div
            className="profile-modal-icon-badge"
            style={{
              backgroundColor: appearance === "dark" ? "rgba(16, 185, 129, 0.22)" : "#d1fae5",
              color: appearance === "dark" ? "#34d399" : "#059669",
            }}
          >
            <span className="material-symbols-outlined">account_balance_wallet</span>
          </div>
          <div className="profile-modal-header-titles">
            <h2 id="edit-pocket-balance-title" className="profile-modal-title">
              Available Pocket Balance
            </h2>
            <p className="profile-modal-subtitle">
              Basic unit: <strong>kobo</strong> (1 NGN = 100 kobo)
            </p>
          </div>
        </div>
        <button
          type="button"
          className="profile-modal-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            close
          </span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="profile-modal-form">
        <div className="profile-modal-body">
          {error && <div className="profile-form-error">{error}</div>}

          {/* Current balance card overview */}
          <div
            style={{
              background: appearance === "dark" ? "#1e2025" : "#f8fafc",
              border: `1px solid ${appearance === "dark" ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                Current Pocket Balance
              </div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: appearance === "dark" ? "#ffffff" : "#0f172a", marginTop: "2px" }}>
                ₦{((currentBalanceKobo || 0) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>
                Basic Unit Value
              </div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#10b981", marginTop: "4px" }}>
                {(currentBalanceKobo || 0).toLocaleString()} kobo
              </div>
            </div>
          </div>

          <div className="profile-form-group">
            <label className="profile-form-label" htmlFor="pocket-balance-input">
              Update Available Balance (NGN)
            </label>
            <div className="profile-input-wrap">
              <span style={{ position: "absolute", left: "14px", fontWeight: 600, color: "#64748b", zIndex: 1 }}>
                ₦
              </span>
              <input
                id="pocket-balance-input"
                type="number"
                step="any"
                min="0"
                className="profile-input-field"
                style={{ paddingLeft: "32px" }}
                placeholder="0.00"
                value={balanceNairaInput}
                onChange={(e) => setBalanceNairaInput(e.target.value)}
              />
            </div>
            <p className="profile-input-help" style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
              <span>Equivalent in basic unit:</span>
              <strong style={{ color: "#10b981" }}>{computedKobo.toLocaleString()} kobo</strong>
            </p>
          </div>

          {/* Quick preset buttons */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
            <button
              type="button"
              className="profile-btn profile-btn-secondary"
              style={{ fontSize: "12px", padding: "6px 10px", height: "auto" }}
              onClick={() => handleQuickAdd(50000)}
            >
              +₦50,000
            </button>
            <button
              type="button"
              className="profile-btn profile-btn-secondary"
              style={{ fontSize: "12px", padding: "6px 10px", height: "auto" }}
              onClick={() => handleQuickAdd(100000)}
            >
              +₦100,000
            </button>
            <button
              type="button"
              className="profile-btn profile-btn-secondary"
              style={{ fontSize: "12px", padding: "6px 10px", height: "auto" }}
              onClick={() => handleQuickAdd(500000)}
            >
              +₦500,000
            </button>
            <button
              type="button"
              className="profile-btn profile-btn-secondary"
              style={{ fontSize: "12px", padding: "6px 10px", height: "auto" }}
              onClick={() => setBalanceNairaInput("0")}
            >
              Reset to ₦0
            </button>
          </div>
        </div>

        <div className="profile-modal-footer">
          <button
            type="button"
            className="profile-btn profile-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="profile-btn profile-btn-primary"
          >
            Save Balance
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

