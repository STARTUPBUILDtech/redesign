import { useState, useEffect, useRef } from "react";
import "../../styles/support-slideup-modal.css";

/* ── Calculate exact bottom of the PayKudi header ── */
export function useHeaderBottom(isOpen) {
  const [headerBottom, setHeaderBottom] = useState(44);

  useEffect(() => {
    if (!isOpen) return;

    document.body.classList.add("pk-modal-up");
    document.documentElement.classList.add("pk-modal-up");

    const calculateHeaderBottom = () => {
      const isMobile =
        window.innerWidth <= 700 ||
        document.querySelector(".mobile-dashboard") ||
        document.querySelector(".mobile-awaiting-payment-screen");

      if (isMobile) {
        const mobileHeader = document.querySelector(".mobile-header");
        if (mobileHeader) {
          const rect = mobileHeader.getBoundingClientRect();
          setHeaderBottom(rect.bottom > 0 ? rect.bottom : 44);
        } else {
          setHeaderBottom(44);
        }
      } else {
        const topbar = document.querySelector(".topbar");
        if (topbar) {
          const rect = topbar.getBoundingClientRect();
          setHeaderBottom(rect.bottom > 0 ? rect.bottom : 96);
        } else {
          setHeaderBottom(96);
        }
      }
    };

    calculateHeaderBottom();
    window.addEventListener("resize", calculateHeaderBottom);
    window.addEventListener("scroll", calculateHeaderBottom);
    return () => {
      document.body.classList.remove("pk-modal-up");
      document.documentElement.classList.remove("pk-modal-up");
      window.removeEventListener("resize", calculateHeaderBottom);
      window.removeEventListener("scroll", calculateHeaderBottom);
    };
  }, [isOpen]);

  return headerBottom;
}

/* ── Header Icons matching screenshots ── */
function WhiteHeadsetIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13a8 8 0 0 1 16 0" />
      <rect x="2.5" y="11" width="3.5" height="6.5" rx="1.75" fill="#ffffff" fillOpacity="0.25" />
      <rect x="18" y="11" width="3.5" height="6.5" rx="1.75" fill="#ffffff" fillOpacity="0.25" />
      <path d="M7 13a5 5 0 0 0 10 0" />
      <circle cx="9.5" cy="12.5" r="0.8" fill="#ffffff" />
      <circle cx="14.5" cy="12.5" r="0.8" fill="#ffffff" />
      <path d="M4.2 16.5v1.2a2.5 2.5 0 0 0 2.5 2.5h3.8" />
      <circle cx="11.5" cy="20.2" r="1.2" fill="#ffffff" />
    </svg>
  );
}

function WhiteRobotIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3" />
      <circle cx="12" cy="2.5" r="1" fill="#ffffff" />
      <rect x="4.5" y="6" width="15" height="13" rx="3.5" />
      <path d="M2.5 11v3" />
      <path d="M21.5 11v3" />
      <rect x="8" y="10" width="2.2" height="2.2" rx="0.5" fill="#ffffff" />
      <rect x="13.8" y="10" width="2.2" height="2.2" rx="0.5" fill="#ffffff" />
      <path d="M8.5 15h7" />
    </svg>
  );
}

function WhiteQuestionIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M9.8 9a2.5 2.5 0 0 1 4.4 1.4c0 1.2-1.7 1.8-1.7 2.8" />
      <circle cx="12.5" cy="16.2" r="0.75" fill="#ffffff" />
    </svg>
  );
}

function SendPlaneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" />
    </svg>
  );
}

/* ==========================================================================
   IMAGE 1: SEND US A MESSAGE SLIDE-UP MODAL
   ========================================================================== */
export function SendMessageSlideUpModal({ isOpen, onClose }) {
  const headerBottom = useHeaderBottom(isOpen);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "agent",
      text: "Hello! Welcome to PayKudi 24/7 Resolution Support. We have connected you to an active resolution specialist. How can we help you today?",
      time: "Just now",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const threadEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "agent",
          text: "Thank you for reaching out. A specialist is reviewing your inquiry and will follow up in this channel shortly.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 900);
  };

  return (
    <div
      className="pk-slideup-backdrop"
      style={{ top: `${headerBottom}px` }}
      onClick={onClose}
    >
      <div className="pk-slideup-container" onClick={(e) => e.stopPropagation()}>
        {/* Navy Header */}
        <div className="pk-slideup-header header-message">
          <div className="pk-slideup-header-left">
            <WhiteHeadsetIcon />
            <h2 className="pk-slideup-header-title">Send us a message</h2>
          </div>
          <button
            type="button"
            className="pk-slideup-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="pk-slideup-body">
          {/* Green Official Support Channel Badge */}
          <div className="pk-msg-official-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            <span>Official Support Channel</span>
          </div>

          <div className="pk-msg-thread">
            {messages.map((m) => (
              <div key={m.id} className={`pk-chat-bubble ${m.sender}`}>
                <div>{m.text}</div>
                <div className="pk-chat-time">{m.time}</div>
              </div>
            ))}
            <div ref={threadEndRef} />
          </div>
        </div>

        {/* Bottom Input Bar */}
        <form className="pk-slideup-bottom-bar" onSubmit={handleSend}>
          <button type="button" className="pk-bottom-plus-btn" title="Add attachment" aria-label="Add attachment">
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>add</span>
          </button>
          <div className="pk-bottom-input-wrap">
            <input
              type="text"
              className="pk-bottom-input"
              placeholder="Type a message to Support Agent..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>
          <button type="submit" className="pk-bottom-send-btn" aria-label="Send message">
            <SendPlaneIcon />
          </button>
        </form>
      </div>
    </div>
  );
}

/* ==========================================================================
   IMAGE 2: PAYKUDI ASSISTANT SLIDE-UP MODAL
   ========================================================================== */
export function BotAssistantSlideUpModal({ isOpen, onClose, room = {} }) {
  const headerBottom = useHeaderBottom(isOpen);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const threadEndRef = useRef(null);

  const orderNum = room.id || room.orderNumber || "ST-8845";
  const itemTitle = room.item || room.title || "Sony WH-1000XM5";
  const statusLabel = room.statusText || "Delivered (Inspection Window)";
  const userRole = room.role || "Buyer";

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [isOpen, chatMessages]);

  if (!isOpen) return null;

  const handleChipClick = (question, answer) => {
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "user", text: question },
      { id: Date.now() + 1, sender: "bot", text: answer },
    ]);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const q = inputText.trim();
    setInputText("");

    setChatMessages((prev) => [
      ...prev,
      { id: Date.now(), sender: "user", text: q },
    ]);

    setTimeout(() => {
      let reply = "I can assist with that! Your funds remain 100% safeguarded in escrow. If you have an active dispute or delivery concern, you can submit evidence or request support.";
      const lower = q.toLowerCase();
      if (lower.includes("window") || lower.includes("hour") || lower.includes("inspection")) {
        reply = "The 2-hour inspection window begins the moment delivery is confirmed. You can test and inspect the item thoroughly before funds are released.";
      } else if (lower.includes("damaged") || lower.includes("wrong") || lower.includes("fake")) {
        reply = "If the item is damaged or does not match specifications, do NOT confirm delivery. Tap 'Report Issue' or 'Dispute' to lock escrow and request a refund.";
      } else if (lower.includes("pay") || lower.includes("payout") || lower.includes("money")) {
        reply = "Once the buyer confirms delivery (or if the 2-hour window expires without dispute), funds are transferred directly to the seller's bank account within minutes.";
      }

      setChatMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: "bot", text: reply },
      ]);
    }, 700);
  };

  return (
    <div
      className="pk-slideup-backdrop"
      style={{ top: `${headerBottom}px` }}
      onClick={onClose}
    >
      <div className="pk-slideup-container" onClick={(e) => e.stopPropagation()}>
        {/* Emerald Green Header */}
        <div className="pk-slideup-header header-bot">
          <div className="pk-slideup-header-left">
            <WhiteRobotIcon />
            <h2 className="pk-slideup-header-title">PayKudi Assistant</h2>
          </div>
          <button
            type="button"
            className="pk-slideup-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="pk-slideup-body">
          {/* Welcome Card matching Image 2 */}
          <div className="pk-assistant-welcome-card">
            <p>
              Hello Marcus! 👋 I am your <strong>PayKudi Virtual Assistant</strong>.
            </p>
            <p>
              I see you are viewing <strong>Deal #{orderNum} ({itemTitle})</strong>, which is currently in <strong>{statusLabel}</strong> status as <strong>{userRole}</strong>.
            </p>
            <p>
              How can I help you today? Choose a suggested topic below or type your question:
            </p>
          </div>

          {/* Interactive Chat Stream if user asked questions */}
          {chatMessages.length > 0 && (
            <div className="pk-msg-thread" style={{ paddingTop: 0 }}>
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`pk-chat-bubble ${m.sender === "user" ? "user" : "agent"}`}
                  style={m.sender === "user" ? { backgroundColor: "#249e54" } : {}}
                >
                  <div>{m.text}</div>
                </div>
              ))}
              <div ref={threadEndRef} />
            </div>
          )}

          {/* Suggested Order Topics matching Image 2 */}
          <div className="pk-assistant-topics-wrap">
            <span className="pk-assistant-topics-label">SUGGESTED ORDER TOPICS</span>
            <div className="pk-assistant-chips-scroll">
              <button
                type="button"
                className="pk-assistant-chip-btn"
                onClick={() =>
                  handleChipClick(
                    "How 2-hr window works",
                    "The 2-hour window starts once package is delivered. You have 2 hours to test your item. If satisfied, confirm delivery. If not, tap 'Report Issue' to hold funds."
                  )
                }
              >
                How 2-hr window works
              </button>
              <button
                type="button"
                className="pk-assistant-chip-btn"
                onClick={() =>
                  handleChipClick(
                    "Item damaged or wrong",
                    "If the item arrived damaged or wrong, do NOT confirm delivery. Open the Dispute section to upload photos and lock the funds immediately."
                  )
                }
              >
                Item damaged or wrong
              </button>
              <button
                type="button"
                className="pk-assistant-chip-btn"
                onClick={() =>
                  handleChipClick(
                    "Payment status & release",
                    "Funds are safely held in escrow. Payouts are dispatched to the seller immediately once inspection is confirmed."
                  )
                }
              >
                Payment status & release
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Input Bar matching Image 2 */}
        <form className="pk-slideup-bottom-bar" onSubmit={handleSend}>
          <div className="pk-bottom-input-wrap">
            <input
              type="text"
              className="pk-bottom-input"
              placeholder="Ask PayKudi Assistant a question..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="pk-bottom-send-btn"
            style={{ backgroundColor: "#249e54" }}
            aria-label="Send question"
          >
            <SendPlaneIcon />
          </button>
        </form>
      </div>
    </div>
  );
}

/* ==========================================================================
   IMAGE 3: FREQUENTLY ASKED QUESTIONS SLIDE-UP MODAL
   ========================================================================== */
export function FaqSlideUpModal({ isOpen, onClose }) {
  const headerBottom = useHeaderBottom(isOpen);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'inspection' | 'escrow'
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Exact 11 FAQs matching Image 3
  const faqs = [
    {
      category: "inspection",
      q: "How does 2-hour inspection work?",
      a: "Once the item is delivered, a 2-hour countdown timer begins. This window allows you to physically test, inspect, and verify the item before funds are released to the seller.",
    },
    {
      category: "inspection",
      q: "What if inspection timer expires?",
      a: "If the 2-hour inspection timer expires without an active dispute or manual confirmation, the escrow engine automatically marks the order fulfilled and dispatches payment to the seller.",
    },
    {
      category: "inspection",
      q: "What should I check during inspection?",
      a: "Verify that the item matches the seller's agreed description, correct model/specifications, serial number, and that all accessories and functions work as expected.",
    },
    {
      category: "escrow",
      q: "When do I get my bank payout?",
      a: "Sellers receive payouts instantly the moment the buyer clicks 'Confirm Delivery' or when the inspection timer safely elapses.",
    },
    {
      category: "escrow",
      q: "How fast does payout reflect?",
      a: "Bank payouts are dispatched via instant NIP transfer directly to your verified Nigerian commercial bank account within 2-5 minutes.",
    },
    {
      category: "escrow",
      q: "How does PayKudi protect payments?",
      a: "Funds are locked in a secure licensed escrow holding account. Neither buyer nor seller can tamper with the funds until inspection terms are satisfied.",
    },
    {
      category: "escrow",
      q: "How long to complete payment?",
      a: "Buyers have until the countdown timer expires (typically 30-60 minutes) to complete payment to the dedicated virtual account shown in the room.",
    },
    {
      category: "escrow",
      q: "What payment methods are accepted?",
      a: "We accept direct bank transfers from all verified Nigerian banks via mobile banking apps, USSD, or internet banking to the dedicated virtual account.",
    },
    {
      category: "escrow",
      q: "Where is escrow money held?",
      a: "Escrow funds are held securely in CBN-regulated settlement trust accounts with our banking partners (GTBank, Providus, and Wema Bank).",
    },
    {
      category: "inspection",
      q: "Can I dispatch while Awaiting Payment?",
      a: "No! Never dispatch goods until the order status changes to 'Payment Received' and PayKudi confirms funds are secured in escrow.",
    },
    {
      category: "escrow",
      q: "Is payment verified and protected?",
      a: "Yes, all incoming payments undergo automated webhook verification with real-time fraud monitoring and dispute arbitration guarantees.",
    },
  ];

  if (!isOpen) return null;

  const filteredFaqs = faqs.filter((item) => {
    if (activeTab === "inspection" && item.category !== "inspection") return false;
    if (activeTab === "escrow" && item.category !== "escrow") return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div
      className="pk-slideup-backdrop"
      style={{ top: `${headerBottom}px` }}
      onClick={onClose}
    >
      <div className="pk-slideup-container" onClick={(e) => e.stopPropagation()}>
        {/* Warm Amber Orange Header matching Image 3 */}
        <div className="pk-slideup-header header-faq">
          <div className="pk-slideup-header-left">
            <WhiteQuestionIcon />
            <h2 className="pk-slideup-header-title">Frequently Asked Questions</h2>
          </div>
          <button
            type="button"
            className="pk-slideup-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="pk-slideup-body">
          {/* Search Bar matching Image 3 */}
          <div className="pk-faq-search-box-wrap">
            <div className="pk-faq-search-inner">
              <span className="material-symbols-outlined pk-faq-search-inner-icon">search</span>
              <input
                type="text"
                className="pk-faq-input-field"
                placeholder="Search FAQs (e.g. payout, refund, tracking...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Filter Pills matching Image 3 */}
          <div className="pk-faq-pills-row">
            <button
              type="button"
              className={`pk-faq-filter-pill ${activeTab === "all" ? "active" : "inactive"}`}
              onClick={() => setActiveTab("all")}
            >
              All FAQs
            </button>
            <button
              type="button"
              className={`pk-faq-filter-pill ${activeTab === "inspection" ? "active" : "inactive"}`}
              onClick={() => setActiveTab("inspection")}
            >
              Delivered (Inspection)
            </button>
            <button
              type="button"
              className={`pk-faq-filter-pill ${activeTab === "escrow" ? "active" : "inactive"}`}
              onClick={() => setActiveTab("escrow")}
            >
              Payments & Escrow
            </button>
          </div>

          {/* Accordion FAQ Cards matching Image 3 */}
          <div className="pk-faq-cards-list">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div key={idx} className="pk-faq-card-item">
                    <button
                      type="button"
                      className="pk-faq-card-trigger"
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    >
                      <div className="pk-faq-card-left">
                        <span className="pk-faq-card-q">Q:</span>
                        <span className="pk-faq-card-question">{faq.q}</span>
                      </div>
                      <span
                        className={`material-symbols-outlined pk-faq-card-chevron ${isOpen ? "open" : ""}`}
                      >
                        expand_more
                      </span>
                    </button>
                    {isOpen && (
                      <div className="pk-faq-card-answer">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p style={{ textAlign: "center", color: "#8c97a5", fontSize: 13, padding: "24px 0" }}>
                No matching FAQs found for "{searchQuery}".
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
