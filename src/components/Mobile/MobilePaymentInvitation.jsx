import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Share2, Upload, Plus, X, RotateCcw } from "lucide-react";
import { computeInviteSecondsLeft } from "../../utils/timerUtils";
import avatarPhoto from "../../assets/avatar-photo.png";
import avatarIllustration from "../../assets/avatar-illustration.png";
import { getUserAvatarStyle } from "../../utils/avatarUtils";
import { getSocket, joinRoomSocket, emitCreatorProceededSocket } from "../../services/socketService";
import { supabase, isSupabaseConfigured } from "../../supabase/client";
import { saveKilledPaymentRoomToDB } from "../../services/supabaseService";
import "../../styles/mobile-new-payment.css";
import "../../styles/mobile-payment-invitation.css";

export default function MobilePaymentInvitation({
  room = {},
  user = null,
  onCancel,
  onShare,
  onProceed,
  isModal = false,
  onCreateNewRoom,
}) {
  if (room && !room.created_at_ms && !room.created_at && !room.expires_at_ms && !room.expires_at) {
    const targetId = room.id || room.orderNumber || room.order_number;
    let storedExpires = null;
    try {
      if (targetId) {
        storedExpires = localStorage.getItem(`paykudi_room_exp_${targetId}`);
      }
    } catch (_) {}
    if (storedExpires && !isNaN(parseInt(storedExpires, 10))) {
      room.expires_at_ms = parseInt(storedExpires, 10);
      room.created_at_ms = room.expires_at_ms - 120000;
    } else {
      const now = Date.now();
      room.created_at_ms = now;
      room.expires_at_ms = now + 120000;
      room.created_at = new Date(now).toISOString();
      room.expires_at = new Date(now + 120000).toISOString();
      try {
        if (targetId) {
          localStorage.setItem(`paykudi_room_exp_${targetId}`, String(room.expires_at_ms));
        }
      } catch (_) {}
    }
  }

  const MAX_RESENDS = 3;
  const targetRoomId = room?.id || room?.orderNumber || room?.order_number;

  const [resendCount, setResendCount] = useState(() => {
    const fromRoom = room?.resend_count ?? room?.resendCount;
    if (typeof fromRoom === "number") return fromRoom;
    try {
      if (targetRoomId) {
        const stored = localStorage.getItem(`paykudi_resend_count_${targetRoomId}`);
        if (stored !== null) return parseInt(stored, 10) || 0;
      }
    } catch (_) {}
    return 0;
  });

  const [secondsLeft, setSecondsLeft] = useState(() => computeInviteSecondsLeft(room));
  const [isExpired, setIsExpired] = useState(() => {
    return Boolean(room?.status === "expired" || room?.is_expired) || computeInviteSecondsLeft(room) <= 0;
  });
  const [isKilled, setIsKilled] = useState(() => {
    const fromRoom = room?.resend_count ?? room?.resendCount;
    let currentResends = typeof fromRoom === "number" ? fromRoom : 0;
    try {
      if (!currentResends && targetRoomId) {
        currentResends = parseInt(localStorage.getItem(`paykudi_resend_count_${targetRoomId}`), 10) || 0;
      }
    } catch (_) {}

    // A payment room must NOT be killed if resends remain (user can resend up to 3 times before being killed)
    if (currentResends < MAX_RESENDS) {
      return false;
    }
    return Boolean(room?.isKilled || room?.status === "killed");
  });
  const [killReason, setKillReason] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [counterpartyJoined, setCounterpartyJoined] = useState(
    () => Boolean(room?.counterparty_joined || room?.counterpartyJoined || room?.counter_party_joined || room?.status === "accepted" || room?.status_text === "accepted")
  );
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 4500);
    return () => clearTimeout(timer);
  }, [showToast, toastMessage]);
  const [copied, setCopied] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [itemImage, setItemImage] = useState(room?.image || null);
  const fileInputRef = useRef(null);

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

  const rawCounterparty = room?.counterpartyName || room?.counterparty || "Counterparty";
  const counterpartyName = formatFullName(rawCounterparty) || rawCounterparty;
  const counterpartyHandle = room?.counterpartyUsername ? `@${room.counterpartyUsername.replace(/^@/, "")}` : "";

  let userProfile = null;
  try {
    userProfile = JSON.parse(localStorage.getItem("paykudi_user_profile") || "{}");
  } catch (e) {}

  const activeUser = user || (userProfile && Object.keys(userProfile).length > 0 ? userProfile : null);

  const creatorName = formatFullName(room?.creatorName || room?.creator) || formatFullName(activeUser?.fullName || activeUser?.firstName || activeUser?.name) || "Howard Ukah";
  const creatorInitial = (creatorName.trim().charAt(0) || "H").toUpperCase();
  const creatorAvatar = room?.creatorAvatar || activeUser?.avatar || activeUser?.avatar_url || activeUser?.photo || null;

  const counterpartyInitial = (counterpartyName.trim().charAt(0) || "C").toUpperCase();
  const counterpartyAvatar = room?.counterpartyAvatar || null;

  const creatorAvatarStyle = getUserAvatarStyle(
    room?.creator_avatar_color || room?.creatorAvatarColor
      ? { avatar_color: room.creator_avatar_color || room.creatorAvatarColor, username: room?.creatorUsername || activeUser?.username, name: creatorName }
      : (activeUser || { username: room?.creatorUsername || "howard001", name: creatorName, phone: room?.creatorPhone || "8032001585" })
  );
  const cpAvatarStyle = getUserAvatarStyle(
    room?.counterparty_avatar_color || room?.counterpartyAvatarColor
      ? { avatar_color: room.counterparty_avatar_color || room.counterpartyAvatarColor, username: room?.counterpartyUsername, name: counterpartyName }
      : { username: room?.counterpartyUsername, name: counterpartyName, phone: room?.counterpartyPhone }
  );

  // 1. Real Room Invitation Dispatched to Server & Counterparty
  useEffect(() => {
    let isMounted = true;
    const sendRealInvite = async () => {
      try {
        const payload = {
          id: room?.id || room?.orderNumber || "ORD-" + Math.floor(100000 + Math.random() * 900000),
          orderNumber: room?.orderNumber || room?.id,
          creator: formatFullName(room?.creator) || "Howard Ukah",
          creatorUsername: room?.creatorUsername || userProfile?.username || "",
          creator_avatar_color: creatorAvatarStyle.backgroundColor,
          counterparty: counterpartyName,
          counterpartyUsername: room?.counterpartyUsername || "",
          counterpartyPhone: room?.counterpartyPhone || "",
          counterparty_avatar_color: cpAvatarStyle.backgroundColor,
          item: room?.item || room?.title || "Payment Item",
          amount: room?.amount || room?.price || "₦0.00",
        };
        const res = await fetch("http://localhost:8000/auth/rooms/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.invitation?.counterparty_joined) {
            setCounterpartyJoined(true);
          }
        }
      } catch (err) {
        console.warn("Backend room invite offline:", err);
      }
    };
        sendRealInvite();

        const checkAcceptedStatus = async () => {
          try {
            const targetId = room?.id || room?.orderNumber || room?.order_number;
            if (!targetId) return;
            const res = await fetch(`http://localhost:8000/auth/pre-payment-rooms/${targetId}`);
            if (res.ok && isMounted) {
              const d = await res.json();
              if (d.room?.counterparty_joined || d.room?.status === "accepted" || d.room?.status_text === "accepted") {
                setCounterpartyJoined(true);
              }
            }
          } catch (e) {}
        };
        const pollTimer = setInterval(checkAcceptedStatus, 2500);

        const onAcceptedSync = (detail) => {
          const checkId = detail?.id || detail?.orderNumber || detail?.order_number;
          if (!checkId || !targetRoomId || checkId === targetRoomId || checkId === room?.id || checkId === room?.orderNumber) {
            setCounterpartyJoined(true);
            setToastMessage(`${counterpartyName} has accepted! You can now proceed to payment.`);
            setShowToast(true);
          }
        };

        const onAcceptedEvent = (e) => onAcceptedSync(e.detail);
        window.addEventListener("paykudi_invite_accepted", onAcceptedEvent);

        const onKilled = (data) => {
          setIsKilled(true);
          setIsExpired(true);
          setKillReason(data?.message || "Payment room was killed. Please create a new one.");
          setToastMessage(data?.message || "Payment room was killed. Please create a new one.");
          setShowToast(true);
        };

        let onCPJoined;
        if (targetRoomId) {
          joinRoomSocket(targetRoomId, creatorName, "creator");
          const s = getSocket();
          if (s) {
            onCPJoined = (data) => {
              onAcceptedSync(data?.room || data);
            };
            s.on("counterparty_joined", onCPJoined);
            s.on("paykudi_invite_accepted", onCPJoined);
            s.on("room_killed", onKilled);
            s.on("paykudi_room_killed_global", (data) => {
              if (data?.roomId === targetRoomId) onKilled(data);
            });
          }
        }

        const onKilledEvent = (e) => {
          const checkId = e.detail?.id || e.detail?.orderNumber;
          if (!checkId || checkId === targetRoomId) {
            onKilled({ message: "Payment room was cancelled / killed. Please create a new one." });
          }
        };
        window.addEventListener("paykudi_invite_killed", onKilledEvent);

        const onResentSync = (detail) => {
          const checkId = detail?.id || detail?.orderNumber;
          if (!checkId || checkId === targetRoomId) {
            setIsExpired(false);
            setIsKilled(false);
            setSecondsLeft(120);
            if (typeof detail?.resend_count === "number") {
              setResendCount(detail.resend_count);
            }
          }
        };

        const onResentEvent = (e) => onResentSync(e.detail);
        window.addEventListener("paykudi_invite_resent", onResentEvent);

        let bc;
        try {
          bc = new BroadcastChannel("paykudi_sync_channel");
          bc.onmessage = (msg) => {
            if (msg.data?.type === "paykudi_invite_killed" || msg.data?.type === "paykudi_room_killed") {
              if (!msg.data?.id || msg.data?.id === targetRoomId) {
                onKilled({ message: "Payment room was killed. Please create a new one." });
              }
            } else if (msg.data?.type === "paykudi_invite_resent") {
              onResentSync(msg.data.detail);
            } else if (msg.data?.type === "paykudi_invite_accepted") {
              onAcceptedSync(msg.data.detail);
            }
          };
        } catch (_) {}

        return () => {
          isMounted = false;
          clearInterval(pollTimer);
          window.removeEventListener("paykudi_invite_accepted", onAcceptedEvent);
          window.removeEventListener("paykudi_invite_killed", onKilledEvent);
          window.removeEventListener("paykudi_invite_resent", onResentEvent);
          if (bc) bc.close();
          const s = getSocket();
          if (s) {
            if (onCPJoined) {
              s.off("counterparty_joined", onCPJoined);
              s.off("paykudi_invite_accepted", onCPJoined);
            }
            s.off("room_killed");
            s.off("paykudi_room_killed_global");
          }
        };
      }, [room?.id, room?.orderNumber, counterpartyName, creatorName]);

  // 2. Real Acceptance Handler
  const handleAcceptInvite = async () => {
    try {
      const roomId = room?.id || room?.orderNumber || "ORD-1";
      await fetch(`http://localhost:8000/auth/rooms/${roomId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: counterpartyName }),
      });
    } catch (e) {
      console.warn("Accept invite endpoint offline", e);
    }
    setCounterpartyJoined(true);
    setToastMessage(`${counterpartyName} has accepted the invite and joined the room.`);
    setShowToast(true);
  };

  const handleShareOrCopy = () => {
    if (onShare) onShare();
    try {
      const inviteUrl = `${window.location.origin}/invite/${room?.id || "ORD-1"}`;
      navigator.clipboard?.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      setToastMessage("Invitation link copied to clipboard!");
      setShowToast(true);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

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

  useEffect(() => {
    if (showToast) {
      const dismissTimer = setTimeout(() => {
        setShowToast(false);
      }, 5000);
      return () => clearTimeout(dismissTimer);
    }
  }, [showToast]);

  // Helper to format item title
  const formatItemTitle = (text) => {
    if (!text) return "Payment Item";
    const trimmed = text.trim();
    return trimmed.replace(/\b[a-z]/g, (char) => char.toUpperCase());
  };

  // Specifications state
  const [specifications, setSpecifications] = useState(() => {
    if (Array.isArray(room?.specifications) && room.specifications.length > 0) {
      return room.specifications;
    }
    const itemLower = (room?.item || room?.title || "").toLowerCase();
    if (itemLower.includes("iphone") || itemLower.includes("phone")) {
      return [
        { id: 1, key: "Color", val: "" },
        { id: 2, key: "Storage", val: "" },
      ];
    }
    return [];
  });
  const [isAddingSpec, setIsAddingSpec] = useState(false);
  const [specKey, setSpecKey] = useState("");
  const [specVal, setSpecVal] = useState("");
  const [showSpecError, setShowSpecError] = useState(false);
  const [isProceedLoading, setIsProceedLoading] = useState(false);

  // Check if at least one valid specification exists AND all current specs have values
  const hasValidSpecs =
    specifications.length > 0 &&
    specifications.every((s) => Boolean(s.key?.trim() && s.val?.trim()));

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

  const handleProceedClick = async () => {
    if (!counterpartyJoined) {
      setToastMessage("Waiting for counterparty to join room before you can proceed to payment.");
      setShowToast(true);
      return;
    }
    setShowSpecError(false);
    if (isProceedLoading) return;
    setIsProceedLoading(true);

    const roomId = room?.id || room?.orderNumber;
    const updatedRoom = {
      ...room,
      specifications: specifications,
      itemImage: itemImage || room?.itemImage,
      item_image: itemImage || room?.item_image,
      creator_proceeded: true,
      creatorProceeded: true,
    };

    if (roomId) {
      try {
        emitCreatorProceededSocket(roomId, specifications, itemImage);
        fetch(`http://localhost:5000/api/rooms/${roomId}/proceed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ specifications, itemImage }),
        }).catch(() => {});
      } catch (_) {}

      try {
        fetch(`http://localhost:8000/auth/pre-payment-rooms/${roomId}/proceed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ specifications, itemImage }),
        }).catch(() => {});
      } catch (e) {}

      try {
        localStorage.setItem(`paykudi_creator_proceeded_${roomId}`, JSON.stringify(updatedRoom));
      } catch (e) {}

      try {
        const bc = new BroadcastChannel("paykudi_sync_channel");
        bc.postMessage({ type: "paykudi_creator_proceeded", detail: updatedRoom });
        bc.close();
      } catch (e) {}

      window.dispatchEvent(
        new CustomEvent("paykudi_creator_proceeded", { detail: updatedRoom })
      );
    }

    try {
      if (onProceed) {
        onProceed(updatedRoom);
      } else if (onCancel) {
        onCancel();
      }
    } catch (err) {
      console.error("Error executing onProceed:", err);
    } finally {
      setIsProceedLoading(false);
    }
  };

  const handleCreateNewRoom = () => {
    if (onCreateNewRoom) {
      onCreateNewRoom();
    } else if (onCancel) {
      onCancel();
    }
  };

  // Timer countdown and automatic deactivation upon expiration synchronized with wall-clock time
  useEffect(() => {
    if (isKilled) return;

    if (counterpartyJoined) {
      // 2-minute timer for creator to click proceed once counterparty has joined
      let remaining = 120;
      const joinInterval = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(joinInterval);
          setIsKilled(true);
          setIsExpired(true);
          setKillReason("Payment room was killed because proceed was not completed within 2 minutes.");
          setToastMessage("Payment room was killed. Please create a new one.");
          setShowToast(true);
        }
      }, 1000);
      return () => clearInterval(joinInterval);
    }

    const tick = () => {
      const rem = computeInviteSecondsLeft(room);
      setSecondsLeft(rem);
      if (rem <= 0) {
        if (!isExpired) {
          setIsExpired(true);
          if (resendCount >= MAX_RESENDS) {
            setIsKilled(true);
            const roomId = room?.id || room?.orderNumber;
            if (roomId) {
              fetch(`http://localhost:8000/auth/pre-payment-rooms/${roomId}/kill`, {
                method: "POST",
              }).catch(() => {});
              window.dispatchEvent(
                new CustomEvent("paykudi_invite_killed", {
                  detail: { id: roomId },
                })
              );
            }
            setToastMessage("Payment room was killed after 3 resend attempts. Please create a new one.");
            setShowToast(true);
          } else {
            setIsKilled(false);
            const remaining = MAX_RESENDS - resendCount;
            setToastMessage(
              `Invite timed out. You have ${remaining} resend${remaining > 1 ? "s" : ""} left.`
            );
            setShowToast(true);
          }
        }
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
  }, [
    counterpartyJoined,
    isExpired,
    isKilled,
    resendCount,
    room?.id,
    room?.orderNumber,
    room?.order_number,
    room?.expires_at_ms,
    room?.created_at_ms,
    room?.expires_at,
    room?.created_at,
    room?.resent_at,
  ]);

  // Resend / Reactivate Payment Room handler
  const handleResendInvite = async () => {
    if (isResending) return;
    if (resendCount >= MAX_RESENDS) {
      setIsKilled(true);
      setToastMessage("Maximum 3 resend attempts reached. Payment room was killed.");
      setShowToast(true);
      return;
    }

    setIsResending(true);
    const newResendCount = resendCount + 1;
    setResendCount(newResendCount);

    const roomId = room?.id || room?.orderNumber;
    try {
      if (roomId) {
        localStorage.setItem(`paykudi_resend_count_${roomId}`, String(newResendCount));
      }
    } catch (_) {}

    try {
      if (roomId) {
        await fetch(`http://localhost:8000/auth/pre-payment-rooms/${roomId}/resend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resend_count: newResendCount }),
        });
      }
    } catch (e) {
      console.warn("Resend invite backend offline:", e);
    }

    const nowMs = Date.now();
    const expiresAtMs = nowMs + 120000;
    const nowIso = new Date(nowMs).toISOString();
    const expIso = new Date(expiresAtMs).toISOString();

    if (room) {
      room.resent_at = nowMs;
      room.created_at = nowIso;
      room.updated_at = nowIso;
      room.expires_at = expIso;
      room.created_at_ms = nowMs;
      room.expires_at_ms = expiresAtMs;
      room.secondsLeft = 120;
      room.seconds_left = 120;
      room.status = "pending_invite";
      room.statusText = "Invite Sent";
      room.status_text = "Invite Sent";
      room.is_expired = false;
      room.isKilled = false;
      room.resend_count = newResendCount;
      room.resendCount = newResendCount;
    }

    setSecondsLeft(120);
    setIsExpired(false);
    setIsKilled(false);
    setIsResending(false);

    const resentDetail = {
      id: roomId,
      orderNumber: room?.orderNumber || roomId,
      resend_count: newResendCount,
      room: {
        ...room,
        id: roomId,
        orderNumber: room?.orderNumber || roomId,
        status: "pending_invite",
        statusText: "Invite Sent",
        is_expired: false,
        isKilled: false,
        resend_count: newResendCount,
        resendCount: newResendCount,
        secondsLeft: 120,
        seconds_left: 120,
        resent_at: nowMs,
        created_at: nowIso,
        updated_at: nowIso,
        expires_at: expIso,
        created_at_ms: nowMs,
        expires_at_ms: expiresAtMs,
      },
      timestamp: nowMs,
    };

    window.dispatchEvent(
      new CustomEvent("paykudi_invite_resent", {
        detail: resentDetail,
      })
    );

    try {
      const bc = new BroadcastChannel("paykudi_sync_channel");
      bc.postMessage({ type: "paykudi_invite_resent", detail: resentDetail });
      bc.close();
    } catch (e) {}

    try {
      localStorage.setItem("paykudi_last_invite_resent", JSON.stringify(resentDetail));
    } catch (e) {}

    setToastMessage(`Invitation resent to ${counterpartyName}`);
    setShowToast(true);
  };

  // Permanently delete payment room & invite upon confirmed user cancellation
  const handleConfirmCancelRoom = async () => {
    if (isDeletingRoom) return;
    setIsDeletingRoom(true);
    const rId = targetRoomId || room?.id || room?.orderNumber || room?.order_number;

    // 1. Move to killed_payment_rooms in Supabase & delete from pre_payment_rooms
    try {
      await saveKilledPaymentRoomToDB(room, "creator_cancelled");
    } catch (err) {
      console.warn("[Cancel] Failed to move to killed_payment_rooms:", err);
    }

    // 2. Extra explicit delete from Supabase pre_payment_rooms
    if (isSupabaseConfigured && rId) {
      try {
        await supabase.from("pre_payment_rooms").delete().eq("order_number", rId);
        await supabase.from("pre_payment_rooms").delete().eq("id", rId);
      } catch (err) {
        console.warn("[Supabase] Failed to delete pre_payment_room:", err);
      }
    }

    // 3. Move out of pre_payment_rooms into killed_payment_rooms on Python backend
    if (rId) {
      try {
        await fetch(`http://localhost:8000/auth/pre-payment-rooms/${encodeURIComponent(rId)}`, {
          method: "DELETE",
        });
      } catch (_) {}
      try {
        await fetch(`http://localhost:8000/auth/pre-payment-rooms/${encodeURIComponent(rId)}/kill`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "creator_cancelled" }),
        });
      } catch (_) {}
    }

    // 4. Kill on Node socket server
    if (rId) {
      try {
        fetch(`http://localhost:5000/api/rooms/${encodeURIComponent(rId)}/kill`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "creator_cancelled" }),
        }).catch(() => {});
      } catch (_) {}
    }

    // 5. Remove from localStorage & permanently register in sessionStorage cancelled list
    try {
      localStorage.removeItem("paykudi_active_pre_payment_room");
      if (rId) {
        localStorage.removeItem(`paykudi_resend_count_${rId}`);
        const cancelled = JSON.parse(sessionStorage.getItem("paykudi_cancelled_rooms") || "[]");
        cancelled.push(rId);
        sessionStorage.setItem("paykudi_cancelled_rooms", JSON.stringify([...new Set(cancelled)]));
      }
    } catch (_) {}

    // 6. Broadcast to counterparty & any open tabs
    window.dispatchEvent(
      new CustomEvent("paykudi_invite_killed", {
        detail: { id: rId, roomId: rId, message: "Payment room was cancelled and deleted by creator." },
      })
    );
    try {
      const bc = new BroadcastChannel("paykudi_sync_channel");
      bc.postMessage({
        type: "paykudi_invite_killed",
        id: rId,
        roomId: rId,
        message: "Payment room was cancelled and deleted by creator.",
      });
      bc.close();
    } catch (_) {}

    setIsDeletingRoom(false);
    setShowCancelConfirm(false);

    if (onCancel) {
      onCancel(room || { id: rId, orderNumber: rId, order_number: rId });
    }
  };

  const safeSeconds = Math.max(0, secondsLeft);
  const mins = Math.floor(safeSeconds / 60);
  const secs = String(safeSeconds % 60).padStart(2, "0");
  const timeFormatted = `${mins}:${secs}`;

  const inviteContent = (
    <>
      {/* Toast Notification (rendered in portal so on desktop it floats at the top of the screen) */}
      {showToast &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="m-invite-toast" role="status" aria-live="polite">
            <div className="m-invite-toast-content">
              <div className="m-invite-toast-icon-wrap">
                <span
                  className={`material-symbols-outlined m-invite-toast-icon ${
                    (toastMessage || "").toLowerCase().includes("killed") || (toastMessage || "").toLowerCase().includes("cancel")
                      ? "is-error"
                      : (toastMessage || "").toLowerCase().includes("expired") || (toastMessage || "").toLowerCase().includes("timed out")
                      ? "is-warning"
                      : ""
                  }`}
                >
                  {(toastMessage || "").toLowerCase().includes("killed") || (toastMessage || "").toLowerCase().includes("cancel")
                    ? "error"
                    : (toastMessage || "").toLowerCase().includes("expired") || (toastMessage || "").toLowerCase().includes("timed out")
                    ? "schedule"
                    : "check_circle"}
                </span>
              </div>
              <span className="m-invite-toast-message">
                {toastMessage || "Counter party has joined room."}
              </span>
            </div>
            <button
              type="button"
              className="m-invite-toast-close"
              onClick={() => setShowToast(false)}
              aria-label="Dismiss notification"
            >
              <X size={14} strokeWidth={2.2} />
            </button>
          </div>,
          document.body
        )}

      {!isModal && (
        <div className="m-invite-title-wrap">
          <div className="m-invite-title-header-row">
            <h1 className="font-semibold text-2xl tracking-tight">
              Payment invitation
            </h1>
            <button
              type="button"
              className="new-payment-cancel-btn"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel
            </button>
          </div>
          <p className="text-muted-foreground text-sm">
            {isKilled ? (
              <span style={{ color: "#ef4444", fontWeight: 600 }}>Payment room expired.</span>
            ) : counterpartyJoined ? (
              "Counter party has joined room."
            ) : isExpired ? (
              <span style={{ color: "#ef4444", fontWeight: 600 }}>Invitation expired.</span>
            ) : (
              <span className="m-invite-subtitle-row">
                <span>Counterparty has</span>
                <span className="m-invite-red-timer">{timeFormatted}</span>
                <span>to accept invite.</span>
              </span>
            )}
          </p>
        </div>
      )}

      {/* Cancel Confirmation Dialog (Portal) */}
      {showCancelConfirm &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="m-invite-confirm-overlay"
            onClick={() => !isDeletingRoom && setShowCancelConfirm(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="m-cancel-confirm-title"
          >
            <div
              className="m-invite-confirm-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="m-cancel-confirm-title" className="m-invite-confirm-title">
                Are you sure you want to cancel?
              </h3>

              <p className="m-invite-confirm-body">
                Cancelling will permanently delete the payment room and invite.
              </p>

              <div className="m-invite-confirm-actions">
                <button
                  type="button"
                  className="m-invite-confirm-keep-btn"
                  disabled={isDeletingRoom}
                  onClick={() => setShowCancelConfirm(false)}
                >
                  Keep room
                </button>
                <button
                  type="button"
                  className="m-invite-confirm-delete-btn"
                  disabled={isDeletingRoom}
                  onClick={handleConfirmCancelRoom}
                >
                  {isDeletingRoom ? (
                    <>
                      <span className="btn-spinner" aria-hidden="true" />
                      <span>Cancelling...</span>
                    </>
                  ) : (
                    "Yes, cancel & delete"
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}


      {/* Item Reference Card */}
      <div className="m-invite-card-container">
        <div className="m-invite-item-card">
          <button
            aria-label="Share"
            className="m-invite-item-share-btn"
            type="button"
            onClick={onShare || handleShareOrCopy}
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
              {formatItemTitle(room?.item || room?.title || "Payment Item")}
            </h1>
            <p className="m-invite-item-price">
              {room?.amount || room?.price || "₦0.00"}
            </p>
          </div>
          <div className="m-invite-bottom-actions">
            {!counterpartyJoined ? (
              <>
                <div
                  className="m-invite-profile-avatar m-invite-creator-avatar"
                  aria-label={`${creatorName}'s avatar`}
                  title={creatorName}
                  style={creatorAvatar ? undefined : creatorAvatarStyle}
                >
                  {creatorAvatar ? (
                    <img
                      src={creatorAvatar}
                      alt={creatorName}
                      className="m-invite-avatar-img"
                    />
                  ) : (
                    <span className="m-invite-avatar-letter" style={{ color: creatorAvatarStyle.color }}>
                      {creatorInitial}
                    </span>
                  )}
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
                aria-label="Both participants in room"
                title={`${creatorName} and ${counterpartyName}`}
              >
                <div
                  className="m-invite-profile-avatar m-invite-avatar-first m-invite-creator-avatar"
                  aria-label={`${creatorName}'s avatar`}
                  title={creatorName}
                  style={creatorAvatar ? undefined : creatorAvatarStyle}
                >
                  {creatorAvatar ? (
                    <img
                      src={creatorAvatar}
                      alt={creatorName}
                      className="m-invite-avatar-img"
                    />
                  ) : (
                    <span className="m-invite-avatar-letter" style={{ color: creatorAvatarStyle.color }}>
                      {creatorInitial}
                    </span>
                  )}
                </div>
                <div
                  className="m-invite-profile-avatar m-invite-avatar-second m-invite-cp-avatar"
                  aria-label={`${counterpartyName}'s avatar`}
                  title={counterpartyName}
                  style={counterpartyAvatar ? undefined : cpAvatarStyle}
                >
                  {counterpartyAvatar ? (
                    <img
                      src={counterpartyAvatar}
                      alt={counterpartyName}
                      className="m-invite-avatar-img"
                    />
                  ) : (
                    <span className="m-invite-avatar-letter cp-letter" style={{ color: cpAvatarStyle.color }}>
                      {counterpartyInitial}
                    </span>
                  )}
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
      <div className={`m-invite-floating-actions ${isModal ? "desktop-invite-modal-actions" : ""}`}>
        {isExpired && !counterpartyJoined && !isKilled ? (
          <button
            type="button"
            onClick={handleResendInvite}
            className="m-invite-btn-resend"
            disabled={isResending || resendCount >= MAX_RESENDS}
            aria-busy={isResending}
          >
            {isResending ? (
              <span className="btn-spinner" aria-hidden="true" />
            ) : (
              <>
                <RotateCcw size={17} strokeWidth={2.4} style={{ flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  Resend invite to {counterpartyName}
                </span>
                <span className="m-invite-resend-badge">
                  {Math.max(0, MAX_RESENDS - resendCount)} left
                </span>
              </>
            )}
          </button>
        ) : null}

        {showSpecError && !hasValidSpecs && !isExpired && !isKilled && (
          <div className="m-invite-spec-error-tip" role="alert">
            <span className="material-symbols-outlined spec-error-tip-icon">error</span>
            <span>
              {specifications.length === 0
                ? "You cannot proceed without adding specification"
                : "Please fill in specifications (Color, Storage, RAM) to proceed"}
            </span>
          </div>
        )}
        {isKilled ? (
          <div className="m-invite-killed-action-wrap" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              type="button"
              onClick={handleCreateNewRoom}
              className="m-invite-btn-proceed is-killed-btn"
            >
              Create new payment room
            </button>
          </div>
        ) : !isExpired ? (
          <button
            type="button"
            onClick={handleProceedClick}
            className={`m-invite-btn-proceed ${isProceedLoading ? "is-loading" : ""}`}
            disabled={isProceedLoading || !counterpartyJoined}
            aria-busy={isProceedLoading}
            aria-disabled={!counterpartyJoined}
            title={!counterpartyJoined ? "Waiting for counterparty to join room before you can proceed" : undefined}
          >
            {isProceedLoading ? (
              <span className="btn-spinner" aria-hidden="true" />
            ) : (
              "Proceed to make payment"
            )}
          </button>
        ) : null}
      </div>
    </>
  );

  if (!isModal) {
    return (
      <main className="flex pt-8 pr-5 pb-8 pl-5 flex-col flex-1 gap-6 w-full m-invite-wrapper">
        {inviteContent}
      </main>
    );
  }

  return (
    <div className="desktop-np-modal-overlay">
      <div
        className="desktop-np-modal-container desktop-invite-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="desktop-invite-modal-title"
      >
        {/* ── Modal Header with Cancel Button ── */}
        <div className="desktop-np-modal-header">
          <div className="desktop-np-header-left">
            <div>
              <h2 id="desktop-invite-modal-title" className="desktop-np-title">
                Payment invitation
              </h2>
              <p className="desktop-np-subtitle">
                {isKilled ? (
                  <span style={{ color: "#ef4444", fontWeight: 600 }}>Payment room expired.</span>
                ) : counterpartyJoined ? (
                  "Counter party has joined room."
                ) : isExpired ? (
                  <span style={{ color: "#ef4444", fontWeight: 600 }}>Invitation expired.</span>
                ) : (
                  <span className="m-invite-subtitle-row">
                    <span>Counterparty has</span>
                    <span className="m-invite-red-timer">{timeFormatted}</span>
                    <span>to accept invite.</span>
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="desktop-np-header-right">
            <button
              type="button"
              className="desktop-np-cancel-btn"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* ── Modal Body (scrollable) ── */}
        <div className="desktop-np-modal-body desktop-invite-modal-body">
          {inviteContent}
        </div>
      </div>
    </div>
  );
}
