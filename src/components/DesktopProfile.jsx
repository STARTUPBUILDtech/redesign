import { useState } from "react";
import "../styles/desktop-profile.css";

function WhatsAppIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.71 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.414z" />
    </svg>
  );
}

export default function DesktopProfile({
  userName = "Your Name",
  phoneNumber = "No phone number",
  onEditProfile = () => {},
  onSignOut = () => {},
}) {
  const [profileData, setProfileData] = useState({
    name: userName,
    address: "",
    phone: phoneNumber,
    email: "",
    isVerified: false,
  });

  return (
    <main id="profile-section" className="desktop-container desktop-profile-main">
      <div className="desktop-profile-wrap">
        {/* ── Top Header: Avatar & Info ── */}
        <section className="desktop-profile-header">
          <div className="desktop-profile-user-info-row">
            <div className="desktop-profile-avatar-wrap">
              <div className="desktop-profile-avatar-circle">
                <span className="material-symbols-outlined desktop-profile-avatar-icon">
                  account_circle
                </span>
              </div>
              <button
                type="button"
                className="desktop-profile-avatar-edit"
                onClick={onEditProfile}
                aria-label="Edit profile picture"
                title="Edit avatar"
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
            </div>

            <div className="desktop-profile-info">
              <h1 className="desktop-profile-name">{profileData.name}</h1>
              <div className="desktop-profile-phone-pill">
                <WhatsAppIcon size={14} />
                <span>{profileData.phone}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="profile-signout-btn"
            onClick={onSignOut}
            aria-label="Sign out"
          >
            <span className="material-symbols-outlined profile-signout-icon">logout</span>
            <span>Sign Out</span>
          </button>
        </section>

        {/* ── Two-Column Layout ── */}
        <div className="desktop-profile-grid">
          {/* ── Column 1: Personal Details ── */}
          <div className="desktop-profile-column">
            <h2 className="desktop-profile-section-title">PERSONAL DETAILS</h2>
            <div className="desktop-profile-list">
              {/* Item 1: Name */}
              <button
                type="button"
                className="desktop-profile-item"
                aria-label="Your Name: Account Name"
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
              </button>

              {/* Item 2: Address */}
              <button
                type="button"
                className="desktop-profile-item"
                aria-label="Add your address: Address"
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

              {/* Item 3: Phone */}
              <button
                type="button"
                className="desktop-profile-item"
                aria-label="No phone number: Phone Number"
              >
                <div className="desktop-profile-badge whatsapp">
                  <WhatsAppIcon size={20} />
                </div>
                <div className="desktop-profile-item-inner">
                  <div className="desktop-profile-item-text">
                    <span className="desktop-profile-item-title">{profileData.phone}</span>
                    <span className="desktop-profile-item-subtitle">Phone Number</span>
                  </div>
                </div>
              </button>

              {/* Item 4: Email */}
              <button
                type="button"
                className="desktop-profile-item"
                aria-label="Add your email: Email Address"
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
                aria-label="Payout Accounts: Add, change, or set primary bank accounts for payouts."
              >
                <div className="desktop-profile-badge payout">
                  <span className="material-symbols-outlined">account_balance</span>
                </div>
                <div className="desktop-profile-item-inner">
                  <div className="desktop-profile-item-text">
                    <span className="desktop-profile-item-title">Payout Accounts</span>
                    <span className="desktop-profile-item-subtitle">
                      Add, change, or set primary bank accounts for payouts.
                    </span>
                  </div>
                  <span className="material-symbols-outlined desktop-profile-item-chevron">
                    chevron_right
                  </span>
                </div>
              </button>

              {/* Item 2: Become a Verified Seller */}
              <button
                type="button"
                className="desktop-profile-item"
                aria-label="Become a Verified Seller (Unverified): Complete verification to enjoy Verified Seller benefits."
              >
                <div className="desktop-profile-badge verified">
                  <span className="material-symbols-outlined">verified</span>
                </div>
                <div className="desktop-profile-item-inner">
                  <div className="desktop-profile-item-text">
                    <span className="desktop-profile-item-title">
                      Become a Verified Seller{" "}
                      <span className="desktop-profile-unverified-tag">(Unverified)</span>
                    </span>
                    <span className="desktop-profile-item-subtitle">
                      Complete verification to enjoy Verified Seller benefits.
                    </span>
                  </div>
                  <span className="material-symbols-outlined desktop-profile-item-chevron chevron-down">
                    keyboard_arrow_down
                  </span>
                </div>
              </button>

              {/* Item 3: Statements & Reports */}
              <button
                type="button"
                className="desktop-profile-item"
                aria-label="Statements & Reports: Get a statement and report for your activities and orders."
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
                aria-label="Cashback & Referral Rewards: See how much you've earned from referrals."
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
    </main>
  );
}
