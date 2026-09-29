import type { CustomerRequestRow } from "../types";
import { DecisionTag } from "./DecisionTag";
import "./RequestThread.css";

interface Props {
  requests: CustomerRequestRow[];
  loading: boolean;
}

export function CustomerRequestHistory({ requests, loading }: Props) {
  if (loading) {
    return (
      <div className="request-thread request-thread--empty">
        <p>Loading your requests…</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="request-thread request-thread--empty">
        <p>No refund requests on file for this customer yet.</p>
      </div>
    );
  }

  return (
    <div className="request-thread">
      {requests.map((entry) => {
        const wasUpdatedLater =
          entry.resolvedAt && entry.resolvedAt !== entry.createdAt;

        return (
          <article className="request-thread__entry" key={entry.id}>
            <header className="request-thread__meta">
              <span className="request-thread__order">
                {entry.order?.product ?? "Unknown order"}
                {entry.order ? ` · $${entry.order.price.toFixed(2)}` : ""}
              </span>
              <DecisionTag status={entry.status} />
            </header>
            {entry.customerMessage && (
              <p className="request-thread__message">{entry.customerMessage}</p>
            )}
            <p className="request-thread__timestamp">
              Submitted {new Date(entry.createdAt).toLocaleString()}
              {wasUpdatedLater &&
                ` · Updated ${new Date(entry.resolvedAt!).toLocaleString()}`}
            </p>
          </article>
        );
      })}
    </div>
  );
}
