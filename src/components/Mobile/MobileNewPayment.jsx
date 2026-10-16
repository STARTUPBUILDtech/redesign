import { useState, useRef, useEffect } from "react";
import {
  Check,
  LoaderCircle,
  Copy,
  Upload,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import MobilePaymentInvitation from "./MobilePaymentInvitation";
import { getUserAvatarStyle, ingestServerUsers } from "../../utils/avatarUtils";
import { createPaymentRoomOnServer } from "../../services/roomServerService";
import "../../styles/mobile-new-payment.css";

export default function MobileNewPayment({ onCancel, onSuccess, currentUser }) {
  const [step, setStep] = useState("form"); // "form" | "confirm" | "success" | "invitation"
  const [createdRoom, setCreatedRoom] = useState(null);
  const [pendingRoom, setPendingRoom] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // 1. Real Counterparty from DB (Name, WhatsApp Number, or Username)
  const [counterparty, setCounterparty] = useState("");
  const [matchedUser, setMatchedUser] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("idle"); // "idle" | "verified" | "not_found"
  const [isSearching, setIsSearching] = useState(false);
  const searchTimerRef = useRef(null);
  const counterpartyRowRef = useRef(null);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const formatFullName = (name) => {
    if (!name || typeof name !== "string") return "";
    return name
      .trim()
      .split(/\s+/)
      .map((w) => {
        if (w.includes("-")) {
          return w.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("-");
        }
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join(" ");
  };

  const formatUserId = (u) => {
    if (!u) return "";
    if (u.account_id) return `ID: ${u.account_id}`;
    const phone = u.whatsapp_number || u.phone;
    if (phone) {
      let digits = String(phone).replace(/\D/g, "");
      if (digits.startsWith("234")) digits = digits.slice(3);
      digits = digits.replace(/^0+/, "");
      if (digits) return `ID: ${digits}`;
    }
    return u.id ? `ID: ${u.id}` : "";
  };

  const getCurrentUserProfile = () => {
    let profile = null;
    try {
      profile = JSON.parse(localStorage.getItem("paykudi_user_profile") || "{}");
    } catch (e) {}

    const resolved = currentUser || profile || {};
    const rawPhone = resolved.phone || resolved.whatsapp_number || profile?.phone || profile?.whatsapp_number || "";
    let phoneDigits = String(rawPhone).replace(/\D/g, "");
    if (phoneDigits.startsWith("234")) phoneDigits = phoneDigits.slice(3);
    phoneDigits = phoneDigits.replace(/^0+/, "");

    const rawUsername = resolved.username || profile?.username || (resolved.name ? String(resolved.name).toLowerCase().replace(/[^a-z0-9]/g, "") : "");
    const cleanUsername = String(rawUsername).toLowerCase().replace(/^@/, "").trim();

    const rawName = resolved.fullName || resolved.full_name || resolved.name || profile?.name || profile?.full_name || "";
    const cleanName = String(rawName).toLowerCase().trim();

    const rawAccountId = resolved.accountId || resolved.account_id || profile?.account_id || phoneDigits || "";
    const cleanAccountId = String(rawAccountId).replace(/\D/g, "");

    const resolvedId = String(resolved.id || profile?.id || "").trim();

    return {
      id: resolvedId,
      username: cleanUsername,
      name: cleanName,
      phone: phoneDigits,
      accountId: cleanAccountId,
    };
  };

  const isUserSelf = (target, currentProfile = getCurrentUserProfile()) => {
    if (!target || !currentProfile) return false;
    if (target.id && currentProfile.id && String(target.id).toLowerCase() === String(currentProfile.id).toLowerCase()) {
      return true;
    }
    const targetUser = (target.username || "").toLowerCase().replace(/^@/, "").trim();
    if (targetUser && currentProfile.username && targetUser === currentProfile.username) {
      return true;
    }
    const rawTargetPhone = target.whatsapp_number || target.phone || target.account_id || "";
    let targetDigits = String(rawTargetPhone).replace(/\D/g, "");
    if (targetDigits.startsWith("234")) targetDigits = targetDigits.slice(3);
    targetDigits = targetDigits.replace(/^0+/, "");

    if (targetDigits && currentProfile.phone && targetDigits === currentProfile.phone) {
      return true;
    }
    if (targetDigits && currentProfile.accountId && targetDigits === currentProfile.accountId) {
      return true;
    }
    const targetName = (target.full_name || target.name || "").toLowerCase().trim();
    if (targetName && currentProfile.name && targetName === currentProfile.name && targetName.length > 3) {
      return true;
    }
    return false;
  };

  const isQuerySelf = (queryText, currentProfile = getCurrentUserProfile()) => {
    if (!queryText || !currentProfile) return false;
    const trimmed = queryText.trim();
    if (!trimmed) return false;

    const cleanUsername = trimmed.toLowerCase().replace(/^@/, "").trim();
    if (cleanUsername && currentProfile.username && cleanUsername === currentProfile.username) {
      return true;
    }

    let digits = trimmed.replace(/\D/g, "");
    if (digits.startsWith("234")) digits = digits.slice(3);
    digits = digits.replace(/^0+/, "");
    if (
      digits &&
      currentProfile.phone &&
      (digits === currentProfile.phone || (digits.length >= 10 && currentProfile.phone === digits))
    ) {
      return true;
    }
    if (
      digits &&
      currentProfile.accountId &&
      (digits === currentProfile.accountId || (digits.length >= 10 && currentProfile.accountId === digits))
    ) {
      return true;
    }

    const cleanName = trimmed.toLowerCase().trim();
    if (cleanName && currentProfile.name && cleanName === currentProfile.name && cleanName.length > 3) {
      return true;
    }

    return false;
  };

  const isCompletedIdentifier = (text) => {
    const trimmed = text.trim();
    if (!trimmed) return false;
    const digitsOnly = trimmed.replace(/\D/g, "");
    const isPhoneOrId = /^\+?\d+$/.test(trimmed) || (digitsOnly.length >= 6 && !/[a-zA-Z]/.test(trimmed)) || /^id:?\s*\d+/i.test(trimmed);
    if (isPhoneOrId) {
      // Completed Nigerian phone number or PayKudi ID: at least 10 digits
      return digitsOnly.length >= 10;
    }
    // Completed username: at least 3 characters
    return trimmed.replace(/^@/, "").length >= 3;
  };

  const searchRealUsers = async (query) => {
    const trimmed = query.trim();
    if (!trimmed || !isCompletedIdentifier(trimmed)) {
      setSuggestions([]);
      setShowSuggestions(false);
      setMatchedUser(null);
      setVerificationStatus("idle");
      setIsSearching(false);
      return;
    }

    const currentProfile = getCurrentUserProfile();
    if (isQuerySelf(trimmed, currentProfile)) {
      setSuggestions([]);
      setShowSuggestions(false);
      setMatchedUser(null);
      setVerificationStatus("self");
      setErrors((prev) => ({ ...prev, counterparty: "You cannot invite yourself" }));
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const res = await fetch(`http://localhost:8000/auth/users/search?q=${encodeURIComponent(trimmed)}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const rawUsers = data.users || [];
        ingestServerUsers(rawUsers);
        const users = rawUsers.filter((u) => !isUserSelf(u, currentProfile));
        setSuggestions(users);
        setIsSearching(false);

        // Check if exact match is self
        const selfMatch = rawUsers.find((u) => isUserSelf(u, currentProfile));
        const cleanVal = trimmed.toLowerCase().replace(/^@/, "");
        const digits = trimmed.replace(/\D/g, "");
        if (selfMatch) {
          const uUser = (selfMatch.username || "").toLowerCase().replace(/^@/, "");
          const uName = (selfMatch.full_name || "").toLowerCase();
          const uDigits = (selfMatch.whatsapp_number || "").replace(/\D/g, "");
          const uAccountId = (selfMatch.account_id || (uDigits.startsWith("234") ? uDigits.slice(3) : uDigits.replace(/^0+/, "")));
          if (
            (cleanVal && uUser === cleanVal) ||
            (cleanVal && uName === cleanVal) ||
            (digits && uAccountId === digits) ||
            (digits.length >= 7 && (uDigits === digits || uDigits.endsWith(digits) || digits.endsWith(uDigits)))
          ) {
            setMatchedUser(null);
            setVerificationStatus("self");
            setErrors((prev) => ({ ...prev, counterparty: "You cannot invite yourself" }));
            setShowSuggestions(false);
            return;
          }
        }

        // Check for exact match among other users
        const exact = users.find((u) => {
          const uUser = (u.username || "").toLowerCase().replace(/^@/, "");
          const uName = (u.full_name || "").toLowerCase();
          const uDigits = (u.whatsapp_number || "").replace(/\D/g, "");
          const uAccountId = (u.account_id || (uDigits.startsWith("234") ? uDigits.slice(3) : uDigits.replace(/^0+/, "")));
          return (
            (cleanVal && uUser === cleanVal) ||
            (cleanVal && uName === cleanVal) ||
            (digits && uAccountId === digits) ||
            (digits.length >= 7 && (uDigits === digits || uDigits.endsWith(digits) || digits.endsWith(uDigits)))
          );
        });

        if (users.length > 0) {
          setShowSuggestions(true);
          setMatchedUser(null);
          setVerificationStatus("idle");
        } else {
          setMatchedUser(null);
          setVerificationStatus("not_found");
          setShowSuggestions(false);
        }
        return;
      }
    } catch (err) {
      console.warn("Backend user search offline/error:", err);
    }

    // Offline / fallback lookup against real DB users
    const fallbackDB = [
      { id: "4ea61d83", full_name: "Howard Ukah", username: "howard001", whatsapp_number: "+2348032007872", account_id: "8032007872", avatar_color: "#bf185b" },
      { id: "17523f25", full_name: "Benedicta James", username: "benedicta001", whatsapp_number: "+2349033705741", account_id: "9033705741", avatar_color: "#0d9488" },
      { id: "1d120085", full_name: "Ram Test User", username: "ramtester", whatsapp_number: "+2348099887766", account_id: "8099887766", avatar_color: "#2563eb" },
      { id: "aa2c3b21", full_name: "Live Check User", username: "livechecker", whatsapp_number: "+2348155443322", account_id: "8155443322", avatar_color: "#ea580c" },
    ];
    const qClean = trimmed.toLowerCase().replace(/^@/, "");
    const qDig = trimmed.replace(/\D/g, "");
    const matched = fallbackDB
      .filter((u) => !isUserSelf(u, currentProfile))
      .filter((u) => {
        const uName = (u.full_name || "").toLowerCase();
        const uUser = (u.username || "").toLowerCase();
        const uPhone = (u.whatsapp_number || "").replace(/\D/g, "");
        const uAcc = (u.account_id || "").replace(/\D/g, "");
        return (
          uName.includes(qClean) ||
          uUser.includes(qClean) ||
          (qDig && uPhone.includes(qDig)) ||
          (qDig && uAcc.includes(qDig))
        );
      });

    setIsSearching(false);
    setSuggestions(matched);
    if (matched.length > 0) {
      setShowSuggestions(true);
      setMatchedUser(null);
      setVerificationStatus("idle");
    } else {
      setMatchedUser(null);
      setVerificationStatus("not_found");
      setShowSuggestions(false);
    }
  };

  const handleCounterpartyChange = (e) => {
    const val = e.target.value;
    setCounterparty(val);
    if (errors.counterparty || errors.server) {
      setErrors((prev) => ({ ...prev, counterparty: false, server: "" }));
    }
    if (matchedUser) {
      setMatchedUser(null);
      setVerificationStatus("idle");
    }

    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    setShowSuggestions(false);

    const trimmed = val.trim();
    if (!trimmed) {
      setSuggestions([]);
      setMatchedUser(null);
      setVerificationStatus("idle");
      setIsSearching(false);
      return;
    }

    const currentProfile = getCurrentUserProfile();
    if (isQuerySelf(trimmed, currentProfile)) {
      setSuggestions([]);
      setMatchedUser(null);
      setVerificationStatus("self");
      setErrors((prev) => ({ ...prev, counterparty: "You cannot invite yourself" }));
      setIsSearching(false);
      return;
    }

    const digitsOnly = trimmed.replace(/\D/g, "");
    const isPhoneOrId = /^\+?\d+$/.test(trimmed) || (digitsOnly.length >= 4 && !/[a-zA-Z]/.test(trimmed)) || /^id:?\s*\d+/i.test(trimmed);

    // For numbers or IDs: ONLY search when all numbers/ID digits are completed (10+ digits)
    if (isPhoneOrId) {
      if (digitsOnly.length < 10) {
        setSuggestions([]);
        setVerificationStatus("idle");
        setIsSearching(false);
        return;
      }
      // Completed phone number or ID: trigger search
      searchRealUsers(trimmed);
      return;
    }

    // For username: only search when length >= 3 and after user finishes typing
    if (trimmed.replace(/^@/, "").length < 3) {
      setSuggestions([]);
      setVerificationStatus("idle");
      setIsSearching(false);
      return;
    }

    // Debounce to only search after user has completed the username
    searchTimerRef.current = setTimeout(() => {
      searchRealUsers(trimmed);
    }, 600);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Escape") {
      setShowSuggestions(false);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (suggestions.length > 0) {
        handleSelectUser(matchedUser || suggestions[0]);
        setShowSuggestions(false);
        return;
      }
      if (counterparty.trim()) {
        const currentProfile = getCurrentUserProfile();
        if (isQuerySelf(counterparty.trim(), currentProfile)) {
          setSuggestions([]);
          setShowSuggestions(false);
          setMatchedUser(null);
          setVerificationStatus("self");
          setErrors((prev) => ({ ...prev, counterparty: "You cannot invite yourself" }));
          return;
        }
        searchRealUsers(counterparty.trim());
      }
    }
  };

  const handleInputBlur = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const trimmed = counterparty.trim();
    if (trimmed && isCompletedIdentifier(trimmed)) {
      const currentProfile = getCurrentUserProfile();
      if (isQuerySelf(trimmed, currentProfile)) {
        setSuggestions([]);
        setShowSuggestions(false);
        setMatchedUser(null);
        setVerificationStatus("self");
        setErrors((prev) => ({ ...prev, counterparty: "You cannot invite yourself" }));
        return;
      }
      if (verificationStatus === "idle" && !matchedUser) {
        searchRealUsers(trimmed);
      }
    }
  };

  const handleSelectUser = (user) => {
    const currentProfile = getCurrentUserProfile();
    if (isUserSelf(user, currentProfile)) {
      setErrors((prev) => ({ ...prev, counterparty: "You cannot invite yourself" }));
      setVerificationStatus("self");
      setMatchedUser(null);
      setShowSuggestions(false);
      return;
    }
    const formattedUser = {
      ...user,
      full_name: formatFullName(user.full_name),
    };
    setMatchedUser(formattedUser);
    setCounterparty(
      formattedUser.username
        ? `@${formattedUser.username.replace(/^@/, "")}`
        : formatUserId(formattedUser) || formattedUser.full_name
    );
    setVerificationStatus("verified");
    setShowSuggestions(false);
    if (errors.counterparty) {
      setErrors((prev) => ({ ...prev, counterparty: false }));
    }
  };

  const handlePaste = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setCounterparty(text.trim());
          searchRealUsers(text.trim());
        }
      }
    } catch (err) {
      console.warn("Clipboard read unavailable", err);
    }
  };

  // 2. What are you Buying / Selling? & Role toggle ("I am Selling" / "I am Buying")
  const [itemPurpose, setItemPurpose] = useState("");
  const [isSelling, setIsSelling] = useState(false); // false: buying (default), true: selling

  // 3. Amount Field
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [roomId, setRoomId] = useState("");


  const handleItemPurposeChange = (e) => {
    const val = e.target.value;
    setItemPurpose(val);
    if (errors.itemPurpose || errors.server) {
      setErrors((prev) => ({ ...prev, itemPurpose: false, server: "" }));
    }
  };

  const handleAmountChange = (e) => {
    // Strip everything except digits and one decimal point
    let raw = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, "");
    const parts = raw.split(".");
    if (parts.length > 2) {
      raw = parts[0] + "." + parts.slice(1).join("");
    }
    // Format integer part with commas
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const formatted = parts.length === 2 ? intPart + "." + parts[1] : intPart;
    setAmount(formatted);
    if (errors.amount || errors.server) {
      const num = parseFloat(raw);
      if (!isNaN(num) && num > 0) {
        setErrors((prev) => ({ ...prev, amount: false, server: "" }));
      } else {
        setErrors((prev) => ({ ...prev, server: "" }));
      }
    }
  };

  const currentProfile = getCurrentUserProfile();
  const isStep1Done = verificationStatus === "verified" && Boolean(matchedUser) && !isUserSelf(matchedUser, currentProfile);
  const isStep2Done = isStep1Done && itemPurpose.trim().length > 0;
  const numAmount = parseFloat((amount || "").replace(/,/g, ""));
  const isStep3Done = isStep2Done && !isNaN(numAmount) && numAmount > 0;

  const handleProceed = () => {
    const userProf = getCurrentUserProfile();
    const errs = {};
    if (!counterparty.trim() || verificationStatus !== "verified" || !matchedUser) {
      errs.counterparty = true;
    }
    if (isQuerySelf(counterparty, userProf) || (matchedUser && isUserSelf(matchedUser, userProf))) {
      errs.counterparty = "You cannot invite yourself";
      setVerificationStatus("self");
      setMatchedUser(null);
    }
    if (!itemPurpose.trim()) {
      errs.itemPurpose = true;
    }
    const parsedAmount = parseFloat((amount || "").replace(/,/g, ""));
    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      errs.amount = true;
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setErrors((prev) => ({ ...prev, server: "" }));
    setIsLoading(true);
    let userProfile = null;
    try {
      userProfile = JSON.parse(localStorage.getItem("paykudi_user_profile") || "{}");
    } catch (e) {}

    createPaymentRoomOnServer({
      item: (itemPurpose || "").trim() || "Payment Item",
      amount: amount.trim(),
      role: isSelling ? "Selling" : "Buying",
      counterparty: counterparty.trim(),
      matchedUser,
      creatorProfile: currentUser || userProfile,
    })
      .then((serverRoom) => {
        setIsLoading(false);
        const resolvedId = serverRoom.id || serverRoom.orderNumber;
        setRoomId(resolvedId);
        setPendingRoom(serverRoom);
        setCreatedRoom(serverRoom);
        if (onSuccess) {
          onSuccess(serverRoom);
        } else {
          setStep("invitation");
        }
      })
      .catch((err) => {
        setIsLoading(false);
        setErrors((prev) => ({ ...prev, server: err.message || "Server is unreachable" }));
      });
  };

  const handleReset = () => {
    setCounterparty("");
    setMatchedUser(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setVerificationStatus("idle");
    setItemPurpose("");
    setIsSelling(false);
    setAmount("");
    setErrors({});
    setStep("form");
    setCreatedRoom(null);
    setPendingRoom(null);
    setShowInfoModal(false);
  };

  if (step === "invitation" && createdRoom) {
    return (
      <MobilePaymentInvitation
        room={createdRoom}
        onCancel={onCancel || handleReset}
        onProceed={(proceedRoom) => {
          const target = proceedRoom || createdRoom || {};
          const updated = {
            ...target,
            status: "awaiting_payment",
            statusText: "Awaiting Payment",
            category: "ongoing",
          };
          if (onSuccess) {
            onSuccess(updated);
          } else {
            handleReset();
          }
        }}
      />
    );
  }

  return (
    <main className="mobile-new-payment-container">
      {/* ── 1. Top Header Row: Sticky New Payment / Subtitle + Cancel Button ── */}
      <div className="new-payment-top-row">
        <div className="new-payment-top-row-inner">
          <div className="new-payment-title-wrap">
            <h1 className="new-payment-title">New Payment</h1>
            <p className="new-payment-subtitle">A few steps to create payment room.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onCancel) onCancel();
            }}
            className="new-payment-cancel-btn"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* ── 2. Scrollable Middle Body (Scrolls IF needed) ── */}
      <div className="new-payment-scroll-body">
        {/* ── STEP 1: FORM (Timeline with diamond badges matching user mockup) ── */}
        {step === "form" && (
          <div className="new-payment-timeline-form">
          {/* ── 1. Counterparty Step ── */}
          <div className="new-payment-timeline-step">
            <div className="new-payment-timeline-rail">
              <div className="new-payment-timeline-diamond is-filled" aria-hidden="true">
                <span>1</span>
              </div>
              <div className="new-payment-timeline-line" aria-hidden="true" />
            </div>
            <div className="new-payment-timeline-content">
              <div className="new-payment-field-group">
                <label htmlFor="new-payment-recipient-input" className="new-payment-label">
                  Invite counterparty<span className="new-payment-star">*</span>
                </label>
                <div className="new-payment-counterparty-row" ref={counterpartyRowRef} style={{ position: "relative" }}>
                  <div className={`new-payment-field-box new-payment-counterparty-box ${errors.counterparty || verificationStatus === "self" ? "error" : ""}`}>
                    <input
                      id="new-payment-recipient-input"
                      type="text"
                      value={counterparty}
                      onChange={handleCounterpartyChange}
                      onKeyDown={handleInputKeyDown}
                      onBlur={handleInputBlur}
                      onFocus={() => {
                        if (suggestions.length > 0 && !matchedUser) setShowSuggestions(true);
                      }}
                      placeholder="WhatsApp number or username"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                    {isSearching ? (
                      <LoaderCircle className="animate-spin text-muted" size={16} />
                    ) : (
                      <button
                        type="button"
                        className="new-payment-paste-btn"
                        onClick={handlePaste}
                        title="Paste from clipboard"
                        aria-label="Paste from clipboard"
                      >
                        <Copy size={17} strokeWidth={2.1} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="new-payment-scanner-box-btn"
                    title="Scan QR Code"
                    aria-label="Scan QR Code"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      qr_code_scanner
                    </span>
                  </button>

                  {/* Real Users Search Autocomplete Dropdown with Loading Skeleton */}
                  {(isSearching || (showSuggestions && suggestions.length > 0)) && (
                    <div className="new-payment-suggestions-dropdown" role="listbox" aria-label="Counterparty suggestions">
                      {isSearching ? (
                        <div className="new-payment-suggestion-skeleton-wrap">
                          {[1, 2].map((i) => (
                            <div key={i} className="new-payment-suggestion-item is-skeleton">
                              <div className="new-payment-suggestion-avatar pk-skel-avatar pk-skeleton" />
                              <div className="new-payment-suggestion-info">
                                <div className="pk-skel-line pk-skel-title pk-skeleton" style={{ width: i === 1 ? "120px" : "105px" }} />
                                <div className="pk-skel-line pk-skel-subtitle pk-skeleton" style={{ width: i === 1 ? "165px" : "145px" }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        suggestions.map((u, idx) => (
                          <div
                            key={u.id}
                            className="new-payment-suggestion-item"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectUser(u);
                            }}
                            onTouchStart={(e) => {
                              e.preventDefault();
                              handleSelectUser(u);
                            }}
                            onClick={() => handleSelectUser(u)}
                          >
                            <div
                              className="new-payment-suggestion-avatar"
                              style={getUserAvatarStyle(u)}
                            >
                              {(u.full_name || u.username || "U").charAt(0).toUpperCase()}
                            </div>

                            <div className="new-payment-suggestion-info">
                              <span className="new-payment-suggestion-name">{formatFullName(u.full_name)}</span>
                              <span className="new-payment-suggestion-sub">
                                {u.username ? `@${u.username.replace(/^@/, "")}` : ""}
                                {u.username && formatUserId(u) ? " • " : ""}
                                {formatUserId(u)}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Error or Verification Status */}
                {errors.counterparty || verificationStatus === "self" ? (
                  <p className="new-payment-field-error">
                    {typeof errors.counterparty === "string"
                      ? errors.counterparty
                      : verificationStatus === "self"
                      ? "You cannot invite yourself"
                      : counterparty.trim()
                      ? "Please select a registered user from your database"
                      : "Please enter a WhatsApp number or username"}
                  </p>
                ) : verificationStatus === "verified" && matchedUser ? (
                  <div className="new-payment-verification-status verified">
                    <span className="verified-check-circle">
                      <Check size={9} strokeWidth={3.2} />
                    </span>
                    <span className="verified-name">
                      {formatFullName(matchedUser.full_name)}
                      {formatUserId(matchedUser)
                        ? ` (${formatUserId(matchedUser)})`
                        : matchedUser.username
                        ? ` (@${matchedUser.username.replace(/^@/, "")})`
                        : ""}
                    </span>
                  </div>
                ) : verificationStatus === "not_found" && isCompletedIdentifier(counterparty) ? (
                  <div className="new-payment-verification-status not-found">
                    <span className="material-symbols-outlined not-found-icon">error</span>
                    <span>No registered user found</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── 2. What are you Buying / Selling? with red/green toggle button ── */}
          <div className={`new-payment-timeline-step ${!isStep1Done ? "is-disabled" : ""}`}>
            <div className="new-payment-timeline-rail">
              <div className={`new-payment-timeline-diamond ${isStep1Done ? "is-filled" : ""}`} aria-hidden="true">
                <span>2</span>
              </div>
              <div className={`new-payment-timeline-line ${!isStep2Done ? "is-dimmed" : ""}`} aria-hidden="true" />
            </div>
            <div className="new-payment-timeline-content">
              <div className="new-payment-field-group">
                <label htmlFor="new-payment-item-input" className="new-payment-label">
                  Item/Service description<span className="new-payment-star">*</span>
                </label>
                <div className={`new-payment-field-box ${errors.itemPurpose ? "error" : ""}`}>
                  <input
                    id="new-payment-item-input"
                    type="text"
                    disabled={!isStep1Done}
                    value={itemPurpose}
                    onChange={handleItemPurposeChange}
                    placeholder={isSelling ? "What are you Selling?" : "What are you Buying?"}
                    autoComplete="off"
                    autoCapitalize="sentences"
                  />
                  <button
                    type="button"
                    id="new-payment-role-toggle-btn"
                    disabled={!isStep1Done}
                    onClick={() => setIsSelling(!isSelling)}
                    className={`field-action-btn ${isSelling ? "new-payment-role-btn-green" : "new-payment-role-btn-red"}`}
                    title="Click to switch role"
                  >
                    {isSelling ? "I am Buying" : "I am Selling"}
                  </button>
                </div>
                {errors.itemPurpose && (
                  <p className="new-payment-field-error">
                    Please enter what you are buying or selling
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── 3. Amount Field (Replaced Add Specifications) ── */}
          <div className={`new-payment-timeline-step is-last ${!isStep2Done ? "is-disabled" : ""}`}>
            <div className="new-payment-timeline-rail">
              <div className={`new-payment-timeline-diamond ${isStep2Done ? "is-filled" : ""}`} aria-hidden="true">
                <span>3</span>
              </div>
              <div className={`new-payment-timeline-line is-last ${!isStep3Done ? "is-dimmed" : ""}`} aria-hidden="true" />
            </div>
            <div className="new-payment-timeline-content">
              <div className="flex flex-col gap-2 new-payment-field-group">
                <label htmlFor="amount" className="font-medium text-sm new-payment-label">
                  Amount<span className="text-destructive new-payment-star">*</span>
                </label>
                <div className={`rounded-md bg-background border-t border-t-input border-r border-r-input border-b border-b-input border-l border-l-input flex items-center h-11 new-payment-field-box new-payment-amount-box ${errors.amount ? "error" : ""}`}>
                  <span className="text-muted-foreground text-sm pr-3 pl-3 new-payment-currency-prefix">NGN</span>
                  <input
                    id="amount"
                    placeholder="0.00"
                    inputMode="decimal"
                    className="bg-transparent text-sm border-t-0 border-r-0 border-b-0 border-l-0 outline-none pr-3 flex-1 h-full min-w-0"
                    value={amount}
                    onChange={handleAmountChange}
                    disabled={!isStep2Done}
                    autoComplete="off"
                  />
                </div>
                <p className={`text-destructive text-xs ${errors.amount ? "" : "hidden"} new-payment-field-error`}>
                  Enter an amount greater than ₦0.00
                </p>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ── STEP 3: PAYMENT ROOM CREATED (SUCCESS) ── */}
      {step === "success" && (
        <div className="new-payment-step-card" style={{ textAlign: "center", alignItems: "center", gap: 20 }}>
          <div className="new-payment-success-badge">
            <Check size={30} />
          </div>

          <div>
            <h2 className="new-payment-step-title" style={{ fontSize: 21, marginBottom: 6 }}>
              Payment Room Created!
            </h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
              Room <strong>#{roomId}</strong> is ready for <strong>{counterparty}</strong>.
            </p>
          </div>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                if (onCancel) onCancel();
              }}
              className="new-payment-proceed-btn"
            >
              Open Payment Room
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="new-payment-back-btn"
            >
              Create another payment
            </button>
          </div>
        </div>
      )}
      </div>

      {/* ── 3. Floating Next CTA Button at Bottom ── */}
      {step === "form" && (
        <div className="new-payment-floating-dock">
          <div className="new-payment-floating-inner">
            {errors.server && (
              <p className="new-payment-field-error" style={{ textAlign: "center", marginBottom: 8 }}>
                {errors.server}
              </p>
            )}
            <button
              type="button"
              id="new-payment-proceed-btn"
              onClick={handleProceed}
              disabled={isLoading}
              className="new-payment-proceed-btn"
            >
              {isLoading ? (
                <LoaderCircle className="animate-spin" size={20} />
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight size={17} strokeWidth={2.4} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Middle Modal: Inform users to upload reference image & add specifications ── */}
      {showInfoModal && (
        <div
          className="new-payment-modal-backdrop"
          role="dialog"
          aria-modal="true"
        >
          <div className="new-payment-info-modal">
            <div className="np-modal-header">
              <div className="np-modal-icon-badge">
                <span className="material-symbols-outlined">info</span>
              </div>
              <div className="np-modal-text-wrap">
                <h2 className="np-modal-title">Important Step Ahead</h2>
              </div>
            </div>

            <div className="np-modal-cards-list">
              <div className="np-modal-step-card">
                <div className="np-modal-step-icon">
                  <Upload size={17} strokeWidth={2.2} />
                </div>
                <div className="np-modal-step-content">
                  <h3 className="np-modal-step-title">Upload Reference Image</h3>
                  <p className="np-modal-step-desc">
                    Add a clear photo of the item for counterparty verification.
                  </p>
                </div>
              </div>

              <div className="np-modal-step-card">
                <div className="np-modal-step-icon">
                  <SlidersHorizontal size={17} strokeWidth={2.2} />
                </div>
                <div className="np-modal-step-content">
                  <h3 className="np-modal-step-title">Add Item Specifications</h3>
                  <p className="np-modal-step-desc">
                    Fill in specifications such as Color, Storage, and RAM.
                  </p>
                </div>
              </div>
            </div>

            <div className="np-modal-footer">
              <button
                type="button"
                className="np-modal-btn-proceed"
                onClick={handleConfirmProceed}
              >
                <span>I understand</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
