import type { RefundResponse } from "../types";
import { effectiveStatus } from "../types";
import { DecisionTag } from "./DecisionTag";
import "./RequestThread.css";

export function RequestThread({ entries }: { entries: RefundResponse[] }) {
  if (entries.length === 0) {
    return (
      <div className="request-thread request-thread--empty">
        <p>No requests submitted yet this session.</p>
      </div>
    );
  }

  return (
    <div className="request-thread">
      {entries.map((entry) => (
        <article className="request-thread__entry" key={entry.id}>
          <header className="request-thread__meta">
            <span className="request-thread__order">
              {entry.order.product} · ${entry.order.price.toFixed(2)}
            </span>
            <DecisionTag status={effectiveStatus(entry.decision)} />
          </header>
          <p className="request-thread__message">{entry.customerMessage}</p>
          <p className="request-thread__timestamp">
            {new Date(entry.createdAt).toLocaleString()}
          </p>
        </article>
      ))}
    </div>
  );
}
