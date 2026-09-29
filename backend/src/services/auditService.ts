import { randomUUID } from "node:crypto";
import { db } from "../db/client.js";
import type { RefundDecision } from "../policy/policyRules.js";
import {
  rowToRefundRequest,
  type RefundRequestRecord,
  type RefundRequestRow,
  type ResolvedDecision,
} from "../models/RefundRequest.js";

interface LogDecisionInput {
  orderId: string;
  customerId: string;
  claimedReason: string;
  decision: RefundDecision;
  policyReasons: string[];
  aiSummary?: string | null;
  customerMessage?: string | null;
  flaggedInjection?: boolean;
}

export function logDecision(input: LogDecisionInput): RefundRequestRecord {
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO refund_requests
      (id, order_id, customer_id, claimed_reason, decision, policy_reasons, ai_summary, customer_message, flagged_injection, created_at)
     VALUES (@id, @orderId, @customerId, @claimedReason, @decision, @policyReasons, @aiSummary, @customerMessage, @flaggedInjection, @createdAt)`
  ).run({
    id,
    orderId: input.orderId,
    customerId: input.customerId,
    claimedReason: input.claimedReason,
    decision: input.decision,
    policyReasons: JSON.stringify(input.policyReasons),
    aiSummary: input.aiSummary ?? null,
    customerMessage: input.customerMessage ?? null,
    flaggedInjection: input.flaggedInjection ? 1 : 0,
    createdAt,
  });

  return getRequestById(id)!;
}

export function getRequestById(id: string): RefundRequestRecord | null {
  const row = db
    .prepare("SELECT * FROM refund_requests WHERE id = ?")
    .get(id) as RefundRequestRow | undefined;
  return row ? rowToRefundRequest(row) : null;
}

export function listRecentRequests(limit = 50): RefundRequestRecord[] {
  const rows = db
    .prepare("SELECT * FROM refund_requests ORDER BY created_at DESC LIMIT ?")
    .all(limit) as unknown as RefundRequestRow[];
  return rows.map(rowToRefundRequest);
}

/**
 * Records a human decision on a request. This never overwrites the
 * original policy `decision` column — the policy engine's verdict stays
 * intact in the audit trail forever; `resolved_decision` is a separate,
 * clearly-labelled field so "what the system decided" and "what a human
 * ultimately did" are never conflated.
 *
 * Admins can call this on ANY request, not only escalated ones, and can
 * call it more than once — each call overwrites the previous resolution
 * (resolved_at/resolved_by update too), by deliberate design: an admin is
 * the final human authority and can correct an earlier override or a
 * system decision they disagree with. The full history of who changed
 * what isn't kept beyond the single latest resolution — see the README's
 * Assumptions & Trade-offs section.
 */
export function resolveRequest(
  id: string,
  resolution: ResolvedDecision,
  resolvedBy: string
): RefundRequestRecord | null {
  const existing = getRequestById(id);
  if (!existing) return null;

  db.prepare(
    `UPDATE refund_requests
     SET resolved_decision = @resolution, resolved_at = @resolvedAt, resolved_by = @resolvedBy
     WHERE id = @id`
  ).run({
    id,
    resolution,
    resolvedAt: new Date().toISOString(),
    resolvedBy,
  });

  return getRequestById(id);
}

/**
 * A customer's own request history, newest first. Used by the customer
 * page's "My requests" view so a customer can come back later and see a
 * status that an admin updated after the fact.
 */
export function listRequestsForCustomer(customerId: string): RefundRequestRecord[] {
  const rows = db
    .prepare(
      "SELECT * FROM refund_requests WHERE customer_id = ? ORDER BY created_at DESC"
    )
    .all(customerId) as unknown as RefundRequestRow[];
  return rows.map(rowToRefundRequest);
}

/**
 * True if this order already has an approved refund on record — either the
 * policy engine's own decision, or a decision an admin later approved.
 * Backs the one-refund-per-order rule (Policy §6).
 */
export function hasApprovedRefund(orderId: string): boolean {
  const row = db
    .prepare(
      `SELECT 1 FROM refund_requests
       WHERE order_id = ?
         AND (resolved_decision = 'approved' OR (resolved_decision IS NULL AND decision = 'approved'))
       LIMIT 1`
    )
    .get(orderId);
  return row !== undefined;
}

/**
 * Counts a customer's approved refunds (policy-approved or admin-approved)
 * within the given number of days. Backs the refund-frequency abuse check
 * (Policy §7).
 */
export function countApprovedRefundsForCustomer(
  customerId: string,
  withinDays: number,
  now: Date = new Date()
): number {
  const cutoff = new Date(now.getTime() - withinDays * 24 * 60 * 60 * 1000).toISOString();
  const row = db
    .prepare(
      `SELECT COUNT(*) as count FROM refund_requests
       WHERE customer_id = ?
         AND (resolved_decision = 'approved' OR (resolved_decision IS NULL AND decision = 'approved'))
         AND created_at >= ?`
    )
    .get(customerId, cutoff) as { count: number };
  return row.count;
}

/**
 * Permanently deletes every saved refund request (the audit trail), and
 * nothing else: customers and orders are untouched. Because the
 * one-refund-per-order and refund-frequency rules are derived from these
 * rows, clearing them also resets those rules, which gives a clean slate.
 */
export function deleteAllRequests(): number {
  const result = db.prepare("DELETE FROM refund_requests").run();
  return Number(result.changes);
}
