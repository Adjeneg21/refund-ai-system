import type { Request, Response } from "express";
import { listCustomers, listOrdersForCustomer, findCustomerById, findOrderById } from "../services/orderService.js";
import { listRequestsForCustomer } from "../services/auditService.js";
import { effectiveStatus } from "../models/RefundRequest.js";

export function handleListCustomers(_req: Request, res: Response): void {
  res.status(200).json({ customers: listCustomers() });
}

export function handleListCustomerOrders(req: Request, res: Response): void {
  const { id } = req.params;
  const customer = findCustomerById(id);
  if (!customer) {
    res.status(404).json({ error: `No customer found with id ${id}` });
    return;
  }
  res.status(200).json({ orders: listOrdersForCustomer(id) });
}

/**
 * A customer's own request history, so they can come back later and see a
 * status an admin updated after the fact — not just the response they got
 * at the moment they submitted. Deliberately excludes internal-only fields
 * (the admin note, the policy citation trail, whether it was flagged) since
 * this is customer-facing: they see the same friendly message they got at
 * submit time, plus whatever the current status is now.
 */
export function handleListCustomerRequests(req: Request, res: Response): void {
  const { id } = req.params;
  const customer = findCustomerById(id);
  if (!customer) {
    res.status(404).json({ error: `No customer found with id ${id}` });
    return;
  }

  const requests = listRequestsForCustomer(id).map((r) => {
    const order = findOrderById(r.orderId);
    const product = order?.product ?? "your order";

    // Once an admin has resolved a request, the message written at submit
    // time may describe the OLD outcome, so it is replaced with a fixed
    // template about the human decision. It contains no customer-written
    // text, so nothing a customer typed can appear in it.
    const customerMessage = r.resolvedDecision
      ? `After review by our support team, your refund request for ${product} was ${
          r.resolvedDecision === "approved" ? "approved" : "declined"
        }.`
      : r.customerMessage;

    return {
      id: r.id,
      status: effectiveStatus(r.decision, r.resolvedDecision),
      customerMessage,
      createdAt: r.createdAt,
      resolvedAt: r.resolvedAt,
      order: order
        ? { id: order.id, product: order.product, price: order.price }
        : null,
    };
  });

  res.status(200).json({ requests });
}
