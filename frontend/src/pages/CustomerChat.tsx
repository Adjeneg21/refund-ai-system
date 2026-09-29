import { useState } from "react";
import { RequestForm } from "../components/RequestForm";
import { CustomerRequestHistory } from "../components/CustomerRequestHistory";
import { submitRefundRequest, fetchCustomerRequests } from "../api/refundApi";
import type { CustomerRequestRow } from "../types";
import "./CustomerChat.css";

export function CustomerChat() {
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [requests, setRequests] = useState<CustomerRequestRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadHistory(customerId: string) {
    if (!customerId) {
      setRequests([]);
      return;
    }
    setLoadingHistory(true);
    fetchCustomerRequests(customerId)
      .then((res) => setRequests(res.requests))
      .catch(() => setRequests([]))
      .finally(() => setLoadingHistory(false));
  }

  function handleCustomerChange(customerId: string) {
    setSelectedCustomerId(customerId);
    loadHistory(customerId);
  }

  async function handleSubmit(input: {
    customerId: string;
    orderId: string;
    reason: string;
  }) {
    setSubmitting(true);
    setError(null);
    try {
      await submitRefundRequest(input);
      // Re-fetch rather than append locally: the request is already
      // persisted server-side by the time this resolves, so this pulls
      // the same real record the admin dashboard and any later visit to
      // this page will see — one source of truth, not two.
      loadHistory(input.customerId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="customer-page">
      <header className="customer-page__header">
        <h1>Request a refund</h1>
        <p className="customer-page__subtitle">
          Select an order and describe what happened. Requests are checked
          against our refund policy and, where needed, sent for review by
          our support team.
        </p>
      </header>

      <RequestForm
        onSubmit={handleSubmit}
        submitting={submitting}
        onCustomerChange={handleCustomerChange}
      />

      {error && <p className="customer-page__error">{error}</p>}

      {selectedCustomerId && (
        <section className="customer-page__history">
          <div className="customer-page__history-header">
            <h2>Your requests</h2>
            <button
              className="admin-page__refresh"
              onClick={() => loadHistory(selectedCustomerId)}
              disabled={loadingHistory}
            >
              {loadingHistory ? "Refreshing" : "Refresh"}
            </button>
          </div>
          <p className="customer-page__subtitle">
            Status updates here if our support team reviews an escalated
            request after you submit it — check back or refresh any time.
          </p>
          <CustomerRequestHistory requests={requests} loading={loadingHistory} />
        </section>
      )}
    </div>
  );
}
