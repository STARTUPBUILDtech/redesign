export const HomeIcon = ({ active }) => (
  <span
    className="material-symbols-outlined nav-symbol"
    style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
  >
    dashboard
  </span>
);

export const ActivityIcon = ({ active }) => (
  <span
    className="material-symbols-outlined nav-symbol"
    style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
  >
    analytics
  </span>
);

export const PaymentRoomIcon = ({ active, count = 5 }) => (
  <span className="nav-pr-wrap">
    <span
      className="material-symbols-outlined nav-symbol"
      style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
    >
      payments
    </span>
    {count !== undefined && count !== null && Number(count) > 0 && (
      <span id="m-pr-nav-badge" className="nav-pr-badge">{count}</span>
    )}
  </span>
);

export const HelpIcon = ({ active }) => (
  <span
    className="material-symbols-outlined nav-symbol"
    style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
  >
    contact_support
  </span>
);

export const ProfileIcon = ({ active }) => (
  <span className="nav-profile-wrap">
    <span
      className="material-symbols-outlined nav-symbol"
      style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
    >
      person
    </span>
    <i className="fa-brands fa-whatsapp nav-whatsapp-icon"></i>
  </span>
);
