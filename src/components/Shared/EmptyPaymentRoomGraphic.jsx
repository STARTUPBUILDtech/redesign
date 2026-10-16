export default function EmptyPaymentRoomGraphic({ className = "pr-empty-graphic-svg" }) {
  return (
    <svg
      className={className}
      viewBox="0 6 320 144"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* ── CARD 1 (BACK) ── */}
      <g className="pr-empty-card-back">
        <rect
          x="44"
          y="10"
          width="232"
          height="64"
          rx="20"
          className="pr-card-bg pr-card-bg-back"
        />
        <circle cx="80" cy="42" r="18" className="pr-card-disc" />
        <circle
          cx="80"
          cy="42"
          r="18"
          stroke="#f43f5e"
          strokeWidth="3.5"
          fill="none"
        />
        <rect
          x="114"
          y="36"
          width="110"
          height="12"
          rx="6"
          className="pr-card-bar"
        />
      </g>

      {/* ── CARD 2 (MIDDLE) ── */}
      <g className="pr-empty-card-mid">
        <rect
          x="26"
          y="38"
          width="268"
          height="70"
          rx="22"
          className="pr-card-bg pr-card-bg-mid"
        />
        <circle cx="68" cy="73" r="18" className="pr-card-disc" />
        <circle
          cx="68"
          cy="73"
          r="18"
          stroke="#a855f7"
          strokeWidth="3.5"
          fill="none"
        />
        <rect
          x="102"
          y="67"
          width="135"
          height="12"
          rx="6"
          className="pr-card-bar"
        />
      </g>

      {/* ── CARD 3 (FRONT) ── */}
      <g className="pr-empty-card-front">
        <rect
          x="8"
          y="66"
          width="304"
          height="82"
          rx="26"
          className="pr-card-bg pr-card-bg-front"
        />
        <circle cx="54" cy="107" r="19" className="pr-card-disc" />
        <circle
          cx="54"
          cy="107"
          r="19"
          stroke="#22c55e"
          strokeWidth="3.5"
          fill="none"
        />
        <rect
          x="90"
          y="97"
          width="168"
          height="13"
          rx="6.5"
          className="pr-card-bar"
        />
        <rect
          x="90"
          y="117"
          width="102"
          height="11"
          rx="5.5"
          className="pr-card-bar"
        />
      </g>
    </svg>
  );
}
