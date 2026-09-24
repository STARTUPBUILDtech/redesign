import { useState, useMemo, useRef, useEffect } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Select, SelectContent, SelectItem } from "./ui/select";
import { ALL_PAYMENT_ROOMS } from "../data/paymentRooms.js";
import { useDashboard } from "../context/DashboardContext";
import DesktopPaymentRoomDetail from "./DesktopPaymentRoomDetail.jsx";
import "../styles/desktop-payment-room.css";

export default function DesktopPaymentRoom({ role = "Buyer", onBackToHome, rooms }) {
  let contextRooms;
  try {
    const dash = useDashboard();
    contextRooms = dash?.paymentRooms;
  } catch (e) {
    contextRooms = null;
  }

  const roomsList = rooms || contextRooms || ALL_PAYMENT_ROOMS;
  const [activeTab, setActiveTab] = useState("ongoing");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const filterRef = useRef(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Filter count (Role + State)
  const activeFilterCount =
    (selectedRole !== "all" ? 1 : 0) + (selectedState !== "all" ? 1 : 0);

  // Click outside to close filter popover
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
      }
    }
    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterOpen]);

  // Tab counts
  const ongoingRooms = useMemo(
    () => roomsList.filter((r) => r.category === "ongoing"),
    [roomsList]
  );
  const fulfilledRooms = useMemo(
    () => roomsList.filter((r) => r.category === "fulfilled"),
    [roomsList]
  );

  // Filtered rooms
  const filteredRooms = useMemo(() => {
    const list = activeTab === "fulfilled" ? fulfilledRooms : ongoingRooms;
    return list.filter((room) => {
      // Role filter
      if (selectedRole !== "all") {
        if (room.role.toLowerCase() !== selectedRole.toLowerCase()) return false;
      }

      // State / Status filter
      if (selectedState !== "all") {
        if (room.status !== selectedState) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = room.title.toLowerCase().includes(q);
        const matchId = room.id.toLowerCase().includes(q);
        const matchPrice = room.price.toLowerCase().includes(q);
        const matchCounterparty = (
          room.counterparty ||
          room.sellerName ||
          room.buyerName ||
          ""
        )
          .toLowerCase()
          .includes(q);
        if (!matchTitle && !matchId && !matchPrice && !matchCounterparty) {
          return false;
        }
      }

      return true;
    });
  }, [activeTab, searchQuery, selectedRole, ongoingRooms, fulfilledRooms]);

  // If a room is selected, show desktop detail view
  if (selectedRoom) {
    return (
      <DesktopPaymentRoomDetail
        room={selectedRoom}
        onBack={() => setSelectedRoom(null)}
        role={role}
        onPaymentConfirmed={() => setSelectedRoom(null)}
      />
    );
  }

  return (
    <div className="desktop-payment-room-wrapper">
      <main id="payment-room" className="desktop-payment-room-main">

        {/* Desktop Toolbar: sticky/fixed toolbar */}
        <div className="desktop-pr-toolbar">
          {/* Tabs */}
          <div className="desktop-pr-tabs">
            <button
              type="button"
              className={`desktop-pr-tab-btn ${activeTab === "ongoing" ? "active" : ""}`}
              onClick={() => setActiveTab("ongoing")}
            >
              <span>Ongoing</span>
            </button>
            <button
              type="button"
              className={`desktop-pr-tab-btn ${activeTab === "fulfilled" ? "active" : ""}`}
              onClick={() => setActiveTab("fulfilled")}
            >
              <span>Fulfilled</span>
            </button>
          </div>

          {/* Desktop Search Bar with Filter */}
          <div className="desktop-pr-controls">
            <div className="desktop-pr-search-container" ref={filterRef}>
              <Search className="desktop-pr-search-icon" />
              <input
                type="text"
                placeholder="Search Payment Room by title, ID, or name"
                className="desktop-pr-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="desktop-pr-clear-btn"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}

              <div className="desktop-pr-search-divider" />

              <button
                type="button"
                className={`desktop-pr-filter-btn ${isFilterOpen ? "active" : ""} ${activeFilterCount > 0 ? "has-filters" : ""}`}
                onClick={() => setIsFilterOpen((prev) => !prev)}
                title="Filter payment rooms"
                aria-label="Filter payment rooms"
                aria-expanded={isFilterOpen}
              >
                <SlidersHorizontal size={16} />
                {activeFilterCount > 0 && (
                  <span className="desktop-pr-filter-badge">{activeFilterCount}</span>
                )}
              </button>

              {/* Filter Popover */}
              {isFilterOpen && (
                <div
                  className="desktop-pr-filter-popover"
                  role="dialog"
                  aria-label="Filter options"
                >
                  <div className="desktop-pr-popover-header">
                    <span className="desktop-pr-popover-title">Filters</span>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        className="desktop-pr-popover-reset"
                        onClick={() => {
                          setSelectedRole("all");
                          setSelectedState("all");
                        }}
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="desktop-pr-filter-group">
                    <span className="desktop-pr-filter-label">State / Status</span>
                    <Select
                      defaultValue="all"
                      value={selectedState}
                      onValueChange={setSelectedState}
                      className="filter-popover-select"
                      placeholder="All States"
                    >
                      <SelectContent className="ui-select">
                        <SelectItem value="all">All States</SelectItem>
                        <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                        <SelectItem value="payment_received">Payment Received</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="delivered">Confirm delivery</SelectItem>
                        <SelectItem value="dispute_ongoing">Dispute Ongoing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="desktop-pr-filter-group">
                    <span className="desktop-pr-filter-label">Role</span>
                    <div className="desktop-pr-role-options">
                      <button
                        type="button"
                        className={`desktop-pr-role-btn ${selectedRole === "all" ? "active" : ""}`}
                        onClick={() => setSelectedRole("all")}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        className={`desktop-pr-role-btn ${selectedRole === "Buying" ? "active" : ""}`}
                        onClick={() => setSelectedRole("Buying")}
                      >
                        Buying
                      </button>
                      <button
                        type="button"
                        className={`desktop-pr-role-btn ${selectedRole === "Selling" ? "active" : ""}`}
                        onClick={() => setSelectedRole("Selling")}
                      >
                        Selling
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Spacer: fixed toolbar height + activity top padding */}
        <div className="desktop-pr-toolbar-spacer" />

        {/* Responsive Grid of Payment Room Cards */}
        <div className="desktop-payment-room-content">
          <div className="desktop-pr-grid">
            {filteredRooms.length === 0 ? (
              <div className="desktop-pr-empty">
                <span className="material-symbols-outlined desktop-pr-empty-icon">
                  payments
                </span>
                <p className="desktop-pr-empty-text">
                  No {activeTab} payment rooms found
                  {searchQuery ? ` matching "${searchQuery}"` : ""}
                </p>
              </div>
            ) : (
              filteredRooms.map((room) => {
                const isBuying = room.role === "Buying";
                const counterpartyLabel = isBuying ? "Seller: " : "Buyer: ";
                const counterpartyName = isBuying ? room.sellerName : room.buyerName;

                return (
                  <div
                    key={room.id}
                    className="desktop-pr-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedRoom(room)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedRoom(room);
                      }
                    }}
                  >
                    {/* Top Row: Role & Room ID */}
                    <div className="desktop-pr-card-top">
                      <span
                        className={`desktop-pr-role-tag ${isBuying ? "buying" : "selling"}`}
                      >
                        {room.role}
                      </span>
                      <span className="desktop-pr-room-id">{room.id}</span>
                    </div>

                    {/* Main Row: Title & Price */}
                    <div className="desktop-pr-card-main">
                      <h4 className="desktop-pr-card-title">{room.title}</h4>
                      <span className="desktop-pr-card-price">{room.price}</span>
                    </div>

                    {/* Counterparty */}
                    <p className="desktop-pr-card-counterparty">
                      <span>{counterpartyLabel}</span>
                      <strong>{counterpartyName}</strong>
                    </p>

                    {/* Bottom Row: Date & Status */}
                    <div className="desktop-pr-card-bottom">
                      <span className="desktop-pr-card-date">{room.date}</span>
                      <span
                        className={`desktop-pr-status-badge status-${room.status}`}
                      >
                        {room.statusText}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}


