import { useState, useRef, useEffect } from "react";
import "../../styles/mobile-awaiting-payment.css";

export default function ChatDrawer({
  isOpen,
  onClose,
  room = {},
  role = "Buyer",
  sellerName: propSellerName,
  counterpartyName: propCounterpartyName,
  orderNumber: propOrderNumber,
  initialMessages,
  messages: externalMessages,
  onSendMessage,
}) {
  const [internalMessages, setInternalMessages] = useState(() => {
    if (initialMessages && initialMessages.length > 0) return initialMessages;
    // Default messages matching MobileAwaitingPayment reference design
    return [
      {
        id: 1,
        sender: "seller",
        text: "Hello! I have packaged the Nike Air Max 2025 and dropped it at GIG Logistics. Tracking number is GIG2208471.",
        time: "Mon 2:18 PM",
      },
      {
        id: 2,
        sender: "buyer",
        text: "Thanks! I will inspect the shoes as soon as the rider arrives.",
        time: "Mon 2:25 PM",
      },
    ];
  });

  // Sync if initialMessages changes (e.g. room switch)
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setInternalMessages(initialMessages);
    }
  }, [initialMessages]);

  const messages = externalMessages || internalMessages;
  const [chatInput, setChatInput] = useState("");
  const chatMessagesRef = useRef(null);

  const scrollToChatBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToChatBottom();
      const timer = setTimeout(scrollToChatBottom, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const counterpartyName =
    propCounterpartyName ||
    propSellerName ||
    (role === "Seller" || room.role === "Selling"
      ? room.buyerName || room.counterparty || "Marcus Vance"
      : room.sellerName || room.counterparty || "08032001585");

  const orderNumber =
    propOrderNumber || room.id || room.orderNumber || "ORD-603607";

  const isUserSender = (sender) => {
    if (sender === "cs" || sender === "system") return false;
    const isSellerRole = role === "Seller" || room.role === "Selling";
    if (sender === "buyer") return !isSellerRole;
    if (sender === "seller") return isSellerRole;
    return sender === "user" || sender === "me";
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const isSellerRole = role === "Seller" || room.role === "Selling";
    const userRole = isSellerRole ? "seller" : "buyer";
    const newMsg = {
      id: Date.now(),
      sender: userRole,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    if (onSendMessage) {
      onSendMessage(newMsg);
    }
    setInternalMessages((prev) => [...prev, newMsg]);
    setChatInput("");
  };

  return (
    <div className="ap-chat-backdrop" onClick={onClose}>
      <div className="ap-chat-slide-modal" onClick={(e) => e.stopPropagation()}>
        {/* Green Header */}
        <div className="ap-chat-green-header">
          <div className="ap-chat-header-info">
            <span className="ap-chat-header-user">{counterpartyName}</span>
            <span className="ap-chat-header-order">{orderNumber}</span>
          </div>
          <button
            type="button"
            className="ap-chat-close-btn"
            onClick={onClose}
            aria-label="Close Chat"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              close
            </span>
          </button>
        </div>

        {/* Security Notice */}
        <div className="ap-chat-security-banner">
          <span className="material-symbols-outlined">verified_user</span>
          <span>
            This chat is protected by <strong>PayKudi security</strong>
          </span>
        </div>

        {/* Messages Container */}
        <div ref={chatMessagesRef} className="ap-chat-messages-container">
          {messages.map((msg) => {
            if (msg.sender === "system") {
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    margin: "4px 0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "#6b7280",
                      background: "rgba(128,128,128,0.12)",
                      borderRadius: 12,
                      padding: "5px 12px",
                      maxWidth: "92%",
                      textAlign: "center",
                      lineHeight: 1.4,
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            }

            const isUser = isUserSender(msg.sender);
            const isCS = msg.sender === "cs";
            return (
              <div
                key={msg.id}
                className={`ap-chat-message-row ${isUser ? "buyer" : "seller"}`}
              >
                {!isUser && (
                  <span
                    className="ap-chat-sender-name"
                    style={isCS ? { color: "#16a34a" } : undefined}
                  >
                    {isCS ? "PayKudi Dispute Support" : (msg.senderName || counterpartyName)}
                  </span>
                )}
                <div className={`ap-chat-bubble ${isUser ? "buyer" : "seller"}`}>
                  <p>{msg.text}</p>
                </div>
                <span className="ap-chat-timestamp">
                  {msg.time} {isUser ? "• Sent" : ""}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom Input Bar */}
        <form onSubmit={handleSendChat} className="ap-chat-input-bar">
          <button
            type="button"
            className="ap-chat-attach-btn"
            aria-label="Add attachment"
          >
            <span className="material-symbols-outlined">add_circle</span>
          </button>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onFocus={() => {
              setTimeout(scrollToChatBottom, 120);
            }}
            placeholder="Type a message..."
            className="ap-chat-text-input"
          />
          <button
            type="submit"
            className="ap-chat-send-btn"
            disabled={!chatInput.trim()}
            aria-label="Send message"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
