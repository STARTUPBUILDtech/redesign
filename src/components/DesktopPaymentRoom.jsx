import { useState, useMemo, useRef, useEffect } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Select, SelectContent, SelectItem } from "./ui/select";
import { ALL_PAYMENT_ROOMS } from "../data/paymentRooms.js";
import { useDashboard } from "../context/DashboardContext";
import MobileAwaitingPayment from "./Mobile/MobileAwaitingPayment.jsx";
import MobilePaymentReceived from "./Mobile/MobilePaymentReceived.jsx";
import MobileInTransit from "./Mobile/MobileInTransit.jsx";
import MobileConfirmDelivery from "./Mobile/MobileConfirmDelivery.jsx";
import MobileDisputeOngoing from "./Mobile/MobileDisputeOngoing.jsx";
import MobileCompleted from "./Mobile/MobileCompleted.jsx";
import "../styles/desktop-payment-room.css";

export default function DesktopPaymentRoom({
  role = "Buyer",
  onBackToHome,
  rooms,
  initialSelectedRoom,
  dark,
  activeTab: propActiveTab,
  setActiveTab: propSetActiveTab,
  searchQuery: propSearchQuery,
  setSearchQuery: propSetSearchQuery,
  selectedRole: propSelectedRole,
  setSelectedRole: propSetSelectedRole,
  selectedState: propSelectedState,
  setSelectedState: propSetSelectedState,
  isSearchExpanded: propIsSearchExpanded,
  setIsSearchExpanded: propSetIsSearchExpanded,
  onSelectRoom,
}) {
  let contextRooms;
  try {
    const dash = useDashboard();
    contextRooms = dash?.paymentRooms;
  } catch (e) {
    contextRooms = null;
  }

  const roomsList = rooms || contextRooms || ALL_PAYMENT_ROOMS;
  const initialRoom = initialSelectedRoom
    ? (roomsList.find((r) => r.id === initialSelectedRoom.id) || initialSelectedRoom)
    : null;
  const isInitialFulfilled =
    initialRoom?.status === "completed" ||
    initialRoom?.statusText === "Completed" ||
    initialRoom?.statusText === "Payment Completed";

  const [internalActiveTab, setInternalActiveTab] = useState(isInitialFulfilled ? "fulfilled" : "ongoing");
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [internalSelectedRole, setInternalSelectedRole] = useState("all");
  const [internalSelectedState, setInternalSelectedState] = useState("all");
  const [internalIsSearchExpanded, setInternalIsSearchExpanded] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(initialRoom || null);

  const activeTab = propActiveTab !== undefined ? propActiveTab : internalActiveTab;
  const setActiveTab = propSetActiveTab || setInternalActiveTab;

  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : internalSearchQuery;
  const setSearchQuery = propSetSearchQuery || setInternalSearchQuery;

  const selectedRole = propSelectedRole !== undefined ? propSelectedRole : internalSelectedRole;
  const setSelectedRole = propSetSelectedRole || setInternalSelectedRole;

  const selectedState = propSelectedState !== undefined ? propSelectedState : internalSelectedState;
  const setSelectedState = propSetSelectedState || setInternalSelectedState;

  const isSearchExpanded = propIsSearchExpanded !== undefined ? propIsSearchExpanded : internalIsSearchExpanded;
  const setIsSearchExpanded = propSetIsSearchExpanded || setInternalIsSearchExpanded;

  const prevInitialIdRef = useRef(initialSelectedRoom?.id);
  useEffect(() => {
    if (initialSelectedRoom) {
      const match = roomsList.find((r) => r.id === initialSelectedRoom.id) || initialSelectedRoom;
      setSelectedRoom(match);
      if (initialSelectedRoom.id !== prevInitialIdRef.current) {
        prevInitialIdRef.current = initialSelectedRoom.id;
        if (
          match.status === "completed" ||
          match.statusText === "Completed" ||
          match.statusText === "Payment Completed"
        ) {
          setActiveTab("fulfilled");
        } else {
          setActiveTab("ongoing");
        }
      }
    } else {
      setSelectedRoom(null);
    }
  }, [initialSelectedRoom, roomsList, setActiveTab]);

  const filterRef = useRef(null);
  const searchInputRef = useRef(null);

  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  const handleCloseSearch = () => {
    setSearchQuery("");
    setIsSearchExpanded(false);
    setIsFilterOpen(false);
  };

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

  // Filtered rooms based on activeTab, search, role, status
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
  }, [activeTab, searchQuery, selectedRole, selectedState, ongoingRooms, fulfilledRooms]);

  // Active selected room: only selected when user explicitly chooses one or when initialSelectedRoom is provided
  const activeSelectedRoom = useMemo(() => {
    if (selectedRoom) {
      const match = filteredRooms.find((r) => r.id === selectedRoom.id);
      if (match) return { ...match, ...selectedRoom };
      return selectedRoom;
    }
    return null;
  }, [selectedRoom, filteredRooms]);

  // Render the matching mobile view component for the selected room
  const renderMobileDetail = (room) => {
    if (!room) {
      return (
        <div className="desktop-pr-empty-detail">
          <div className="desktop-pr-empty-illustration">
            <span className="material-symbols-outlined desktop-pr-empty-watermark">
              shield_lock
            </span>
          </div>
          <h3 className="desktop-pr-empty-title">PayKudi Payment Room</h3>
          <p className="desktop-pr-empty-subtitle">
            Select a payment room from the left list to view.
          </p>
          <div className="desktop-pr-empty-features">
            <div className="desktop-pr-feature-item">
              <span className="material-symbols-outlined">lock</span>
              <span>End-to-End PayKudi Security</span>
            </div>
            <div className="desktop-pr-feature-item">
              <span className="material-symbols-outlined">verified_user</span>
              <span>Verified Counterparties</span>
            </div>
          </div>
        </div>
      );
    }

    const itemRole = room.role === "Selling" ? "Seller" : (room.role === "Buying" ? "Buyer" : role);
    const status = room.status || "";
    const statusText = room.statusText || "";

    if (status === "awaiting_payment" || statusText === "Awaiting Payment") {
      return (
        <MobileAwaitingPayment
          key={room.id}
          room={room}
          isPaymentRoomWhite={!dark}
          onBack={() => setSelectedRoom(null)}
          onPaymentConfirmed={() => {
            const updated = {
              ...room,
              status: "payment_received",
              statusText: "Payment Received",
            };
            setSelectedRoom(updated);
          }}
        />
      );
    }

    if (status === "payment_received" || statusText === "Payment Received") {
      return (
        <MobilePaymentReceived
          key={room.id}
          room={room}
          isPaymentRoomWhite={!dark}
          onBack={() => setSelectedRoom(null)}
        />
      );
    }

    if (status === "in_transit" || statusText === "In Transit") {
      return (
        <MobileInTransit
          key={room.id}
          room={room}
          role={itemRole}
          isPaymentRoomWhite={!dark}
          onBack={() => setSelectedRoom(null)}
        />
      );
    }

    if (status === "delivered" || statusText === "Confirm delivery" || statusText === "Confirm Delivery") {
      return (
        <MobileConfirmDelivery
          key={room.id}
          room={room}
          role={itemRole}
          isPaymentRoomWhite={!dark}
          onBack={() => setSelectedRoom(null)}
          onDeliveryConfirmed={() => {
            const updated = {
              ...room,
              status: "completed",
              statusText: "Completed",
              category: "fulfilled",
            };
            setSelectedRoom(updated);
            setActiveTab("fulfilled");
          }}
          onNavigateToDispute={(disputeData) => {
            if (disputeData) {
              const updated = {
                ...room,
                status: "dispute_ongoing",
                statusText: "Dispute Ongoing",
                disputeReason: disputeData.reason,
                disputeMessage: disputeData.description,
                disputePhotos: disputeData.images,
              };
              setSelectedRoom(updated);
            }
          }}
        />
      );
    }

    if (status === "dispute_ongoing" || statusText === "Dispute Ongoing" || statusText === "Dispute ongoing") {
      return (
        <MobileDisputeOngoing
          key={room.id}
          room={room}
          role={itemRole}
          isPaymentRoomWhite={!dark}
          onBack={() => setSelectedRoom(null)}
        />
      );
    }

    if (status === "completed" || statusText === "Completed" || statusText === "Payment Completed") {
      return (
        <MobileCompleted
          key={room.id}
          room={room}
          role={itemRole}
          isPaymentRoomWhite={!dark}
          onBack={() => setSelectedRoom(null)}
        />
      );
    }

    // Default fallback
    return (
      <MobileAwaitingPayment
        key={room.id}
        room={room}
        isPaymentRoomWhite={!dark}
        onBack={() => setSelectedRoom(null)}
      />
    );
  };

  return (
    <div className="desktop-payment-room-wrapper">
      <main id="payment-room" className="desktop-payment-room-main">
        <div className="desktop-pr-split-layout">
          {/* ── LEFT PANE: CARDS LIST & SEARCH (WhatsApp Web style) ── */}
          <aside className="desktop-pr-left-pane" aria-label="Payment Rooms List">
            {/* Header: Tabs with Expandable / Collapsing Search Trigger (Mobile Style) */}
            <div className="desktop-pr-left-header">
              {!isSearchExpanded ? (
                /* Collapsed Row: Tabs on left, Search Trigger on far right */
                <div className="desktop-pr-collapsed-row">
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

                  {/* Expandable Search Trigger Button */}
                  <button
                    type="button"
                    className={`desktop-pr-search-trigger-btn ${searchQuery || activeFilterCount > 0 ? "has-active-query" : ""}`}
                    onClick={() => {
                      setIsSearchExpanded(true);
                      setTimeout(() => searchInputRef.current?.focus(), 60);
                    }}
                    aria-label="Open search and filter"
                    title="Search payment rooms"
                  >
                    <Search size={18} />
                    {(searchQuery || activeFilterCount > 0) && (
                      <span className="desktop-pr-trigger-filter-dot" />
                    )}
                  </button>
                </div>
              ) : (
                /* Expanded Row: Full-width search bar with embedded filter and close button */
                <div className="desktop-pr-search-expanded-row">
                  <div className="desktop-pr-search-container" ref={filterRef}>
                    <Search className="desktop-pr-search-icon" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search by title, ID, or name..."
                      className="desktop-pr-search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        className="desktop-pr-clear-btn"
                        aria-label="Clear search"
                        title="Clear search"
                      >
                        <X size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCloseSearch}
                        className="desktop-pr-clear-btn"
                        aria-label="Close search"
                        title="Close search"
                      >
                        <X size={15} />
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
              )}
            </div>

            {/* Vertical Scrollable List of Cards */}
            <div className="desktop-pr-cards-list">
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
                  const roleLower = String(room.role || "").toLowerCase();
                  const isBuying = roleLower.includes("buy");
                  const counterpartyLabel = isBuying ? "Seller's Name: " : "Buyer's Name: ";
                  const counterpartyName = isBuying
                    ? (room.sellerName || room.counterparty || "Seller")
                    : (room.buyerName || room.counterparty || "Buyer");
                  const isSelected = activeSelectedRoom?.id === room.id;

                  return (
                    <div
                      key={room.id}
                      className={`desktop-pr-card ${isSelected ? "selected" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedRoom(room);
                        onSelectRoom?.(room);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedRoom(room);
                          onSelectRoom?.(room);
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

                      {/* Counterparty: Seller's Name or Buyer's Name */}
                      <p className="desktop-pr-card-counterparty">
                        <span className="desktop-pr-counterparty-label">{counterpartyLabel}</span>
                        <strong className="desktop-pr-counterparty-name">{counterpartyName}</strong>
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
          </aside>

          {/* ── RIGHT PANE: DETAIL VIEW (Ashy white in light mode, Black in dark mode) ── */}
          <section
            className="desktop-pr-right-pane"
            aria-label="Payment Room Detail View"
          >
            <div
              className="desktop-pr-mobile-viewport"
            >
              {renderMobileDetail(activeSelectedRoom)}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
