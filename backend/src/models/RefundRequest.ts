import type { RefundDecision } from "../policy/policyRules.js";

export type ResolvedDecision = "approved" | "denied";

export interface RefundRequestRecord {
  id: string;
  orderId: string;
  customerId: string;
  claimedReason: string;
  decision: RefundDecision; // the ORIGINAL, policy-engine decision — never overwritten
  policyReasons: string[];
  aiSummary: string | null; // internal admin note
  customerMessage: string | null; // what was actually shown to the customer
  flaggedInjection: boolean;
  resolvedDecision: ResolvedDecision | null; // set only by an admin action
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

export interface RefundRequestRow {
  id: string;
  order_id: string;
  customer_id: string;
  claimed_reason: string;
  decision: string;
  policy_reasons: string;
  ai_summary: string | null;
  customer_message: string | null;
  flagged_injection: number;
  resolved_decision: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export function rowToRefundRequest(row: RefundRequestRow): RefundRequestRecord {
  return {
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_id,
    claimedReason: row.claimed_reason,
    decision: row.decision as RefundDecision,
    policyReasons: JSON.parse(row.policy_reasons),
    aiSummary: row.ai_summary,
    customerMessage: row.customer_message,
    flaggedInjection: Boolean(row.flagged_injection),
    resolvedDecision: (row.resolved_decision as ResolvedDecision | null) ?? null,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    createdAt: row.created_at,
  };
}


export type EffectiveStatus = "approved" | "pending" | "rejected";

export function effectiveStatus(
  decision: RefundDecision,
  resolvedDecision: ResolvedDecision | null
): EffectiveStatus {
  if (resolvedDecision === "approved") return "approved";
  if (resolvedDecision === "denied") return "rejected";
  if (decision === "approved") return "approved";
  if (decision === "denied") return "rejected";
  return "pending"; // decision === "escalated", not yet resolved
}
