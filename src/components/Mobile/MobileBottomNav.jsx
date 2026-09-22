import {
  HomeIcon,
  ActivityIcon,
  PaymentRoomIcon,
  HelpIcon,
  ProfileIcon,
} from "../Header/NavIcons";
import { useDashboard } from "../../context/DashboardContext";

export default function MobileBottomNav() {
  const { active, setActive, ongoingPaymentRoomsCount } = useDashboard();

  return (
    <nav id="m-bottom-nav" className="mobile-nav" aria-label="Primary navigation">
      <button
        type="button"
        id="m-nav-home"
        className={`nav-bottom-link ${active === "Home" ? "active" : ""}`}
        onClick={() => setActive("Home")}
      >
        <HomeIcon active={active === "Home"} />
        <span className="nav-link-label">Home</span>
      </button>

      <button
        type="button"
        id="m-nav-activity"
        className={`nav-bottom-link ${active === "Activity" ? "active" : ""}`}
        onClick={() => setActive("Activity")}
      >
        <ActivityIcon active={active === "Activity"} />
        <span className="nav-link-label">Activity</span>
      </button>

      <button
        type="button"
        id="m-nav-notifications"
        className={`nav-bottom-link ${active === "Payment room" || active === "New Payment" ? "active" : ""}`}
        onClick={() => setActive("Payment room")}
      >
        <PaymentRoomIcon
          active={active === "Payment room" || active === "New Payment"}
          count={ongoingPaymentRoomsCount}
        />
        <span className="nav-link-label">Payment Room</span>
      </button>

      <button
        type="button"
        id="m-nav-help"
        className={`nav-bottom-link ${active === "Help" ? "active" : ""}`}
        onClick={() => setActive("Help")}
      >
        <HelpIcon active={active === "Help"} />
        <span className="nav-link-label">Help</span>
      </button>

      <button
        type="button"
        id="m-nav-profile"
        className={`nav-bottom-link ${active === "Profile" ? "active" : ""}`}
        onClick={() => setActive("Profile")}
      >
        <ProfileIcon active={active === "Profile"} />
        <span className="nav-link-label">Profile</span>
      </button>
    </nav>
  );
}
