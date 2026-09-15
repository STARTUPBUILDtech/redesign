import { useState, useMemo, useRef, useEffect } from "react";
import { Download, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem } from "./ui/select";
import "./desktop-activity.css";

const INITIAL_TRANSACTIONS = [
  {
    id: "tx-1",
    title: "Payment received",
    time: "Today, 10:42 AM",
    amount: "+₦145,000.00",
    type: "received",
    typeKey: "received",
  },
  {
    id: "tx-2",
    title: "Payment sent",
    time: "Yesterday, 4:18 PM",
    amount: "−₦85,000.00",
    type: "sent",
    typeKey: "sent",
  },
  {
    id: "tx-3",
    title: "Payout sent",
    time: "Mon, 9:24 AM",
    amount: "₦24,000.00",
    type: "payout",
    typeKey: "payout",
  },
  {
    id: "tx-4",
    title: "Payment sent",
    time: "Mar 14, 2025 at 6:31 PM",
    amount: "−₦75,000.00",
    type: "sent",
    typeKey: "sent",
  },
  {
    id: "tx-5",
    title: "Refund sent",
    time: "Sun, 2:15 PM",
    amount: "−₦12,500.00",
    type: "refund",
    typeKey: "refund",
  },
  {
    id: "tx-6",
    title: "Payout sent",
    time: "Mar 10, 2025 at 11:20 AM",
    amount: "₦50,000.00",
    type: "payout",
    typeKey: "payout",
  },
  {
    id: "tx-7",
    title: "Payment received",
    time: "Mar 08, 2025 at 4:44 PM",
    amount: "+₦320,000.00",
    type: "received",
    typeKey: "received",
  },
  {
    id: "tx-8",
    title: "Payment received",
    time: "Mar 06, 2025 at 1:15 PM",
    amount: "+₦95,000.00",
    type: "received",
    typeKey: "received",
  },
  {
    id: "tx-9",
    title: "Payment sent",
    time: "Mar 04, 2025 at 8:30 AM",
    amount: "−₦42,000.00",
    type: "sent",
    typeKey: "sent",
  },
  {
    id: "tx-10",
    title: "Payout sent",
    time: "Mar 02, 2025 at 3:50 PM",
    amount: "₦180,000.00",
    type: "payout",
    typeKey: "payout",
  },
  {
    id: "tx-11",
    title: "Refund sent",
    time: "Feb 28, 2025 at 11:05 AM",
    amount: "−₦8,750.00",
    type: "refund",
    typeKey: "refund",
  },
  {
    id: "tx-12",
    title: "Payment received",
    time: "Feb 26, 2025 at 5:22 PM",
    amount: "+₦210,000.00",
    type: "received",
    typeKey: "received",
  },
  {
    id: "tx-13",
    title: "Payment sent",
    time: "Feb 24, 2025 at 9:14 AM",
    amount: "−₦63,500.00",
    type: "sent",
    typeKey: "sent",
  },
  {
    id: "tx-14",
    title: "Payout sent",
    time: "Feb 21, 2025 at 2:40 PM",
    amount: "₦95,000.00",
    type: "payout",
    typeKey: "payout",
  },
  {
    id: "tx-15",
    title: "Payment received",
    time: "Feb 19, 2025 at 12:10 PM",
    amount: "+₦540,000.00",
    type: "received",
    typeKey: "received",
  },
  {
    id: "tx-16",
    title: "Refund sent",
    time: "Feb 16, 2025 at 4:55 PM",
    amount: "−₦15,000.00",
    type: "refund",
    typeKey: "refund",
  },
  {
    id: "tx-17",
    title: "Payment sent",
    time: "Feb 14, 2025 at 10:30 AM",
    amount: "−₦118,000.00",
    type: "sent",
    typeKey: "sent",
  },
  {
    id: "tx-18",
    title: "Payout sent",
    time: "Feb 11, 2025 at 3:18 PM",
    amount: "₦72,000.00",
    type: "payout",
    typeKey: "payout",
  },
  {
    id: "tx-19",
    title: "Payment received",
    time: "Feb 08, 2025 at 11:45 AM",
    amount: "+₦285,000.00",
    type: "received",
    typeKey: "received",
  },
  {
    id: "tx-20",
    title: "Payment sent",
    time: "Feb 05, 2025 at 6:02 PM",
    amount: "−₦34,000.00",
    type: "sent",
    typeKey: "sent",
  },
  {
    id: "tx-21",
    title: "Payout sent",
    time: "Feb 02, 2025 at 1:20 PM",
    amount: "₦150,000.00",
    type: "payout",
    typeKey: "payout",
  },
  {
    id: "tx-22",
    title: "Refund sent",
    time: "Jan 29, 2025 at 4:12 PM",
    amount: "−₦22,000.00",
    type: "refund",
    typeKey: "refund",
  },
  {
    id: "tx-23",
    title: "Payment received",
    time: "Jan 25, 2025 at 10:15 AM",
    amount: "+₦470,000.00",
    type: "received",
    typeKey: "received",
  },
  {
    id: "tx-24",
    title: "Payment sent",
    time: "Jan 20, 2025 at 3:45 PM",
    amount: "−₦90,000.00",
    type: "sent",
    typeKey: "sent",
  },
];

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

function ActivityRow({ item, isLast }) {
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

export default function DesktopActivity() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedRange, setSelectedRange] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [contentFits, setContentFits] = useState(false);
  const filterRef = useRef(null);

  const toolbarRef = useRef(null);
  const statsGridRef = useRef(null);
  const listRef = useRef(null);
  const wasStickyRef = useRef(false);

  const activeFilterCount = (selectedType !== "all" ? 1 : 0) + (selectedRange !== "all" ? 1 : 0);

  const filteredTransactions = useMemo(() => {
    return INITIAL_TRANSACTIONS.filter((item) => {
      // Filter by Type
      if (selectedType !== "all" && item.typeKey !== selectedType) {
        return false;
      }

      // Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchType = (item.type || "").toLowerCase().includes(q);
        const matchAmount = item.amount.toLowerCase().includes(q);
        const matchDate = item.time.toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);
        if (!matchTitle && !matchType && !matchAmount && !matchDate && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [searchQuery, selectedType]);

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

  const handleExport = () => {
    const headers = ["Activity", "Type", "Amount", "Date and time"];
    const rows = filteredTransactions.map((tx) => [
      `"${tx.title.replace(/"/g, '""')}"`,
      `"${tx.title}"`,
      `"${tx.amount}"`,
      `"${tx.time}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `paykudi-activity-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
                <p className="desktop-stat-val">₦248,000.00</p>
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
                <p className="desktop-stat-val">₦312,500.00</p>
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
                <p className="desktop-stat-val">₦154,000.00</p>
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
                <p className="desktop-stat-val">₦58,250.00</p>
              </CardContent>
            </Card>
          </div>

          {/* Toolbar with Activities Heading & Controls */}
          <div className="desktop-activity-toolbar" ref={toolbarRef}>
            <h2 className="desktop-activities-heading">Activities</h2>

            <div className="desktop-activity-controls">
              {/* Unified Search Bar with Filter Icon on Far Right */}
              <div className="unified-search-container" ref={filterRef}>
                <Search className="unified-search-icon" />
                <input
                  type="text"
                  placeholder="Search by title, date, or amount"
                  className="unified-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                <div className="unified-search-divider" />

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

              <Button variant="outline" onClick={handleExport} className="ui-btn-outline">
                <Download className="desktop-export-icon" size={16} />
                Export activity
              </Button>
            </div>
          </div>

          {/* Boxless Activity List (matching Home page) */}
          <div className={`boxless-activity-list desktop-boxless-activity-list ${!contentFits ? "overflowing" : ""}`} ref={listRef}>
            {filteredTransactions.length === 0 ? (
              <div className="desktop-empty-row">
                No matching activity found. Try clearing your search or filter.
              </div>
            ) : (
              filteredTransactions.map((tx, idx) => (
                <ActivityRow
                  key={tx.id}
                  item={tx}
                  isLast={idx === filteredTransactions.length - 1}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
