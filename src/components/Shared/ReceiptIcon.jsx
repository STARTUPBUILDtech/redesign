/**
 * ReceiptIcon matches the custom serrated receipt icon provided in design specs:
 * Solid body with rounded top, 3 rounded pill cutout bars, and a jagged 4-tooth serrated bottom.
 */
export default function ReceiptIcon({ size = 16, className = "", style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="currentColor"
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 110,27 
           L 402,27 
           C 425,27 443,45 443,68 
           L 443,471 
           C 440,480 435,484 427,484 
           C 420,484 414,480 410,477 
           L 372,453 
           C 368,450 363,450 359,453 
           L 324,476 
           C 319,479 314,484 308,484 
           C 302,484 297,479 292,476 
           L 263,453 
           C 259,450 254,450 250,453 
           L 221,476 
           C 216,479 211,484 206,484 
           C 200,484 195,479 190,476 
           L 153,453 
           C 149,450 144,450 140,453 
           L 102,477 
           C 98,480 92,484 85,484 
           C 77,484 72,480 69,471 
           L 69,68 
           C 69,45 87,27 110,27 
           Z 
           M 170,114 
           L 342,114 
           C 350,114 356,120 356,128 
           C 356,136 350,142 342,142 
           L 170,142 
           C 162,142 156,136 156,128 
           C 156,120 162,114 170,114 
           Z 
           M 170,199 
           L 342,199 
           C 350,199 356,205 356,213 
           C 356,221 350,227 342,227 
           L 170,227 
           C 162,227 156,221 156,213 
           C 156,205 162,199 170,199 
           Z 
           M 170,284 
           L 256,284 
           C 264,284 270,290 270,298 
           C 270,306 264,312 256,312 
           L 170,312 
           C 162,312 156,306 156,298 
           C 156,290 162,284 170,284 
           Z"
      />
    </svg>
  );
}
