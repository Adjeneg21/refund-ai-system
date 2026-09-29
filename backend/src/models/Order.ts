import type { Order as PolicyOrder, OrderCondition } from "../policy/policyRules.js";

export interface OrderRow {
  id: string;
  customer_id: string;
  product: string;
  price: number;
  order_date: string;
  final_sale: number;
  condition: string;
  status: string;
}

export function rowToOrder(row: OrderRow): PolicyOrder {
  return {
    id: row.id,
    customerId: row.customer_id,
    product: row.product,
    price: row.price,
    orderDate: row.order_date,
    finalSale: Boolean(row.final_sale),
    condition: row.condition as OrderCondition,
    status: row.status,
  };
}
