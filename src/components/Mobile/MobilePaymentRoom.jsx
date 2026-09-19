import { useState, useMemo, useRef, useEffect } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Select, SelectContent, SelectItem } from "../ui/select";
import { ALL_PAYMENT_ROOMS } from "../../data/paymentRooms.js";
import "../../styles/mobile-payment-room.css";

export default function MobilePaymentRoom({ onSelectRoom }) {
  const [activeTab, setActiveTab] = useState("ongoing");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filterRef = useRef(null);
  const searchInputRef = useRef(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Filter count for active filter badge (Role + State)
  const activeFilterCount =
    (selectedRole !== "all" ? 1 : 0) + (selectedState !== "all" ? 1 : 0);

  // Auto-collapse search on click outside if input is empty
  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setIsFilterOpen(false);
        if (!searchTerm.trim()) {
          setIsSearchExpanded(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchTerm]);

  // Tab counts
  const ongoingRooms = useMemo(
    () => ALL_PAYMENT_ROOMS.filter((r) => r.category === "ongoing"),
    []
  );
  const fulfilledRooms = useMemo(
    () => ALL_PAYMENT_ROOMS.filter((r) => r.category === "fulfilled"),
    []
  );

  // Filtered rooms based on active tab, search term, role, and state
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

      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
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
  }, [activeTab, searchTerm, selectedRole, selectedState, ongoingRooms, fulfilledRooms]);

  const handleClearSearch = () => {
    setSearchTerm("");
    searchInputRef.current?.focus();
  };

  const handleCloseSearch = () => {
    setSearchTerm("");
    setIsSearchExpanded(false);
    setIsFilterOpen(false);
  };

  return (
    <div className="mobile-payment-room-view">
      {/* Sticky Header with Ongoing/Fulfilled Tabs and Expandable Search */}
      <div className="mobile-pr-sticky-toolbar">
        {!isSearchExpanded ? (
          /* Collapsed Row: Tabs on left, Search Icon trigger on far right */
          <div className="mobile-pr-collapsed-row">
            <div className="mobile-pr-tabs-wrap">
              <button
                type="button"
                className={`mobile-pr-tab-btn ${activeTab === "ongoing" ? "active" : ""}`}
                onClick={() => setActiveTab("ongoing")}
              >
                <span>Ongoing</span>
                <span className="mobile-pr-tab-badge">{ongoingRooms.length}</span>
              </button>
              <button
                type="button"
                className={`mobile-pr-tab-btn ${activeTab === "fulfilled" ? "active" : ""}`}
                onClick={() => setActiveTab("fulfilled")}
              >
                <span>Fulfilled</span>
                <span className="mobile-pr-tab-badge">{fulfilledRooms.length}</span>
              </button>
            </div>

            {/* Expandable Search Trigger Button (copied from MobileActivity) */}
            <button
              type="button"
              className={`mobile-pr-search-trigger-btn ${searchTerm || activeFilterCount > 0 ? "has-active-query" : ""}`}
              onClick={() => {
                setIsSearchExpanded(true);
                setTimeout(() => searchInputRef.current?.focus(), 60);
              }}
              aria-label="Open search and filter"
              title="Search payment rooms"
            >
              <Search size={18} />
              {(searchTerm || activeFilterCount > 0) && (
                <span className="mobile-pr-trigger-filter-dot" />
              )}
            </button>
          </div>
        ) : (
          /* Expanded Row: Full-width search bar with embedded filter (copied from MobileActivity) */
          <div className="mobile-pr-search-expanded-row">
            <div className="mobile-pr-unified-search" ref={filterRef}>
              <Search className="mobile-pr-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Payment Room..."
                className="mobile-pr-search-input"
              />

              {searchTerm ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="mobile-pr-clear-btn"
                  aria-label="Clear search text"
                  title="Clear text"
                >
                  <X size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCloseSearch}
                  className="mobile-pr-clear-btn"
                  aria-label="Close search"
                  title="Close search"
                >
                  <X size={15} />
                </button>
              )}

              <div className="mobile-pr-search-divider" />

              <button
                type="button"
                className={`mobile-pr-filter-btn ${isFilterOpen ? "active" : ""}`}
                onClick={() => setIsFilterOpen((prev) => !prev)}
                title="Filter payment rooms"
                aria-label="Filter payment rooms"
                aria-expanded={isFilterOpen}
              >
                <SlidersHorizontal size={16} />
                {activeFilterCount > 0 && (
                  <span className="mobile-pr-filter-badge">{activeFilterCount}</span>
                )}
              </button>

              {/* Filter Popover */}
              {isFilterOpen && (
                <div
                  className="mobile-pr-filter-popover"
                  role="dialog"
                  aria-label="Filter options"
                >
                  <div className="mobile-pr-popover-header">
                    <span className="mobile-pr-popover-title">Filters</span>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        className="mobile-pr-popover-reset"
                        onClick={() => {
                          setSelectedRole("all");
                          setSelectedState("all");
                        }}
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="mobile-pr-filter-group">
                    <span className="mobile-pr-filter-label">State / Status</span>
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

                  <div className="mobile-pr-filter-group">
                    <span className="mobile-pr-filter-label">Role</span>
                    <div className="mobile-pr-role-options">
                      <button
                        type="button"
                        className={`mobile-pr-role-btn ${selectedRole === "all" ? "active" : ""}`}
                        onClick={() => setSelectedRole("all")}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        className={`mobile-pr-role-btn ${selectedRole === "Buying" ? "active" : ""}`}
                        onClick={() => setSelectedRole("Buying")}
                      >
                        Buying
                      </button>
                      <button
                        type="button"
                        className={`mobile-pr-role-btn ${selectedRole === "Selling" ? "active" : ""}`}
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

      {/* Payment Room Cards List */}
      <div className="mobile-pr-list">
        {filteredRooms.length === 0 ? (
          <div className="mobile-pr-empty">
            <span className="material-symbols-outlined mobile-pr-empty-icon">payments</span>
            <p className="mobile-pr-empty-text">
              No {activeTab} payment rooms found
              {searchTerm ? ` matching "${searchTerm}"` : ""}
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
                className="mobile-pr-card"
                role="button"
                tabIndex={0}
                onClick={() => onSelectRoom && onSelectRoom(room)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectRoom && onSelectRoom(room);
                  }
                }}
              >
                {/* Top Row: Role & Room ID */}
                <div className="mobile-pr-card-top">
                  <span
                    className={`mobile-pr-role-tag ${isBuying ? "buying" : "selling"}`}
                  >
                    {room.role}
                  </span>
                  <span className="mobile-pr-room-id">#{room.id}</span>
                </div>

                {/* Main Row: Title & Price */}
                <div className="mobile-pr-card-main">
                  <h4 className="mobile-pr-card-title">{room.title}</h4>
                  <span className="mobile-pr-card-price">{room.price}</span>
                </div>

                {/* Counterparty Row */}
                <p className="mobile-pr-card-counterparty">
                  <span>{counterpartyLabel}</span>
                  <strong>{counterpartyName}</strong>
                </p>

                {/* Bottom Row: Date & Status */}
                <div className="mobile-pr-card-bottom">
                  <span className="mobile-pr-card-date">{room.date}</span>
                  <span
                    className={`mobile-pr-status-badge status-${room.status}`}
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
  );
}
