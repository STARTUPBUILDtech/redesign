import paykudiLogo from "../../assets/paykudi-logo.png";
import logoDarkMode from "../../assets/logodarkmode.png";
import { useDashboard } from "../../context/DashboardContext";

export default function BrandLogo({ className = "brand" }) {
  const { dark } = useDashboard();

  return (
    <a className={className} href="#home" aria-label="PayKudi home">
      <img
        src={dark ? logoDarkMode : paykudiLogo}
        alt="PayKudi"
        className={`brand-logo-img ${dark ? "logo-dark" : "logo-light"}`}
        style={{ height: "22px", maxHeight: "22px", width: "auto" }}
      />
    </a>
  );
}
