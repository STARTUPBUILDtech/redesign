import BrandLogo from "./BrandLogo";
import HeaderActions from "./HeaderActions";
import {
  HomeIcon,
  ActivityIcon,
  PaymentRoomIcon,
  HelpIcon,
  ProfileIcon,
} from "./NavIcons";
import { useDashboard } from "../../context/DashboardContext";

const navItems = [
  ["Home", HomeIcon],
  ["Activity", ActivityIcon],
  ["Payment room", PaymentRoomIcon],
  ["Help & support", HelpIcon],
  ["Profile", ProfileIcon],
];

export default function TopBar() {
  const { active, setActive, ongoingPaymentRoomsCount } = useDashboard();

  return (
    <header className="topbar">
      <BrandLogo className="brand" />

      <nav aria-label="Primary navigation">
        {navItems.map(([name, NavIcon]) => (
          <button
            key={name}
            type="button"
            onClick={() => setActive(name)}
            className={active === name ? "active" : ""}
          >
            <NavIcon
              active={active === name}
              count={name === "Payment room" ? ongoingPaymentRoomsCount : undefined}
            />
            <span>{name}</span>
          </button>
        ))}
      </nav>

      <div className="top-actions">
        <HeaderActions />
      </div>
    </header>
  );
}
