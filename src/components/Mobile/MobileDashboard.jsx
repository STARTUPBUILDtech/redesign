import BrandLogo from "../Header/BrandLogo";
import HeaderActions from "../Header/HeaderActions";
import PayKudiBalance from "../Balance/PayKudiBalance";
import ActivityRow from "../Activity/ActivityRow";
import MobileBottomNav from "./MobileBottomNav";
import MobileActivity from "./MobileActivity";
import MobileNewPayment from "./MobileNewPayment";
import { useDashboard } from "../../context/DashboardContext";

export default function MobileDashboard() {
  const { dark, active, setActive, transactions } = useDashboard();

  const isNewPayment = active === "New Payment";
  const isPaymentRoom = active === "Payment room";
  const isActivity = active === "Activity";

  return (
    <div className={`mobile-dashboard ${isActivity ? "activity-mode" : ""}`} data-appearance={dark ? "dark" : "light"}>
      <header className="mobile-header">
        <BrandLogo className="mobile-brand" />
        <HeaderActions />
      </header>

      {isActivity ? (
        <MobileActivity />
      ) : isNewPayment ? (
        <MobileNewPayment onCancel={() => setActive("Home")} />
      ) : isPaymentRoom ? (
        <div style={{ padding: "24px 20px", color: "var(--ink)", opacity: 0.5, textAlign: "center", marginTop: 60 }}>
          Payment Room coming soon…
        </div>
      ) : (
        <>
          <div className="mobile-main mobile-main-top">
            <section className="mobile-intro">
              <h1>Good morning, Amaka</h1>
              <p>What will you like to do?</p>
            </section>
            <section className="mobile-cta">
              <button
                type="button"
                className="mobile-primary"
                onClick={() => setActive("New Payment")}
              >
                <b className="btn-plus">＋</b> New Payment
              </button>
              <button type="button" className="mobile-secondary">Withdraw</button>
            </section>
          </div>

          {/* Balance Tile with no padding, spanning left to right, no corner radius */}
          <div className="balance-tile">
            <PayKudiBalance />
          </div>

          <main className="mobile-main mobile-main-bottom">
            <section className="mobile-activity" id="activity">
              <div className="mobile-activity-head">
                <h2>Recent activity</h2>
                <a
                  href="#activity"
                  onClick={(e) => {
                    e.preventDefault();
                    if (setActive) setActive("Activity");
                  }}
                >
                  View all
                </a>
              </div>
              <div className="boxless-activity-list">
                {transactions.map((tx, idx) => (
                  <ActivityRow
                    key={tx.id || tx.title}
                    item={tx}
                    isLast={idx === transactions.length - 1}
                  />
                ))}
              </div>
            </section>
          </main>
        </>
      )}

      {/* Hide navbar only on New Payment screen */}
      {!isNewPayment && <MobileBottomNav />}
    </div>
  );
}
