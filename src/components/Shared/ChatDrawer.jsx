import { useState, useRef, useEffect } from "react";

export default function ChatDrawer({
  isOpen,
  onClose,
  room = {},
  role = "Buyer",
  initialMessages,
}) {
  const [messages, setMessages] = useState(() => {
    if (initialMessages && initialMessages.length > 0) return initialMessages;
    const isSeller = role === "Seller" || room.role === "Selling";
    return [
      {
        id: 1,
        sender: isSeller ? "buyer" : "seller",
        text: "Hello! I am checking on the order status.",
        time: "Today 10:42 AM",
      },
      {
        id: 2,
        sender: isSeller ? "seller" : "buyer",
        text: "Hi! Everything is moving smoothly in PayKudi Escrow.",
        time: "Today 10:45 AM",
      },
    ];
  });

  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToChatBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToChatBottom, 60);
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const counterpartyName =
    (role === "Seller" || room.role === "Selling")
      ? room.buyerName || room.counterparty || "Marcus Vance"
      : room.sellerName || room.counterparty || "08032001585";

  const orderNumber = room.id || room.orderNumber || "ORD-603607";

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const userSender = (role === "Seller" || room.role === "Selling") ? "seller" : "buyer";
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: userSender,
        text: input.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setInput("");
  };

  const isUserSender = (sender) => {
    const userRole = (role === "Seller" || room.role === "Selling") ? "seller" : "buyer";
    return sender === userRole;
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

        {/* Message Stream */}
        <div className="ap-chat-messages-container" ref={messagesEndRef}>
          {messages.map((msg) => {
            const isUser = isUserSender(msg.sender);
            return (
              <div
                key={msg.id}
                className={`ap-chat-message-row ${isUser ? "buyer" : "seller"}`}
              >
                <div className="ap-chat-bubble">
                  <p>{msg.text}</p>
                  <span className="ap-chat-bubble-time">{msg.time}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Input Bar */}
        <form onSubmit={handleSend} className="ap-chat-input-bar">
          <button type="button" className="ap-chat-attach-btn" aria-label="Add attachment">
            <span className="material-symbols-outlined">add_circle</span>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setTimeout(scrollToChatBottom, 120)}
            placeholder="Type a message..."
            className="ap-chat-text-input"
          />
          <button
            type="submit"
            className="ap-chat-send-btn"
            disabled={!input.trim()}
            aria-label="Send message"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
