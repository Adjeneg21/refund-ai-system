/**
 * Machine-readable refund policy rules.
 *
 * This file is a direct translation of `refund_policy.md`. Every constant
 * and branch here should map back to a numbered section in that document.
 * Keep them in sync — if you change a threshold here, update the doc too.
 */

export const POLICY = {
  STANDARD_WINDOW_DAYS: 30, // Section 1
  DEFECT_WINDOW_DAYS: 45, // Section 3
  HIGH_VALUE_THRESHOLD: 500, // Section 4
  REFUND_FREQUENCY_LIMIT: 3, // Section 7 — approved refunds within the window below
  REFUND_FREQUENCY_WINDOW_DAYS: 30, // Section 7
} as const;

export type OrderCondition =
  | "unopened"
  | "damaged"
  | "malfunctioning"
  | "wrong_item_received";

export interface Order {
  id: string;
  customerId: string;
  product: string;
  price: number;
  orderDate: string; // ISO date
  finalSale: boolean;
  condition: OrderCondition;
  status: string;
}

export type RefundDecision = "approved" | "denied" | "escalated";

export interface PolicyResult {
  decision: RefundDecision;
  reasons: string[]; // human-readable trail, references policy sections
}

/**
 * Facts that require a database lookup, computed by the caller (see
 * services/policyEngine.ts) and passed in here so this file stays a pure,
 * easily-unit-tested function with no DB dependency of its own.
 */
export interface PolicyContext {
  /** True if an approved refund already exists for this exact order. */
  alreadyRefundedThisOrder: boolean;
  /** Count of this customer's approved refunds in the last REFUND_FREQUENCY_WINDOW_DAYS. */
  recentApprovedRefundCount: number;
}

const DEFECT_CONDITIONS: OrderCondition[] = [
  "damaged",
  "malfunctioning",
  "wrong_item_received",
];

function daysSince(dateStr: string, now: Date = new Date()): number {
  const orderDate = new Date(dateStr);
  const diffMs = now.getTime() - orderDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Runs the order through the deterministic policy rules. This is the
 * FINAL authority on Approved/Denied/Escalated — the AI layer may inform
 * reasoning text, but cannot override this result (Section 9).
 */
export function evaluatePolicy(
  order: Order,
  claimedReason: string,
  context: PolicyContext,
  now: Date = new Date()
): PolicyResult {
  const reasons: string[] = [];
  const age = daysSince(order.orderDate, now);
  const isDefectClaim = DEFECT_CONDITIONS.includes(order.condition);

  // Section 6: One refund per order. A hard fact, checked before anything
  // else — including the AI layer, which never even runs for this case.
  if (context.alreadyRefundedThisOrder) {
    reasons.push(
      `A refund has already been approved for this order (Policy §6) — one refund per order.`
    );
    return { decision: "denied", reasons };
  }

  // Section 10: Order status. Only delivered orders go through the normal
  // return rules. Checked right after the duplicate check because it is a
  // hard fact about the order record, and it makes the later window/value
  // checks meaningless for orders that were never fulfilled.
  const status = order.status.trim().toLowerCase();
  if (status === "cancelled") {
    reasons.push(
      `Order was cancelled (Policy §10) — there is no completed purchase to refund.`
    );
    return { decision: "denied", reasons };
  }
  if (status === "refunded") {
    reasons.push(
      `Order record already shows status "refunded" (Policy §10) — nothing further to refund.`
    );
    return { decision: "denied", reasons };
  }
  if (status !== "delivered") {
    // processing / shipped / returned / anything unrecognised: we cannot
    // judge the return window or item condition, so fail safe to a human.
    reasons.push(
      `Order status is "${order.status}", not "delivered" (Policy §10) — cannot be assessed against the return rules, escalating for review.`
    );
    return { decision: "escalated", reasons };
  }

  // Section 4: High-value orders always require human review.
  if (order.price > POLICY.HIGH_VALUE_THRESHOLD) {
    reasons.push(
      `Order price $${order.price.toFixed(2)} exceeds the $${POLICY.HIGH_VALUE_THRESHOLD} high-value threshold (Policy §4) — human review required.`
    );
    return { decision: "escalated", reasons };
  }

  // Section 7: Refund-frequency abuse. A customer approaching the limit
  // gets flagged for review even if this individual request looks clean.
  if (context.recentApprovedRefundCount >= POLICY.REFUND_FREQUENCY_LIMIT) {
    reasons.push(
      `Customer has ${context.recentApprovedRefundCount} approved refunds in the last ${POLICY.REFUND_FREQUENCY_WINDOW_DAYS} days (Policy §7) — flagged for review.`
    );
    return { decision: "escalated", reasons };
  }

  // Section 3: Damaged/defective/incorrect items get an extended window
  // and can override final-sale restrictions — but only if the order
  // record actually confirms the condition.
  if (isDefectClaim) {
    if (age <= POLICY.DEFECT_WINDOW_DAYS) {
      reasons.push(
        `Order condition "${order.condition}" qualifies as a defect claim within the ${POLICY.DEFECT_WINDOW_DAYS}-day defect window (Policy §3).`
      );
      return { decision: "approved", reasons };
    }
    reasons.push(
      `Defect claim ("${order.condition}") but order is ${age} days old, beyond the ${POLICY.DEFECT_WINDOW_DAYS}-day defect window (Policy §3) — escalating for review.`
    );
    return { decision: "escalated", reasons };
  }

  // Section 5: Claimed reason doesn't match the recorded order condition.
  const claimSuggestsDefect = /damag|broken|defect|malfunction|wrong item|incorrect item|received the wrong/i.test(
    claimedReason
  );
  if (claimSuggestsDefect && !isDefectClaim) {
    reasons.push(
      `Customer's stated reason suggests a defect, but order record shows condition "${order.condition}" with no defect flag (Policy §5) — conflicting information, escalating.`
    );
    return { decision: "escalated", reasons };
  }

  // Section 2: Final sale items are never refundable outside defect cases.
  if (order.finalSale) {
    reasons.push(
      `Item was marked final sale at purchase (Policy §2) — not eligible for refund.`
    );
    return { decision: "denied", reasons };
  }

  // Section 1: Standard 30-day return window.
  if (age > POLICY.STANDARD_WINDOW_DAYS) {
    reasons.push(
      `Order is ${age} days old, beyond the standard ${POLICY.STANDARD_WINDOW_DAYS}-day return window (Policy §1).`
    );
    return { decision: "denied", reasons };
  }

  reasons.push(
    `Order is within the ${POLICY.STANDARD_WINDOW_DAYS}-day window, not final sale, and no conflicting claim detected (Policy §1) — eligible for refund.`
  );
  return { decision: "approved", reasons };
}
