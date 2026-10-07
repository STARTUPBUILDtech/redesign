import { useState, useEffect } from "react";
import "../styles/desktop-profile.css";
import "../styles/desktop-payment-room.css";
import {
  EditFieldModal,
  PayoutAccountModal,
  VerifiedSellerModal,
  StatementsModal,
  RewardsModal,
  ProfileToast,
  SellerStepModal,
  BvnIcon,
  NinIcon,
  useModalAppearance,
  WhatsAppIcon,
} from "./Shared/ProfileModals.jsx";
import {
  DEFAULT_POCKET_BALANCE_KOBO,
} from "../utils/balanceUtils.js";

function NormalCursorIcon() {
  return (
    <svg
      width="20"
      height="22"
      viewBox="0 0 24 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="pk-empty-cursor"
    >
      <path
        d="M3 2v19l5.3-4.8 3.5 8 3.2-1.4-3.5-7.9 6.5.1L3 2z"
        fill="#FFFFFF"
        stroke="#1F2937"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * @param {"stacked" | "split"} layout
 *   - "stacked" (default): original two-column page with popup modals (used on mobile)
 *   - "split": desktop split-pane — list on the left, selected panel opens on the right
 *     (mirrors Desktop Payment Room and Desktop Help & Support)
 */
export default function DesktopProfile({
  userName = "Amaka",
  phoneNumber = "+234 803 200 1585",
  onEditProfile,
  onSignOut = () => {},
  dark,
  layout = "stacked",
}) {
  const isSplit = layout === "split";
  const appearance = useModalAppearance(dark);

  const isPhoneStr = (v) => typeof v === "string" && (v.startsWith("+") || /^\d[\d\s-]{6,}$/.test(v));
  const cleanDisplayName = (val) => {
    if (!val || isPhoneStr(val) || val === "Amaka") {
      return (userName && !isPhoneStr(userName) && userName !== "Amaka") ? userName : "Howard Ukah-Columba";
    }
    return val;
  };

  const isGenericBankAccount = (bank, accountNumber, accountName) => {
    const genericNumbers = [
      "2345678900",
      "1234567653",
      "0234567891",
      "0123456789",
      "2001948291",
    ];
    const num = String(accountNumber || "").trim();
    const name = String(accountName || "").toLowerCase();
    const b = String(bank || "").toLowerCase();
    if (!num || !bank) return true;
    if (genericNumbers.includes(num)) return true;
    if (name.includes("amaka")) return true;
    if (b.includes("kuda") && num === "2001948291") return true;
    return false;
  };

  // Initialize state with stored details or fallbacks
  const [profileData, setProfileData] = useState(() => {
    try {
      const stored = localStorage.getItem("paykudi_user_profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        const isGeneric = isGenericBankAccount(parsed.bank, parsed.accountNumber, parsed.accountName);
        if (isGeneric && (parsed.bank || parsed.accountNumber)) {
          try {
            localStorage.setItem(
              "paykudi_user_profile",
              JSON.stringify({ ...parsed, bank: "", accountNumber: "" })
            );
          } catch {}
        }
        return {
          id: parsed.id || "",
          name: cleanDisplayName(parsed.name),
          address: parsed.address || "",
          phone: parsed.phone || (phoneNumber !== "No phone number" ? phoneNumber : "+234 803 200 1585"),
          email: parsed.email || "",
          isVerified: parsed.isVerified || false,
          verificationStatus: parsed.verificationStatus || "unverified",
          bank: isGeneric ? "" : (parsed.bank || ""),
          accountNumber: isGeneric ? "" : (parsed.accountNumber || ""),
          accountName: parsed.accountName || "Howard Ukah-Columba",
          pocket_balance_kobo: parsed.pocket_balance_kobo !== undefined ? Number(parsed.pocket_balance_kobo) : DEFAULT_POCKET_BALANCE_KOBO,
        };
      }
    } catch (e) {
      // Local storage fallback
    }
    return {
      id: "",
      name: cleanDisplayName(userName),
      address: "",
      phone: phoneNumber !== "No phone number" ? phoneNumber : "+234 803 200 1585",
      email: "",
      isVerified: false,
      verificationStatus: "unverified",
      bank: "",
      accountNumber: "",
      accountName: "Howard Ukah-Columba",
      pocket_balance_kobo: DEFAULT_POCKET_BALANCE_KOBO,
    };
  });

  // Modal / panel display state:
  // null | 'email' | 'name' | 'address' | 'phone' | 'profile' | 'payout' | 'verification' | 'seller' | 'statements' | 'rewards'
  // In "stacked" layout this drives popup modals; in "split" layout it drives the right pane.
  const [activeModal, setActiveModal] = useState(null);

  // Seller verification dropdown and steps
  const [isSellerExpanded, setIsSellerExpanded] = useState(false);
  const [activeSellerStep, setActiveSellerStep] = useState(null);
  const [sellerSteps, setSellerSteps] = useState(() => {
    try {
      const saved = localStorage.getItem("paykudi_seller_steps");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      bvn: false,
      nin: false,
      business: false,
    };
  });

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState("");
  const [isToastVisible, setIsToastVisible] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Clean WhatsApp number to serve as clean PayKudi ID without leading zero
  const cleanId = (val) => {
    if (!val) return "8032007872";
    let digits = String(val).replace(/\D/g, "");
    if (!digits) return "8032007872";
    if (digits.startsWith("234")) {
      digits = digits.slice(3);
    }
    digits = digits.replace(/^0+/, "");
    return digits || "8032007872";
  };

  const userAccountId = cleanId(profileData.phone);

  const handleCopyId = (e) => {
    if (e) e.stopPropagation();
    try {
      navigator.clipboard?.writeText(userAccountId);
      setCopiedId(true);
      showToast("Copied ID: " + userAccountId);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      setCopiedId(true);
      showToast("Copied ID: " + userAccountId);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Immediate purge of any lingering generic bank accounts on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("paykudi_user_profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (isGenericBankAccount(parsed.bank, parsed.accountNumber, parsed.accountName)) {
          if (parsed.bank || parsed.accountNumber) {
            localStorage.setItem(
              "paykudi_user_profile",
              JSON.stringify({ ...parsed, bank: "", accountNumber: "" })
            );
          }
          setProfileData((prev) => ({
            ...prev,
            bank: "",
            accountNumber: "",
          }));
        }
      }
      const savedAccs = localStorage.getItem("paykudi_payout_accounts");
      if (savedAccs) {
        const parsedAccs = JSON.parse(savedAccs);
        if (Array.isArray(parsedAccs)) {
          const cleanAccs = parsedAccs.filter(
            (a) => !isGenericBankAccount(a.bank, a.accountNumber, a.accountName)
          );
          if (cleanAccs.length !== parsedAccs.length) {
            localStorage.setItem("paykudi_payout_accounts", JSON.stringify(cleanAccs));
          }
        }
      }
    } catch (_) {}
  }, []);

  // Sync profile if updated elsewhere
  useEffect(() => {
    const syncProfile = () => {
      try {
        const stored = localStorage.getItem("paykudi_user_profile");
        if (stored) {
          const parsed = JSON.parse(stored);
          const isGeneric = isGenericBankAccount(parsed.bank, parsed.accountNumber, parsed.accountName);
          setProfileData((prev) => ({
            ...prev,
            id: parsed.id || prev.id || "",
            name: cleanDisplayName(parsed.name) || prev.name,
            phone: parsed.phone ? cleanId(parsed.phone) : prev.phone,
            email: parsed.email || prev.email,
            address: parsed.address || prev.address,
            bank: isGeneric ? "" : (parsed.bank ?? prev.bank),
            accountNumber: isGeneric ? "" : (parsed.accountNumber ?? prev.accountNumber),
            pocket_balance_kobo: parsed.pocket_balance_kobo !== undefined ? Number(parsed.pocket_balance_kobo) : prev.pocket_balance_kobo,
          }));
        }
      } catch (_) {}
    };

    window.addEventListener("paykudi_profile_updated", syncProfile);
    window.addEventListener("storage", syncProfile);
    return () => {
      window.removeEventListener("paykudi_profile_updated", syncProfile);
      window.removeEventListener("storage", syncProfile);
    };
  }, []);

  useEffect(() => {
    if (isSplit) window.scrollTo({ top: 0, behavior: "instant" });
  }, [isSplit]);

  const showToast = (message) => {
    setToastMessage(message);
    setIsToastVisible(true);
    setTimeout(() => {
      setIsToastVisible(false);
    }, 2800);
  };

  // Helper to persist updates
  const updateProfile = (updates, message = "Details updated successfully") => {
    setProfileData((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem("paykudi_user_profile", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    showToast(message);
  };

  const handleEditClick = (field) => {
    setActiveSellerStep(null);
    setActiveModal(field);
  };

  const closePanel = () => {
    setActiveSellerStep(null);
    setActiveModal(null);
  };

  const handleSaveSellerStep = (step, data) => {
    setSellerSteps((prev) => {
      const next = { ...prev, [step]: true, ...data };
      try {
        localStorage.setItem("paykudi_seller_steps", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    showToast(
      step === "bvn"
        ? "BVN verified successfully"
        : step === "nin"
        ? "NIN verified successfully"
        : "Business details saved"
    );
  };

  const handleFinalSubmitVerification = () => {
    if (profileData.isVerified) {
      showToast("Your seller verification is already approved!");
      return;
    }
    const nextSteps = { ...sellerSteps, bvn: true, nin: true, business: true };
    setSellerSteps(nextSteps);
    try {
      localStorage.setItem("paykudi_seller_steps", JSON.stringify(nextSteps));
    } catch (e) {}
    updateProfile(
      { isVerified: true, verificationStatus: "verified" },
      "Congratulations! Seller verification submitted and approved"
    );
  };

  const handleFieldSave = async (updates) => {
    let msg = "Details updated successfully";
    if (updates.email) {
      msg = "Email address bound to account successfully";
      try {
        let csrfCookie = document.cookie
          .split("; ")
          .find((row) => row.startsWith("paykudi_csrf_token="))
          ?.split("=")[1];

        if (!csrfCookie) {
          try {
            await fetch("http://localhost:8000/auth/csrf", { credentials: "include" });
            csrfCookie = document.cookie
              .split("; ")
              .find((row) => row.startsWith("paykudi_csrf_token="))
              ?.split("=")[1];
          } catch (_) {}
        }

        const res = await fetch("http://localhost:8000/auth/bind-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrfCookie ? { "x-csrf-token": csrfCookie } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            email: updates.email,
            user_id: profileData.id || undefined,
            phone: profileData.phone || undefined,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.user?.id) {
            updates.id = data.user.id;
          }
          msg = "Email bound successfully! You can now log in using this email.";
        } else {
          const errData = await res.json().catch(() => ({}));
          if (errData.detail) {
            msg = errData.detail;
          }
        }
      } catch (err) {
        console.warn("[Profile] Backend bind-email error:", err);
      }
    } else if (updates.address) {
      msg = "Address updated successfully";
    }

    updateProfile(updates, msg);
    window.dispatchEvent(new Event("paykudi_profile_updated"));
  };

  /* ── Shared render helpers ── */

  const renderAvatar = () => (
    <div className="desktop-profile-avatar-wrap">
      <div
        className="desktop-profile-avatar-circle"
        style={{ cursor: "pointer" }}
        onClick={() => handleEditClick("profile")}
        title="Click to edit profile"
      >
        <span className="material-symbols-outlined desktop-profile-avatar-icon">
          account_circle
        </span>
      </div>
      <button
        id="profile-avatar-edit-btn"
        type="button"
        className="desktop-profile-avatar-edit"
        onClick={() => {
          if (onEditProfile) {
            onEditProfile();
          } else {
            handleEditClick("profile");
          }
        }}
        aria-label="Edit profile picture"
        title="Edit avatar and profile"
      >
        <span className="material-symbols-outlined">edit</span>
      </button>
    </div>
  );

  const renderUserInfo = () => (
    <div className="desktop-profile-info">
      <h1 className="desktop-profile-name">{profileData.name}</h1>
      <div
        className="desktop-profile-id-pill"
        onClick={handleCopyId}
        title="Click to copy ID"
        role="button"
        tabIndex={0}
      >
        <span className="desktop-profile-id-label">ID:</span>
        <span className="desktop-profile-id-number">{userAccountId}</span>
        <button
          type="button"
          onClick={handleCopyId}
          className="desktop-profile-id-copy-btn"
          title={copiedId ? "Copied!" : "Copy PayKudi ID"}
          aria-label="Copy PayKudi ID"
        >
          <span className="material-symbols-outlined desktop-profile-id-copy-icon">
            {copiedId ? "check" : "content_copy"}
          </span>
        </button>
      </div>
    </div>
  );

  // Generic list row. Readonly rows render as a div; actionable rows as a button.
  const renderRow = ({
    id,
    badgeClass,
    badgeContent,
    title,
    subtitle,
    ariaLabel,
    onClick,
    readonly = false,
    noBorder = false,
    selected = false,
    chevron = "chevron_right",
    chevronClass = "",
    expanded,
    titleTooltip,
  }) => {
    const inner = (
      <>
        <div className={`desktop-profile-badge ${badgeClass}`}>{badgeContent}</div>
        <div className={`desktop-profile-item-inner ${noBorder ? "no-border" : ""}`}>
          <div className="desktop-profile-item-text">
            <span className="desktop-profile-item-title">{title}</span>
            <span className="desktop-profile-item-subtitle">{subtitle}</span>
          </div>
          {!readonly && (
            <span className={`material-symbols-outlined desktop-profile-item-chevron ${chevronClass}`}>
              {chevron}
            </span>
          )}
        </div>
      </>
    );

    if (readonly) {
      return (
        <div id={id} className="desktop-profile-item readonly" aria-label={ariaLabel}>
          {inner}
        </div>
      );
    }

    return (
      <button
        id={id}
        type="button"
        className={`desktop-profile-item ${selected ? "selected" : ""} ${expanded ? "is-expanded" : ""}`}
        aria-label={ariaLabel}
        onClick={onClick}
        title={titleTooltip}
        aria-pressed={isSplit ? selected : undefined}
        aria-expanded={expanded}
      >
        {inner}
      </button>
    );
  };

  const sellerTitle = (
    <>
      <span>Become a Verified Seller</span>
      {profileData.isVerified ? (
        <span className="desktop-profile-unverified-tag" style={{ color: "#10b981", fontWeight: 700 }}>
          (Verified)
        </span>
      ) : (
        <span className="desktop-profile-unverified-tag">(Unverified)</span>
      )}
    </>
  );

  const sellerSubtitle = profileData.isVerified
    ? "Verification approved. Enjoy Verified Seller escrow benefits."
    : "Complete verification to enjoy Verified Seller benefits.";

  // BVN / NIN / Business step cards + submit CTA (used by accordion and right panel)
  const renderSellerSteps = () => (
    <>
      {/* Card 1: BVN */}
      <div className="seller-sub-card">
        <div className="seller-sub-card-left">
          <div className="seller-sub-card-badge bvn">
            <BvnIcon size={20} />
          </div>
          <div className="seller-sub-card-info">
            <span className="seller-sub-card-title">BVN Verification</span>
            <span className="seller-sub-card-sub">Bank Verification Number</span>
          </div>
        </div>
        <button
          id="seller-step-bvn-btn"
          type="button"
          className={`seller-sub-card-btn ${sellerSteps.bvn ? "is-done" : ""}`}
          onClick={() => setActiveSellerStep("bvn")}
          title={sellerSteps.bvn ? "BVN Verified" : "Verify BVN"}
          aria-label={sellerSteps.bvn ? "BVN Verified" : "Verify BVN"}
        >
          {sellerSteps.bvn ? (
            <span className="material-symbols-outlined seller-verified-tick-icon">verified</span>
          ) : (
            "Verify BVN"
          )}
        </button>
      </div>

      {/* Card 2: NIN */}
      <div className="seller-sub-card">
        <div className="seller-sub-card-left">
          <div className="seller-sub-card-badge nin">
            <NinIcon size={20} />
          </div>
          <div className="seller-sub-card-info">
            <span className="seller-sub-card-title">NIN Verification</span>
            <span className="seller-sub-card-sub">National Identity Number</span>
          </div>
        </div>
        <button
          id="seller-step-nin-btn"
          type="button"
          className={`seller-sub-card-btn ${sellerSteps.nin ? "is-done" : ""}`}
          onClick={() => setActiveSellerStep("nin")}
          title={sellerSteps.nin ? "NIN Verified" : "Verify NIN"}
          aria-label={sellerSteps.nin ? "NIN Verified" : "Verify NIN"}
        >
          {sellerSteps.nin ? (
            <span className="material-symbols-outlined seller-verified-tick-icon">verified</span>
          ) : (
            "Verify NIN"
          )}
        </button>
      </div>

      {/* Card 3: Business Info */}
      <div className="seller-sub-card">
        <div className="seller-sub-card-left">
          <div className="seller-sub-card-badge business">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              storefront
            </span>
          </div>
          <div className="seller-sub-card-info">
            <span className="seller-sub-card-title">Business Info</span>
            <span className="seller-sub-card-sub">Store Name &amp; Category</span>
          </div>
        </div>
        <button
          id="seller-step-business-btn"
          type="button"
          className={`seller-sub-card-btn ${sellerSteps.business ? "is-done" : ""}`}
          onClick={() => setActiveSellerStep("business")}
          title={sellerSteps.business ? "Business Info Added" : "Add Business"}
          aria-label={sellerSteps.business ? "Business Info Added" : "Add Business"}
        >
          {sellerSteps.business ? (
            <span className="material-symbols-outlined seller-verified-tick-icon">verified</span>
          ) : (
            "Add Business"
          )}
        </button>
      </div>

      {/* Bottom CTA Submit Button */}
      <button
        id="seller-verify-submit-btn"
        type="button"
        className="seller-verify-submit-btn"
        onClick={handleFinalSubmitVerification}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
          verified
        </span>
        <span>Submit Seller Verification</span>
      </button>
    </>
  );

  /* ── Personal Details rows ── */
  const renderPersonalRows = () => (
    <>
      {renderRow({
        id: "profile-row-name",
        badgeClass: "user",
        badgeContent: <span className="material-symbols-outlined">person</span>,
        title: profileData.name,
        subtitle: "Account Name",
        ariaLabel: `Account Name: ${profileData.name}`,
        readonly: true,
      })}
      {renderRow({
        id: "profile-row-address",
        badgeClass: "address",
        badgeContent: <span className="material-symbols-outlined">location_on</span>,
        title: profileData.address || "Add your address",
        subtitle: "Address",
        ariaLabel: `Address: ${profileData.address || "Add your address"}. Tap to edit.`,
        onClick: () => handleEditClick("address"),
        selected: isSplit && activeModal === "address",
        titleTooltip: "Click to edit address",
      })}
      {renderRow({
        id: "profile-row-phone",
        badgeClass: "whatsapp",
        badgeContent: <WhatsAppIcon size={16} />,
        title: userAccountId,
        subtitle: "Phone Number",
        ariaLabel: `Phone Number: ${userAccountId}`,
        readonly: true,
      })}
      {renderRow({
        id: "profile-row-email",
        badgeClass: "email",
        badgeContent: <span className="material-symbols-outlined">mail</span>,
        title: profileData.email || "Bind your email",
        subtitle: profileData.email
          ? "Email Address · Bound (Login enabled)"
          : "Email Address · Link to enable email login",
        ariaLabel: `Email Address: ${profileData.email || "Bind your email"}. Tap to edit.`,
        onClick: () => handleEditClick("email"),
        noBorder: true,
        selected: isSplit && activeModal === "email",
        titleTooltip: "Click to bind or edit email address",
      })}
    </>
  );

  /* ── Services & Settings rows ── */
  const renderPayoutRow = () =>
    renderRow({
      id: "profile-row-payout",
      badgeClass: "payout",
      badgeContent: <span className="material-symbols-outlined">account_balance</span>,
      title: "Payout Accounts",
      subtitle:
        profileData.bank && profileData.accountNumber
          ? `${profileData.bank} · ${profileData.accountNumber}`
          : "Add bank account for payouts",
      ariaLabel: "Payout Accounts: Tap to manage bank account.",
      onClick: () => handleEditClick("payout"),
      selected: isSplit && activeModal === "payout",
      titleTooltip: "Click to manage payout accounts",
    });

  const renderStatementsRow = () =>
    renderRow({
      id: "profile-row-statements",
      badgeClass: "statements",
      badgeContent: <span className="material-symbols-outlined">receipt_long</span>,
      title: "Statements & Reports",
      subtitle: "Get a statement and report for your activities and orders.",
      ariaLabel: "Statements & Reports: Tap to generate statement.",
      onClick: () => handleEditClick("statements"),
      selected: isSplit && activeModal === "statements",
      titleTooltip: "Click to generate statements and reports",
    });

  const renderRewardsRow = () =>
    renderRow({
      id: "profile-row-rewards",
      badgeClass: "rewards",
      badgeContent: <span className="material-symbols-outlined">card_giftcard</span>,
      title: "Cashback & Referral Rewards",
      subtitle: "See how much you've earned from referrals.",
      ariaLabel: "Cashback & Referral Rewards: Tap to view earnings.",
      onClick: () => handleEditClick("rewards"),
      noBorder: true,
      selected: isSplit && activeModal === "rewards",
      titleTooltip: "Click to view cashback and rewards",
    });

  /* ══════════════════════════════════════════════════════════════
     SPLIT LAYOUT (Desktop): list on left, opening panel on right
     ══════════════════════════════════════════════════════════════ */
  if (isSplit) {
    const renderDetail = () => {
      if (activeModal === "address" || activeModal === "email" || activeModal === "profile") {
        return (
          <EditFieldModal
            key={activeModal}
            inline
            isOpen
            fieldType={activeModal}
            currentData={profileData}
            dark={dark}
            onClose={closePanel}
            onSave={handleFieldSave}
          />
        );
      }
      if (activeModal === "payout") {
        return (
          <PayoutAccountModal
            key="payout"
            inline
            isOpen
            currentData={profileData}
            dark={dark}
            onClose={closePanel}
            onSave={(payoutUpdates) =>
              updateProfile(payoutUpdates, "Payout bank account updated successfully")
            }
          />
        );
      }
      if (activeModal === "seller") {
        if (activeSellerStep) {
          return (
            <SellerStepModal
              key={`seller-${activeSellerStep}`}
              inline
              isOpen
              step={activeSellerStep}
              dark={dark}
              onClose={() => setActiveSellerStep(null)}
              onSave={handleSaveSellerStep}
            />
          );
        }
        return (
          <div className="profile-modal-inline" data-appearance={appearance} key="seller">
            <div className="profile-modal-card is-inline" data-appearance={appearance}>
              <div className="profile-modal-header">
                <div className="profile-modal-header-left">
                  <div className="profile-modal-icon-badge desktop-profile-badge verified">
                    <span className="material-symbols-outlined">verified</span>
                  </div>
                  <div className="profile-modal-header-titles">
                    <h2 className="profile-modal-title">Become a Verified Seller</h2>
                  </div>
                </div>
                <button
                  type="button"
                  className="profile-modal-close-btn"
                  onClick={closePanel}
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    close
                  </span>
                </button>
              </div>
              <div className="profile-modal-body desktop-profile-seller-panel">
                <p className="desktop-profile-seller-panel-intro">{sellerSubtitle}</p>
                <div className="desktop-profile-seller-panel-steps">{renderSellerSteps()}</div>
              </div>
            </div>
          </div>
        );
      }
      if (activeModal === "statements") {
        return (
          <StatementsModal
            key="statements"
            inline
            isOpen
            userEmail={profileData.email}
            dark={dark}
            onClose={closePanel}
            onSend={(msg) => showToast(msg)}
          />
        );
      }
      if (activeModal === "rewards") {
        return (
          <RewardsModal
            key="rewards"
            inline
            isOpen
            dark={dark}
            onClose={closePanel}
            onCopy={(msg) => showToast(msg)}
          />
        );
      }
      return (
        <div className="desktop-pr-empty-detail desktop-profile-empty-state">
          <div className="pk-empty-selection-graphic" aria-hidden="true">
            {/* Circular background disk behind the cards - top card extends outside it */}
            <div className="pk-empty-circle-disk" />

            <div className="pk-empty-circle-canvas">
              {/* Animated normal cursor that moves from the top of the list down to the card */}
              <div className="pk-empty-animated-cursor">
                <NormalCursorIcon />
              </div>

              {/* Vertically scrolling card stream */}
              <div className="pk-empty-cards-stack pk-empty-cards-scroller">
                {/* Card 0 */}
                <div className="pk-empty-card">
                  <div className="pk-empty-route-marker">
                    <span className="pk-empty-dot" />
                    <span className="pk-empty-line" />
                    <span className="pk-empty-dot" />
                  </div>
                  <div className="pk-empty-skeleton">
                    <span className="pk-empty-skel-bar skel-short" />
                    <span className="pk-empty-skel-bar skel-long" />
                  </div>
                </div>

                {/* Card 1 (Target 1 - highlighted when cursor is at top) */}
                <div
                  className="pk-empty-card pk-empty-card-target-1"
                  onClick={() => openModal("payout")}
                  role="button"
                  tabIndex={0}
                  title="Select a profile option"
                >
                  <div className="pk-empty-route-marker">
                    <span className="pk-empty-dot" />
                    <span className="pk-empty-line" />
                    <span className="pk-empty-dot" />
                  </div>
                  <div className="pk-empty-skeleton">
                    <span className="pk-empty-skel-bar skel-short" />
                    <span className="pk-empty-skel-bar skel-long" />
                  </div>
                </div>

                {/* Card 2 (Target 2 - highlighted when cursor is on center) */}
                <div
                  className="pk-empty-card pk-empty-card-target-2"
                  onClick={() => openModal("seller")}
                  role="button"
                  tabIndex={0}
                  title="Select a profile option"
                >
                  <div className="pk-empty-route-marker">
                    <span className="pk-empty-dot" />
                    <span className="pk-empty-line" />
                    <span className="pk-empty-dot" />
                  </div>
                  <div className="pk-empty-skeleton">
                    <span className="pk-empty-skel-bar skel-short" />
                    <span className="pk-empty-skel-bar skel-long" />
                  </div>
                </div>

                {/* Card 3 */}
                <div className="pk-empty-card">
                  <div className="pk-empty-route-marker">
                    <span className="pk-empty-dot" />
                    <span className="pk-empty-line" />
                    <span className="pk-empty-dot" />
                  </div>
                  <div className="pk-empty-skeleton">
                    <span className="pk-empty-skel-bar skel-short" />
                    <span className="pk-empty-skel-bar skel-long" />
                  </div>
                </div>

                {/* Card 4 */}
                <div className="pk-empty-card">
                  <div className="pk-empty-route-marker">
                    <span className="pk-empty-dot" />
                    <span className="pk-empty-line" />
                    <span className="pk-empty-dot" />
                  </div>
                  <div className="pk-empty-skeleton">
                    <span className="pk-empty-skel-bar skel-short" />
                    <span className="pk-empty-skel-bar skel-long" />
                  </div>
                </div>

                {/* Card 5 */}
                <div className="pk-empty-card">
                  <div className="pk-empty-route-marker">
                    <span className="pk-empty-dot" />
                    <span className="pk-empty-line" />
                    <span className="pk-empty-dot" />
                  </div>
                  <div className="pk-empty-skeleton">
                    <span className="pk-empty-skel-bar skel-short" />
                    <span className="pk-empty-skel-bar skel-long" />
                  </div>
                </div>

                {/* Card 6 (Regular unselected card) */}
                <div className="pk-empty-card">
                  <div className="pk-empty-route-marker">
                    <span className="pk-empty-dot" />
                    <span className="pk-empty-line" />
                    <span className="pk-empty-dot" />
                  </div>
                  <div className="pk-empty-skeleton">
                    <span className="pk-empty-skel-bar skel-short" />
                    <span className="pk-empty-skel-bar skel-long" />
                  </div>
                </div>

                {/* Card 7 */}
                <div className="pk-empty-card">
                  <div className="pk-empty-route-marker">
                    <span className="pk-empty-dot" />
                    <span className="pk-empty-line" />
                    <span className="pk-empty-dot" />
                  </div>
                  <div className="pk-empty-skeleton">
                    <span className="pk-empty-skel-bar skel-short" />
                    <span className="pk-empty-skel-bar skel-long" />
                  </div>
                </div>

                {/* Card 8 */}
                <div className="pk-empty-card">
                  <div className="pk-empty-route-marker">
                    <span className="pk-empty-dot" />
                    <span className="pk-empty-line" />
                    <span className="pk-empty-dot" />
                  </div>
                  <div className="pk-empty-skeleton">
                    <span className="pk-empty-skel-bar skel-short" />
                    <span className="pk-empty-skel-bar skel-long" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <h3 className="desktop-profile-empty-title">No profile option selected</h3>
          <p className="desktop-profile-empty-subtitle">
            Please select an option to display details.
          </p>
        </div>
      );
    };

    return (
      <div
        className="desktop-payment-room-wrapper desktop-profile-split-wrapper"
        data-appearance={appearance}
      >
        <main id="profile-section" className="desktop-payment-room-main">
          <div className="desktop-pr-split-layout">
            {/* ── LEFT PANE: PROFILE LIST ── */}
            <aside
              className="desktop-pr-left-pane desktop-profile-left-pane"
              aria-label="Profile settings list"
            >
              <div className="desktop-profile-left-scroll">
                <section className="desktop-profile-header desktop-profile-left-header">
                  <div
                    className={`desktop-profile-user-info-row ${
                      activeModal === "profile" ? "is-selected" : ""
                    }`}
                  >
                    {renderAvatar()}
                    {renderUserInfo()}
                  </div>
                </section>

                <div className="desktop-profile-left-group">
                  <h2 className="desktop-profile-section-title">PERSONAL DETAILS</h2>
                  <div className="desktop-profile-list">{renderPersonalRows()}</div>
                </div>

                <div className="desktop-profile-left-group">
                  <h2 className="desktop-profile-section-title">SERVICES &amp; SETTINGS</h2>
                  <div className="desktop-profile-list">
                    {renderPayoutRow()}
                    {renderRow({
                      id: "profile-row-seller",
                      badgeClass: "verified",
                      badgeContent: <span className="material-symbols-outlined">verified</span>,
                      title: sellerTitle,
                      subtitle: sellerSubtitle,
                      ariaLabel: "Become a Verified Seller: Tap to complete verification.",
                      onClick: () => handleEditClick("seller"),
                      selected: activeModal === "seller",
                      titleTooltip: "Click to open seller verification",
                    })}
                    {renderStatementsRow()}
                    {renderRewardsRow()}
                  </div>
                </div>
              </div>
            </aside>

            {/* ── RIGHT PANE: SELECTED PANEL ── */}
            <section
              className="desktop-pr-right-pane desktop-profile-right-pane"
              aria-label="Profile detail view"
            >
              {renderDetail()}
            </section>
          </div>
        </main>

        <ProfileToast message={toastMessage} isVisible={isToastVisible} dark={dark} />
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     STACKED LAYOUT (Mobile / default): two columns + popup modals
     ══════════════════════════════════════════════════════════════ */
  return (
    <main
      id="profile-section"
      className={`desktop-container desktop-profile-main ${dark ? "dark" : ""}`}
      data-appearance={dark ? "dark" : "light"}
    >
      <div className="desktop-profile-wrap">
        {/* ── Top Header: Avatar & Info ── */}
        <section className="desktop-profile-header">
          <div className="desktop-profile-user-info-row">
            {renderAvatar()}
            {renderUserInfo()}
          </div>
        </section>

        {/* ── Two-Column Layout ── */}
        <div className="desktop-profile-grid">
          {/* ── Column 1: Personal Details ── */}
          <div className="desktop-profile-column">
            <h2 className="desktop-profile-section-title">PERSONAL DETAILS</h2>
            <div className="desktop-profile-list">{renderPersonalRows()}</div>
          </div>

          {/* ── Column 2: Services & Settings ── */}
          <div className="desktop-profile-column">
            <h2 className="desktop-profile-section-title">SERVICES &amp; SETTINGS</h2>
            <div className="desktop-profile-list">
              {/* Item 1: Payout Accounts */}
              {renderPayoutRow()}

              {/* Item 2: Become a Verified Seller (Expandable Dropdown) */}
              <div className={`desktop-profile-seller-accordion ${isSellerExpanded ? "is-expanded" : ""}`}>
                {renderRow({
                  id: "profile-row-seller",
                  badgeClass: "verified",
                  badgeContent: <span className="material-symbols-outlined">verified</span>,
                  title: sellerTitle,
                  subtitle: sellerSubtitle,
                  ariaLabel: "Become a Verified Seller: Tap to complete verification.",
                  onClick: () => setIsSellerExpanded((prev) => !prev),
                  noBorder: isSellerExpanded,
                  chevron: isSellerExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down",
                  chevronClass: "chevron-down",
                  expanded: isSellerExpanded,
                  titleTooltip: "Click to toggle seller verification options",
                })}

                {/* Dropdown Content */}
                {isSellerExpanded && (
                  <div className="desktop-profile-seller-dropdown">{renderSellerSteps()}</div>
                )}
              </div>

              {/* Item 3: Statements & Reports */}
              {renderStatementsRow()}

              {/* Item 4: Cashback & Referral Rewards */}
              {renderRewardsRow()}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {/* 1. Field Edit Modal (Email, Address, or Full Profile) */}
      <EditFieldModal
        isOpen={
          activeModal === "email" ||
          activeModal === "address" ||
          activeModal === "profile"
        }
        fieldType={activeModal || "email"}
        currentData={profileData}
        dark={dark}
        onClose={() => setActiveModal(null)}
        onSave={handleFieldSave}
      />

      {/* 2. Payout Account Modal */}
      <PayoutAccountModal
        isOpen={activeModal === "payout"}
        currentData={profileData}
        dark={dark}
        onClose={() => setActiveModal(null)}
        onSave={(payoutUpdates) => {
          updateProfile(payoutUpdates, "Payout bank account updated successfully");
        }}
      />

      {/* 3. Seller Verification Modal */}
      <VerifiedSellerModal
        isOpen={activeModal === "verification"}
        currentStatus={profileData.verificationStatus}
        dark={dark}
        onClose={() => setActiveModal(null)}
        onVerified={() => {
          updateProfile(
            { isVerified: true, verificationStatus: "verified" },
            "Congratulations! Seller verification approved"
          );
        }}
      />

      {/* 4. Statements & Reports Modal */}
      <StatementsModal
        isOpen={activeModal === "statements"}
        userEmail={profileData.email}
        dark={dark}
        onClose={() => setActiveModal(null)}
        onSend={(msg) => showToast(msg)}
      />

      {/* 5. Cashback & Referral Rewards Modal */}
      <RewardsModal
        isOpen={activeModal === "rewards"}
        dark={dark}
        onClose={() => setActiveModal(null)}
        onCopy={(msg) => showToast(msg)}
      />

      {/* 6. Step-specific Verification Modal */}
      <SellerStepModal
        isOpen={Boolean(activeSellerStep)}
        step={activeSellerStep}
        dark={dark}
        onClose={() => setActiveSellerStep(null)}
        onSave={handleSaveSellerStep}
      />

      {/* ── Floating Toast Feedback ── */}
      <ProfileToast message={toastMessage} isVisible={isToastVisible} dark={dark} />
    </main>
  );
}
