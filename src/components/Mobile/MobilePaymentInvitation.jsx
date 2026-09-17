import { useState, useEffect, useRef } from "react";
import { Share2, Upload, Plus, X } from "lucide-react";
import avatarPhoto from "../../assets/avatar-photo.png";
import avatarIllustration from "../../assets/avatar-illustration.png";
import "../../styles/mobile-payment-invitation.css";

export default function MobilePaymentInvitation({
  room = {},
  onCancel,
  onShare,
  onProceed,
}) {
  const [secondsLeft, setSecondsLeft] = useState(120); // 2:00
  const [counterpartyJoined, setCounterpartyJoined] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [itemImage, setItemImage] = useState(room?.image || null);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict validation: Only upload image
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (e.g. JPG, PNG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setItemImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleBoxClick = () => {
    fileInputRef.current?.click();
  };

  // 8-second animation: Counterparty joins room, shows toast, displays double avatar
  useEffect(() => {
    const joinTimer = setTimeout(() => {
      setCounterpartyJoined(true);
      setShowToast(true);
    }, 8000);

    return () => clearTimeout(joinTimer);
  }, []);

  useEffect(() => {
    if (showToast) {
      const dismissTimer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return () => clearTimeout(dismissTimer);
    }
  }, [showToast]);

  // Helper to format item title into sentence/title case e.g. "Iphone 18 Pro Max"
  const formatItemTitle = (text) => {
    if (!text) return "Iphone 18 Pro Max";
    const trimmed = text.trim();
    if (trimmed.toLowerCase() === "iphone 18 pro max") {
      return "Iphone 18 Pro Max";
    }
    return trimmed.replace(/\b[a-z]/g, (char) => char.toUpperCase());
  };

  // Default specs when iPhone is in the picture
  const getItemDefaultSpecs = (itemName = "") => {
    const lower = (itemName || "").toLowerCase();
    if (
      lower.includes("iphone") ||
      lower.includes("apple") ||
      lower.includes("phone") ||
      !itemName
    ) {
      return [
        { id: 1, key: "Color", val: "" },
        { id: 2, key: "Storage", val: "" },
        { id: 3, key: "RAM", val: "" },
      ];
    }
    return [];
  };

  // Specifications state - initialized with Color, Storage, RAM for iPhone to fill
  const [specifications, setSpecifications] = useState(() => {
    if (Array.isArray(room?.specifications) && room.specifications.length > 0) {
      return room.specifications;
    }
    return getItemDefaultSpecs(room?.item);
  });
  const [isAddingSpec, setIsAddingSpec] = useState(false);
  const [specKey, setSpecKey] = useState("");
  const [specVal, setSpecVal] = useState("");
  const [showSpecError, setShowSpecError] = useState(false);

  // Check if at least one valid specification exists AND all current specs have values
  const hasValidSpecs =
    specifications.length > 0 &&
    specifications.every((s) => Boolean(s.key?.trim() && s.val?.trim()));

  const quickPresets = [
    { key: "Color", val: "Space Black" },
    { key: "Color", val: "Silver" },
    { key: "Color", val: "Natural Titanium" },
    { key: "Storage", val: "128GB" },
    { key: "Storage", val: "256GB" },
    { key: "Storage", val: "512GB" },
    { key: "RAM", val: "8GB" },
    { key: "RAM", val: "12GB" },
    { key: "Condition", val: "Brand New" },
    { key: "Box", val: "Original Box" },
    { key: "Warranty", val: "1 Year Official" },
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
    setShowSpecError(false);
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
    setSpecifications((prev) => {
      const existingIndex = prev.findIndex(
        (s) => s.key.toLowerCase() === preset.key.toLowerCase()
      );
      if (existingIndex >= 0) {
        // If field exists (e.g. Color, Storage, RAM), fill in the preset value
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          val: preset.val,
        };
        return updated;
      }
      return [
        ...prev,
        { id: Date.now(), key: preset.key, val: preset.val },
      ];
    });
    setShowSpecError(false);
  };

  const handleProceedClick = () => {
    setShowSpecError(false);
    if (onProceed) onProceed();
    else if (onCancel) onCancel();
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
      {/* Toast Notification: Counter party has joined room */}
      {showToast && (
        <div className="m-invite-toast" role="status" aria-live="polite">
          <div className="m-invite-toast-content">
            <div className="m-invite-toast-icon-wrap">
              <span className="material-symbols-outlined m-invite-toast-icon">check_circle</span>
            </div>
            <span className="m-invite-toast-message">Counter party has joined room.</span>
          </div>
          <button
            type="button"
            className="m-invite-toast-close"
            onClick={() => setShowToast(false)}
            aria-label="Dismiss notification"
          >
            <X size={14} strokeWidth={2.2} />
          </button>
        </div>
      )}

      <div className="m-invite-title-wrap">
        <h1 className="font-semibold text-2xl tracking-tight">
          Payment invitation
        </h1>
        <p className="text-muted-foreground text-sm">
          {counterpartyJoined ? (
            <span className="text-emerald-500 font-medium inline-flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              Counter party has joined room.
            </span>
          ) : (
            <>
              Counterparty has{" "}
              <span className="m-invite-red-timer">{timeFormatted}</span>{" "}
              to accept invite.
            </>
          )}
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
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: "none" }}
              aria-label="Upload item reference image"
            />
            <button
              type="button"
              className={`m-invite-ref-box ${itemImage ? "has-preview" : ""}`}
              onClick={handleBoxClick}
              aria-label={itemImage ? "Change item reference image" : "Upload item reference image"}
              title={itemImage ? "Click to change reference image" : "Upload item reference image"}
            >
              {itemImage ? (
                <div className="m-invite-ref-preview-wrap">
                  <img
                    src={itemImage}
                    alt="Item reference preview"
                    className="m-invite-ref-preview-img"
                  />
                  <div className="m-invite-ref-overlay">
                    <Upload size={18} strokeWidth={2.2} />
                  </div>
                </div>
              ) : (
                <Upload className="m-invite-upload-icon size-8" strokeWidth={1.8} />
              )}
            </button>
            <p className="m-invite-ref-text">
              {itemImage ? "Change Reference" : "Item Reference"}
            </p>
          </div>
          <div className="m-invite-item-info">
            <h1 className="m-invite-item-title">
              {formatItemTitle(room?.item || "Iphone 18 Pro Max")}
            </h1>
            <p className="m-invite-item-price">
              {room?.amount || "₦89,000"}
            </p>
          </div>
          <div className="m-invite-bottom-actions">
            {!counterpartyJoined ? (
              <>
                <div
                  className="header-avatar-circle m-invite-profile-avatar"
                  aria-label="User avatar"
                >
                  <img
                    src={avatarPhoto}
                    alt="User profile"
                    className="m-invite-avatar-img"
                  />
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
              </>
            ) : (
              <div
                className="m-invite-double-avatar-group"
                aria-label="Both participants in room - double user profile"
                title="Counter party has joined room"
              >
                <div
                  className="header-avatar-circle m-invite-profile-avatar m-invite-avatar-first"
                  aria-label="Your avatar"
                >
                  <img
                    src={avatarPhoto}
                    alt="Your profile"
                    className="m-invite-avatar-img"
                  />
                </div>
                <div
                  className="header-avatar-circle m-invite-profile-avatar m-invite-avatar-second"
                  aria-label="Counterparty avatar"
                >
                  <img
                    src={avatarIllustration}
                    alt="Counterparty avatar"
                    className="m-invite-avatar-img"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item Specifications Section */}
      <section
        className={`m-invite-specs-section ${showSpecError && !hasValidSpecs ? "has-spec-error" : ""}`}
        aria-label="Item specifications"
      >
        <div className="m-invite-specs-header">
          <div className="m-invite-specs-title-row">
            <h2 className="m-invite-specs-title">Item Specifications</h2>
            <span className="m-invite-specs-count">{specifications.length}</span>
            {showSpecError && !hasValidSpecs && (
              <span className="m-invite-spec-required-badge">Specification required</span>
            )}
          </div>
          {!isAddingSpec && (
            <button
              type="button"
              className="m-invite-add-spec-btn"
              onClick={() => {
                setIsAddingSpec(true);
                setShowSpecError(false);
              }}
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
                  className={`m-invite-spec-row-input ${showSpecError && !item.val?.trim() ? "has-input-error" : ""}`}
                  value={item.val}
                  onChange={(e) => {
                    handleUpdateSpecValue(item.id, e.target.value);
                    if (showSpecError) setShowSpecError(false);
                  }}
                  placeholder={
                    item.key.toLowerCase() === "color"
                      ? "eg. Space Black"
                      : item.key.toLowerCase() === "storage"
                      ? "eg. 256GB"
                      : item.key.toLowerCase() === "ram"
                      ? "eg. 8GB"
                      : `Enter ${item.key.toLowerCase()}`
                  }
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
                  const isSelected = specifications.some(
                    (s) =>
                      s.key.toLowerCase() === preset.key.toLowerCase() &&
                      s.val.toLowerCase() === preset.val.toLowerCase()
                  );
                  return (
                    <button
                      key={`form-${preset.key}-${preset.val}`}
                      type="button"
                      className={`m-invite-quick-chip ${isSelected ? "is-added" : ""}`}
                      onClick={() => handleQuickAdd(preset)}
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
          <div
            className={`m-invite-spec-empty-state ${showSpecError ? "has-spec-error" : ""}`}
            onClick={() => {
              setIsAddingSpec(true);
              setShowSpecError(false);
            }}
            role="button"
            tabIndex={0}
          >
            <div className="m-invite-spec-empty-content">
              <div className="m-invite-spec-empty-title">
                {showSpecError ? "Specification required" : "No specifications added"}
              </div>
              <div className="m-invite-spec-empty-desc">
                {showSpecError
                  ? "You cannot proceed without adding specification. Tap here to add now."
                  : "Tap \"+ Add specification\" above to add item details"}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Floating Action Button */}
      <div className="m-invite-floating-actions">
        {showSpecError && !hasValidSpecs && (
          <div className="m-invite-spec-error-tip" role="alert">
            <span className="material-symbols-outlined spec-error-tip-icon">error</span>
            <span>
              {specifications.length === 0
                ? "You cannot proceed without adding specification"
                : "Please fill in specifications (Color, Storage, RAM) to proceed"}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={handleProceedClick}
          className="m-invite-btn-proceed"
        >
          Proceed to payment
        </button>
      </div>
    </main>
  );
}
