import type { Request, Response } from "express";
import {
  listRecentRequests,
  resolveRequest,
  getRequestById,
  deleteAllRequests,
} from "../services/auditService.js";
import { findCustomerById, findOrderById } from "../services/orderService.js";
import { effectiveStatus } from "../models/RefundRequest.js";

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 200;

/**
 * Parses ?limit=. Absent -> default. Anything that isn't a positive whole
 * number (including repeated params, which Express turns into an array) is
 * rejected rather than silently becoming NaN in the SQL LIMIT clause.
 * Oversized values are clamped.
 */
function parseLimit(raw: unknown): number | null {
  if (raw === undefined) return DEFAULT_LIST_LIMIT;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (n < 1) return null;
  return Math.min(n, MAX_LIST_LIMIT);
}

export function handleListRequests(req: Request, res: Response): void {
  const limit = parseLimit(req.query.limit);
  if (limit === null) {
    res
      .status(400)
      .json({ error: `limit must be a whole number between 1 and ${MAX_LIST_LIMIT}.` });
    return;
  }
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

export function handleResolveRequest(req: Request, res: Response): void {
  const { id } = req.params;
  const { action } = req.body as { action?: string };

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

export function handleClearRequests(_req: Request, res: Response): void {
  const deleted = deleteAllRequests();
  res.status(200).json({ deleted });
}
