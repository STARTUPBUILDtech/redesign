import walletLight from "../../assets/empty-activity-wallet.png";
import walletDark from "../../assets/empty-activity-wallet-dark.png";

export default function EmptyActivityGraphic({ className = "activity-empty-graphic-svg" }) {
  return (
    <div className={`activity-empty-wallet-wrapper ${className}`}>
      <img
        src={walletLight}
        alt="No transactions yet"
        className="activity-empty-wallet-img activity-empty-wallet-light"
        draggable={false}
      />
      <img
        src={walletDark}
        alt="No transactions yet"
        className="activity-empty-wallet-img activity-empty-wallet-dark"
        draggable={false}
      />
    </div>
  );
}
