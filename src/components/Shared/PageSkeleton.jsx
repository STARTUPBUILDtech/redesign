import React from "react";

export default function PageSkeleton({ page = "Home", layout = "desktop" }) {
  const normPage = (page || "").toLowerCase();

  // 1. Payment Room Skeleton
  if (normPage.includes("payment room") || normPage.includes("paymentroom")) {
    return (
      <div className="pk-page-skeleton-container pk-payment-room-skeleton" aria-busy="true" aria-label="Loading payment rooms">
        <div className="pk-pr-skel-header">
          <div className="pk-pr-skel-title pk-skeleton" />
          <div className="pk-skel-line pk-skeleton" style={{ width: "90px", height: "36px", borderRadius: "10px" }} />
        </div>
        <div className="pk-pr-skel-search pk-skeleton" />
        <div className="pk-pr-skel-tabs">
          <div className="pk-pr-skel-tab pk-skeleton" />
          <div className="pk-pr-skel-tab pk-skeleton" />
          <div className="pk-pr-skel-tab pk-skeleton" />
        </div>
        <div className="pk-pr-skel-list">
          {[1, 2, 3].map((k) => (
            <div key={k} className="pk-pr-skel-card">
              <div className="pk-pr-skel-card-top">
                <div className="pk-pr-skel-badge pk-skeleton" />
                <div className="pk-pr-skel-date pk-skeleton" />
              </div>
              <div className="pk-pr-skel-card-middle">
                <div className="pk-pr-skel-item-name pk-skeleton" style={{ width: k === 1 ? "180px" : "140px" }} />
                <div className="pk-pr-skel-price pk-skeleton" />
              </div>
              <div className="pk-pr-skel-card-bottom">
                <div className="pk-pr-skel-avatar-mini pk-skeleton" />
                <div className="pk-pr-skel-counterparty pk-skeleton" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. Activity Skeleton
  if (normPage.includes("activity")) {
    return (
      <div className="pk-page-skeleton-container pk-activity-skeleton" aria-busy="true" aria-label="Loading activity">
        <div className="pk-act-skel-top-row">
          <div className="pk-act-skel-page-title pk-skeleton" />
          <div className="pk-skel-line pk-skeleton" style={{ width: "95px", height: "36px", borderRadius: "10px" }} />
        </div>
        <div className="pk-act-skel-filters">
          {[1, 2, 3, 4, 5].map((k) => (
            <div key={k} className="pk-act-skel-filter-chip pk-skeleton" />
          ))}
        </div>
        <div className="pk-home-skel-act-rows">
          {[1, 2, 3, 4, 5].map((k) => (
            <div key={k} className="pk-skel-act-row">
              <div className="pk-skel-act-left">
                <div className="pk-skel-act-icon pk-skeleton" />
                <div className="pk-skel-act-texts">
                  <div className="pk-skel-act-main-text pk-skeleton" style={{ width: k % 2 === 0 ? "170px" : "130px" }} />
                  <div className="pk-skel-act-sub-text pk-skeleton" />
                </div>
              </div>
              <div className="pk-skel-act-amount pk-skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Help & Support Skeleton
  if (normPage.includes("help")) {
    return (
      <div className="pk-page-skeleton-container pk-help-skeleton" aria-busy="true" aria-label="Loading help">
        <div className="pk-skel-line pk-skeleton" style={{ width: "160px", height: "26px" }} />
        <div className="pk-help-skel-search pk-skeleton" />
        <div className="pk-help-skel-tiles">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="pk-help-skel-tile pk-skeleton" />
          ))}
        </div>
        <div className="pk-help-skel-faqs">
          {[1, 2, 3].map((k) => (
            <div key={k} className="pk-help-skel-faq-item pk-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  // 4. Profile Skeleton
  if (normPage.includes("profile")) {
    return (
      <div className="pk-page-skeleton-container pk-profile-skeleton" aria-busy="true" aria-label="Loading profile">
        <div className="pk-prof-skel-card">
          <div className="pk-prof-skel-avatar pk-skeleton" />
          <div className="pk-prof-skel-info">
            <div className="pk-prof-skel-name pk-skeleton" />
            <div className="pk-prof-skel-sub pk-skeleton" />
          </div>
        </div>
        <div className="pk-prof-skel-rows">
          {[1, 2, 3, 4, 5].map((k) => (
            <div key={k} className="pk-prof-skel-row pk-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  // 5. Mobile Room Stages Skeleton (Awaiting Payment, In Transit, Dispute, Completed)
  if (
    normPage.includes("awaiting") ||
    normPage.includes("transit") ||
    normPage.includes("received") ||
    normPage.includes("delivery") ||
    normPage.includes("dispute") ||
    normPage.includes("completed")
  ) {
    return (
      <div className="pk-page-skeleton-container pk-room-stage-skeleton" aria-busy="true" aria-label="Loading payment room status">
        <div className="pk-stage-skel-top">
          <div className="pk-stage-skel-back pk-skeleton" />
          <div className="pk-stage-skel-pill pk-skeleton" />
        </div>
        <div className="pk-stage-skel-timeline">
          <div className="pk-stage-skel-step pk-skeleton" />
          <div className="pk-stage-skel-step pk-skeleton" />
          <div className="pk-stage-skel-step pk-skeleton" />
        </div>
        <div className="pk-stage-skel-card pk-skeleton" />
        <div className="pk-stage-skel-card pk-skeleton" style={{ height: "110px" }} />
        <div className="pk-stage-skel-dock pk-skeleton" />
      </div>
    );
  }

  // 6. Default Home Page Skeleton (Desktop & Mobile)
  return (
    <div className="pk-page-skeleton-container pk-home-skeleton" aria-busy="true" aria-label="Loading dashboard">
      <div className="pk-home-skel-intro">
        <div className="pk-home-skel-greeting-wrap">
          <div className="pk-home-skel-title pk-skeleton" />
          <div className="pk-home-skel-subtitle pk-skeleton" />
        </div>
        <div className="pk-home-skel-actions">
          <div className="pk-home-skel-btn pk-skeleton" />
          <div className="pk-home-skel-btn pk-skeleton" style={{ width: "95px" }} />
        </div>
      </div>

      <div className="pk-home-skel-balance-tile">
        <div className="pk-home-skel-bal-top pk-skeleton" />
        <div className="pk-home-skel-bal-amount pk-skeleton" />
        <div className="pk-home-skel-bal-time pk-skeleton" />
      </div>

      <div className="pk-home-skel-activity-section">
        <div className="pk-home-skel-act-head">
          <div className="pk-home-skel-act-title pk-skeleton" />
          <div className="pk-home-skel-act-link pk-skeleton" />
        </div>
        <div className="pk-home-skel-act-rows">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="pk-skel-act-row">
              <div className="pk-skel-act-left">
                <div className="pk-skel-act-icon pk-skeleton" />
                <div className="pk-skel-act-texts">
                  <div className="pk-skel-act-main-text pk-skeleton" style={{ width: k % 2 === 0 ? "160px" : "120px" }} />
                  <div className="pk-skel-act-sub-text pk-skeleton" />
                </div>
              </div>
              <div className="pk-skel-act-amount pk-skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
