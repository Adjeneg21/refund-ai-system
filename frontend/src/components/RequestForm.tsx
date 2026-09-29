import { useEffect, useState } from "react";
import type { Customer, Order } from "../types";
import { fetchCustomerOrders, fetchCustomers } from "../api/refundApi";
import "./RequestForm.css";

interface Props {
  onSubmit: (input: { customerId: string; orderId: string; reason: string }) => void;
  submitting: boolean;
  onCustomerChange?: (customerId: string) => void;
}

export function RequestForm({ onSubmit, submitting, onCustomerChange }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    fetchCustomers().then((res) => setCustomers(res.customers));
  }, []);

  useEffect(() => {
    onCustomerChange?.(customerId);
    if (!customerId) {
      setOrders([]);
      setOrderId("");
      return;
    }
    fetchCustomerOrders(customerId).then((res) => {
      setOrders(res.orders);
      setOrderId(res.orders[0]?.id ?? "");
    });
  }, [customerId]);

  const selectedOrder = orders.find((o) => o.id === orderId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId || !orderId || !reason.trim()) return;
    onSubmit({ customerId, orderId, reason: reason.trim() });
  }

  return (
    <form className="request-form" onSubmit={handleSubmit}>
      <div className="request-form__row">
        <label className="request-form__field">
          <span className="request-form__label">Customer</span>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            required
          >
            <option value="" disabled>
              Select a customer
            </option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="request-form__field">
          <span className="request-form__label">Order</span>
          <select
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            disabled={!customerId}
            required
          >
            {orders.length === 0 && <option value="">No orders</option>}
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.product} — ${o.price.toFixed(2)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedOrder && (
        <p className="request-form__order-meta">
          Ordered {selectedOrder.orderDate}
          {selectedOrder.finalSale ? " · Final sale" : ""} · Condition on
          file: {selectedOrder.condition.replace(/_/g, " ")}
        </p>
      )}

      <label className="request-form__field request-form__field--reason">
        <span className="request-form__label">Reason for return</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe what happened with your order"
          rows={4}
          required
        />
      </label>

      <button
        type="submit"
        className="request-form__submit"
        disabled={submitting || !customerId || !orderId || !reason.trim()}
      >
        {submitting ? "Submitting request" : "Submit request"}
      </button>
    </form>
  );
}
