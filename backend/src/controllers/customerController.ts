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
