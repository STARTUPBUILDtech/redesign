import { useState, useEffect } from "react";
import paykudiLogo from "../../assets/paykudi-logo.png";
import logoDarkMode from "../../assets/logodarkmode.png";
import "../../styles/glowing-loader.css";

export default function GlowingLogoLoader({ dark = false, layout = "desktop" }) {
  const [isThemeDark, setIsThemeDark] = useState(dark);

  useEffect(() => {
    const checkDark = () => {
      const isDocDark =
        document.documentElement.getAttribute("data-appearance") === "dark" ||
        document.body.getAttribute("data-appearance") === "dark" ||
        document.body.classList.contains("dark") ||
        Boolean(document.querySelector('[data-appearance="dark"]'));
      setIsThemeDark(Boolean(dark || isDocDark));
    };
    checkDark();
    if (typeof document === "undefined") return;
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-appearance", "class"] });
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-appearance", "class"] });
    return () => observer.disconnect();
  }, [dark]);

  const effectiveDark = Boolean(dark || isThemeDark);

  return (
    <div
      className={`pk-logo-loader-wrap pk-glowing-loader-wrap ${layout} ${effectiveDark ? "dark" : "light"}`}
      role="status"
      aria-live="polite"
      aria-label="Loading..."
    >
      <div className="pk-logo-loader-inner">
        {/* Render both with CSS classes so CSS media queries & theme selectors also switch immediately */}
        <img
          src={paykudiLogo}
          alt="PayKudi"
          className="pk-logo-loader-img pk-logo-light"
        />
        <img
          src={logoDarkMode}
          alt="PayKudi"
          className="pk-logo-loader-img pk-logo-dark"
        />

        {/* Clean loading state */}
        <div className="pk-logo-loader-spinner" aria-hidden="true" />
      </div>
    </div>
  );
}
