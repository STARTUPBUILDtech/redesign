import { useState, useEffect } from "react";
import "../../styles/mobile-payment-invitation.css";

export default function MobilePaymentInvitation({
  room = {},
  onCancel,
  onShare,
}) {
  const [secondsLeft, setSecondsLeft] = useState(120); // 2:00

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const timeFormatted = `${mins}:${secs}`;

  return (
    <main className="flex pt-8 pr-5 pb-8 pl-5 flex-col flex-1 gap-6 w-full m-invite-wrapper">
      <div className="m-invite-title-wrap">
        <h1 className="font-semibold text-2xl tracking-tight">
          Payment invitation
        </h1>
        <p className="text-muted-foreground text-sm">
          Counterparty has{" "}
          <span className="m-invite-red-timer">{timeFormatted}</span>{" "}
          to accept invite.
        </p>
      </div>

      {/* Black box spanning the exact position of the removed card */}
      <div className="m-invite-black-box" />

      {/* Floating Action Buttons */}
      <div className="m-invite-floating-actions">
        <button
          type="button"
          onClick={onShare}
          className="m-invite-btn-share"
        >
          Share invite Link
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="m-invite-btn-cancel"
        >
          Cancel invite
        </button>
      </div>
    </main>
  );
}
