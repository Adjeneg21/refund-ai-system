import type { EffectiveStatus } from "../types";
import "./DecisionTag.css";

const LABELS: Record<EffectiveStatus, string> = {
  approved: "Approved",
  pending: "Pending",
  rejected: "Rejected",
};

export function DecisionTag({ status }: { status: EffectiveStatus }) {
  return (
    <span className={`decision-tag decision-tag--${status}`}>
      <span className="decision-tag__swatch" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
