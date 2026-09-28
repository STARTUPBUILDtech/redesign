import { useState } from "react";
import paykudiLogo from "../../assets/paykudi-logo.png";
import logoDarkMode from "../../assets/logodarkmode.png";
import bgVideo from "../../assets/login-slide-3.mp4";
import "../../styles/login.css";

function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.71 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.414z" />
    </svg>
  );
}

export default function LoginPage({ dark, onThemeToggle, onLogin }) {
  const [loginMethod, setLoginMethod] = useState("email"); // "email" | "whatsapp"
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin?.(); }, 1200);
  };

  return (
    <div className="login-page">
      {/* ── Full-screen video background ── */}
      <video
        className="login-bg-video"
        src={bgVideo}
        autoPlay
        muted
        loop
        playsInline
      />

      {/* ── Dark overlay ── */}
      <div className="login-bg-overlay" />

      {/* ── Logo — top left of page ── */}
      <div className="login-page-logo">
        <img
          src={logoDarkMode}
          alt="PayKudi"
          className="login-page-logo-img"
          style={{ height: "22px", maxHeight: "22px", width: "auto" }}
        />
      </div>

      {/* ── Theme toggle (top-right corner) ── */}
      <button
        type="button"
        className="login-theme-btn"
        onClick={onThemeToggle}
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <span className="material-symbols-outlined">
          {dark ? "dark_mode" : "light_mode"}
        </span>
      </button>

      {/* ── Centered modal card ── */}
      <div className="login-card">
        <h1 className="login-card-title">Sign in to PayKudi</h1>

        {/* ── Login Method Selector (Email or WhatsApp) ── */}
        <div className="login-method-selector" role="tablist" aria-label="Login method">
          <button
            type="button"
            role="tab"
            aria-selected={loginMethod === "email"}
            className={`login-method-btn ${loginMethod === "email" ? "active" : ""}`}
            onClick={() => {
              setLoginMethod("email");
              setErrors({});
            }}
          >
            <span className="material-symbols-outlined login-method-icon">mail</span>
            <span>Email</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={loginMethod === "whatsapp"}
            className={`login-method-btn ${loginMethod === "whatsapp" ? "active" : ""}`}
            onClick={() => {
              setLoginMethod("whatsapp");
              setErrors({});
            }}
          >
            <WhatsAppIcon size={16} />
            <span>WhatsApp</span>
          </button>
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {/* Email or WhatsApp Field */}
          {loginMethod === "email" ? (
            <div className={`login-field ${errors.email ? "has-error" : ""}`}>
              <label className="login-label" htmlFor="login-email">
                Email Address
              </label>
              <div className="login-input-wrap">
                <input
                  id="login-email"
                  type="email"
                  className="login-input"
                  placeholder="example@gmail.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((p) => ({ ...p, email: "" }));
                  }}
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="login-error-msg">{errors.email}</span>}
            </div>
          ) : (
            <div className={`login-field ${errors.phone ? "has-error" : ""}`}>
              <label className="login-label" htmlFor="login-phone">
                WhatsApp Phone Number
              </label>
              <div className="login-input-wrap login-phone-wrap">
                <span className="login-phone-prefix">
                  <svg width="20" height="14" viewBox="0 0 20 14" style={{borderRadius: "2px", display:"block", flexShrink:0}}>
                    <rect width="20" height="14" fill="#008751"/>
                    <rect x="6.67" width="6.66" height="14" fill="#ffffff"/>
                  </svg>
                  <span>+234</span>
                </span>
                <input
                  id="login-phone"
                  type="tel"
                  className="login-input phone-input"
                  placeholder="801 234 5678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors((p) => ({ ...p, phone: "" }));
                  }}
                  autoComplete="tel"
                />
              </div>
              {errors.phone && <span className="login-error-msg">{errors.phone}</span>}
            </div>
          )}

          {/* Password */}
          <div className={`login-field ${errors.password ? "has-error" : ""}`}>
            <label className="login-label" htmlFor="login-password">
              Password
            </label>
            <div className="login-input-wrap">
              <input
                id="login-password"
                type={showPass ? "text" : "password"}
                className="login-input password-input"
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
                className="login-show-pass-btn"
                onClick={() => setShowPass((v) => !v)}
                tabIndex={-1}
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                <span className="material-symbols-outlined">
                  {showPass ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
            {errors.password && <span className="login-error-msg">{errors.password}</span>}
          </div>

          {/* Forgot your password? Reset it */}
          <div className="login-forgot-row">
            <span className="login-forgot-text">Forgot your password?</span>
            <a href="#" className="login-reset-link">Reset it</a>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={`login-submit-btn${((loginMethod === "email" ? email.trim() : phone.trim()) && password) ? " active" : ""}${loading ? " loading" : ""}`}
            disabled={loading}
          >
            {loading ? <span className="login-spinner" /> : "Sign In"}
          </button>

          {/* Create an Account */}
          <div className="login-register-row">
            <a href="#" className="login-create-account-btn">Create an Account</a>
          </div>
        </form>
      </div>
    </div>
  );
}
