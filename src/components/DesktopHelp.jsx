import { useState } from "react";
import "../styles/support-section.css";
import {
  SendMessageSlideUpModal,
  BotAssistantSlideUpModal,
  FaqSlideUpModal,
} from "./Shared/SupportSlideUpModals.jsx";

function HeadsetAgentIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 13a8 8 0 0 1 16 0" />
      <rect x="2.5" y="11" width="3.5" height="6.5" rx="1.75" fill="currentColor" fillOpacity="0.2" />
      <rect x="18" y="11" width="3.5" height="6.5" rx="1.75" fill="currentColor" fillOpacity="0.2" />
      <path d="M7 13a5 5 0 0 0 10 0" />
      <circle cx="9.5" cy="12.5" r="0.8" fill="currentColor" />
      <circle cx="14.5" cy="12.5" r="0.8" fill="currentColor" />
      <path d="M4.2 16.5v1.2a2.5 2.5 0 0 0 2.5 2.5h3.8" />
      <circle cx="11.5" cy="20.2" r="1.2" fill="currentColor" />
    </svg>
  );
}

function RobotBotIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3" />
      <circle cx="12" cy="2.5" r="1" fill="currentColor" />
      <rect x="4.5" y="6" width="15" height="13" rx="3.5" />
      <path d="M2.5 11v3" />
      <path d="M21.5 11v3" />
      <rect x="8" y="10" width="2.2" height="2.2" rx="0.5" fill="currentColor" />
      <rect x="13.8" y="10" width="2.2" height="2.2" rx="0.5" fill="currentColor" />
      <path d="M8.5 15h7" />
    </svg>
  );
}

function QuestionBoxIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M9.8 9a2.5 2.5 0 0 1 4.4 1.4c0 1.2-1.7 1.8-1.7 2.8" />
      <circle cx="12.5" cy="16.2" r="0.75" fill="currentColor" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.71 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.414z" />
    </svg>
  );
}

export default function DesktopHelp({ room = {} }) {
  const [activeModal, setActiveModal] = useState(null); // 'message' | 'bot' | 'faq' | null

  const handleWhatsAppClick = () => {
    window.open(
      "https://wa.me/2348032001585?text=Hello%20PayKudi%20Support%2C%20I%20need%20assistance%20with%20my%20account.",
      "_blank"
    );
  };

  return (
    <main id="help-support" className="desktop-container desktop-help-main">
      {/* ── Desktop Intro Heading obeying desktop-content-wrap padding ── */}
      <div className="desktop-content-wrap desktop-intro-wrap">
        <section className="intro desktop-help-intro">
          <div>
            <h1>24/7 PayKudi Support</h1>
            <p>Chat with specialists, get instant diagnostics, or browse policies</p>
          </div>
        </section>
      </div>

      {/* ── Desktop Support List obeying desktop-content-wrap padding ── */}
      <div className="desktop-content-wrap">
        <div className="desktop-help-list">
          {/* 1. Send us a message */}
          <button
            type="button"
            className="desktop-help-item"
            onClick={() => setActiveModal("message")}
            aria-label="Send us a message: Chat with resolution specialists"
          >
            <div className="pk-support-item-left">
              <div className="pk-support-icon-circle message">
                <HeadsetAgentIcon />
              </div>
              <div className="pk-support-text">
                <span className="pk-support-label">Send us a message</span>
                <span className="pk-support-subtitle">Chat with resolution specialists</span>
              </div>
            </div>
            <span className="material-symbols-outlined pk-support-chevron">
              chevron_right
            </span>
          </button>

          {/* 2. PayKudi Bot Assistant */}
          <button
            type="button"
            className="desktop-help-item"
            onClick={() => setActiveModal("bot")}
            aria-label="PayKudi Bot Assistant: Instant automated answers & diagnostics"
          >
            <div className="pk-support-item-left">
              <div className="pk-support-icon-circle bot">
                <RobotBotIcon />
              </div>
              <div className="pk-support-text">
                <span className="pk-support-label">PayKudi Bot Assistant</span>
                <span className="pk-support-subtitle">Instant automated answers & diagnostics</span>
              </div>
            </div>
            <span className="material-symbols-outlined pk-support-chevron">
              chevron_right
            </span>
          </button>

          {/* 3. Frequently Asked Questions */}
          <button
            type="button"
            className="desktop-help-item"
            onClick={() => setActiveModal("faq")}
            aria-label="Frequently Asked Questions: Search escrow rules & policies"
          >
            <div className="pk-support-item-left">
              <div className="pk-support-icon-circle faq">
                <QuestionBoxIcon />
              </div>
              <div className="pk-support-text">
                <span className="pk-support-label">Frequently Asked Questions</span>
                <span className="pk-support-subtitle">Search escrow rules & policies</span>
              </div>
            </div>
            <span className="material-symbols-outlined pk-support-chevron">
              chevron_right
            </span>
          </button>

          {/* 4. WhatsApp Live Support */}
          <button
            type="button"
            className="desktop-help-item"
            onClick={handleWhatsAppClick}
            aria-label="WhatsApp Live Support: Connect instantly with our support team"
          >
            <div className="pk-support-item-left">
              <div className="pk-support-icon-circle whatsapp">
                <WhatsAppIcon />
              </div>
              <div className="pk-support-text">
                <span className="pk-support-label whatsapp-label">WhatsApp Live Support</span>
                <span className="pk-support-subtitle">Connect instantly with our support team</span>
              </div>
            </div>
            <span className="material-symbols-outlined pk-support-chevron whatsapp-chevron">
              chevron_right
            </span>
          </button>
        </div>
      </div>

      {/* ── Slide-Up Modal 1: Send Us a Message (Stops at PayKudi Header) ── */}
      <SendMessageSlideUpModal
        isOpen={activeModal === "message"}
        onClose={() => setActiveModal(null)}
      />

      {/* ── Slide-Up Modal 2: PayKudi Assistant (Stops at PayKudi Header) ── */}
      <BotAssistantSlideUpModal
        isOpen={activeModal === "bot"}
        onClose={() => setActiveModal(null)}
        room={room}
      />

      {/* ── Slide-Up Modal 3: Frequently Asked Questions (Stops at PayKudi Header) ── */}
      <FaqSlideUpModal
        isOpen={activeModal === "faq"}
        onClose={() => setActiveModal(null)}
      />
    </main>
  );
}
