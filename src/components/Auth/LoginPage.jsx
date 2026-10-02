import { useState, useEffect, useRef } from "react";
import paykudiLogo from "../../assets/paykudi-logo.png";
import logoDarkMode from "../../assets/logodarkmode.png";
import slide1 from "../../assets/slide-1.png";
import slide2 from "../../assets/slide-2.png";
import slide3 from "../../assets/slide-3.png";
import slide4 from "../../assets/slide-4.png";
import slide5 from "../../assets/slide-5.png";
import "../../styles/login.css";

const SLIDES = [
  {
    id: 1,
    image: slide1,
    title: "SPLIT BILLS, SHARE MOMENTS",
    subtitle: "Send and receive money with friends instantly with zero stress",
  },
  {
    id: 2,
    image: slide2,
    title: "SPEND SMART EVERYWHERE",
    subtitle: "Virtual and physical debit cards that work seamlessly worldwide",
  },
  {
    id: 3,
    image: slide3,
    title: "PAYMENTS AT THE SPEED OF LIFE",
    subtitle: "Experience lightning-fast transfers with zero maintenance fees",
  },
  {
    id: 4,
    image: slide4,
    title: "JOURNEY BEYOND BOUNDARIES",
    subtitle: "Manage your finances effortlessly wherever your adventures take you",
  },
  {
    id: 5,
    image: slide5,
    title: "INVEST IN YOUR FUTURE",
    subtitle: "Buy top US stocks from as little as ₦20,000",
  },
];

function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.71 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.414z" />
    </svg>
  );
}

function PaykudiQRCode() {
  return (
    <div className="login-qr-card" title="Scan to download PayKudi mobile app">
      <div className="login-qr-inner">
        <svg
          viewBox="0 0 100 100"
          className="login-qr-svg"
          fill="currentColor"
          aria-hidden="true"
        >
          {/* Top-Left Finder */}
          <rect x="6" y="6" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
          <rect x="13" y="13" width="12" height="12" rx="2" fill="currentColor" />

          {/* Top-Right Finder */}
          <rect x="68" y="6" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
          <rect x="75" y="13" width="12" height="12" rx="2" fill="currentColor" />

          {/* Bottom-Left Finder */}
          <rect x="6" y="68" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
          <rect x="13" y="75" width="12" height="12" rx="2" fill="currentColor" />

          {/* Data Modules */}
          <rect x="38" y="8" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="48" y="8" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="58" y="8" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="38" y="18" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="50" y="18" width="6" height="5" rx="1" fill="currentColor" />
          <rect x="38" y="27" width="6" height="6" rx="1" fill="currentColor" />
          <rect x="54" y="27" width="5" height="5" rx="1" fill="currentColor" />

          <rect x="8" y="38" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="18" y="38" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="26" y="38" width="6" height="5" rx="1" fill="currentColor" />
          <rect x="8" y="48" width="6" height="5" rx="1" fill="currentColor" />
          <rect x="22" y="48" width="5" height="6" rx="1" fill="currentColor" />
          <rect x="8" y="58" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="24" y="58" width="6" height="5" rx="1" fill="currentColor" />

          <rect x="68" y="38" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="78" y="38" width="6" height="5" rx="1" fill="currentColor" />
          <rect x="88" y="38" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="68" y="48" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="80" y="48" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="72" y="58" width="6" height="5" rx="1" fill="currentColor" />
          <rect x="86" y="58" width="5" height="5" rx="1" fill="currentColor" />

          <rect x="38" y="68" width="5" height="6" rx="1" fill="currentColor" />
          <rect x="52" y="68" width="6" height="5" rx="1" fill="currentColor" />
          <rect x="42" y="78" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="56" y="78" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="38" y="86" width="6" height="6" rx="1" fill="currentColor" />
          <rect x="52" y="86" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="68" y="72" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="82" y="72" width="6" height="5" rx="1" fill="currentColor" />
          <rect x="74" y="84" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="86" y="84" width="6" height="5" rx="1" fill="currentColor" />

          {/* Center Monogram Badge */}
          <rect x="35" y="35" width="30" height="30" rx="4" fill="#000000" />
          <text
            x="50"
            y="52"
            fill="#ffffff"
            fontSize="10"
            fontWeight="900"
            fontFamily="Inter, system-ui, sans-serif"
            textAnchor="middle"
            letterSpacing="0.5"
          >
            PAY
          </text>
          <text
            x="50"
            y="61"
            fill="#ffffff"
            fontSize="8"
            fontWeight="800"
            fontFamily="Inter, system-ui, sans-serif"
            textAnchor="middle"
            letterSpacing="0.5"
          >
            KUDI
          </text>
        </svg>
      </div>
    </div>
  );
}

export default function LoginPage({ dark, onThemeToggle, onLogin }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loginMethod, setLoginMethod] = useState("email"); // "email" | "whatsapp"
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const slideTimerRef = useRef(null);

  // Auto-advance slides every 5.5 seconds unless paused
  useEffect(() => {
    if (isPaused) return;
    slideTimerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5500);

    return () => clearInterval(slideTimerRef.current);
  }, [isPaused]);

  const validate = () => {
    const e = {};
    if (loginMethod === "email") {
      if (!email.trim()) e.email = "Email address is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        e.email = "Enter a valid email address";
    } else {
      const cleanPhone = phone.replace(/\D/g, "");
      if (!phone.trim()) e.phone = "WhatsApp phone number is required";
      else if (cleanPhone.length < 10)
        e.phone = "Enter a valid 10 or 11-digit phone number";
    }
    if (!password) e.password = "Password is required";
    else if (password.length < 6) e.password = "Password must be at least 6 characters";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin?.();
    }, 1000);
  };

  const isFormFilled =
    (loginMethod === "email" ? email.trim().length > 0 : phone.trim().length > 0) &&
    password.length > 0;

  return (
    <div className={`kuda-login-layout ${dark ? "theme-dark" : "theme-light"}`}>
      {/* ══════════════════════════════════════════════════════════════
          LEFT PANEL: Header, Login Form
         ══════════════════════════════════════════════════════════════ */}
      <section className="kuda-login-left">
        {/* Top Header bar with Logo and Theme toggle */}
        <header className="kuda-left-header">
          <div className="kuda-brand-logo-wrap">
            <img
              src={dark ? logoDarkMode : paykudiLogo}
              alt="PayKudi"
              className="kuda-brand-logo"
            />
          </div>

          <button
            type="button"
            className="kuda-theme-toggle"
            onClick={onThemeToggle}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="material-symbols-outlined">
              {dark ? "light_mode" : "dark_mode"}
            </span>
          </button>
        </header>

        {/* Centered Login Card */}
        <div className="kuda-form-container">
          <div className="kuda-login-card">
            <h1 className="kuda-card-title">Sign in to PayKudi</h1>

            {/* Email / WhatsApp Method Selector */}
            <div className="kuda-method-tabs" role="tablist" aria-label="Sign in method">
              <button
                type="button"
                role="tab"
                aria-selected={loginMethod === "email"}
                className={`kuda-method-tab ${loginMethod === "email" ? "active" : ""}`}
                onClick={() => {
                  setLoginMethod("email");
                  setErrors({});
                }}
              >
                <span className="material-symbols-outlined tab-icon">mail</span>
                <span>Email Address</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={loginMethod === "whatsapp"}
                className={`kuda-method-tab ${loginMethod === "whatsapp" ? "active" : ""}`}
                onClick={() => {
                  setLoginMethod("whatsapp");
                  setErrors({});
                }}
              >
                <WhatsAppIcon size={16} />
                <span>WhatsApp</span>
              </button>
            </div>

            <form className="kuda-auth-form" onSubmit={handleSubmit} noValidate>
              {loginMethod === "email" ? (
                <div className={`kuda-input-group ${errors.email ? "has-error" : ""}`}>
                  <label className="kuda-input-label" htmlFor="kuda-email">
                    Email Address
                  </label>
                  <div className="kuda-input-box">
                    <input
                      id="kuda-email"
                      type="email"
                      className="kuda-input-field"
                      placeholder="example@gmail.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors((p) => ({ ...p, email: "" }));
                      }}
                      autoComplete="email"
                    />
                  </div>
                  {errors.email && <span className="kuda-error-text">{errors.email}</span>}
                </div>
              ) : (
                <div className={`kuda-input-group ${errors.phone ? "has-error" : ""}`}>
                  <label className="kuda-input-label" htmlFor="kuda-phone">
                    WhatsApp Phone Number
                  </label>
                  <div className="kuda-input-box kuda-phone-box">
                    <span className="kuda-phone-prefix">
                      <svg
                        width="18"
                        height="12"
                        viewBox="0 0 20 14"
                        className="kuda-country-flag"
                        aria-hidden="true"
                      >
                        <rect width="20" height="14" fill="#008751" />
                        <rect x="6.67" width="6.66" height="14" fill="#ffffff" />
                      </svg>
                      <span>+234</span>
                    </span>
                    <input
                      id="kuda-phone"
                      type="tel"
                      className="kuda-input-field phone-field"
                      placeholder="801 234 5678"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (errors.phone) setErrors((p) => ({ ...p, phone: "" }));
                      }}
                      autoComplete="tel"
                    />
                  </div>
                  {errors.phone && <span className="kuda-error-text">{errors.phone}</span>}
                </div>
              )}

              {/* Password */}
              <div className={`kuda-input-group ${errors.password ? "has-error" : ""}`}>
                <label className="kuda-input-label" htmlFor="kuda-password">
                  Password
                </label>
                <div className="kuda-input-box password-box">
                  <input
                    id="kuda-password"
                    type={showPass ? "text" : "password"}
                    className="kuda-input-field password-field"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((p) => ({ ...p, password: "" }));
                    }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="kuda-pass-toggle"
                    onClick={() => setShowPass((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined">
                      {showPass ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {errors.password && (
                  <span className="kuda-error-text">{errors.password}</span>
                )}
              </div>

              {/* Forgot your password? Reset it */}
              <div className="kuda-forgot-row">
                <span className="kuda-forgot-prompt">Forgot your password?</span>
                <a href="#reset" className="kuda-reset-anchor">
                  Reset it
                </a>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`kuda-submit-button ${isFormFilled ? "active" : ""} ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading ? <span className="kuda-button-spinner" /> : "Sign In"}
              </button>

              {/* Create an Account */}
              <div className="kuda-register-row">
                <a href="#signup" className="kuda-create-account-link">
                  Create an Account
                </a>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT PANEL: Slideshow Hero with Titles, Dots & QR Code
         ══════════════════════════════════════════════════════════════ */}
      <section
        className="kuda-login-right"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        aria-label="Product Showcase"
      >
        {/* Slide Images with smooth crossfade */}
        <div className="kuda-slider-viewport">
          {SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              className={`kuda-slide-item ${idx === activeSlide ? "active" : ""}`}
              aria-hidden={idx !== activeSlide}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="kuda-slide-image"
              />
              <div className="kuda-slide-overlay" />
            </div>
          ))}
        </div>

        {/* Content overlay on the right slide (Title, Subtitle, Dots) */}
        <div className="kuda-slide-caption-bar">
          <div className="kuda-caption-content">
            <h2 className="kuda-slide-headline">
              {SLIDES[activeSlide].title}
            </h2>
            <p className="kuda-slide-subheadline">
              {SLIDES[activeSlide].subtitle}
            </p>

            {/* Pagination Dots */}
            <div className="kuda-slide-dots" role="tablist" aria-label="Slideshow pagination">
              {SLIDES.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === activeSlide}
                  className={`kuda-dot ${idx === activeSlide ? "active" : ""}`}
                  onClick={() => setActiveSlide(idx)}
                  aria-label={`Go to slide ${idx + 1}: ${slide.title}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* QR Code Card in Bottom Right */}
        <div className="kuda-qr-container">
          <PaykudiQRCode />
        </div>
      </section>
    </div>
  );
}
