import { useState, useEffect } from "react";
import "../../styles/order-help-modal.css";

function HelpFaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ap-order-help-faq-card">
      <button
        type="button"
        className="ap-order-help-faq-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="ap-order-help-faq-title-wrap">
          <span className="ap-order-help-faq-q">Q:</span>
          <span className="ap-order-help-faq-question">{question}</span>
        </div>
        <span
          className={`material-symbols-outlined ap-order-help-faq-chevron${
            open ? " open" : ""
          }`}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div className="ap-order-help-faq-answer">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function HelpDrawer({
  isOpen,
  onClose,
  onOpenChat,
  onReportIssue,
  faqs,
}) {
  const [headerBottom, setHeaderBottom] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      // On mobile screens, the screen container already starts directly under the PayKudi header.
      // Top 0 allows it to cover the screen sub-header (Confirm Delivery) and sit flush under PayKudi.
      const isMobile =
        window.innerWidth <= 700 ||
        document.querySelector(".mobile-dashboard") ||
        document.querySelector(".mobile-awaiting-payment-screen");

      if (isMobile) {
        setHeaderBottom(0);
      } else {
        const desktopHeader = document.querySelector(".topbar");
        if (desktopHeader) {
          setHeaderBottom(desktopHeader.getBoundingClientRect().bottom);
        } else {
          setHeaderBottom(0);
        }
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [isOpen]);

  if (!isOpen) return null;

  const defaultFaqs = [
    {
      q: "How does PayKudi protect my payment?",
      a: "PayKudi holds your funds in a secure escrow account until you confirm receipt of your order. If there are any issues with your order, your money remains safe and refundable.",
    },
    {
      q: "How long do I have to complete my payment?",
      a: "You have until the countdown timer expires (typically 30 minutes to 1 hour) to complete your bank transfer to the designated PayKudi account.",
    },
    {
      q: "Which payment methods are accepted?",
      a: "We accept direct bank transfers from all verified Nigerian banks via mobile banking apps, USSD, or internet banking to the dedicated virtual account shown.",
    },
    {
      q: "Can I cancel this order before paying?",
      a: "Yes, if you haven't made payment yet, you can cancel the order directly in the payment room without any penalty.",
    },
  ];

  const items = faqs && faqs.length > 0 ? faqs : defaultFaqs;

  return (
    <div
      className="ap-order-help-backdrop"
      style={{ top: `${headerBottom}px` }}
      onClick={onClose}
    >
      <div
        className="ap-order-help-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="ap-order-help-header">
          <h2 className="ap-order-help-title">Order Help and Faq's</h2>
          <button
            type="button"
            className="ap-order-help-close-btn"
            onClick={onClose}
            aria-label="Close Help"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              close
            </span>
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="ap-order-help-body">
          {/* Important Step Alert Box */}
          <div className="ap-order-help-alert">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              className="ap-order-help-alert-icon"
              aria-hidden="true"
            >
              <path
                d="M9 17h6M10 20h4M12 3a6.5 6.5 0 0 0-4.2 11.5c.7.6 1.2 1.5 1.2 2.5h6c0-1 .5-1.9 1.2-2.5A6.5 6.5 0 0 0 12 3z"
                stroke="#d97706"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19 1.5 C19 2.8 19.6 3.4 21 3.4 C19.6 3.4 19 4 19 5.3 C19 4 18.4 3.4 17 3.4 C18.4 3.4 19 2.8 19 1.5 Z"
                fill="#d97706"
              />
            </svg>
            <p className="ap-order-help-alert-text">
              <strong>Important Step:</strong> Make a payment to the PayKudi-verified
              account shown in your payment room. Once confirmed, payment protection
              becomes active.
            </p>
          </div>

          {/* FAQ List */}
          <div className="ap-order-help-faqs">
            {items.map((item, idx) => (
              <HelpFaqItem
                key={idx}
                question={item.q || item.question}
                answer={item.a || item.answer}
              />
            ))}
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="ap-order-help-footer">
          <button
            type="button"
            className="ap-order-help-btn-report"
            onClick={() => {
              onClose();
              if (onReportIssue) {
                onReportIssue();
              } else {
                window.open("https://wa.me/2348032001585", "_blank");
              }
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              gavel
            </span>
            <span>Report Issue</span>
          </button>
          <button
            type="button"
            className="ap-order-help-btn-chat"
            onClick={() => {
              onClose();
              if (onOpenChat) onOpenChat();
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              support_agent
            </span>
            <span>Chat with Paykudi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
