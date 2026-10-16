import emptyActivityImg from "../../assets/empty-activity.png";

export default function EmptyActivityGraphic({ className = "activity-empty-graphic-svg" }) {
  return (
    <div className={`activity-empty-wallet-wrapper ${className}`}>
      <img
        src={emptyActivityImg}
        alt="No transactions yet"
        className="activity-empty-wallet-img"
        draggable={false}
      />
    </div>
  );
}
