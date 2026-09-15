import ActivityRow from "./ActivityRow";
import { useDashboard } from "../../context/DashboardContext";

export default function RecentActivity() {
  const { transactions } = useDashboard();

  return (
    <section className="activity-card boxless-activity-card" aria-label="Recent activity">
      <div className="activity-heading">
        <h2>Recent activity</h2>
        <a href="#all">View all</a>
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
  );
}
