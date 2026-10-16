import { useState, useMemo, useRef, useEffect } from "react";
import { Search, SlidersHorizontal, ArrowUpRight, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem } from "./ui/select";
import DesktopActivityDetail from "./DesktopActivityDetail";
import ReceiptModal from "./Shared/ReceiptModal";
import BankLogo from "./BankLogo.jsx";
import EmptyActivityGraphic from "./Shared/EmptyActivityGraphic.jsx";
import { ALL_TRANSACTIONS } from "../data/transactions.js";
import { useDashboard } from "../context/DashboardContext.jsx";
import "./desktop-activity.css";

function getActivityConfig(item) {
  const t = (item.typeKey || item.type || item.title || "").toLowerCase();

  if (t.includes("refund")) {
    return {
      typeKey: "refund",
      defaultBank: "kuda",
      amountClass: "act-val-refund",
      badgeClass: "refund",
      badgeIcon: (
        <svg width="8.5" height="8.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14L4 9l5-5" />
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" />
        </svg>
      ),
    };
  }
  if (t.includes("payout") || t.includes("withdrawn") || t.includes("withdraw")) {
    return {
      typeKey: "payout",
      defaultBank: "firstbank",
      amountClass: "act-val-payout",
      badgeClass: "payout",
      badgeIcon: (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "translate(-0.5px, 0.5px)" }}>
          <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
        </svg>
      ),
    };
  }
  if (t.includes("received")) {
    return {
      typeKey: "received",
      defaultBank: "access",
      amountClass: "act-val-received",
      badgeClass: "received",
      badgeIcon: (
        <svg width="8.5" height="8.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v16m0 0l-6-6m6 6l6-6" />
        </svg>
      ),
    };
  }
  return {
    typeKey: "sent",
    defaultBank: "zenith",
    amountClass: "act-val-sent",
    badgeClass: "sent",
    badgeIcon: (
      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "translate(-0.5px, 0.5px)" }}>
        <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
      </svg>
    ),
  };
}

function ActivityRow({ item, isLast, onSelect }) {
  const cfg = getActivityConfig(item);
  const bank = item.bankCode || item.bank || cfg.defaultBank;
  return (
    <div
      className="activity-item-row"
      role="button"
      tabIndex={0}
      style={{ cursor: "pointer" }}
      onClick={() => onSelect && onSelect(item)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect && onSelect(item)}
    >
      <div className="activity-item-icon">
        <BankLogo bankCode={bank} size={40} className="activity-bank-badge" />
        <span className={`activity-direction-badge ${cfg.badgeClass}`}>
          {cfg.badgeIcon}
        </span>
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

export default function DesktopActivity({ transactions: propTransactions, onWithdraw }) {
  let contextTransactions = null;
  let dash = null;
  try {
    dash = useDashboard();
    contextTransactions = dash?.transactions;
  } catch (e) {
    contextTransactions = null;
  }

  const transactionsList = propTransactions !== undefined ? propTransactions : (contextTransactions || ALL_TRANSACTIONS);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedRange, setSelectedRange] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef(null);
  const [contentFits, setContentFits] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const filterRef = useRef(null);

  const toolbarRef = useRef(null);
  const statsGridRef = useRef(null);
  const listRef = useRef(null);
  const wasStickyRef = useRef(false);

  const activeFilterCount = (selectedType !== "all" ? 1 : 0) + (selectedRange !== "all" ? 1 : 0);

  // Dynamic calculation of monthly stats from actual transactions
  const stats = useMemo(() => {
    let sent = 0;
    let received = 0;
    let payout = 0;
    let refund = 0;

    (transactionsList || []).forEach((tx) => {
      const rawAmount = parseFloat(
        String(tx.amount || "0").replace(/[^0-9.]/g, "")
      ) || 0;
      const type = (tx.typeKey || tx.type || tx.title || "").toLowerCase();
      if (type.includes("received")) received += rawAmount;
      else if (type.includes("sent")) sent += rawAmount;
      else if (type.includes("payout") || type.includes("withdraw")) payout += rawAmount;
      else if (type.includes("refund")) refund += rawAmount;
    });

    const formatNaira = (val) =>
      "₦" + val.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return {
      sent: formatNaira(sent),
      received: formatNaira(received),
      payout: formatNaira(payout),
      refund: formatNaira(refund),
    };
  }, [transactionsList]);

  const filteredTransactions = useMemo(() => {
    return (transactionsList || []).filter((item) => {
      // Filter by Type
      if (selectedType !== "all" && item.typeKey !== selectedType) {
        return false;
      }

      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchType = (item.type || "").toLowerCase().includes(q);
        const matchAmount = (item.amount || "").toLowerCase().includes(q);
        const matchDate = (item.time || "").toLowerCase().includes(q);
        const matchId = (item.id || "").toLowerCase().includes(q);
        if (!matchTitle && !matchType && !matchAmount && !matchDate && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [transactionsList, searchQuery, selectedType]);

  // Reset scroll to 0 on initial mount so cards start cleanly visible below the topbar
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Measure whether current filtered activities fit on screen below sticky toolbar
  useEffect(() => {
    const checkFits = () => {
      const topbarEl = document.querySelector(".topbar");
      const topbarH = topbarEl ? topbarEl.getBoundingClientRect().height : 80;
      const availableH = window.innerHeight - topbarH - 60 - 40;
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
        const topbarEl = document.querySelector(".topbar");
        const topbarH = topbarEl ? topbarEl.getBoundingClientRect().height : 80;
        const rect = toolbarRef.current.getBoundingClientRect();
        wasStickyRef.current = rect.top <= topbarH + 6;

        // If content fits completely on screen and toolbar is sticky, clamp downward scroll
        if (contentFits && wasStickyRef.current) {
          const statsBottom = statsGridRef.current.getBoundingClientRect().bottom + window.scrollY;
          const dockScrollY = Math.max(0, statsBottom + 24 - topbarH);
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

  // Prevent downward mouse wheel or touch scroll when content fits and toolbar is sticky
  useEffect(() => {
    let touchStartY = 0;

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      if (!contentFits || !wasStickyRef.current || !statsGridRef.current) return;
      const currentY = e.touches[0].clientY;
      const isSwipingUp = touchStartY - currentY > 0;

      const topbarEl = document.querySelector(".topbar");
      const topbarH = topbarEl ? topbarEl.getBoundingClientRect().height : 80;
      const statsBottom = statsGridRef.current.getBoundingClientRect().bottom + window.scrollY;
      const dockScrollY = Math.max(0, statsBottom + 24 - topbarH);

      if (isSwipingUp && window.scrollY >= dockScrollY - 2) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const handleWheel = (e) => {
      if (!contentFits || !wasStickyRef.current || !statsGridRef.current) return;
      const isScrollingDown = e.deltaY > 0;

      const topbarEl = document.querySelector(".topbar");
      const topbarH = topbarEl ? topbarEl.getBoundingClientRect().height : 80;
      const statsBottom = statsGridRef.current.getBoundingClientRect().bottom + window.scrollY;
      const dockScrollY = Math.max(0, statsBottom + 24 - topbarH);

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
      const topbarEl = document.querySelector(".topbar");
      const topbarH = topbarEl ? topbarEl.getBoundingClientRect().height : 80;
      const statsBottom = statsGridRef.current.getBoundingClientRect().bottom + window.scrollY;
      const dockScrollY = Math.max(0, statsBottom + 24 - topbarH);
      window.scrollTo({ top: dockScrollY, behavior: "instant" });
    }
  }, [searchQuery, selectedType, selectedRange]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
        if (!searchQuery.trim()) {
          setIsSearchExpanded(false);
        }
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
        if (!searchQuery.trim()) {
          setIsSearchExpanded(false);
        }
      }
    }
    if (isFilterOpen || isSearchExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterOpen, isSearchExpanded, searchQuery]);

  return (
    <div className="desktop-activity-wrapper">
      <main className="desktop-activity-main">
        <div className="desktop-activity-content">
          {/* 4 Stat Cards */}
          <div className="desktop-activity-stats-grid" ref={statsGridRef}>
            <Card className="ui-card">
              <CardHeader className="ui-card-header stat-card-header">
                <CardTitle className="ui-card-title">Sent this month</CardTitle>
                <div className="stat-card-icon stat-icon-sent">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"></path>
                  </svg>
                </div>
              </CardHeader>
              <CardContent className="ui-card-content">
                <p className="desktop-stat-val">{stats.sent}</p>
              </CardContent>
            </Card>

            <Card className="ui-card">
              <CardHeader className="ui-card-header stat-card-header">
                <CardTitle className="ui-card-title">Received this month</CardTitle>
                <div className="stat-card-icon stat-icon-received">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 4v16m0 0l-6-6m6 6l6-6"></path>
                  </svg>
                </div>
              </CardHeader>
              <CardContent className="ui-card-content">
                <p className="desktop-stat-val">{stats.received}</p>
              </CardContent>
            </Card>

            <Card className="ui-card">
              <CardHeader className="ui-card-header stat-card-header">
                <CardTitle className="ui-card-title">Payout this month</CardTitle>
                <div className="stat-card-icon stat-icon-payout">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"></path>
                  </svg>
                </div>
              </CardHeader>
              <CardContent className="ui-card-content">
                <p className="desktop-stat-val">{stats.payout}</p>
              </CardContent>
            </Card>

            <Card className="ui-card">
              <CardHeader className="ui-card-header stat-card-header">
                <CardTitle className="ui-card-title">Refund this month</CardTitle>
                <div className="stat-card-icon stat-icon-refund">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 14L4 9l5-5"></path>
                    <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"></path>
                  </svg>
                </div>
              </CardHeader>
              <CardContent className="ui-card-content">
                <p className="desktop-stat-val">{stats.refund}</p>
              </CardContent>
            </Card>
          </div>

          {/* Toolbar with Activities Heading & Controls */}
          <div className="desktop-activity-toolbar" ref={toolbarRef}>
            <div className="desktop-activity-toolbar-row">
              <h2 className="desktop-activities-heading">Activities</h2>

              {!isSearchExpanded ? (
                /* Collapsed Search Icon Trigger Button */
                <button
                  type="button"
                  className={`desktop-activity-search-trigger-btn ${searchQuery || activeFilterCount > 0 ? "has-active-query" : ""}`}
                  onClick={() => {
                    setIsSearchExpanded(true);
                    setTimeout(() => searchInputRef.current?.focus(), 60);
                  }}
                  aria-label="Open search and filter"
                  title="Search and filter activities"
                >
                  <Search size={18} />
                  {(searchQuery || activeFilterCount > 0) && (
                    <span className="desktop-activity-trigger-filter-dot" />
                  )}
                </button>
              ) : (
                /* Expanded Search Bar with Input, Clear/Close and Filter */
                <div className="desktop-activity-controls" ref={filterRef}>
                  <div className="unified-search-container">
                    <Search className="unified-search-icon" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search by title, date, or amount"
                      className="unified-search-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          searchInputRef.current?.focus();
                        }}
                        className="desktop-activity-clear-btn"
                        aria-label="Clear search"
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
                        className="desktop-activity-clear-btn"
                        aria-label="Close search"
                        title="Close search"
                      >
                        <X size={15} />
                      </button>
                    )}

                    <div className={`unified-search-divider ${isFilterOpen ? "active" : ""}`} />

                    <button
                      type="button"
                      className={`unified-filter-btn ${isFilterOpen ? "active" : ""} ${activeFilterCount > 0 ? "has-filters" : ""}`}
                      onClick={() => setIsFilterOpen((prev) => !prev)}
                      title="Filter activities"
                      aria-label="Filter activities"
                      aria-expanded={isFilterOpen}
                    >
                      <SlidersHorizontal className="unified-filter-icon" />
                      {activeFilterCount > 0 && (
                        <span className="unified-filter-badge">{activeFilterCount}</span>
                      )}
                    </button>

                    {/* Filter Popover displaying the 2 dropdowns when tapped */}
                    {isFilterOpen && (
                      <div className="unified-filter-popover" role="dialog" aria-label="Filter options">
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
          </div>

          {/* Boxless Activity List (matching Home page) */}
          <div className={`boxless-activity-list desktop-boxless-activity-list ${!contentFits ? "overflowing" : ""}`} ref={listRef}>
            {filteredTransactions.length === 0 ? (
              <div className="activity-empty-state">
                <div className="activity-empty-graphic-wrap">
                  <EmptyActivityGraphic />
                </div>
                <h3 className="activity-empty-title">No Transactions</h3>
                <p className="activity-empty-subtitle">You haven’t completed any transactions.</p>
                <button
                  type="button"
                  className="activity-empty-cta-btn"
                  onClick={() => {
                    if (onWithdraw) {
                      onWithdraw();
                    } else if (dash?.setActive) {
                      dash.setActive("Withdraw");
                    }
                  }}
                >
                  <ArrowUpRight size={18} className="activity-empty-cta-arrow" />
                  <span>Withdraw</span>
                </button>
              </div>
            ) : (
              filteredTransactions.map((tx, idx) => (
                <ActivityRow
                  key={tx.id}
                  item={tx}
                  isLast={idx === filteredTransactions.length - 1}
                  onSelect={setSelectedItem}
                />
              ))
            )}
          </div>
        </div>
      </main>

      <ReceiptModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        item={selectedItem}
      />
    </div>
  );
}
