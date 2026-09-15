function getActivityConfig(item) {
  const t = (item.type || item.title || "").toLowerCase();
  if (t.includes("refund")) {
    return {
      iconClass: "act-icon-refund",
      amountClass: "act-val-refund",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14L4 9l5-5"></path>
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path>
        </svg>
      ),
    };
  }
  if (t.includes("payout") || t.includes("withdrawn") || t.includes("withdraw")) {
    return {
      iconClass: "act-icon-payout",
      amountClass: "act-val-payout",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"></path>
        </svg>
      ),
    };
  }
  if (t.includes("received")) {
    return {
      iconClass: "act-icon-received",
      amountClass: "act-val-received",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v16m0 0l-6-6m6 6l6-6"></path>
        </svg>
      ),
    };
  }
  return {
    iconClass: "act-icon-sent",
    amountClass: "act-val-sent",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"></path>
      </svg>
    ),
  };
}

export default function ActivityRow({ item, isLast }) {
  const cfg = getActivityConfig(item);
  return (
    <div className="activity-item-row" role="button" tabIndex={0}>
      <div className={`activity-item-icon ${cfg.iconClass}`}>
        {cfg.icon}
      </div>
      <div className={`activity-item-inner ${isLast ? "no-border" : ""}`}>
        <div className="activity-item-info">
          <h4 className="activity-item-title">{item.title}</h4>
          <p className="activity-item-time">{item.time}</p>
        </div>
        <div className="activity-item-amount">
          <p className={`activity-item-value ${cfg.amountClass}`}>{item.amount}</p>
        </div>
      </div>
    </div>
  );
}
