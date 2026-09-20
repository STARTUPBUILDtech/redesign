import { useState } from "react";
import BrandLogo from "../Header/BrandLogo";
import HeaderActions from "../Header/HeaderActions";
import PayKudiBalance from "../Balance/PayKudiBalance";
import ActivityRow from "../Activity/ActivityRow";
import MobileBottomNav from "./MobileBottomNav";
import MobileActivity from "./MobileActivity";
import MobileNewPayment from "./MobileNewPayment";
import MobilePaymentInvitation from "./MobilePaymentInvitation";
import MobilePaymentRoom from "./MobilePaymentRoom";
import MobileAwaitingPayment from "./MobileAwaitingPayment";
import { useDashboard } from "../../context/DashboardContext";

export default function MobileDashboard() {
  const { dark, active, setActive, transactions } = useDashboard();
  const [room, setRoom] = useState({
    id: "ORD-603607",
    orderNumber: "ORD-603607",
    counterparty: "08032001585",
    sellerName: "08032001585",
    item: "Iphone 18 Pro Max",
    amount: "₦1,000,000",
    price: "₦1,000,000",
    priceNumeric: 1000000,
    role: "Buying",
    status: "awaiting_payment",
    statusText: "Awaiting Payment",
    bank: "Guaranteed Trust Bank (GTBank)",
    accountName: "PayKudi(08032001585)",
    accountNumber: "903370574",
  });

  const isNewPayment = active === "New Payment";
  const isPaymentInvitation = active === "Payment Invitation";
  const isAwaitingPayment = active === "Awaiting Payment";
  const isActivity = active === "Activity";

  return (
    <div className={`mobile-dashboard ${isActivity ? "activity-mode" : ""} ${isAwaitingPayment ? "no-nav-mode" : ""}`} data-appearance={dark ? "dark" : "light"}>
      <header className="mobile-header">
        <BrandLogo className="mobile-brand" />
        <HeaderActions />
      </header>

      {isActivity ? (
        <MobileActivity />
      ) : active === "Payment room" || active === "Payment Room" ? (
        <MobilePaymentRoom
          onSelectRoom={(newRoom) => {
            if (newRoom) setRoom(newRoom);
            if (
              newRoom &&
              (newRoom.status === "awaiting_payment" ||
                newRoom.statusText === "Awaiting Payment")
            ) {
              if (setActive) setActive("Awaiting Payment");
            } else {
              if (setActive) setActive("Payment Invitation");
            }
          }}
        />
      ) : isAwaitingPayment ? (
        <MobileAwaitingPayment
          room={room}
          onBack={() => setActive("Payment room")}
          onPaymentConfirmed={() => {}}
        />
      ) : isNewPayment ? (
        <MobileNewPayment
          onCancel={() => setActive("Home")}
          onSuccess={(newRoom) => {
            if (newRoom) setRoom(newRoom);
            setActive("Payment Invitation");
          }}
        />
      ) : isPaymentInvitation ? (
        <MobilePaymentInvitation
          room={room}
          onCancel={() => setActive("Home")}
          onProceed={() => setActive("Home")}
          onShare={() => {}}
        />
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

      {/* Hide navbar on New Payment, Payment Invitation, and Awaiting Payment screens */}
      {!isNewPayment && !isPaymentInvitation && !isAwaitingPayment && <MobileBottomNav />}
    </div>
  );
}
