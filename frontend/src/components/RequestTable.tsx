import { Fragment, useState } from "react";
import type { AdminRequestRow } from "../types";
import { DecisionTag } from "./DecisionTag";
import "./RequestTable.css";

interface Props {
  rows: AdminRequestRow[];
  onResolve: (id: string, action: "approve" | "deny") => Promise<void>;
}

export function RequestTable({ rows, onResolve }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="request-table__empty">
        <p>No refund requests recorded yet.</p>
      </div>
    );
  }

  async function handleResolve(
    e: React.MouseEvent,
    id: string,
    action: "approve" | "deny"
  ) {
    e.stopPropagation(); // don't also toggle the row's expanded state
    setResolvingId(id);
    try {
      await onResolve(id, action);
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <>
      <p className="request-table__scroll-hint">Scroll sideways for more columns →</p>
      <div className="request-table__scroll">
    <table className="request-table">
      <thead>
        <tr>
          <th>Order</th>
          <th>Customer</th>
          <th className="request-table__num">Amount</th>
          <th>Status</th>
          <th>Submitted</th>
          <th>Admin action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const expanded = expandedId === row.id;
          const resolving = resolvingId === row.id;

          return (
            <Fragment key={row.id}>
              <tr
                className="request-table__row"
                onClick={() => setExpandedId(expanded ? null : row.id)}
                aria-expanded={expanded}
              >
                <td>{row.order?.product ?? "—"}</td>
                <td>{row.customer?.name ?? "—"}</td>
                <td className="request-table__num">
                  {row.order ? `$${row.order.price.toFixed(2)}` : "—"}
                </td>
                <td>
                  <DecisionTag status={row.status} />
                  {row.flaggedInjection && (
                    <span className="request-table__flag">security flag</span>
                  )}
                </td>
                <td className="request-table__timestamp">
                  {new Date(row.createdAt).toLocaleString()}
                </td>
                <td className="request-table__actions-cell">
                  {/* Admin can override ANY row, at any time — not limited
                      to Pending. Approve/Reject are always available. */}
                  <div className="request-table__actions">
                    <button
                      className="request-table__action request-table__action--approve"
                      disabled={resolving}
                      onClick={(e) => handleResolve(e, row.id, "approve")}
                    >
                      Approve
                    </button>
                    <button
                      className="request-table__action request-table__action--deny"
                      disabled={resolving}
                      onClick={(e) => handleResolve(e, row.id, "deny")}
                    >
                      Reject
                    </button>
                  </div>
                  {row.resolvedDecision && (
                    <span className="request-table__resolved">
                      last set by {row.resolvedBy}
                    </span>
                  )}
                </td>
              </tr>
              {expanded && (
                <tr className="request-table__detail-row">
                  <td colSpan={6}>
                    <div className="request-table__detail">
                      <div>
                        <span className="request-table__detail-label">
                          Customer's stated reason
                        </span>
                        <p>{row.claimedReason}</p>
                      </div>
                      <div>
                        <span className="request-table__detail-label">
                          Policy reasoning
                        </span>
                        <ul>
                          {row.reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                      {row.aiSummary && (
                        <div>
                          <span className="request-table__detail-label">AI note</span>
                          <p>{row.aiSummary}</p>
                        </div>
                      )}
                      {row.resolvedDecision && (
                        <div>
                          <span className="request-table__detail-label">
                            Manual review
                          </span>
                          <p>
                            Currently set to <strong>{row.status}</strong> by{" "}
                            {row.resolvedBy} at{" "}
                            {new Date(row.resolvedAt!).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
    </div>
    </>
  );
}
