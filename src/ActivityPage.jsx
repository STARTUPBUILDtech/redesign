import { useState, useMemo, useRef, useEffect } from "react";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Download,
  ListFilter,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

const INITIAL_ACTIVITIES = [
  {
    id: "act-1",
    title: "Payment received from Maya Chen",
    type: "Payment received",
    category: "received",
    group: "payments",
    amount: "+$850.00",
    isPositive: true,
    dateTime: "Mar 18, 2025 at 10:42 AM",
    status: "Completed",
    statusVariant: "completed",
  },
  {
    id: "act-2",
    title: "Buy USDC",
    type: "Buy",
    category: "buy",
    group: "buy",
    amount: "-$500.00",
    isPositive: false,
    dateTime: "Mar 17, 2025 at 3:18 PM",
    status: "Completed",
    statusVariant: "completed",
  },
  {
    id: "act-3",
    title: "Payout to Chase Checking ••4821",
    type: "Payout sent",
    category: "payout",
    group: "payouts",
    amount: "-$1,200.00",
    isPositive: false,
    dateTime: "Mar 16, 2025 at 9:05 AM",
    status: "Processing",
    statusVariant: "processing",
  },
  {
    id: "act-4",
    title: "Payment sent to Jordan Lee",
    type: "Payment sent",
    category: "sent",
    group: "payments",
    amount: "-$75.00",
    isPositive: false,
    dateTime: "Mar 14, 2025 at 6:31 PM",
    status: "Completed",
    statusVariant: "completed",
  },
  {
    id: "act-5",
    title: "Refund sent to Maya Chen",
    type: "Refund sent",
    category: "refund",
    group: "payments",
    amount: "+$120.00",
    isPositive: true,
    dateTime: "Mar 12, 2025 at 1:12 PM",
    status: "Completed",
    statusVariant: "completed",
  },
  {
    id: "act-6",
    title: "Withdrawal to PayKudi balance",
    type: "Withdrawal",
    category: "withdrawal",
    group: "payouts",
    amount: "-$300.00",
    isPositive: false,
    dateTime: "Mar 10, 2025 at 11:20 AM",
    status: "Cancelled",
    statusVariant: "cancelled",
  },
  {
    id: "act-7",
    title: "Sell BTC",
    type: "Sell",
    category: "sell",
    group: "sell",
    amount: "+$1,050.00",
    isPositive: true,
    dateTime: "Mar 08, 2025 at 4:44 PM",
    status: "Completed",
    statusVariant: "completed",
  },
];

export default function ActivityPage({ dark, isMobile = false }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedRange, setSelectedRange] = useState("30");
  const [activeTab, setActiveTab] = useState("all");

  // Mobile dropdown toggles
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [rangeDropdownOpen, setRangeDropdownOpen] = useState(false);

  const typeDropdownRef = useRef(null);
  const rangeDropdownRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(e.target)) {
        setTypeDropdownOpen(false);
      }
      if (rangeDropdownRef.current && !rangeDropdownRef.current.contains(e.target)) {
        setRangeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasActiveFilters = searchQuery.trim() !== "" || selectedType !== "all" || selectedRange !== "30";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedType("all");
    setSelectedRange("30");
  };

  const filteredActivities = useMemo(() => {
    return INITIAL_ACTIVITIES.filter((item) => {
      // Type filter
      if (selectedType !== "all") {
        if (selectedType === "payments" && item.group !== "payments") return false;
        if (selectedType === "payouts" && item.group !== "payouts") return false;
        if (
          selectedType !== "payments" &&
          selectedType !== "payouts" &&
          item.category !== selectedType
        ) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(query);
        const matchType = item.type.toLowerCase().includes(query);
        const matchAmount = item.amount.toLowerCase().includes(query);
        const matchDate = item.dateTime.toLowerCase().includes(query);
        const matchStatus = item.status.toLowerCase().includes(query);
        if (!matchTitle && !matchType && !matchAmount && !matchDate && !matchStatus) {
          return false;
        }
      }
      return true;
    });
  }, [searchQuery, selectedType]);

  const handleExport = () => {
    const headers = ["Activity", "Type", "Amount", "Date and Time", "Status"];
    const rows = filteredActivities.map((a) => [
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.type}"`,
      `"${a.amount}"`,
      `"${a.dateTime}"`,
      `"${a.status}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `paykudi-activity-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ───────────────────────────────────────────────
  // MOBILE VIEW (matches user Screen2 layout)
  // ───────────────────────────────────────────────
  if (isMobile) {
    return (
      <main className="m-activity-main">
        {/* Section 1: Title & 2x2 Grid */}
        <section className="m-activity-section">
          <div className="m-activity-title-row">
            <h1 className="m-activity-title">Activity</h1>
          </div>

          <div className="m-activity-grid">
            <div className="m-stat-card">
              <div className="m-stat-number">24</div>
              <div className="m-stat-label">Transactions</div>
            </div>
            <div className="m-stat-card">
              <div className="m-stat-number">$2,480</div>
              <div className="m-stat-label">Sent</div>
            </div>
            <div className="m-stat-card">
              <div className="m-stat-number text-accent-received">$3,125</div>
              <div className="m-stat-label">Received</div>
            </div>
            <div className="m-stat-card">
              <div className="m-stat-number">2</div>
              <div className="m-stat-label">Pending</div>
            </div>
          </div>
        </section>

        {/* Section 2: Tabs, Search & Filters */}
        <section className="m-activity-section">
          <div className="m-activity-tabs">
            <button
              type="button"
              className={`m-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All activity
            </button>
          </div>

          <div className="m-search-wrap">
            <Search className="m-search-icon" size={16} />
            <input
              type="text"
              className="m-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, transaction ID, or amount"
            />
          </div>

          <div className="m-filters-wrap">
            {/* Filter by Type Dropdown */}
            <div className="m-dropdown-rel" ref={typeDropdownRef}>
              <button
                type="button"
                className={`m-filter-btn ${selectedType !== "all" ? "active" : ""}`}
                onClick={() => {
                  setTypeDropdownOpen(!typeDropdownOpen);
                  setRangeDropdownOpen(false);
                }}
              >
                <ListFilter size={16} className="m-filter-icon" />
                <span className="m-filter-btn-text">
                  {selectedType === "all"
                    ? "All types"
                    : selectedType === "payments"
                    ? "Payments"
                    : selectedType === "payouts"
                    ? "Payouts"
                    : selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}
                </span>
                <ChevronDown size={14} className="m-filter-chevron" />
              </button>

              {typeDropdownOpen && (
                <div className="m-dropdown-menu">
                  <button
                    type="button"
                    className={`m-dropdown-item ${selectedType === "all" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedType("all");
                      setTypeDropdownOpen(false);
                    }}
                  >
                    All types
                  </button>
                  <button
                    type="button"
                    className={`m-dropdown-item ${selectedType === "payments" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedType("payments");
                      setTypeDropdownOpen(false);
                    }}
                  >
                    Payments
                  </button>
                  <button
                    type="button"
                    className={`m-dropdown-item ${selectedType === "payouts" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedType("payouts");
                      setTypeDropdownOpen(false);
                    }}
                  >
                    Payouts
                  </button>
                  <button
                    type="button"
                    className={`m-dropdown-item ${selectedType === "buy" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedType("buy");
                      setTypeDropdownOpen(false);
                    }}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    className={`m-dropdown-item ${selectedType === "sell" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedType("sell");
                      setTypeDropdownOpen(false);
                    }}
                  >
                    Sell
                  </button>
                </div>
              )}
            </div>

            {/* Filter by Date Range Dropdown */}
            <div className="m-dropdown-rel" ref={rangeDropdownRef}>
              <button
                type="button"
                className={`m-filter-btn ${selectedRange !== "30" ? "active" : ""}`}
                onClick={() => {
                  setRangeDropdownOpen(!rangeDropdownOpen);
                  setTypeDropdownOpen(false);
                }}
              >
                <CalendarDays size={16} className="m-filter-icon" />
                <span className="m-filter-btn-text">
                  {selectedRange === "30"
                    ? "Last 30 days"
                    : selectedRange === "all"
                    ? "All time"
                    : selectedRange === "7"
                    ? "Last 7 days"
                    : "Today"}
                </span>
                <ChevronDown size={14} className="m-filter-chevron" />
              </button>

              {rangeDropdownOpen && (
                <div className="m-dropdown-menu">
                  <button
                    type="button"
                    className={`m-dropdown-item ${selectedRange === "30" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedRange("30");
                      setRangeDropdownOpen(false);
                    }}
                  >
                    Last 30 days
                  </button>
                  <button
                    type="button"
                    className={`m-dropdown-item ${selectedRange === "7" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedRange("7");
                      setRangeDropdownOpen(false);
                    }}
                  >
                    Last 7 days
                  </button>
                  <button
                    type="button"
                    className={`m-dropdown-item ${selectedRange === "all" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedRange("all");
                      setRangeDropdownOpen(false);
                    }}
                  >
                    All time
                  </button>
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="m-clear-filters-btn"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        </section>

        {/* Section 3: Empty State when No Matching Activities */}
        {filteredActivities.length === 0 ? (
          <section className="m-empty-state-card">
            <Activity size={32} className="m-empty-icon" />
            <div className="m-empty-texts">
              <h2 className="m-empty-title">No matching activity</h2>
              <p className="m-empty-subtitle">Try changing your search or filters</p>
            </div>
            <button
              type="button"
              className="m-clear-filters-btn inline-clear"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </section>
        ) : (
          /* Section 4: Recent Activity List */
          <section className="m-activity-section">
            <div className="m-activity-list-head">
              <h2 className="m-activity-list-title">Recent activity</h2>
              <span className="m-activity-count">{filteredActivities.length} items</span>
            </div>

            <div className="m-activity-card-list">
              {filteredActivities.map((item) => (
                <div key={item.id} className="m-activity-card-row" role="button" tabIndex={0}>
                  <div className="m-card-row-main">
                    <div className="m-card-row-info">
                      <h4 className="m-item-title">{item.title}</h4>
                      <div className="m-item-meta">
                        <span className="m-item-time">{item.dateTime}</span>
                        <span className="m-item-dot">•</span>
                        <span className="m-item-type">{item.type}</span>
                      </div>
                    </div>
                    <div className="m-card-row-right">
                      <span
                        className={`m-item-amount ${
                          item.isPositive ? "amount-positive" : "amount-negative"
                        }`}
                      >
                        {item.amount}
                      </span>
                      <div className="m-item-sub-right">
                        <span className={`status-badge status-${item.statusVariant}`}>
                          {item.statusVariant === "completed" && (
                            <CheckCircle2 size={11} className="status-badge-icon" />
                          )}
                          {item.statusVariant === "processing" && (
                            <Clock size={11} className="status-badge-icon" />
                          )}
                          {item.statusVariant === "cancelled" && (
                            <XCircle size={11} className="status-badge-icon" />
                          )}
                          {item.status}
                        </span>
                        <ChevronRight size={15} className="m-item-chevron" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  // ───────────────────────────────────────────────
  // DESKTOP VIEW
  // ───────────────────────────────────────────────
  return (
    <div className="activity-page-container">
      {/* Title Bar */}
      <div className="activity-page-header">
        <div>
          <h1 className="activity-page-title">Activity</h1>
          <p className="activity-page-subtitle">
            View, filter, and track all your transactions across PayKudi.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="activity-stats-grid">
        <div className="activity-stat-card">
          <span className="activity-stat-label">Total activity</span>
          <p className="activity-stat-value">
            24 <span className="activity-stat-unit">transactions</span>
          </p>
        </div>
        <div className="activity-stat-card">
          <span className="activity-stat-label">Sent this month</span>
          <p className="activity-stat-value">$2,480.00</p>
        </div>
        <div className="activity-stat-card">
          <span className="activity-stat-label">Received this month</span>
          <p className="activity-stat-value text-accent-received">$3,125.00</p>
        </div>
        <div className="activity-stat-card">
          <span className="activity-stat-label">Pending</span>
          <p className="activity-stat-value">2</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="activity-controls-section">
        <div className="activity-tabs-row">
          <div className="activity-tabs-list">
            <button
              type="button"
              className={`activity-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All activity
            </button>
          </div>
        </div>

        <div className="activity-filters-row">
          <div className="activity-search-box">
            <Search className="activity-search-icon" size={17} />
            <input
              type="text"
              placeholder="Search by name, transaction ID, or amount"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="activity-search-input"
            />
          </div>

          <div className="activity-filter-group">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="activity-select"
            >
              <option value="all">All types</option>
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
              <option value="sent">Payment sent</option>
              <option value="received">Payment received</option>
              <option value="refund">Refund sent</option>
              <option value="payout">Payout sent</option>
              <option value="withdrawal">Withdrawal</option>
            </select>

            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value)}
              className="activity-select"
            >
              <option value="today">Today</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                className="m-clear-filters-btn"
                onClick={clearFilters}
              >
                Clear
              </button>
            )}

            <button
              type="button"
              onClick={handleExport}
              className="activity-export-btn"
              title="Export activities as CSV"
            >
              <Download size={16} className="activity-export-icon" />
              <span>Export activity</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Activity Table */}
      <div className="activity-table-card">
        <div className="activity-table-responsive">
          <table className="activity-table">
            <thead>
              <tr>
                <th className="th-activity">Activity</th>
                <th className="th-type">Type</th>
                <th className="th-amount">Amount</th>
                <th className="th-date">Date and time</th>
                <th className="th-status">Status</th>
                <th className="th-action"></th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={6} className="activity-empty-cell">
                    <div className="m-empty-state-card borderless">
                      <Activity size={32} className="m-empty-icon" />
                      <h2 className="m-empty-title">No matching activity</h2>
                      <p className="m-empty-subtitle">Try changing your search or filters</p>
                      <button
                        type="button"
                        className="m-clear-filters-btn inline-clear"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredActivities.map((item) => (
                  <tr key={item.id} className="activity-row">
                    <td className="td-activity">
                      <div className="activity-title-wrap">
                        <span className="activity-title-text">{item.title}</span>
                      </div>
                    </td>
                    <td className="td-type">
                      <span className="activity-type-badge">{item.type}</span>
                    </td>
                    <td className="td-amount">
                      <span
                        className={`activity-amount-text ${
                          item.isPositive ? "amount-positive" : "amount-negative"
                        }`}
                      >
                        {item.amount}
                      </span>
                    </td>
                    <td className="td-date">{item.dateTime}</td>
                    <td className="td-status">
                      <span className={`status-badge status-${item.statusVariant}`}>
                        {item.statusVariant === "completed" && (
                          <CheckCircle2 size={13} className="status-badge-icon" />
                        )}
                        {item.statusVariant === "processing" && (
                          <Clock size={13} className="status-badge-icon" />
                        )}
                        {item.statusVariant === "cancelled" && (
                          <XCircle size={13} className="status-badge-icon" />
                        )}
                        {item.status}
                      </span>
                    </td>
                    <td className="td-action">
                      <ChevronRight size={17} className="activity-arrow-icon" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
