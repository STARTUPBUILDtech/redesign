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
import MobilePaymentReceived from "./MobilePaymentReceived";
import MobileInTransit from "./MobileInTransit";
import MobileConfirmDelivery from "./MobileConfirmDelivery";
import MobileDisputeOngoing from "./MobileDisputeOngoing";
import MobileCompleted from "./MobileCompleted";
import { useDashboard } from "../../context/DashboardContext";
import { BUYER_ROOM, SELLER_ROOM, IN_TRANSIT_ROOM } from "../../data/paymentRooms";

export default function MobileDashboard() {
  const { dark, active, setActive, transactions, paymentRooms, addPaymentRoom } = useDashboard();
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

  const role = room.role;

  const isNewPayment = active === "New Payment";
  const isPaymentInvitation = active === "Payment Invitation";
  const isAwaitingPayment = active === "Awaiting Payment";
  const isPaymentReceived = active === "Payment Received";
  const isInTransit = active === "In Transit";
  const isConfirmDelivery = active === "Confirm Delivery" || active === "Confirm delivery";
  const isDisputeOngoing = active === "Dispute Ongoing" || active === "Dispute ongoing";
  const isCompleted = active === "Completed" || active === "Payment Completed";
  const isActivity = active === "Activity";

  const isNoNav =
    isNewPayment ||
    isPaymentInvitation ||
    isAwaitingPayment ||
    isPaymentReceived ||
    isInTransit ||
    isConfirmDelivery ||
    isDisputeOngoing ||
    isCompleted;

  return (
    <div className={`mobile-dashboard ${isActivity ? "activity-mode" : ""} ${isNoNav ? "no-nav-mode" : ""}`} data-appearance={dark ? "dark" : "light"}>
      <header className="mobile-header">
        <BrandLogo className="mobile-brand" />
        <HeaderActions />
      </header>

      {isNewPayment ? (
        <MobileNewPayment
          onCancel={() => setActive("Home")}
          onSuccess={(newRoom) => {
            if (newRoom) {
              const added = addPaymentRoom ? addPaymentRoom(newRoom) : newRoom;
              setRoom(added);
            }
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
      ) : isAwaitingPayment ? (
        <MobileAwaitingPayment
          room={room}
          onBack={() => setActive("Payment room")}
          onPaymentConfirmed={() => {}}
        />
      ) : isPaymentReceived ? (
        <MobilePaymentReceived
          room={room}
          onBack={() => setActive("Payment room")}
        />
      ) : isInTransit ? (
        <MobileInTransit
          room={room}
          onBack={() => setActive("Payment room")}
          role={role}
        />
      ) : isConfirmDelivery ? (
        <MobileConfirmDelivery
          room={room}
          onBack={() => setActive("Payment room")}
          role={role}
          onNavigateToDispute={(disputeData) => {
            if (disputeData) {
              setRoom((prev) => ({
                ...prev,
                status: "dispute_ongoing",
                statusText: "Dispute Ongoing",
                disputeReason: disputeData.reason,
                disputeMessage: disputeData.description,
                disputePhotos: disputeData.images,
              }));
            }
            setActive("Dispute Ongoing");
          }}
        />
      ) : isDisputeOngoing ? (
        <MobileDisputeOngoing
          room={room}
          onBack={() => setActive("Payment room")}
          role={role}
        />
      ) : isCompleted ? (
        <MobileCompleted
          room={room}
          onBack={() => setActive("Payment room")}
          role={role}
        />
      ) : (
        <div className="mobile-content-scroll">
          {isActivity ? (
            <MobileActivity />
          ) : active === "Payment room" || active === "Payment Room" ? (
            <MobilePaymentRoom
              rooms={paymentRooms}
              onSelectRoom={(newRoom) => {
                if (newRoom) setRoom(newRoom);
                if (
                  newRoom &&
                  (newRoom.status === "awaiting_payment" ||
                    newRoom.statusText === "Awaiting Payment")
                ) {
                  if (setActive) setActive("Awaiting Payment");
                } else if (
                  newRoom &&
                  (newRoom.status === "payment_received" ||
                    newRoom.statusText === "Payment Received")
                ) {
                  if (setActive) setActive("Payment Received");
                } else if (
                  newRoom &&
                  (newRoom.status === "in_transit" ||
                    newRoom.statusText === "In Transit")
                ) {
                  if (setActive) setActive("In Transit");
                } else if (
                  newRoom &&
                  (newRoom.status === "delivered" ||
                    newRoom.statusText === "Confirm delivery" ||
                    newRoom.statusText === "Confirm Delivery")
                ) {
                  if (setActive) setActive("Confirm Delivery");
                } else if (
                  newRoom &&
                  (newRoom.status === "dispute_ongoing" ||
                    newRoom.statusText === "Dispute Ongoing" ||
                    newRoom.statusText === "Dispute ongoing")
                ) {
                  if (setActive) setActive("Dispute Ongoing");
                } else if (
                  newRoom &&
                  (newRoom.status === "completed" ||
                    newRoom.statusText === "Completed")
                ) {
                  if (setActive) setActive("Completed");
                } else {
                  if (setActive) setActive("Payment Invitation");
                }
              }}
            />
          ) : (
            <div className="mobile-home-content">
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
            </div>
          )}
        </div>
      )}

      {/* Hide navbar on payment room screens */}
      {!isNoNav && <MobileBottomNav />}
    </div>
  );
}
