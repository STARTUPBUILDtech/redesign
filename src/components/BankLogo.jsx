import kudaLogo from "../assets/banks/kuda.png";
import accessLogo from "../assets/banks/access.png";
import gtbankLogo from "../assets/banks/gtbank.png";
import zenithLogo from "../assets/banks/zenith.png";
import firstbankLogo from "../assets/banks/firstbank.png";
import ubaLogo from "../assets/banks/uba.png";
import palmpayLogo from "../assets/banks/palmpay.png";

export const BANK_LOGOS = {
  kuda: kudaLogo,
  access: accessLogo,
  gtbank: gtbankLogo,
  gtb: gtbankLogo,
  zenith: zenithLogo,
  firstbank: firstbankLogo,
  uba: ubaLogo,
  palmpay: palmpayLogo,
};

export default function BankLogo({
  bankCode = "kuda",
  bankName = "",
  size = 36,
  className = "",
}) {
  const code = bankCode?.toLowerCase() || "";
  const logo = BANK_LOGOS[code];

  // Specific padding adjustments for transparent logos
  const needsPadding = ["access", "zenith", "uba", "firstbank"].includes(code);

  if (logo) {
    return (
      <div
        className={`payout-bank-badge ${code} ${className}`}
        style={{
          width: size,
          height: size,
          minWidth: size,
          maxWidth: size,
        }}
      >
        <img
          src={logo}
          alt={bankName || bankCode}
          className="payout-bank-badge-img"
          style={{
            padding: needsPadding ? 4 : 0,
            objectFit: needsPadding ? "contain" : "cover",
          }}
        />
      </div>
    );
  }

  // Fallback text badge
  return (
    <div
      className={`payout-bank-badge ${code} ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        maxWidth: size,
      }}
    >
      <span>{(bankName || bankCode).slice(0, 4).toUpperCase()}</span>
    </div>
  );
}
