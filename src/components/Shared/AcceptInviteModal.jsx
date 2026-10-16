import { useState, useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { computeInviteSecondsLeft } from "../../utils/timerUtils";
import { getUserAvatarStyle } from "../../utils/avatarUtils";
import GlowingLogoLoader from "./GlowingLogoLoader";
import { saveKilledPaymentRoomToDB } from "../../services/supabaseService";
import { getSocket, joinRoomSocket, emitAcceptInviteSocket } from "../../services/socketService";
import togetherImg from "../../assets/together.png";
import "../../styles/accept-invite-modal.css";

export default function AcceptInviteModal({
  invite,
  onAccept,
  onDecline,
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWaitingForCreator, setIsWaitingForCreator] = useState(
    () => Boolean(invite?.counterparty_joined || invite?.counterpartyJoined || invite?.status === "accepted")
  );
  const [waitingSecondsLeft, setWaitingSecondsLeft] = useState(120);
  const [isKilled, setIsKilled] = useState(false);
  const [killMessage, setKillMessage] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(() => computeInviteSecondsLeft(invite));
  const [isExpired, setIsExpired] = useState(() => {
    const isExplicitlyExpired = Boolean(invite?.status === "expired" || invite?.is_expired || invite?.statusText === "Expired");
    return isExplicitlyExpired || computeInviteSecondsLeft(invite) <= 0;
  });
  const [errorMsg, setErrorMsg] = useState("");

  if (!invite) return null;

  const roomId = invite.id || invite.orderNumber || invite.order_number || "ORD-ROOM";
  const item = invite.item || invite.title || "Payment Item";
  const amount = invite.amount || invite.price || "₦0.00";
  const creatorName = invite.creator || invite.creatorName || "Howard Ukah";
  const creatorInitial = (creatorName.trim().charAt(0) || "H").toUpperCase();
  const creatorAvatar = invite.creatorAvatar || invite.creator_avatar || null;
  const creatorUsername = invite.creatorUsername || invite.creator_username;
  const creatorPhone = invite.creatorPhone || invite.creator_phone;
  const creatorAvatarStyle = getUserAvatarStyle(
    invite.creator_avatar_color || invite.creatorAvatarColor
      ? { avatar_color: invite.creator_avatar_color || invite.creatorAvatarColor, username: creatorUsername, name: creatorName }
      : { username: creatorUsername, name: creatorName, phone: creatorPhone, creator: creatorName }
  );

  const counterpartyName = invite.counterparty || invite.counterpartyName || "Counterparty";
  const counterpartyInitial = (counterpartyName.trim().charAt(0) || "C").toUpperCase();
  const counterpartyAvatar = invite.counterpartyAvatar || invite.counterparty_avatar || null;
  const counterpartyAvatarStyle = getUserAvatarStyle(
    invite.counterparty_avatar_color || invite.counterpartyAvatarColor
      ? { avatar_color: invite.counterparty_avatar_color || invite.counterpartyAvatarColor, username: invite.counterparty_username || invite.counterpartyUsername, name: counterpartyName }
      : { username: invite.counterparty_username || invite.counterpartyUsername, name: counterpartyName, phone: invite.counterparty_phone || invite.counterpartyPhone }
  );

  // Real-time wall-clock countdown timer synchronized with creator and server
  useEffect(() => {
    if (isExpired || isWaitingForCreator) return;

    const tick = () => {
      const rem = computeInviteSecondsLeft(invite);
      setSecondsLeft(rem);
      if (rem <= 0) {
        setIsExpired(true);
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [invite, isExpired, isWaitingForCreator]);

  useEffect(() => {
    const isExplicitlyExpired = Boolean(invite?.status === "expired" || invite?.is_expired || invite?.statusText === "Expired");
    const rem = computeInviteSecondsLeft(invite);
    if (isExplicitlyExpired || rem <= 0) {
      setIsExpired(true);
      setSecondsLeft(0);
    } else {
      setIsExpired(false);
      setSecondsLeft(rem);
      setErrorMsg("");
    }
  }, [invite?.id, invite?.orderNumber, invite?.status, invite?.is_expired, invite?.updated_at, invite?.resent_at, invite?.expires_at, invite?.expires_at_ms]);

  useEffect(() => {
    const checkMatch = (targetId) => {
      if (!targetId) return true;
      return (
        targetId === roomId ||
        targetId === invite?.id ||
        targetId === invite?.orderNumber ||
        targetId === invite?.order_number
      );
    };

    const onKilled = (e) => {
      if (checkMatch(e.detail?.id)) {
        setIsExpired(true);
        setSecondsLeft(0);
        setIsWaitingForCreator(false);
      }
    };

    const handleResent = (detail) => {
      const incomingId = detail?.id || detail?.orderNumber || detail?.room?.id || detail?.room?.orderNumber;
      if (checkMatch(incomingId)) {
        setIsExpired(false);
        setSecondsLeft(computeInviteSecondsLeft(detail?.room || detail));
        setErrorMsg("");
        setIsWaitingForCreator(false);
      }
    };

    const onResent = (e) => {
      handleResent(e.detail);
    };

    window.addEventListener("paykudi_invite_killed", onKilled);
    window.addEventListener("paykudi_invite_resent", onResent);

    let bc;
    try {
      bc = new BroadcastChannel("paykudi_sync_channel");
      bc.onmessage = (msg) => {
        if (msg.data?.type === "paykudi_invite_resent") {
          handleResent(msg.data.detail);
        } else if (msg.data?.type === "paykudi_invite_killed") {
          if (checkMatch(msg.data.id)) {
            setIsExpired(true);
            setSecondsLeft(0);
            setIsWaitingForCreator(false);
          }
        }
      };
    } catch (e) {}

    const onStorage = (e) => {
      if (e.key === "paykudi_last_invite_resent" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          handleResent(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("paykudi_invite_killed", onKilled);
      window.removeEventListener("paykudi_invite_resent", onResent);
      window.removeEventListener("storage", onStorage);
      if (bc) bc.close();
    };
  }, [roomId, invite?.id, invite?.orderNumber]);

  // Connect to Socket.IO server on port 5000
  useEffect(() => {
    if (!roomId) return;
    joinRoomSocket(roomId, invite?.counterparty || "Counterparty", "counterparty");
    const s = getSocket();
    if (!s) return;

    const onRoomReady = (data) => {
      if (data?.roomId === roomId || !data?.roomId) {
        setIsWaitingForCreator(false);
        const incoming = data?.room || {};
        const readyRoom = {
          ...invite,
          ...incoming,
          id: roomId,
          orderNumber: roomId,
          title: invite?.title || invite?.item || incoming?.title || incoming?.item || item,
          item: invite?.item || invite?.title || incoming?.item || incoming?.title || item,
          amount: invite?.amount || invite?.price || incoming?.amount || incoming?.price || amount,
          price: invite?.price || invite?.amount || incoming?.price || incoming?.amount || amount,
          creator: invite?.creator || invite?.creatorName || incoming?.creator || incoming?.creatorName,
          counterparty: invite?.counterparty || invite?.counterpartyName || incoming?.counterparty || incoming?.counterpartyName,
          sellerName: invite?.sellerName || incoming?.sellerName,
          buyerName: invite?.buyerName || incoming?.buyerName,
          status: "awaiting_payment",
          statusText: "Awaiting Payment",
          category: "ongoing",
          counterpartyJoined: true,
          counterparty_joined: true,
        };
        if (onAccept) onAccept(readyRoom);
      }
    };

    const onWaiting = (data) => {
      if (data?.roomId === roomId) {
        setIsWaitingForCreator(true);
        if (data.timeoutSeconds) setWaitingSecondsLeft(data.timeoutSeconds);
      }
    };

    const onKilled = (data) => {
      if (data?.roomId === roomId) {
        setIsWaitingForCreator(false);
        setIsKilled(true);
        setIsExpired(true);
        setKillMessage(data.message || "Payment room was killed because counterparty did not join within 2 minutes.");
      }
    };

    s.on("room_ready", onRoomReady);
    s.on("waiting_for_creator", onWaiting);
    s.on("room_killed", onKilled);

    return () => {
      s.off("room_ready", onRoomReady);
      s.off("waiting_for_creator", onWaiting);
      s.off("room_killed", onKilled);
    };
  }, [roomId, invite, onAccept]);

  // 2-minute countdown timer while waiting for counterparty to join
  useEffect(() => {
    if (!isWaitingForCreator || isKilled) return;

    const killTheRoom = async () => {
      setIsWaitingForCreator(false);
      setIsKilled(true);
      setIsExpired(true);
      setKillMessage("Counterparty failed to join within 2 minutes. This payment room has been killed.");

      // 1. Save into Supabase killed_payment_rooms table & clean up pre_payment_rooms/payment_rooms
      try {
        await saveKilledPaymentRoomToDB(invite, "timeout_creator_not_joined");
      } catch (err) {
        console.warn("Error saving killed payment room:", err);
      }

      // 2. Notify Node server.js
      try {
        fetch(`http://localhost:5000/api/rooms/${roomId}/kill`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "timeout_creator_not_joined" }),
        }).catch(() => {});
      } catch (_) {}

      // 3. Broadcast kill event
      window.dispatchEvent(
        new CustomEvent("paykudi_invite_killed", { detail: { id: roomId } })
      );
    };

    const timer = setInterval(() => {
      setWaitingSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          killTheRoom();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isWaitingForCreator, isKilled, invite, roomId]);

  // Handle waiting for creator to add specifications & click proceed
  useEffect(() => {
    if (!isWaitingForCreator) return;

    let isDone = false;
    const finishProceed = (extra = {}) => {
      if (isDone) return;
      isDone = true;
      setIsWaitingForCreator(false);
      const finalRoom = {
        ...invite,
        ...(extra || {}),
        id: roomId,
        orderNumber: roomId,
        title: invite?.title || invite?.item || extra?.item || extra?.title || item,
        item: invite?.item || invite?.title || extra?.item || extra?.title || item,
        amount: invite?.amount || invite?.price || extra?.amount || extra?.price || amount,
        price: invite?.price || invite?.amount || extra?.price || extra?.amount || amount,
        creator: invite?.creator || invite?.creatorName || extra?.creator || extra?.creatorName,
        counterparty: invite?.counterparty || invite?.counterpartyName || extra?.counterparty || extra?.counterpartyName,
        sellerName: invite?.sellerName || extra?.sellerName,
        buyerName: invite?.buyerName || extra?.buyerName,
        specifications: extra?.specifications || invite?.specifications || [],
        itemImage: extra?.itemImage || extra?.item_image || invite?.itemImage,
        status: "awaiting_payment",
        statusText: "Awaiting Payment",
        category: "ongoing",
        counterpartyJoined: true,
        counterparty_joined: true,
        creator_proceeded: true,
        creatorProceeded: true,
      };
      if (onAccept) {
        onAccept(finalRoom);
      }
    };

    // A. Window event
    const onCreatorProceed = (e) => {
      const detail = e.detail;
      const targetId = detail?.id || detail?.orderNumber;
      if (!targetId || targetId === roomId) {
        finishProceed(detail || {});
      }
    };
    window.addEventListener("paykudi_creator_proceeded", onCreatorProceed);

    // B. BroadcastChannel
    let bc;
    try {
      bc = new BroadcastChannel("paykudi_sync_channel");
      bc.onmessage = (msg) => {
        if (msg.data?.type === "paykudi_creator_proceeded") {
          const detail = msg.data.detail;
          const targetId = detail?.id || detail?.orderNumber;
          if (!targetId || targetId === roomId) {
            finishProceed(detail || {});
          }
        }
      };
    } catch (e) {}

    // C. localStorage storage event
    const onStorage = (e) => {
      if (e.key === `paykudi_creator_proceeded_${roomId}` && e.newValue) {
        try {
          finishProceed(JSON.parse(e.newValue));
        } catch (err) {
          finishProceed();
        }
      }
    };
    window.addEventListener("storage", onStorage);

    // D. Poll server.js and backend
    const pollInterval = setInterval(async () => {
      try {
        const sRes = await fetch(`http://localhost:5000/api/rooms/${roomId}/status`);
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.room?.creatorProceeded === true || sData.room?.creator_proceeded === true) {
            finishProceed(sData.room);
            return;
          }
          if (sData.room?.isKilled) {
            setIsWaitingForCreator(false);
            setIsKilled(true);
            setIsExpired(true);
            return;
          }
        }
      } catch (_) {}

      try {
        const res = await fetch(`http://localhost:8000/auth/pre-payment-rooms/${roomId}`);
        if (res.ok) {
          const data = await res.json();
          const r = data.room;
          if (r && (r.creator_proceeded === true || r.creatorProceeded === true)) {
            finishProceed(r);
          }
        }
      } catch (e) {}
    }, 1200);

    return () => {
      isDone = true;
      window.removeEventListener("paykudi_creator_proceeded", onCreatorProceed);
      window.removeEventListener("storage", onStorage);
      clearInterval(pollInterval);
      if (bc) bc.close();
    };
  }, [isWaitingForCreator, roomId, invite, item, amount, onAccept]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const timeFormatted = `${mins}:${secs}`;

  const waitingMins = Math.floor(waitingSecondsLeft / 60);
  const waitingSecs = String(waitingSecondsLeft % 60).padStart(2, "0");

  const handleConfirmAccept = async () => {
    if (isExpired || isSubmitting || isWaitingForCreator || isKilled) return;
    setIsSubmitting(true);
    setErrorMsg("");

    const acceptedRoom = {
      ...invite,
      id: roomId,
      orderNumber: roomId,
      title: item,
      item: item,
      amount: amount,
      price: amount,
      status: "pending_invite",
      statusText: "Waiting for Counterparty",
      category: "pre_payment",
      counterpartyJoined: true,
      counterparty_joined: true,
      creatorProceeded: false,
      creator_proceeded: false,
    };

    // 1. Notify Node server.js
    try {
      emitAcceptInviteSocket(roomId, { counterpartyJoined: true });
      fetch(`http://localhost:5000/api/rooms/${roomId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: acceptedRoom }),
      }).catch(() => {});
    } catch (_) {}

    // 2. Notify Python backend
    try {
      await fetch(`http://localhost:8000/auth/pre-payment-rooms/${roomId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: invite.counterparty || "Counterparty" }),
      });
    } catch (e) {
      console.warn("Backend accept invite notice:", e);
    }

    // 3. Dispatch event so creator screen immediately shows "Counter party has joined room"
    window.dispatchEvent(
      new CustomEvent("paykudi_invite_accepted", {
        detail: acceptedRoom,
      })
    );

    try {
      const bc = new BroadcastChannel("paykudi_sync_channel");
      bc.postMessage({ type: "paykudi_invite_accepted", detail: acceptedRoom });
      bc.close();
    } catch (e) {}

    // 4. User 2 enters waiting state and starts 2-minute timer!
    // NEVER navigate to payment room yet — wait until creator clicks "Proceed to make payment"!
    setIsSubmitting(false);
    setWaitingSecondsLeft(120);
    setIsWaitingForCreator(true);
  };

  const handleDecline = () => {
    try {
      fetch(`http://localhost:5000/api/rooms/${roomId}/kill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "declined" }),
      }).catch(() => {});
    } catch (_) {}

    if (onDecline) {
      onDecline(invite);
    }
  };

  const toSentenceCase = (str) => {
    if (!str || typeof str !== "string") return "Payment item";
    const trimmed = str.trim();
    if (!trimmed) return "Payment item";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  const formattedToday = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="pk-accept-invite-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pk-accept-invite-title"
      onClick={isExpired || isKilled ? handleDecline : undefined}
    >
      <div className="pk-accept-invite-modal" onClick={(e) => e.stopPropagation()}>
        {isWaitingForCreator ? (
          /* Waiting for counterparty to join room with PayKudi logo & loading state */
          <div className="pk-invite-waiting-view">
            <div className="pk-invite-waiting-loader-wrap">
              <GlowingLogoLoader layout="inline" />
            </div>
            <h3 className="pk-invite-waiting-title">
              Waiting for counter party to join
            </h3>
            <p className="pk-invite-waiting-subtitle">
              Room will close in{" "}
              <strong className="pk-invite-timer-countdown">
                {waitingMins}:{waitingSecs}
              </strong>{" "}
              if counterparty does not join.
            </p>
          </div>
        ) : isKilled ? (
          /* Payment Room Killed State */
          <div className="pk-invite-card-inner">
            <div className="pk-invite-header-row">
              <span className="pk-invite-date-label">Today, {formattedToday}</span>
              <h2 id="pk-accept-invite-title" className="pk-invite-heading" style={{ color: "#ef4444" }}>
                Invite Expired
              </h2>
            </div>
            <div className="pk-invite-avatar-wrap">
              <div className="pk-invite-avatar-circle" style={{ background: "#fee2e2", color: "#ef4444" }}>
                <span style={{ fontSize: 28, fontWeight: 700 }}>✕</span>
              </div>
            </div>
            <div className="pk-invite-main-content">
              <h3 className="pk-invite-project-title" style={{ color: "#ef4444", fontSize: 20 }}>
                Payment Room Killed
              </h3>
              <p className="pk-invite-description">
                {killMessage || "Counterparty failed to join within 2 minutes. This room has been cancelled and moved to killed payment rooms."}
              </p>
            </div>
            <div className="pk-invite-footer-row" style={{ justifyContent: "flex-end" }}>
              <button
                type="button"
                className="pk-invite-decline-btn"
                onClick={handleDecline}
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Top Date & Heading */}
            <div className="pk-invite-header-row">
              <span className="pk-invite-date-label">Today, {formattedToday}</span>
              <h2 id="pk-accept-invite-title" className="pk-invite-heading">
                Pending invite
              </h2>
            </div>

            {/* Center Circular Avatar */}
            <div className="pk-invite-avatar-wrap">
              {creatorAvatar ? (
                <img src={creatorAvatar} alt={creatorName} className="pk-invite-avatar-img" />
              ) : (
                <div
                  className="pk-invite-avatar-circle"
                  style={creatorAvatarStyle?.backgroundColor ? { backgroundColor: creatorAvatarStyle.backgroundColor } : undefined}
                >
                  <span>{creatorInitial}</span>
                </div>
              )}
            </div>

            {/* Center Main Invitation Content */}
            <div className="pk-invite-main-content">
              <p className="pk-invite-lead-text">
                <strong>{creatorName}</strong> invited you to Join<br />
                <span className="pk-invite-room-term">Payment room</span>
              </p>
              <h3 className="pk-invite-project-title">
                “{toSentenceCase(item)}”
              </h3>
            </div>

            {/* Avatars of the users involved in the payment room */}
            <div className="pk-invite-badges-row">
              <div className="pk-invite-avatar-stack">
                {creatorAvatar ? (
                  <img src={creatorAvatar} alt={creatorName} className="pk-stack-avatar creator" title={creatorName} />
                ) : (
                  <span
                    className="pk-stack-avatar creator"
                    title={creatorName}
                    style={creatorAvatarStyle?.backgroundColor ? { backgroundColor: creatorAvatarStyle.backgroundColor } : undefined}
                  >
                    {creatorInitial}
                  </span>
                )}
                {counterpartyAvatar ? (
                  <img src={counterpartyAvatar} alt={counterpartyName} className="pk-stack-avatar counterparty" title={counterpartyName} />
                ) : (
                  <span
                    className="pk-stack-avatar counterparty"
                    title={counterpartyName}
                    style={counterpartyAvatarStyle?.backgroundColor ? { backgroundColor: counterpartyAvatarStyle.backgroundColor } : undefined}
                  >
                    {counterpartyInitial}
                  </span>
                )}
              </div>
              <span className="pk-invite-accepted-meta">
                Ref: {roomId} • <strong>{amount}</strong>
              </span>
            </div>

            {/* Error message display if any */}
            {errorMsg && (
              <p
                className="pk-accept-invite-error"
                role="alert"
                style={{ color: "#ef4444", fontSize: "13px", margin: "4px 0 10px 0", textAlign: "center" }}
              >
                {errorMsg}
              </p>
            )}

            {/* Bottom Footer Section: Divider, Centered Expiry Note, and Side-by-Side Action Buttons */}
            <div className="pk-invite-footer-section">
              <div className="pk-invite-expiry-note">
                {isExpired ? (
                  <span className="pk-invite-expired-label">Your invitation has expired.</span>
                ) : (
                  <span>
                    Your invitation expires in <strong className="pk-invite-timer-countdown">{timeFormatted}</strong>.
                  </span>
                )}
              </div>

              <div className="pk-invite-btn-row">
                <button
                  type="button"
                  className="pk-invite-decline-btn"
                  disabled={isSubmitting}
                  onClick={handleDecline}
                >
                  {isExpired ? "Close" : "Decline"}
                </button>
                <button
                  type="button"
                  className="pk-invite-accept-btn"
                  disabled={isSubmitting || isExpired}
                  onClick={handleConfirmAccept}
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle className="animate-spin" size={15} />
                      <span>Accepting...</span>
                    </>
                  ) : (
                    <span>Accept invitation</span>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
