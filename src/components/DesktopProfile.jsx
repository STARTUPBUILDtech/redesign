import { useState, useEffect } from "react";
import "../styles/desktop-profile.css";
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
} from "./Shared/ProfileModals.jsx";

function WhatsAppIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.71 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.414z" />
    </svg>
  );
}

export default function DesktopProfile({
  userName = "Amaka",
  phoneNumber = "+234 803 200 1585",
  onEditProfile,
  onSignOut = () => {},
  dark,
}) {
  // Initialize state with stored details or fallbacks
  const [profileData, setProfileData] = useState(() => {
    try {
      const stored = localStorage.getItem("paykudi_user_profile");
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          name: parsed.name || userName || "Amaka",
          address: parsed.address || "",
          phone: parsed.phone || (phoneNumber !== "No phone number" ? phoneNumber : "+234 803 200 1585"),
          email: parsed.email || "",
          isVerified: parsed.isVerified || false,
          verificationStatus: parsed.verificationStatus || "unverified",
          bank: parsed.bank || "Kuda Bank",
          accountNumber: parsed.accountNumber || "2001948291",
          accountName: parsed.accountName || "Amaka",
        };
      }
    } catch (e) {
      // Local storage fallback
    }
    return {
      name: userName || "Amaka",
      address: "",
      phone: phoneNumber !== "No phone number" ? phoneNumber : "+234 803 200 1585",
      email: "",
      isVerified: false,
      verificationStatus: "unverified",
      bank: "Kuda Bank",
      accountNumber: "2001948291",
      accountName: "Amaka",
    };
  });

  // Modal display state: null | 'email' | 'name' | 'address' | 'phone' | 'profile' | 'payout' | 'verification' | 'statements' | 'rewards'
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
    setActiveModal(field);
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

            <div className="desktop-profile-info">
              <h1 className="desktop-profile-name">
                {profileData.name}
              </h1>
              <div className="desktop-profile-phone-pill">
                <WhatsAppIcon size={14} />
                <span>{profileData.phone}</span>
              </div>
            </div>
          </div>

        </section>

        {/* ── Two-Column Layout ── */}
        <div className="desktop-profile-grid">
          {/* ── Column 1: Personal Details ── */}
          <div className="desktop-profile-column">
            <h2 className="desktop-profile-section-title">PERSONAL DETAILS</h2>
            <div className="desktop-profile-list">
              {/* Item 1: Name (Non-editable) */}
              <div
                className="desktop-profile-item readonly"
                aria-label={`Account Name: ${profileData.name}`}
              >
                <div className="desktop-profile-badge user">
                  <span className="material-symbols-outlined">person</span>
                </div>
                <div className="desktop-profile-item-inner">
                  <div className="desktop-profile-item-text">
                    <span className="desktop-profile-item-title">{profileData.name}</span>
                    <span className="desktop-profile-item-subtitle">Account Name</span>
                  </div>
                </div>
              </div>

              {/* Item 2: Address */}
              <button
                type="button"
                className="desktop-profile-item"
                aria-label={`Address: ${profileData.address || "Add your address"}. Tap to edit.`}
                onClick={() => handleEditClick("address")}
                title="Click to edit address"
              >
                <div className="desktop-profile-badge address">
                  <span className="material-symbols-outlined">location_on</span>
                </div>
                <div className="desktop-profile-item-inner">
                  <div className="desktop-profile-item-text">
                    <span className="desktop-profile-item-title">
                      {profileData.address || "Add your address"}
                    </span>
                    <span className="desktop-profile-item-subtitle">Address</span>
                  </div>
                  <span className="material-symbols-outlined desktop-profile-item-chevron">
                    chevron_right
                  </span>
                </div>
              </button>

              {/* Item 3: Phone (Non-editable) */}
              <div
                className="desktop-profile-item readonly"
                aria-label={`Phone Number: ${profileData.phone}`}
              >
                <div className="desktop-profile-badge whatsapp">
                  <WhatsAppIcon size={16} />
                </div>
                <div className="desktop-profile-item-inner">
                  <div className="desktop-profile-item-text">
                    <span className="desktop-profile-item-title">{profileData.phone}</span>
                    <span className="desktop-profile-item-subtitle">Phone Number</span>
                  </div>
                </div>
              </div>

              {/* Item 4: Email */}
              <button
                type="button"
                className="desktop-profile-item"
                aria-label={`Email Address: ${profileData.email || "Add your email"}. Tap to edit.`}
                onClick={() => handleEditClick("email")}
                title="Click to edit email address"
              >
                <div className="desktop-profile-badge email">
                  <span className="material-symbols-outlined">mail</span>
                </div>
                <div className="desktop-profile-item-inner no-border">
                  <div className="desktop-profile-item-text">
                    <span className="desktop-profile-item-title">
                      {profileData.email || "Add your email"}
                    </span>
                    <span className="desktop-profile-item-subtitle">Email Address</span>
                  </div>
                  <span className="material-symbols-outlined desktop-profile-item-chevron">
                    chevron_right
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* ── Column 2: Services & Settings ── */}
          <div className="desktop-profile-column">
            <h2 className="desktop-profile-section-title">SERVICES & SETTINGS</h2>
            <div className="desktop-profile-list">
              {/* Item 1: Payout Accounts */}
              <button
                type="button"
                className="desktop-profile-item"
                aria-label="Payout Accounts: Tap to manage bank account."
                onClick={() => handleEditClick("payout")}
                title="Click to manage payout accounts"
              >
                <div className="desktop-profile-badge payout">
                  <span className="material-symbols-outlined">account_balance</span>
                </div>
                <div className="desktop-profile-item-inner">
                  <div className="desktop-profile-item-text">
                    <span className="desktop-profile-item-title">Payout Accounts</span>
                    <span className="desktop-profile-item-subtitle">
                      {profileData.bank && profileData.accountNumber
                        ? `${profileData.bank} · ${profileData.accountNumber}`
                        : "Add, change, or set primary bank accounts for payouts."}
                    </span>
                  </div>
                  <span className="material-symbols-outlined desktop-profile-item-chevron">
                    chevron_right
                  </span>
                </div>
              </button>

              {/* Item 2: Become a Verified Seller (Expandable Dropdown) */}
              <div className={`desktop-profile-seller-accordion ${isSellerExpanded ? "is-expanded" : ""}`}>
                <button
                  type="button"
                  className={`desktop-profile-item ${isSellerExpanded ? "is-expanded" : ""}`}
                  aria-label="Become a Verified Seller: Tap to complete verification."
                  onClick={() => setIsSellerExpanded((prev) => !prev)}
                  title="Click to toggle seller verification options"
                  aria-expanded={isSellerExpanded}
                >
                  <div className="desktop-profile-badge verified">
                    <span className="material-symbols-outlined">verified</span>
                  </div>
                  <div className={`desktop-profile-item-inner ${isSellerExpanded ? "no-border" : ""}`}>
                    <div className="desktop-profile-item-text">
                      <span className="desktop-profile-item-title">
                        <span>Become a Verified Seller</span>
                        {profileData.isVerified ? (
                          <span
                            className="desktop-profile-unverified-tag"
                            style={{ color: "#10b981", fontWeight: 700 }}
                          >
                            (Verified)
                          </span>
                        ) : (
                          <span className="desktop-profile-unverified-tag">(Unverified)</span>
                        )}
                      </span>
                      <span className="desktop-profile-item-subtitle">
                        {profileData.isVerified
                          ? "Verification approved. Enjoy Verified Seller escrow benefits."
                          : "Complete verification to enjoy Verified Seller benefits."}
                      </span>
                    </div>
                    <span className="material-symbols-outlined desktop-profile-item-chevron chevron-down">
                      {isSellerExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                    </span>
                  </div>
                </button>

                {/* Dropdown Content */}
                {isSellerExpanded && (
                  <div className="desktop-profile-seller-dropdown">
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
                        type="button"
                        className={`seller-sub-card-btn ${sellerSteps.bvn ? "is-done" : ""}`}
                        onClick={() => setActiveSellerStep("bvn")}
                        title={sellerSteps.bvn ? "BVN Verified" : "Verify BVN"}
                        aria-label={sellerSteps.bvn ? "BVN Verified" : "Verify BVN"}
                      >
                        {sellerSteps.bvn ? (
                          <span className="material-symbols-outlined seller-verified-tick-icon">
                            verified
                          </span>
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
                        type="button"
                        className={`seller-sub-card-btn ${sellerSteps.nin ? "is-done" : ""}`}
                        onClick={() => setActiveSellerStep("nin")}
                        title={sellerSteps.nin ? "NIN Verified" : "Verify NIN"}
                        aria-label={sellerSteps.nin ? "NIN Verified" : "Verify NIN"}
                      >
                        {sellerSteps.nin ? (
                          <span className="material-symbols-outlined seller-verified-tick-icon">
                            verified
                          </span>
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
                          <span className="seller-sub-card-sub">Store Name & Category</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`seller-sub-card-btn ${sellerSteps.business ? "is-done" : ""}`}
                        onClick={() => setActiveSellerStep("business")}
                        title={sellerSteps.business ? "Business Info Added" : "Add Business"}
                        aria-label={sellerSteps.business ? "Business Info Added" : "Add Business"}
                      >
                        {sellerSteps.business ? (
                          <span className="material-symbols-outlined seller-verified-tick-icon">
                            verified
                          </span>
                        ) : (
                          "Add Business"
                        )}
                      </button>
                    </div>

                    {/* Bottom CTA Submit Button */}
                    <button
                      type="button"
                      className="seller-verify-submit-btn"
                      onClick={handleFinalSubmitVerification}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                        verified
                      </span>
                      <span>Submit Seller Verification</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Item 3: Statements & Reports */}
              <button
                type="button"
                className="desktop-profile-item"
                aria-label="Statements & Reports: Tap to generate statement."
                onClick={() => handleEditClick("statements")}
                title="Click to generate statements and reports"
              >
                <div className="desktop-profile-badge statements">
                  <span className="material-symbols-outlined">receipt_long</span>
                </div>
                <div className="desktop-profile-item-inner">
                  <div className="desktop-profile-item-text">
                    <span className="desktop-profile-item-title">Statements & Reports</span>
                    <span className="desktop-profile-item-subtitle">
                      Get a statement and report for your activities and orders.
                    </span>
                  </div>
                  <span className="material-symbols-outlined desktop-profile-item-chevron">
                    chevron_right
                  </span>
                </div>
              </button>

              {/* Item 4: Cashback & Referral Rewards */}
              <button
                type="button"
                className="desktop-profile-item"
                aria-label="Cashback & Referral Rewards: Tap to view earnings."
                onClick={() => handleEditClick("rewards")}
                title="Click to view cashback and rewards"
              >
                <div className="desktop-profile-badge rewards">
                  <span className="material-symbols-outlined">card_giftcard</span>
                </div>
                <div className="desktop-profile-item-inner no-border">
                  <div className="desktop-profile-item-text">
                    <span className="desktop-profile-item-title">
                      Cashback & Referral Rewards
                    </span>
                    <span className="desktop-profile-item-subtitle">
                      See how much you've earned from referrals.
                    </span>
                  </div>
                  <span className="material-symbols-outlined desktop-profile-item-chevron">
                    chevron_right
                  </span>
                </div>
              </button>
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
        onSave={(updates) => {
          let msg = "Details updated successfully";
          if (updates.email) msg = "Email address updated successfully";
          else if (updates.address) msg = "Address updated successfully";
          updateProfile(updates, msg);
        }}
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
