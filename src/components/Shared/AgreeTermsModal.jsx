import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import "../../styles/agree-terms-modal.css";

export const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT - Abuja",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

export default function AgreeTermsModal({
  isOpen,
  onClose,
  onAgree,
  room = {},
  sellerName: propSellerName,
}) {
  const [selectedState, setSelectedState] = useState(room.deliveryState || "");
  const [city, setCity] = useState(room.deliveryCity || "");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync appearance (light/dark) with document body to match body color
  const [appearance, setAppearance] = useState(() => {
    if (typeof document === "undefined") return "light";
    return (
      document.body.getAttribute("data-appearance") ||
      document.documentElement.getAttribute("data-appearance") ||
      "light"
    );
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const updateAppearance = () => {
      const current =
        document.body.getAttribute("data-appearance") ||
        document.documentElement.getAttribute("data-appearance") ||
        "light";
      setAppearance(current);
    };

    updateAppearance();
    const observer = new MutationObserver(updateAppearance);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-appearance"] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-appearance"] });
    return () => observer.disconnect();
  }, []);

  const cityInputRef = useRef(null);
  const searchInputRef = useRef(null);

  // Sync state if room changes
  useEffect(() => {
    if (room.deliveryState) setSelectedState(room.deliveryState);
    if (room.deliveryCity) setCity(room.deliveryCity);
  }, [room]);

  useEffect(() => {
    if (isPickerOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isPickerOpen]);

  if (!isOpen) return null;

  const sellerName =
    propSellerName ||
    room.sellerName ||
    room.counterparty ||
    "900000909099";

  const filteredStates = NIGERIAN_STATES.filter((st) =>
    st.toLowerCase().includes(stateSearch.toLowerCase().trim())
  );

  const handleSelectState = (stateName) => {
    setSelectedState(stateName);
    setIsPickerOpen(false);
    setStateSearch("");
    setTimeout(() => {
      cityInputRef.current?.focus();
    }, 100);
  };

  const handleClearState = (e) => {
    e.stopPropagation();
    setSelectedState("");
    setIsPickerOpen(true);
  };

  const isFormValid = isAgreed && selectedState.trim().length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isFormValid || isLoading) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (onAgree) {
        onAgree({
          state: selectedState,
          city: city.trim().toUpperCase(),
          location: city.trim() ? `${city.trim().toUpperCase()}, ${selectedState}` : selectedState,
        });
      }
    }, 1200);
  };

  const modalContent = (
    <div
      className="atm-backdrop"
      data-appearance={appearance}
      onClick={(e) => {
        // Compulsory modal: prevent dismissing on accidental outside click
        // unless explicitly handled
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div
        className="atm-sheet-container"
        data-appearance={appearance}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="atm-dialog-title"
      >
        {/* Drag handle */}
        <div className="atm-handle-bar" />

        {/* Title */}
        <h2 id="atm-dialog-title" className="atm-title">
          Agree to Transaction Terms
        </h2>

        {/* Scrollable Content */}
        <div className="atm-content-scroll">
          {/* ── State Selection ── */}
          <div className="atm-state-section">
            {!selectedState ? (
              <div>
                <button
                  type="button"
                  className="atm-state-trigger"
                  onClick={() => setIsPickerOpen(!isPickerOpen)}
                  aria-expanded={isPickerOpen}
                >
                  <span className="atm-state-placeholder">
                    Select your delivery state
                  </span>
                  <span
                    className={`material-symbols-outlined atm-state-chevron ${
                      isPickerOpen ? "open" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>
              </div>
            ) : (
              <div>
                <div className="atm-selected-state-row">
                  <button
                    type="button"
                    className="atm-state-badge"
                    onClick={() => setIsPickerOpen(!isPickerOpen)}
                    title="Click to change state"
                  >
                    <span className="material-symbols-outlined atm-badge-pin">
                      location_on
                    </span>
                    <span>{selectedState}</span>
                    <span
                      className="material-symbols-outlined atm-badge-close"
                      onClick={handleClearState}
                      title="Clear state"
                    >
                      close
                    </span>
                  </button>

                  <input
                    ref={cityInputRef}
                    type="text"
                    className="atm-city-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value.toUpperCase())}
                    placeholder="ENTER CITY / LGA"
                    maxLength={40}
                  />
                </div>
                <div className="atm-state-helper">
                  Click state badge to switch state
                </div>
              </div>
            )}

            {/* Expandable State Picker Dropdown */}
            {isPickerOpen && (
              <div className="atm-state-dropdown">
                <div className="atm-state-search-box">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18, color: "#9ca3af" }}
                  >
                    search
                  </span>
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="atm-state-search-input"
                    placeholder="Search state..."
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)}
                  />
                  {stateSearch && (
                    <button
                      type="button"
                      onClick={() => setStateSearch("")}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        color: "#9ca3af",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                        close
                      </span>
                    </button>
                  )}
                </div>

                <ul className="atm-state-list">
                  {filteredStates.length === 0 ? (
                    <li
                      style={{
                        padding: "12px 14px",
                        fontSize: 13,
                        color: "#9ca3af",
                        textAlign: "center",
                      }}
                    >
                      No states found
                    </li>
                  ) : (
                    filteredStates.map((st) => (
                      <li
                        key={st}
                        className={`atm-state-option ${
                          selectedState === st ? "selected" : ""
                        }`}
                        onClick={() => handleSelectState(st)}
                      >
                        <span>{st}</span>
                        {selectedState === st && (
                          <span
                            className="material-symbols-outlined"
                            style={{ fontSize: 18 }}
                          >
                            check
                          </span>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* ── Info Cards ── */}
          <div className="atm-info-cards-group">
            {/* Inspection Window */}
            <div className="atm-info-row">
              <div className="atm-info-icon-wrap inspection">
                <span className="material-symbols-outlined">timer</span>
              </div>
              <div className="atm-info-texts">
                <span className="atm-info-label">Inspection Window</span>
                <span className="atm-info-val">
                  2 Hours post-delivery
                  <span className="atm-info-val-sub">(To confirm or dispute)</span>
                </span>
              </div>
            </div>

            {/* Seller's Name */}
            <div className="atm-info-row">
              <div className="atm-info-icon-wrap seller">
                <span className="material-symbols-outlined">person</span>
              </div>
              <div className="atm-info-texts">
                <span className="atm-info-label">Seller's Name</span>
                <span className="atm-info-val">{sellerName}</span>
              </div>
            </div>
          </div>

          {/* ── Terms & Conditions Header ── */}
          <div className="atm-terms-head">
            <h3 className="atm-terms-title">PAYKUDI TERMS &amp; CONDITIONS</h3>
            <button
              type="button"
              className="atm-terms-policy-link"
              onClick={() => {
                window.open("https://paykudi.com/terms", "_blank");
              }}
            >
              Platform Policy
            </button>
          </div>

          {/* ── Numbered Terms List ── */}
          <div className="atm-terms-list">
            <div className="atm-term-item">
              <span className="atm-term-num">1.</span>
              <div className="atm-term-text">
                <span className="atm-term-strong">Buyer Protection Guarantee: </span>
                100% of transaction funds remain securely held in PayKudi protected vault until the buyer confirms the item or the inspection window completes without dispute.
              </div>
            </div>

            <div className="atm-term-item">
              <span className="atm-term-num">2.</span>
              <div className="atm-term-text">
                <span className="atm-term-strong">2-Hour Inspection Window: </span>
                The buyer has a full 2 hours from the recorded carrier delivery timestamp to unpack, test, and verify item condition or file a dispute with evidence.
              </div>
            </div>

            <div className="atm-term-item">
              <span className="atm-term-num">3.</span>
              <div className="atm-term-text">
                <span className="atm-term-strong">Automated Seller Payout: </span>
                Once delivery is confirmed by the buyer, or when the 2-hour inspection window elapses with no dispute, payout automatically disburses directly to the seller's settlement account.
              </div>
            </div>

            <div className="atm-term-item">
              <span className="atm-term-num">4.</span>
              <div className="atm-term-text">
                <span className="atm-term-strong">Verified Carrier Dispatch: </span>
                Sellers must dispatch packages to the agreed destination location with valid shipment tracking documentation.
              </div>
            </div>

            <div className="atm-term-item">
              <span className="atm-term-num">5.</span>
              <div className="atm-term-text">
                <span className="atm-term-strong">Fair Resolution Policy: </span>
                In any rare event of misrepresentation or damage, payments remain locked while PayKudi mediators review the evidence to ensure full justice and refunds where due.
              </div>
            </div>
          </div>

          {/* ── Checkbox ── */}
          <div
            className="atm-checkbox-row"
            onClick={() => setIsAgreed(!isAgreed)}
            role="checkbox"
            aria-checked={isAgreed}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                setIsAgreed(!isAgreed);
              }
            }}
          >
            <div className={`atm-checkbox-box ${isAgreed ? "checked" : ""}`}>
              {isAgreed && (
                <span className="material-symbols-outlined">check</span>
              )}
            </div>
            <label className="atm-checkbox-label">
              I agree to the <strong>PayKudi Terms and Conditions</strong>, the 2-hour inspection window, and the selected location.
            </label>
          </div>

          {/* ── CTA Action Button ── */}
          <button
            type="button"
            className={`atm-cta-btn ${isLoading ? "is-loading" : ""}`}
            disabled={!isFormValid || isLoading}
            onClick={handleSubmit}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <span className="atm-btn-spinner" aria-hidden="true" />
            ) : (
              "Agree & Continue to Payment"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
}
