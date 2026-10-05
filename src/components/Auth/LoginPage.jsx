import { useState, useEffect, useRef } from "react";
import paykudiLogo from "../../assets/paykudi-logo.png";
import logoDarkMode from "../../assets/logodarkmode.png";
import image1 from "../../assets/image-1.png";
import image2 from "../../assets/image-2.png";
import image3 from "../../assets/image-3.png";
import image4 from "../../assets/image-4.png";
import image5 from "../../assets/image-5.png";
import "../../styles/login.css";

const SLIDES = [
  {
    id: 1,
    image: image1,
    title: "Buy it. We've got your back.",
    subtitle: "Pay on PayKudi and your money stays safe until your order arrives.",
  },
  {
    id: 2,
    image: image2,
    title: "Strangers can trade safely now.",
    subtitle: "Buy or sell with anyone. Both sides stay protected.",
  },
  {
    id: 3,
    image: image3,
    title: "Love it? Then they get paid.",
    subtitle: "Check your order first. Pay the seller only when you're happy.",
  },
  {
    id: 4,
    image: image4,
    title: "Your money waits till it arrives.",
    subtitle: "We hold your payment while your order is on the way.",
  },
  {
    id: 5,
    image: image5,
    title: "Pay without the worry.",
    subtitle: 'No more "send first" stress. Pay only when it\'s right.',
  },
];

function EmailIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function WhatsAppIcon({ size = 18, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.71 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.414z" />
    </svg>
  );
}

function PaykudiQRCode() {
  return (
    <div className="login-qr-card" title="Scan to download PayKudi mobile app">
      <div className="login-qr-inner">
        <svg viewBox="0 0 100 100" className="login-qr-svg" fill="currentColor" aria-hidden="true">
          <rect x="2" y="2" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
          <rect x="8" y="8" width="16" height="16" rx="2" fill="currentColor" />
          <rect x="70" y="2" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
          <rect x="76" y="8" width="16" height="16" rx="2" fill="currentColor" />
          <rect x="2" y="70" width="28" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="4" />
          <rect x="8" y="76" width="16" height="16" rx="2" fill="currentColor" />
          <rect x="36" y="6" width="6" height="5" rx="1" fill="currentColor" />
          <rect x="48" y="6" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="58" y="6" width="6" height="5" rx="1" fill="currentColor" />
          <rect x="36" y="16" width="8" height="5" rx="1" fill="currentColor" />
          <rect x="52" y="16" width="10" height="5" rx="1" fill="currentColor" />
          <rect x="6" y="36" width="5" height="6" rx="1" fill="currentColor" />
          <rect x="6" y="48" width="6" height="5" rx="1" fill="currentColor" />
          <rect x="6" y="58" width="5" height="6" rx="1" fill="currentColor" />
          <rect x="16" y="40" width="6" height="8" rx="1" fill="currentColor" />
          <rect x="88" y="36" width="6" height="6" rx="1" fill="currentColor" />
          <rect x="88" y="48" width="5" height="6" rx="1" fill="currentColor" />
          <rect x="88" y="58" width="6" height="5" rx="1" fill="currentColor" />
          <rect x="76" y="42" width="6" height="8" rx="1" fill="currentColor" />
          <rect x="38" y="68" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="52" y="68" width="6" height="5" rx="1" fill="currentColor" />
          <rect x="42" y="78" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="56" y="78" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="38" y="86" width="6" height="6" rx="1" fill="currentColor" />
          <rect x="52" y="86" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="68" y="72" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="82" y="72" width="6" height="5" rx="1" fill="currentColor" />
          <rect x="74" y="84" width="5" height="5" rx="1" fill="currentColor" />
          <rect x="86" y="84" width="6" height="5" rx="1" fill="currentColor" />
          <rect x="35" y="35" width="30" height="30" rx="4" fill="#000000" />
          <text x="50" y="52" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle" letterSpacing="0.5">
            PAY
          </text>
          <text x="50" y="61" fill="#ffffff" fontSize="8" fontWeight="800" fontFamily="Inter, system-ui, sans-serif" textAnchor="middle" letterSpacing="0.5">
            KUDI
          </text>
        </svg>
      </div>
    </div>
  );
}

export default function LoginPage({ dark, onLogin }) {
  // Slideshow State
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const slideTimerRef = useRef(null);

  // View:
  // "menu" | "email" | "email-pass" | "whatsapp" | "whatsapp-pass"
  // "signup-phone" | "signup-otp" | "signup-password" | "signup-name" | "signup-extra"
  const [view, setView] = useState("menu");

  // Sign in state
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Sign up state
  const [signupPhone, setSignupPhone] = useState("");
  const [signupOtp, setSignupOtp] = useState(["", "", "", "", "", ""]);
  const [signupPassword, setSignupPassword] = useState("");
  const [signupShowPass, setSignupShowPass] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupUsername, setSignupUsername] = useState("");

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [submittingStep, setSubmittingStep] = useState(null);

  // OTP input refs
  const otpInputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // Auto-advance slides every 5.5 seconds unless paused
  useEffect(() => {
    if (isPaused) return;
    slideTimerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 5500);

    return () => clearInterval(slideTimerRef.current);
  }, [isPaused]);

  const handleMenuSelect = (selectedView) => {
    setErrors({});
    setSubmittingStep(null);
    setView(selectedView);
  };

  const handleBackToMenu = () => {
    setErrors({});
    setSubmittingStep(null);
    setOtpVerifying(false);
    setLoading(false);
    setView("menu");
  };

  /* ── Sign In with Email ── */
  const handleEmailStep1 = (e) => {
    e.preventDefault();
    if (submittingStep) return;
    if (!email.trim()) {
      setErrors({ email: "Email address is required" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }
    setErrors({});
    setSubmittingStep("email");
    setTimeout(() => {
      setSubmittingStep(null);
      setView("email-pass");
    }, 1500);
  };

  const handleEmailStep2 = (e) => {
    e.preventDefault();
    if (loading) return;
    if (!password) {
      setErrors({ password: "Password is required" });
      return;
    }
    submitLogin();
  };

  /* ── Sign In with WhatsApp ── */
  const handleWhatsAppStep1 = (e) => {
    e.preventDefault();
    if (submittingStep) return;
    const clean = phone.replace(/\D/g, "");
    if (!phone.trim()) {
      setErrors({ phone: "WhatsApp phone number is required" });
      return;
    }
    if (clean.length < 10) {
      setErrors({ phone: "Enter a valid 10 or 11-digit phone number" });
      return;
    }
    setErrors({});
    setSubmittingStep("whatsapp");
    setTimeout(() => {
      setSubmittingStep(null);
      setView("whatsapp-pass");
    }, 1500);
  };

  const handleWhatsAppStep2 = (e) => {
    e.preventDefault();
    if (loading) return;
    if (!password) {
      setErrors({ password: "Password is required" });
      return;
    }
    submitLogin();
  };

  /* ── Sign Up Flow (WhatsApp First -> OTP -> Password -> Name -> Optional Details) ── */
  
  // Step 1: WhatsApp phone input
  const handleSignupPhoneSubmit = (e) => {
    e.preventDefault();
    if (submittingStep) return;
    const clean = signupPhone.replace(/\D/g, "");
    if (!signupPhone.trim()) {
      setErrors({ signupPhone: "WhatsApp phone number is required" });
      return;
    }
    if (clean.length < 10) {
      setErrors({ signupPhone: "Enter a valid 10 or 11-digit phone number" });
      return;
    }
    setErrors({});
    setSubmittingStep("signup-phone");
    setTimeout(() => {
      setSubmittingStep(null);
      setView("signup-otp");
    }, 1500);
  };

  // Step 2: OTP input handlers & Auto-Verify
  const triggerOtpVerification = (code) => {
    if (otpVerifying) return;
    setErrors({});
    setOtpVerifying(true);
    setTimeout(() => {
      setOtpVerifying(false);
      setView("signup-password");
    }, 2200);
  };

  const handleOtpDigitChange = (index, val) => {
    if (otpVerifying) return;
    const clean = val.replace(/\D/g, "");
    const updated = [...signupOtp];

    if (!clean) {
      updated[index] = "";
      setSignupOtp(updated);
      return;
    }

    if (clean.length > 1) {
      // Pasted code
      for (let i = 0; i < 6 && index + i < 6; i++) {
        if (clean[i]) updated[index + i] = clean[i];
      }
      setSignupOtp(updated);
      const nextIdx = Math.min(index + clean.length, 5);
      otpInputRefs[nextIdx]?.current?.focus();
      if (updated.join("").length === 6 && updated.every((d) => d !== "")) {
        triggerOtpVerification(updated.join(""));
      }
      return;
    }

    updated[index] = clean[clean.length - 1];
    setSignupOtp(updated);
    if (index < 5) {
      otpInputRefs[index + 1]?.current?.focus();
    }
    // Auto-trigger when 6 digits are complete!
    if (updated.join("").length === 6 && updated.every((d) => d !== "")) {
      triggerOtpVerification(updated.join(""));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !signupOtp[index] && index > 0) {
      otpInputRefs[index - 1]?.current?.focus();
    }
  };

  const handleFillDemoOtp = () => {
    if (otpVerifying) return;
    const demo = ["1", "2", "3", "4", "5", "6"];
    setSignupOtp(demo);
    otpInputRefs[5]?.current?.focus();
    triggerOtpVerification("123456");
  };

  const handleSignupOtpSubmit = (e) => {
    e.preventDefault();
    const otpCode = signupOtp.join("");
    if (otpCode.length < 6) {
      setErrors({ otp: "Please enter the complete 6-digit code" });
      return;
    }
    triggerOtpVerification(otpCode);
  };

  // Step 3: Password creation
  const handleSignupPasswordSubmit = (e) => {
    e.preventDefault();
    if (submittingStep) return;
    if (!signupPassword || signupPassword.length < 6) {
      setErrors({ signupPassword: "Password must be at least 6 characters" });
      return;
    }
    setErrors({});
    setSubmittingStep("signup-password");
    setTimeout(() => {
      setSubmittingStep(null);
      setView("signup-name");
    }, 1500);
  };

  // Step 4: Name input (Required first)
  const handleSignupNameSubmit = (e) => {
    e.preventDefault();
    if (submittingStep) return;
    if (!signupName.trim()) {
      setErrors({ signupName: "Full name is required" });
      return;
    }
    setErrors({});
    setSubmittingStep("signup-name");
    setTimeout(() => {
      setSubmittingStep(null);
      setView("signup-extra");
    }, 1500);
  };

  // Step 5: Optional extra details or skip
  const handleCompleteRegistration = (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    submitLogin();
  };

  const submitLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin?.();
    }, 1800);
  };

  return (
    <div className={`kuda-login-layout ${dark ? "theme-dark" : "theme-light"}`}>
      {/* ══════════════════════════════════════════════════════════════
          LEFT PANEL: Ambient Gradient + Parakeet-style Card
         ══════════════════════════════════════════════════════════════ */}
      <section className="kuda-login-left">
        {/* Brand Logo in Top-Left Corner */}
        <div className="pk-auth-top-left-logo">
          <img
            src={dark ? logoDarkMode : paykudiLogo}
            alt="PayKudi"
            className="pk-auth-logo"
          />
        </div>

        <main className="pk-auth-main">
          {/* Elevated Rounded Center Card */}
          <div className="pk-auth-card">
            <div key={view} className="pk-view-anim">
              {/* ══════════════════════════════════════════════════════════════
                  VIEW 1: Main Menu Options
                 ══════════════════════════════════════════════════════════════ */}
              {view === "menu" && (
                <>
                  <h1 className="pk-card-title">Sign in to PayKudi</h1>

                  <div className="pk-auth-actions">
                    {/* 1. Continue with Email */}
                    <button
                      type="button"
                      className="pk-btn-primary"
                      onClick={() => handleMenuSelect("email")}
                    >
                      <EmailIcon size={18} />
                      <span>Continue with Email</span>
                    </button>

                    {/* 2. Continue with WhatsApp */}
                    <button
                      type="button"
                      className="pk-btn-primary"
                      onClick={() => handleMenuSelect("whatsapp")}
                    >
                      <WhatsAppIcon size={18} color="#25D366" />
                      <span>Continue with WhatsApp</span>
                    </button>

                    {/* Divider */}
                    <div className="pk-auth-divider" role="separator">
                      <span>OR</span>
                    </div>

                    {/* 3. Create an Account (starts with WhatsApp) */}
                    <button
                      type="button"
                      className="pk-btn-secondary"
                      onClick={() => handleMenuSelect("signup-phone")}
                    >
                      <span>Create an Account</span>
                    </button>
                  </div>
                </>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  VIEW 2: What's your email address? (Sign in)
                 ══════════════════════════════════════════════════════════════ */}
              {view === "email" && (
                <>
                  <h1 className="pk-step-title">What’s your email address?</h1>

                  <form onSubmit={handleEmailStep1} noValidate>
                    <div className="pk-step-input-wrap">
                      <input
                        type="email"
                        className="pk-step-input"
                        placeholder="Enter email address"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (errors.email) setErrors((p) => ({ ...p, email: "" }));
                        }}
                        autoComplete="email"
                        autoFocus
                      />
                      {errors.email && <span className="pk-error-text">{errors.email}</span>}
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                      <button
                        type="submit"
                        className={`pk-step-button ${email.trim() ? "active" : ""} ${submittingStep === "email" ? "is-loading" : ""}`}
                        disabled={submittingStep === "email"}
                      >
                        <span className="pk-btn-text">Continue with Email</span>
                        <span className="pk-btn-spinner" aria-hidden="true" />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="pk-step-back-link"
                      onClick={handleBackToMenu}
                    >
                      Back to login
                    </button>
                  </form>
                </>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  VIEW 2B: Enter your password (Email Step 2)
                 ══════════════════════════════════════════════════════════════ */}
              {view === "email-pass" && (
                <>
                  <h1 className="pk-step-title">Enter your password</h1>

                  <form onSubmit={handleEmailStep2} noValidate>
                    <div className="pk-step-input-wrap">
                      <div className="pk-input-box" style={{ borderRadius: "8px", height: "48px" }}>
                        <input
                          type={showPass ? "text" : "password"}
                          className="pk-input-field"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password) setErrors((p) => ({ ...p, password: "" }));
                          }}
                          autoComplete="current-password"
                          autoFocus
                        />
                        <button
                          type="button"
                          className="pk-pass-toggle"
                          onClick={() => setShowPass(!showPass)}
                          tabIndex={-1}
                          aria-label={showPass ? "Hide password" : "Show password"}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "19px" }}>
                            {showPass ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                      {errors.password && <span className="pk-error-text">{errors.password}</span>}
                    </div>

                    <div className="pk-forgot-row" style={{ marginBottom: "14px" }}>
                      <a href="#reset" className="pk-forgot-link" onClick={(e) => e.preventDefault()}>
                        Forgot your password?
                      </a>
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                      <button
                        type="submit"
                        className={`pk-step-button ${password ? "active" : ""} ${loading ? "is-loading" : ""}`}
                        disabled={loading}
                      >
                        <span className="pk-btn-text">Sign in to PayKudi</span>
                        <span className="pk-btn-spinner" aria-hidden="true" />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="pk-step-back-link"
                      onClick={handleBackToMenu}
                    >
                      Back to login
                    </button>
                  </form>
                </>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  VIEW 3: What's your WhatsApp number? (Sign in)
                 ══════════════════════════════════════════════════════════════ */}
              {view === "whatsapp" && (
                <>
                  <h1 className="pk-step-title">What’s your WhatsApp number?</h1>

                  <form onSubmit={handleWhatsAppStep1} noValidate>
                    <div className="pk-step-input-wrap">
                      <div className="pk-phone-step-box">
                        <span className="pk-phone-prefix">
                          <svg width="18" height="12" viewBox="0 0 20 14" aria-hidden="true">
                            <rect width="20" height="14" fill="#008751" />
                            <rect x="6.67" width="6.66" height="14" fill="#ffffff" />
                          </svg>
                          <span>+234</span>
                        </span>
                        <input
                          type="tel"
                          className="pk-phone-step-field"
                          placeholder="Enter WhatsApp number"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            if (errors.phone) setErrors((p) => ({ ...p, phone: "" }));
                          }}
                          autoComplete="tel"
                          autoFocus
                        />
                      </div>
                      {errors.phone && <span className="pk-error-text">{errors.phone}</span>}
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                      <button
                        type="submit"
                        className={`pk-step-button ${phone.trim() ? "active" : ""} ${submittingStep === "whatsapp" ? "is-loading" : ""}`}
                        disabled={submittingStep === "whatsapp"}
                      >
                        <span className="pk-btn-text">Continue with WhatsApp</span>
                        <span className="pk-btn-spinner" aria-hidden="true" />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="pk-step-back-link"
                      onClick={handleBackToMenu}
                    >
                      Back to login
                    </button>
                  </form>
                </>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  VIEW 3B: Enter your password (WhatsApp Sign in Step 2)
                 ══════════════════════════════════════════════════════════════ */}
              {view === "whatsapp-pass" && (
                <>
                  <h1 className="pk-step-title">Enter your password</h1>

                  <form onSubmit={handleWhatsAppStep2} noValidate>
                    <div className="pk-step-input-wrap">
                      <div className="pk-input-box" style={{ borderRadius: "8px", height: "48px" }}>
                        <input
                          type={showPass ? "text" : "password"}
                          className="pk-input-field"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password) setErrors((p) => ({ ...p, password: "" }));
                          }}
                          autoComplete="current-password"
                          autoFocus
                        />
                        <button
                          type="button"
                          className="pk-pass-toggle"
                          onClick={() => setShowPass(!showPass)}
                          tabIndex={-1}
                          aria-label={showPass ? "Hide password" : "Show password"}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "19px" }}>
                            {showPass ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                      {errors.password && <span className="pk-error-text">{errors.password}</span>}
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                      <button
                        type="submit"
                        className={`pk-step-button ${password ? "active" : ""} ${loading ? "is-loading" : ""}`}
                        disabled={loading}
                      >
                        <span className="pk-btn-text">Sign in to PayKudi</span>
                        <span className="pk-btn-spinner" aria-hidden="true" />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="pk-step-back-link"
                      onClick={handleBackToMenu}
                    >
                      Back to login
                    </button>
                  </form>
                </>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  CREATE ACCOUNT FLOW:
                  1. WhatsApp Number
                  2. Verify with OTP
                  3. Prompt Password
                  4. Name First (Required)
                  5. Other Details (Can be Skipped)
                 ══════════════════════════════════════════════════════════════ */}

              {/* ── Sign Up Step 1: WhatsApp Number ── */}
              {view === "signup-phone" && (
                <>
                  <h1 className="pk-step-title">What’s your WhatsApp number?</h1>
                  <p className="pk-step-subtitle">We’ll send a 6-digit OTP verification code</p>

                  <form onSubmit={handleSignupPhoneSubmit} noValidate>
                    <div className="pk-step-input-wrap">
                      <div className="pk-phone-step-box">
                        <span className="pk-phone-prefix">
                          <svg width="18" height="12" viewBox="0 0 20 14" aria-hidden="true">
                            <rect width="20" height="14" fill="#008751" />
                            <rect x="6.67" width="6.66" height="14" fill="#ffffff" />
                          </svg>
                          <span>+234</span>
                        </span>
                        <input
                          type="tel"
                          className="pk-phone-step-field"
                          placeholder="Enter WhatsApp number"
                          value={signupPhone}
                          onChange={(e) => {
                            setSignupPhone(e.target.value);
                            if (errors.signupPhone) setErrors((p) => ({ ...p, signupPhone: "" }));
                          }}
                          autoComplete="tel"
                          autoFocus
                        />
                      </div>
                      {errors.signupPhone && <span className="pk-error-text">{errors.signupPhone}</span>}
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                      <button
                        type="submit"
                        className={`pk-step-button ${signupPhone.trim() ? "active" : ""} ${submittingStep === "signup-phone" ? "is-loading" : ""}`}
                        disabled={submittingStep === "signup-phone"}
                      >
                        <span className="pk-btn-text">Continue</span>
                        <span className="pk-btn-spinner" aria-hidden="true" />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="pk-step-back-link"
                      onClick={handleBackToMenu}
                    >
                      Back to login
                    </button>
                  </form>
                </>
              )}

              {/* ── Sign Up Step 2: Verify with OTP ── */}
              {view === "signup-otp" && (
                <>
                  <h1 className="pk-step-title">Enter verification code</h1>
                  <p className="pk-step-subtitle">
                    Sent via WhatsApp to <strong>+234 {signupPhone}</strong>
                  </p>

                  <form onSubmit={handleSignupOtpSubmit} noValidate>
                    <div className="pk-otp-row">
                      {signupOtp.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={otpInputRefs[idx]}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          className="pk-otp-digit"
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          autoFocus={idx === 0}
                        />
                      ))}
                    </div>

                    {errors.otp && (
                      <div style={{ textAlign: "center", marginBottom: "12px" }}>
                        <span className="pk-error-text">{errors.otp}</span>
                      </div>
                    )}

                    <div className="pk-otp-helper">
                      Didn't get code?
                      <button
                        type="button"
                        className="pk-resend-btn"
                        onClick={handleFillDemoOtp}
                      >
                        Auto-fill demo code (123456)
                      </button>
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                      <button
                        type="submit"
                        className={`pk-step-button ${signupOtp.join("").length === 6 ? "active" : ""} ${otpVerifying ? "is-loading" : ""}`}
                        disabled={otpVerifying}
                      >
                        <span className="pk-btn-text">Verify code</span>
                        <span className="pk-btn-spinner" aria-hidden="true" />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="pk-step-back-link"
                      onClick={handleBackToMenu}
                    >
                      Back to login
                    </button>
                  </form>
                </>
              )}

              {/* ── Sign Up Step 3: Prompt Password ── */}
              {view === "signup-password" && (
                <>
                  <h1 className="pk-step-title">Create a password</h1>
                  <p className="pk-step-subtitle">Choose a secure password to protect your account</p>

                  <form onSubmit={handleSignupPasswordSubmit} noValidate>
                    <div className="pk-step-input-wrap">
                      <div className="pk-input-box" style={{ borderRadius: "8px", height: "48px" }}>
                        <input
                          type={signupShowPass ? "text" : "password"}
                          className="pk-input-field"
                          placeholder="At least 6 characters"
                          value={signupPassword}
                          onChange={(e) => {
                            setSignupPassword(e.target.value);
                            if (errors.signupPassword) setErrors((p) => ({ ...p, signupPassword: "" }));
                          }}
                          autoComplete="new-password"
                          autoFocus
                        />
                        <button
                          type="button"
                          className="pk-pass-toggle"
                          onClick={() => setSignupShowPass(!signupShowPass)}
                          tabIndex={-1}
                          aria-label={signupShowPass ? "Hide password" : "Show password"}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "19px" }}>
                            {signupShowPass ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                      {errors.signupPassword && (
                        <span className="pk-error-text">{errors.signupPassword}</span>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                      <button
                        type="submit"
                        className={`pk-step-button ${signupPassword.length >= 6 ? "active" : ""} ${submittingStep === "signup-password" ? "is-loading" : ""}`}
                        disabled={submittingStep === "signup-password"}
                      >
                        <span className="pk-btn-text">Continue</span>
                        <span className="pk-btn-spinner" aria-hidden="true" />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="pk-step-back-link"
                      onClick={handleBackToMenu}
                    >
                      Back to login
                    </button>
                  </form>
                </>
              )}

              {/* ── Sign Up Step 4: Name First (Required) ── */}
              {view === "signup-name" && (
                <>
                  <h1 className="pk-step-title">What’s your full name?</h1>
                  <p className="pk-step-subtitle">This name will appear on all your trade rooms</p>

                  <form onSubmit={handleSignupNameSubmit} noValidate>
                    <div className="pk-step-input-wrap">
                      <input
                        type="text"
                        className="pk-step-input"
                        placeholder="e.g. Amaka Obi"
                        value={signupName}
                        onChange={(e) => {
                          setSignupName(e.target.value);
                          if (errors.signupName) setErrors((p) => ({ ...p, signupName: "" }));
                        }}
                        autoComplete="name"
                        autoFocus
                      />
                      {errors.signupName && (
                        <span className="pk-error-text">{errors.signupName}</span>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                      <button
                        type="submit"
                        className={`pk-step-button ${signupName.trim() ? "active" : ""} ${submittingStep === "signup-name" ? "is-loading" : ""}`}
                        disabled={submittingStep === "signup-name"}
                      >
                        <span className="pk-btn-text">Continue</span>
                        <span className="pk-btn-spinner" aria-hidden="true" />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="pk-step-back-link"
                      onClick={handleBackToMenu}
                    >
                      Back to login
                    </button>
                  </form>
                </>
              )}

              {/* ── Sign Up Step 5: Other Details (Can Be Skipped) ── */}
              {view === "signup-extra" && (
                <>
                  <h1 className="pk-step-title">Additional details</h1>

                  <form onSubmit={handleCompleteRegistration} noValidate>
                    <div className="pk-step-input-wrap">
                      <label className="pk-input-label" style={{ marginBottom: "2px" }}>
                        Email address <span style={{ opacity: 0.6, fontWeight: 400 }}>(Optional)</span>
                      </label>
                      <input
                        type="email"
                        className="pk-step-input"
                        placeholder="name@example.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        autoComplete="email"
                      />
                    </div>

                    <div className="pk-step-input-wrap" style={{ marginBottom: "20px" }}>
                      <label className="pk-input-label" style={{ marginBottom: "2px" }}>
                        Username <span style={{ opacity: 0.6, fontWeight: 400 }}>(Optional)</span>
                      </label>
                      <input
                        type="text"
                        className="pk-step-input"
                        placeholder="@username"
                        value={signupUsername}
                        onChange={(e) => setSignupUsername(e.target.value)}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                      <button
                        type="submit"
                        className={`pk-step-button active ${loading ? "is-loading" : ""}`}
                        disabled={loading}
                      >
                        <span className="pk-btn-text">Complete Setup</span>
                        <span className="pk-btn-spinner" aria-hidden="true" />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="pk-skip-btn"
                      onClick={() => submitLogin()}
                      disabled={loading}
                    >
                      Skip for now
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="pk-auth-footer">
            By continuing, you agree to PayKudi's{" "}
            <a href="#terms" onClick={(e) => e.preventDefault()}>
              Terms and Conditions
            </a>{" "}
            and{" "}
            <a href="#privacy" onClick={(e) => e.preventDefault()}>
              Privacy Policy
            </a>
            .
          </footer>
        </main>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT PANEL: Slideshow Showcase (Images 1 - 5)
         ══════════════════════════════════════════════════════════════ */}
      <section
        className="kuda-login-right"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        aria-label="Product Showcase"
      >
        {/* Slide Images with crossfade */}
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

        {/* Slide Captions Bar & Pagination Dots */}
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
