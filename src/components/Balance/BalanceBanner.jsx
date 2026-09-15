import PayKudiBalance from "./PayKudiBalance";

export default function BalanceBanner() {
  return (
    <section className="summary desktop-balance-banner" aria-label="Dashboard summary">
      <div className="desktop-cardless-balance-wrap">
        <div className="balance-tile">
          <PayKudiBalance />
        </div>
      </div>
    </section>
  );
}
