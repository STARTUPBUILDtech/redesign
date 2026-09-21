import { useState } from "react";

function HelpFaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ap-faq-item">
      <button
        type="button"
        className="ap-faq-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="ap-faq-q-label">Q:</span>
        <span className="ap-faq-q-text">{question}</span>
        <span className={`ap-faq-chevron material-symbols-outlined${open ? " open" : ""}`}>
          expand_more
        </span>
      </button>
      {open && <div className="ap-faq-answer">{answer}</div>}
    </div>
  );
}

export default function HelpDrawer({
  isOpen,
  onClose,
  onOpenChat,
  faqs,
}) {
  if (!isOpen) return null;

  const defaultFaqs = [
    {
      q: "How does PayKudi protect my payment?",
      a: "PayKudi holds your funds in a secure escrow account until you confirm receipt of your item. This protects you against fraud, damages, and non-delivery.",
    },
    {
      q: "When are funds released to the seller?",
      a: "Funds are released to the seller only after the buyer inspects and confirms delivery in Payment Room.",
    },
    {
      q: "Which payment methods are accepted?",
      a: "PayKudi accepts instant bank transfers from all verified Nigerian banks into your dedicated PayKudi account.",
    },
    {
      q: "Can I cancel this order or request a refund?",
      a: "Yes, you can request cancellation before dispatch. If an item arrives damaged or incorrect, open a dispute for a full 100% money-back refund.",
    },
  ];

  const items = faqs && faqs.length > 0 ? faqs : defaultFaqs;

  return (
    <div className="ap-help-backdrop" onClick={onClose}>
      <div className="ap-help-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Black/Adaptive Header */}
        <div className="ap-help-header">
          <span className="ap-help-header-title">Order Help and FAQ's</span>
          <button
            type="button"
            className="ap-help-close-btn"
            onClick={onClose}
            aria-label="Close Help"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="ap-help-body">
          {/* Important Step Banner */}
          <div className="ap-help-banner">
            <span className="ap-help-banner-icon material-symbols-outlined">emoji_objects</span>
            <p>
              <strong>Important Step:</strong> Every transaction is backed by PayKudi Escrow Protection. Both buyer and seller are fully covered from payment until verified delivery.
            </p>
          </div>

          {/* FAQ Accordion */}
          {items.map((item, idx) => (
            <HelpFaqItem
              key={idx}
              question={item.q || item.question}
              answer={item.a || item.answer}
            />
          ))}
        </div>

        {/* Footer Buttons */}
        <div className="ap-help-footer">
          <button
            type="button"
            className="ap-help-report-btn"
            onClick={() => {
              window.open("https://wa.me/2348032001585", "_blank");
            }}
          >
            <span className="material-symbols-outlined">flag</span>
            Report Issue
          </button>
          <button
            type="button"
            className="ap-help-chat-btn"
            onClick={() => {
              onClose();
              if (onOpenChat) onOpenChat();
            }}
          >
            <span className="material-symbols-outlined">headset_mic</span>
            Chat with PayKudi
          </button>
        </div>
      </div>
    </div>
  );
}
