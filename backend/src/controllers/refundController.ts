import type { Request, Response } from "express";
import { refundRequestSchema } from "../security/validators.js";
import { screenForInjection, sanitizeReason } from "../security/promptInjectionGuard.js";
import { findOrderById, orderBelongsToCustomer } from "../services/orderService.js";
import { runPolicyEngine } from "../services/policyEngine.js";
import { logDecision } from "../services/auditService.js";
import { assessClaim, draftCustomerReply, flaggedAssessment } from "../services/aiService.js";
import { withKeyLock } from "../services/keyedLock.js";

export async function handleRefundRequest(req: Request, res: Response): Promise<void> {
  const parsed = refundRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const { customerId, orderId } = parsed.data;
  const reason = sanitizeReason(parsed.data.reason);

  const order = findOrderById(orderId);
  if (!order) {
    res.status(404).json({ error: `No order found with id ${orderId}` });
    return;
  }

  if (!orderBelongsToCustomer(orderId, customerId)) {
    res.status(403).json({
      error: "Order does not belong to the specified customer.",
    });
    return;
  }

  // Screen BEFORE anything touches the LLM. This runs independently of
  // the policy engine — a flagged request is escalated regardless of what
  // the policy rules alone would have concluded (Policy §5).
  const injectionScreen = screenForInjection(reason);

  // Everything from "read the history the rules depend on" to "save the
  // decision" runs under a per-customer lock. The AI calls in the middle are
  // async, so without this two simultaneous requests could each pass the
  // one-refund-per-order / refund-frequency checks before either is saved.
  const record = await withKeyLock(customerId, async () => {
    const policyResult = injectionScreen.flagged
      ? {
          decision: "escalated" as const,
          reasons: [
            `Request flagged by security screening (pattern: ${injectionScreen.matchedPatterns.join(", ")}) — escalated for human review regardless of policy outcome (Policy §5).`,
          ],
        }
      : runPolicyEngine(order, reason, customerId);

    // Two separate, isolated AI calls:
    //  - assessClaim sees the customer's text (needed to classify it) but its
    //    output is internal-only. It is SKIPPED for requests the guard
    //    already flagged, so a known injection payload never reaches the LLM.
    //  - draftCustomerReply never receives the customer's text at all, so an
    //    injection payload has no channel into the customer-facing message.
    const [assessment, customerMessage] = await Promise.all([
      injectionScreen.flagged
        ? Promise.resolve(flaggedAssessment(injectionScreen.matchedPatterns))
        : assessClaim(order, reason, policyResult),
      draftCustomerReply(order, policyResult),
    ]);

    // If the AI independently flags manipulation, treat that as its own
    // signal — same as the regex guard, this forces escalation even if the
    // regex screen missed a more subtle attempt. Defense-in-depth, not a
    // replacement for the deterministic guard.
    const finalDecision =
      assessment.manipulationSuspected && policyResult.decision !== "escalated"
        ? {
            decision: "escalated" as const,
            reasons: [
              ...policyResult.reasons,
              "AI assessment flagged possible manipulation in the customer's message — escalated for human review (Policy §5).",
            ],
          }
        : policyResult;

    const saved = logDecision({
      orderId,
      customerId,
      claimedReason: reason,
      decision: finalDecision.decision,
      policyReasons: finalDecision.reasons,
      aiSummary: assessment.adminNote,
      customerMessage,
      flaggedInjection: injectionScreen.flagged || assessment.manipulationSuspected,
    });

    return { saved, customerMessage };
  });

  res.status(200).json({
    id: record.saved.id,
    decision: record.saved.decision,
    reasons: record.saved.policyReasons,
    customerMessage: record.customerMessage,
    order: {
      id: order.id,
      product: order.product,
      price: order.price,
    },
    createdAt: record.saved.createdAt,
  });
}
