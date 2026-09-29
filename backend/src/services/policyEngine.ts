import { evaluatePolicy, POLICY, type PolicyResult, type Order } from "../policy/policyRules.js";
import { hasApprovedRefund, countApprovedRefundsForCustomer } from "./auditService.js";

/**
 * Orchestration wrapper around the pure policy rules in policy/policyRules.ts.
 * This is where the two DB-derived facts (one-refund-per-order, recent
 * refund frequency) get resolved, so policyRules.ts itself stays a pure,
 * easily-unit-tested function with no database dependency of its own.
 */
export function runPolicyEngine(
  order: Order,
  claimedReason: string,
  customerId: string
): PolicyResult {
  const context = {
    alreadyRefundedThisOrder: hasApprovedRefund(order.id),
    recentApprovedRefundCount: countApprovedRefundsForCustomer(
      customerId,
      POLICY.REFUND_FREQUENCY_WINDOW_DAYS
    ),
  };

  return evaluatePolicy(order, claimedReason, context);
}
