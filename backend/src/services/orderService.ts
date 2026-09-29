import { db } from "../db/client.js";
import { rowToOrder, type OrderRow } from "../models/Order.js";
import { rowToCustomer, type CustomerRow } from "../models/Customer.js";
import type { Order } from "../policy/policyRules.js";
import type { Customer } from "../models/Customer.js";

export function findOrderById(orderId: string): Order | null {
  const row = db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(orderId) as OrderRow | undefined;
  return row ? rowToOrder(row) : null;
}

export function findCustomerById(customerId: string): Customer | null {
  const row = db
    .prepare("SELECT * FROM customers WHERE id = ?")
    .get(customerId) as CustomerRow | undefined;
  return row ? rowToCustomer(row) : null;
}

export function listCustomers(): Customer[] {
  const rows = db
    .prepare("SELECT * FROM customers ORDER BY name ASC")
    .all() as unknown as CustomerRow[];
  return rows.map(rowToCustomer);
}

export function listOrdersForCustomer(customerId: string): Order[] {
  const rows = db
    .prepare("SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC")
    .all(customerId) as unknown as OrderRow[];
  return rows.map(rowToOrder);
}

export function orderBelongsToCustomer(
  orderId: string,
  customerId: string
): boolean {
  const order = findOrderById(orderId);
  return order?.customerId === customerId;
}
