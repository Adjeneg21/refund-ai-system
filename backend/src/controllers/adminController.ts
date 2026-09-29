import type { Request, Response } from "express";
import {
  listRecentRequests,
  resolveRequest,
  getRequestById,
  deleteAllRequests,
} from "../services/auditService.js";
import { findCustomerById, findOrderById } from "../services/orderService.js";
import { effectiveStatus } from "../models/RefundRequest.js";

export function handleListRequests(req: Request, res: Response): void {
  const limit = Number(req.query.limit ?? 50);
  const requests = listRecentRequests(limit);

  const enriched = requests.map((r) => {
    const order = findOrderById(r.orderId);
    const customer = findCustomerById(r.customerId);
    return {
      id: r.id,
      decision: r.decision,
      status: effectiveStatus(r.decision, r.resolvedDecision),
      reasons: r.policyReasons,
      aiSummary: r.aiSummary,
      flaggedInjection: r.flaggedInjection,
      claimedReason: r.claimedReason,
      createdAt: r.createdAt,
      resolvedDecision: r.resolvedDecision,
      resolvedAt: r.resolvedAt,
      resolvedBy: r.resolvedBy,
      customer: customer ? { id: customer.id, name: customer.name } : null,
      order: order
        ? { id: order.id, product: order.product, price: order.price }
        : null,
    };
  });

  res.status(200).json({ requests: enriched });
}

/**
 * An admin can resolve ANY request, at any time, more than once — this is
 * a deliberate design choice: the admin is the final human authority and
 * can override a system decision or correct an earlier override. There is
 * no restriction to "escalated only" and no "already resolved" lock.
 */
export function handleResolveRequest(req: Request, res: Response): void {
  const { id } = req.params;
  const { action } = req.body as { action?: string };

  // "reject" is accepted as an alias for "deny": the UI says Approve/Reject,
  // while the stored value stays "denied". Accepting both keeps the API
  // tolerant of either spelling.
  const normalized = action === "reject" ? "deny" : action;
  if (normalized !== "approve" && normalized !== "deny") {
    res
      .status(400)
      .json({ error: "action must be 'approve' or 'reject' (or 'deny')." });
    return;
  }

  const existing = getRequestById(id);
  if (!existing) {
    res.status(404).json({ error: `No refund request found with id ${id}` });
    return;
  }

  // "resolvedBy" is self-reported (whoever holds the admin token) — this is
  // a known limitation without real per-user authentication, called out in
  // the README rather than hidden.
  const resolvedBy = req.header("x-admin-name") || "support-agent";
  const resolution = normalized === "approve" ? "approved" : "denied";

  const updated = resolveRequest(id, resolution, resolvedBy)!;

  res.status(200).json({
    id: updated.id,
    decision: updated.decision,
    status: effectiveStatus(updated.decision, updated.resolvedDecision),
    resolvedDecision: updated.resolvedDecision,
    resolvedAt: updated.resolvedAt,
    resolvedBy: updated.resolvedBy,
  });
}

/** Permanently clears all saved requests. Admin-token protected via the router. */
export function handleClearRequests(_req: Request, res: Response): void {
  const deleted = deleteAllRequests();
  res.status(200).json({ deleted });
}
