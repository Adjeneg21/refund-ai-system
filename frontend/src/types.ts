export type RefundDecision = "approved" | "denied" | "escalated";
export type ResolvedDecision = "approved" | "denied";
export type EffectiveStatus = "approved" | "pending" | "rejected";

/**
 * Collapses the system's original decision and any later admin override
 * into the three states the UI actually shows. Mirrors the backend's
 * models/RefundRequest.ts effectiveStatus() exactly — keep them in sync.
 */
export function effectiveStatus(
  decision: RefundDecision,
  resolvedDecision?: ResolvedDecision | null
): EffectiveStatus {
  if (resolvedDecision === "approved") return "approved";
  if (resolvedDecision === "denied") return "rejected";
  if (decision === "approved") return "approved";
  if (decision === "denied") return "rejected";
  return "pending";
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  signupDate: string;
  vip: boolean;
}

export interface Order {
  id: string;
  customerId: string;
  product: string;
  price: number;
  orderDate: string;
  finalSale: boolean;
  condition: string;
  status: string;
}

export interface RefundResponse {
  id: string;
  decision: RefundDecision;
  reasons: string[];
  customerMessage: string;
  order: { id: string; product: string; price: number };
  createdAt: string;
}

export interface AdminRequestRow {
  id: string;
  decision: RefundDecision;
  status: EffectiveStatus;
  reasons: string[];
  aiSummary: string | null;
  flaggedInjection: boolean;
  claimedReason: string;
  createdAt: string;
  resolvedDecision: ResolvedDecision | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  customer: { id: string; name: string } | null;
  order: { id: string; product: string; price: number } | null;
}

export interface CustomerRequestRow {
  id: string;
  status: EffectiveStatus;
  customerMessage: string | null;
  createdAt: string;
  resolvedAt: string | null;
  order: { id: string; product: string; price: number } | null;
}
