import { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  Activity,
  X,
} from "lucide-react";
import { Select, SelectContent, SelectItem } from "../ui/select";
import { ALL_TRANSACTIONS } from "../../data/transactions.js";
import "../../styles/mobile-activity.css";

function getActivityConfig(item) {
  const t = (item.typeKey || item.type || item.title || "").toLowerCase();
  if (t.includes("refund")) {
    return {
      iconClass: "act-icon-refund",
      amountClass: "act-val-refund",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14L4 9l5-5"></path>
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path>
        </svg>
      ),
    };
  }
  if (t.includes("payout") || t.includes("withdrawn") || t.includes("withdraw")) {
    return {
      iconClass: "act-icon-payout",
      amountClass: "act-val-payout",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"></path>
        </svg>
      ),
    };
  }
  if (t.includes("received")) {
    return {
      iconClass: "act-icon-received",
      amountClass: "act-val-received",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v16m0 0l-6-6m6 6l6-6"></path>
        </svg>
      ),
    };
  }
  return {
    iconClass: "act-icon-sent",
    amountClass: "act-val-sent",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"></path>
      </svg>
    ),
  };
}

function MobileActivityRow({ item, isLast }) {
  const cfg = getActivityConfig(item);
  return (
    <div className="activity-item-row" role="button" tabIndex={0}>
      <div className={`activity-item-icon ${cfg.iconClass}`}>
        {cfg.icon}
      </div>
      <div className={`activity-item-inner ${isLast ? "no-border" : ""}`}>
        <div className="activity-item-info">
          <h4 className="activity-item-title">{item.title}</h4>
          <p className="activity-item-time">{item.time}</p>
        </div>
        <div className="activity-item-amount">
          <p className={`activity-item-value ${cfg.amountClass}`}>{item.amount}</p>
        </div>
      </div>
    </div>
  );
}

export default function MobileActivity() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedRange, setSelectedRange] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const [contentFits, setContentFits] = useState(false);
  const filterRef = useRef(null);
  const searchInputRef = useRef(null);
  const toolbarRef = useRef(null);
  const statsGridRef = useRef(null);
  const listRef = useRef(null);
  const wasStickyRef = useRef(false);

  // Always scroll to the very top on initial view
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  const activeFilterCount = (selectedType !== "all" ? 1 : 0) + (selectedRange !== "all" ? 1 : 0);

  const filteredTransactions = useMemo(() => {
    return ALL_TRANSACTIONS.filter((tx) => {
      // Type filtering
      if (selectedType !== "all") {
        const typeKey = (tx.typeKey || tx.type || tx.title).toLowerCase();
        if (selectedType === "received" && !typeKey.includes("received")) return false;
        if (selectedType === "sent" && !typeKey.includes("sent")) return false;
        if (selectedType === "payout" && !typeKey.includes("payout")) return false;
        if (selectedType === "refund" && !typeKey.includes("refund")) return false;
      }

      // Date range filtering
      if (selectedRange === "today") {
        if (!tx.time.toLowerCase().includes("today")) return false;
      } else if (selectedRange === "7") {
        const isRecent =
          tx.time.includes("Today") ||
          tx.time.includes("Yesterday") ||
          tx.time.includes("Sun") ||
          tx.time.includes("Mon") ||
          tx.time.includes("Mar 14") ||
          tx.time.includes("Mar 10");
        if (!isRecent) return false;
      } else if (selectedRange === "30") {
        if (!tx.time.includes("Mar 2025") && !tx.time.includes("Feb 2025")) {
          if (!tx.time.includes("Today") && !tx.time.includes("Yesterday")) {
            return false;
          }
        }
      }

      // Search term filtering
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const matchesTitle = tx.title.toLowerCase().includes(term);
        const matchesTime = tx.time.toLowerCase().includes(term);
        const matchesAmount = tx.amount.toLowerCase().includes(term);
        if (!matchesTitle && !matchesTime && !matchesAmount) return false;
      }

      return true;
    });
  }, [searchTerm, selectedType, selectedRange]);

  // Measure whether current filtered activities fit on screen below sticky toolbar
  useEffect(() => {
    const checkFits = () => {
      const headerEl = document.querySelector(".mobile-header");
      const headerH = headerEl
        ? headerEl.getBoundingClientRect().height
        : 44;
      const availableH = window.innerHeight - headerH - 56 - 20 - 84;
      if (filteredTransactions.length === 0) {
        setContentFits(true);
        return;
      }
      if (listRef.current) {
        const listItems = listRef.current.querySelectorAll(".activity-item-row");
        const totalH = Array.from(listItems).reduce((sum, el) => sum + el.offsetHeight, 0);
        setContentFits(totalH > 0 && totalH <= availableH);
      }
    };
    checkFits();
    const timer = setTimeout(checkFits, 50);
    window.addEventListener("resize", checkFits);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkFits);
    };
  }, [filteredTransactions]);

  // Track if toolbar is currently sticky and clamp downward scroll if content fits
  useEffect(() => {
    const handleScroll = () => {
      if (toolbarRef.current && statsGridRef.current) {
        const headerEl = document.querySelector(".mobile-header");
        const headerH = headerEl
          ? headerEl.getBoundingClientRect().height
          : 44;
        const rect = toolbarRef.current.getBoundingClientRect();
        wasStickyRef.current = rect.top <= headerH + 6;

        // If content fits completely on screen and toolbar is sticky, clamp downward scroll
        if (contentFits && wasStickyRef.current) {
          const statsBottom = statsGridRef.current.getBoundingClientRect().bottom + window.scrollY;
          const dockScrollY = Math.max(0, statsBottom + 18 - headerH);
          if (window.scrollY > dockScrollY) {
            window.scrollTo({ top: dockScrollY, behavior: "instant" });
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [contentFits]);

  // Prevent downward touch gesture or wheel scroll when content fits and toolbar is sticky
  useEffect(() => {
    let touchStartY = 0;

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (!contentFits || !wasStickyRef.current || !statsGridRef.current) return;
      const currentY = e.touches[0].clientY;
      const isSwipingUp = touchStartY - currentY > 0; // swiping up tries to scroll down

      const headerEl = document.querySelector(".mobile-header");
      const headerH = headerEl
        ? headerEl.getBoundingClientRect().height
        : 44;
      const statsBottom = statsGridRef.current.getBoundingClientRect().bottom + window.scrollY;
      const dockScrollY = Math.max(0, statsBottom + 18 - headerH);

      if (isSwipingUp && window.scrollY >= dockScrollY - 2) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const handleWheel = (e) => {
      if (!contentFits || !wasStickyRef.current || !statsGridRef.current) return;
      const isScrollingDown = e.deltaY > 0;

      const headerEl = document.querySelector(".mobile-header");
      const headerH = headerEl
        ? headerEl.getBoundingClientRect().height
        : 44;
      const statsBottom = statsGridRef.current.getBoundingClientRect().bottom + window.scrollY;
      const dockScrollY = Math.max(0, statsBottom + 18 - headerH);

      if (isScrollingDown && window.scrollY >= dockScrollY - 2) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [contentFits]);

  // When search or filter changes, if the toolbar was sticky, align scroll to the exact dock position
  // so filtered transactions start cleanly below the sticky toolbar, and scrolling up immediately shows the cards
  useEffect(() => {
    if (wasStickyRef.current && statsGridRef.current) {
      const headerEl = document.querySelector(".mobile-header");
      const headerH = headerEl
        ? headerEl.getBoundingClientRect().height
        : 44;
      const statsBottom = statsGridRef.current.getBoundingClientRect().bottom + window.scrollY;
      const dockScrollY = Math.max(0, statsBottom + 18 - headerH);
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      if (Math.abs(currentScrollY - dockScrollY) > 2) {
        window.scrollTo({ top: dockScrollY, behavior: "instant" });
      }
    }
  }, [searchTerm, selectedType, selectedRange]);

  // Close filter popover on click outside, and collapse search if clicked outside
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

  const hasActiveFilters =
    searchTerm.trim() !== "" || selectedType !== "all" || selectedRange !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedType("all");
    setSelectedRange("all");
    setIsFilterOpen(false);
  };

  return (
    <div className="mobile-activity-view">
      {/* 4 Stat Cards in 2x2 Grid (Black in Light Mode, White in Dark Mode) */}
      <div className="mobile-activity-stats-grid" ref={statsGridRef}>
        {/* Card 1: Sent this month */}
        <div className="mobile-stat-card">
          <div className="mobile-stat-header">
            <span className="mobile-stat-label">Sent this month</span>
            <div className="mobile-stat-icon stat-icon-sent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"></path>
              </svg>
            </div>
          </div>
          <p className="mobile-stat-val">₦248,000.00</p>
        </div>

        {/* Card 2: Received this month */}
        <div className="mobile-stat-card">
          <div className="mobile-stat-header">
            <span className="mobile-stat-label">Received this month</span>
            <div className="mobile-stat-icon stat-icon-received">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4v16m0 0l-6-6m6 6l6-6"></path>
              </svg>
            </div>
          </div>
          <p className="mobile-stat-val">₦312,500.00</p>
        </div>

        {/* Card 3: Payout this month */}
        <div className="mobile-stat-card">
          <div className="mobile-stat-header">
            <span className="mobile-stat-label">Payout this month</span>
            <div className="mobile-stat-icon stat-icon-payout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"></path>
              </svg>
            </div>
          </div>
          <p className="mobile-stat-val">₦154,000.00</p>
        </div>

        {/* Card 4: Refund this month */}
        <div className="mobile-stat-card">
          <div className="mobile-stat-header">
            <span className="mobile-stat-label">Refund this month</span>
            <div className="mobile-stat-icon stat-icon-refund">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 14L4 9l5-5"></path>
                <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path>
              </svg>
            </div>
          </div>
          <p className="mobile-stat-val">₦58,250.00</p>
        </div>
      </div>

      {/* Sticky Toolbar: Expandable Search & Activities Header */}
      <div className="mobile-activity-sticky-toolbar" ref={toolbarRef}>
        {!isSearchExpanded ? (
          /* Collapsed Row: Activities title on left, Search icon on far right */
          <div className="mobile-activity-collapsed-row">
            <h2 className="mobile-activity-title-text">Activities</h2>
            <button
              type="button"
              className={`mobile-search-trigger-btn ${searchTerm || activeFilterCount > 0 ? "has-active-query" : ""}`}
              onClick={() => {
                setIsSearchExpanded(true);
                setTimeout(() => searchInputRef.current?.focus(), 60);
              }}
              aria-label="Open search and filters"
              title="Search and filter activities"
            >
              <Search size={18} />
              {activeFilterCount > 0 && (
                <span className="mobile-trigger-filter-dot" />
              )}
            </button>
          </div>
        ) : (
          /* Expanded Row: Full-width search bar + Filter button */
          <div className="mobile-search-expanded-row">
            <div className="mobile-unified-search" ref={filterRef}>
              <Search className="mobile-unified-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, date, or amount"
                className="mobile-unified-search-input"
              />

              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    searchInputRef.current?.focus();
                  }}
                  className="mobile-search-clear-inline"
                  aria-label="Clear search text"
                  title="Clear text"
                >
                  <X size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchExpanded(false);
                    setIsFilterOpen(false);
                  }}
                  className="mobile-search-clear-inline"
                  aria-label="Close search"
                  title="Close search"
                >
                  <X size={15} />
                </button>
              )}

              <div className={`mobile-unified-search-divider ${isFilterOpen ? "active" : ""}`} />

              <button
                type="button"
                className={`mobile-unified-filter-btn ${isFilterOpen ? "active" : ""}`}
                onClick={() => setIsFilterOpen((prev) => !prev)}
                title="Filter activities"
                aria-label="Filter activities"
                aria-expanded={isFilterOpen}
              >
                <SlidersHorizontal className="mobile-unified-filter-icon" />
                {activeFilterCount > 0 && (
                  <span className="mobile-unified-filter-badge">{activeFilterCount}</span>
                )}
              </button>

              {/* Filter Popover displaying the 2 dropdowns when tapped - exact desktop match */}
              {isFilterOpen && (
                <div className="unified-filter-popover mobile-filter-popover" role="dialog" aria-label="Filter options">
                  <div className="filter-popover-header">
                    <span className="filter-popover-title">Filters</span>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        className="filter-reset-btn"
                        onClick={() => {
                          setSelectedType("all");
                          setSelectedRange("all");
                        }}
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="filter-popover-body">
                    <Select
                      defaultValue="all"
                      value={selectedType}
                      onValueChange={setSelectedType}
                      className="filter-popover-select"
                      placeholder="Transaction type"
                    >
                      <SelectContent className="ui-select">
                        <SelectItem value="received">Payment received</SelectItem>
                        <SelectItem value="sent">Payment sent</SelectItem>
                        <SelectItem value="payout">Payout sent</SelectItem>
                        <SelectItem value="refund">Refund sent</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      defaultValue="all"
                      value={selectedRange}
                      onValueChange={setSelectedRange}
                      className="filter-popover-select"
                      placeholder="Date range"
                    >
                      <SelectContent className="ui-select">
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="custom">Custom range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Transaction List or Empty State */}
      {filteredTransactions.length === 0 ? (
        <div className="mobile-empty-state">
          <Activity className="mobile-empty-icon" size={32} />
          <div>
            <h3 className="mobile-empty-title">No matching activity</h3>
            <p className="mobile-empty-sub">Try changing your search or filters</p>
          </div>
          <button
            type="button"
            onClick={clearFilters}
            className="mobile-empty-btn"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className={`boxless-activity-list ${!contentFits ? "overflowing" : ""}`} ref={listRef}>
          {filteredTransactions.map((tx, idx) => (
            <MobileActivityRow
              key={tx.id}
              item={tx}
              isLast={idx === filteredTransactions.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
