import { useState, useEffect } from "react";
import { Share2, Upload, Plus, X } from "lucide-react";
import "../../styles/mobile-payment-invitation.css";

export default function MobilePaymentInvitation({
  room = {},
  onCancel,
  onShare,
  onProceed,
}) {
  const [secondsLeft, setSecondsLeft] = useState(120); // 2:00

  // Specifications state
  const [specifications, setSpecifications] = useState([
    { id: 1, key: "Condition", val: "Brand New" },
    { id: 2, key: "Warranty", val: "1 Year Official" },
  ]);
  const [isAddingSpec, setIsAddingSpec] = useState(false);
  const [specKey, setSpecKey] = useState("");
  const [specVal, setSpecVal] = useState("");

  const quickPresets = [
    { key: "Color", val: "Black" },
    { key: "Box", val: "Original Box" },
    { key: "Receipt", val: "Available" },
    { key: "Status", val: "Tested & Working" },
  ];

  const handleAddSpec = () => {
    const k = specKey.trim();
    const v = specVal.trim();
    if (!k && !v) return;

    const newSpec = {
      id: Date.now(),
      key: k || "Detail",
      val: v || k,
    };

    setSpecifications((prev) => [...prev, newSpec]);
    setSpecKey("");
    setSpecVal("");
    setIsAddingSpec(false);
  };

  const handleUpdateSpecValue = (id, newVal) => {
    setSpecifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, val: newVal } : item))
    );
  };

  const handleRemoveSpec = (id) => {
    setSpecifications((prev) => prev.filter((item) => item.id !== id));
  };

  const handleQuickAdd = (preset) => {
    if (specifications.some((s) => s.key.toLowerCase() === preset.key.toLowerCase())) {
      return;
    }
    setSpecifications((prev) => [
      ...prev,
      { id: Date.now(), key: preset.key, val: preset.val },
    ]);
  };

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const timeFormatted = `${mins}:${secs}`;

  return (
    <main className="flex pt-8 pr-5 pb-8 pl-5 flex-col flex-1 gap-6 w-full m-invite-wrapper">
      <div className="m-invite-title-wrap">
        <h1 className="font-semibold text-2xl tracking-tight">
          Payment invitation
        </h1>
        <p className="text-muted-foreground text-sm">
          Counterparty has{" "}
          <span className="m-invite-red-timer">{timeFormatted}</span>{" "}
          to accept invite.
        </p>
      </div>

      {/* Item Reference Card */}
      <div className="m-invite-card-container">
        <div className="m-invite-item-card">
          <button
            aria-label="Share"
            className="m-invite-item-share-btn"
            type="button"
            onClick={onShare}
          >
            <Share2 size={16} strokeWidth={1.6} />
          </button>
          <div className="m-invite-ref-col">
            <div className="m-invite-ref-box">
              <Upload className="m-invite-upload-icon size-8" strokeWidth={1.8} />
            </div>
            <p className="m-invite-ref-text">
              Item Reference
            </p>
          </div>
          <div className="m-invite-item-info">
            <h1 className="m-invite-item-title">
              {room?.item || "iPhone 18 Pro Max"}
            </h1>
            <p className="m-invite-item-price">
              {room?.amount || "₦89,000"}
            </p>
          </div>
          <div className="m-invite-bottom-actions">
            <div
              className="header-avatar-circle m-invite-profile-avatar"
              aria-label="User avatar"
            >
              <span className="material-symbols-outlined avatar-icon">account_circle</span>
            </div>
            <div
              className="m-invite-loading-dots"
              aria-label="Waiting for counterparty"
              title="Waiting for counterparty"
            >
              <span className="m-invite-dot m-invite-dot-1" />
              <span className="m-invite-dot m-invite-dot-2" />
              <span className="m-invite-dot m-invite-dot-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Item Specifications Section */}
      <section className="m-invite-specs-section" aria-label="Item specifications">
        <div className="m-invite-specs-header">
          <div className="m-invite-specs-title-row">
            <h2 className="m-invite-specs-title">Item Specifications</h2>
            <span className="m-invite-specs-count">{specifications.length}</span>
          </div>
          {!isAddingSpec && (
            <button
              type="button"
              className="m-invite-add-spec-btn"
              onClick={() => setIsAddingSpec(true)}
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Add specification</span>
            </button>
          )}
        </div>

        {/* Active Specifications List */}
        {specifications.length > 0 && (
          <div className="m-invite-specs-list">
            {specifications.map((item) => (
              <div key={item.id} className="m-invite-spec-item">
                <span className="m-invite-spec-label">{item.key}</span>
                <input
                  type="text"
                  className="m-invite-spec-row-input"
                  value={item.val}
                  onChange={(e) => handleUpdateSpecValue(item.id, e.target.value)}
                  placeholder={`Enter ${item.key.toLowerCase()}`}
                  aria-label={`${item.key} specification`}
                />
                <button
                  type="button"
                  className="m-invite-spec-delete-btn"
                  onClick={() => handleRemoveSpec(item.id)}
                  aria-label={`Remove ${item.key}`}
                  title="Remove specification"
                >
                  <X size={13} strokeWidth={2.2} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Inline Add Specification Form */}
        {isAddingSpec ? (
          <div className="m-invite-add-spec-card">
            <div className="m-invite-spec-inputs-row">
              <input
                type="text"
                className="m-invite-spec-input m-invite-spec-input-key"
                placeholder="Spec (e.g. Color)"
                value={specKey}
                onChange={(e) => setSpecKey(e.target.value)}
                autoFocus
              />
              <input
                type="text"
                className="m-invite-spec-input m-invite-spec-input-val"
                placeholder="Value (e.g. Matte Black)"
                value={specVal}
                onChange={(e) => setSpecVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSpec();
                }}
              />
            </div>

            {/* Quick Presets */}
            <div className="m-invite-quick-presets">
              <span className="m-invite-quick-preset-title">Quick add:</span>
              <div className="m-invite-quick-preset-chips">
                {quickPresets.map((preset) => {
                  const exists = specifications.some(
                    (s) => s.key.toLowerCase() === preset.key.toLowerCase()
                  );
                  return (
                    <button
                      key={preset.key}
                      type="button"
                      className={`m-invite-quick-chip ${exists ? "is-added" : ""}`}
                      onClick={() => handleQuickAdd(preset)}
                      disabled={exists}
                    >
                      <Plus size={11} strokeWidth={2.5} />
                      <span>
                        {preset.key}: {preset.val}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="m-invite-spec-form-footer">
              <button
                type="button"
                className="m-invite-spec-btn-cancel"
                onClick={() => {
                  setIsAddingSpec(false);
                  setSpecKey("");
                  setSpecVal("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="m-invite-spec-btn-submit"
                onClick={handleAddSpec}
                disabled={!specKey.trim() && !specVal.trim()}
              >
                Add
              </button>
            </div>
          </div>
        ) : specifications.length === 0 ? (
          <div className="m-invite-spec-empty-state">
            <span className="m-invite-spec-empty-title">No specifications added</span>
            <span className="m-invite-spec-empty-desc">
              Tap &ldquo;+ Add specification&rdquo; above to add item details
            </span>
          </div>
        ) : null}
      </section>

      {/* Floating Action Button */}
      <div className="m-invite-floating-actions">
        <button
          type="button"
          onClick={onProceed || onCancel}
          className="m-invite-btn-proceed"
        >
          Proceed to payment
        </button>
      </div>
    </main>
  );
}
