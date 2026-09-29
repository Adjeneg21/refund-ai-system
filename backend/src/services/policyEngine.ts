import { evaluatePolicy, POLICY, type PolicyResult, type Order } from "../policy/policyRules.js";
import { hasApprovedRefund, countApprovedRefundsForCustomer } from "./auditService.js";

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
