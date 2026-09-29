import type {
  AdminRequestRow,
  Customer,
  CustomerRequestRow,
  Order,
  RefundResponse,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body.error ?? `Request failed with status ${res.status}`,
      res.status
    );
  }
  return res.json();
}

export function fetchCustomers(): Promise<{ customers: Customer[] }> {
  return request("/customers");
}

export function fetchCustomerOrders(
  customerId: string
): Promise<{ orders: Order[] }> {
  return request(`/customers/${customerId}/orders`);
}

export function fetchCustomerRequests(
  customerId: string
): Promise<{ requests: CustomerRequestRow[] }> {
  return request(`/customers/${customerId}/refund-requests`);
}

export function submitRefundRequest(input: {
  customerId: string;
  orderId: string;
  reason: string;
}): Promise<RefundResponse> {
  return request("/refund-request", {
    method: "POST",
    body: JSON.stringify(input),
  });
}


export function fetchAdminRequests(
  adminToken: string
): Promise<{ requests: AdminRequestRow[] }> {
  return request("/admin/requests", {
    headers: { "x-admin-token": adminToken },
  });
}

export function resolveAdminRequest(
  adminToken: string,
  requestId: string,
  action: "approve" | "deny"
): Promise<{
  id: string;
  decision: string;
  resolvedDecision: string;
  resolvedAt: string;
  resolvedBy: string;
}> {
  return request(`/admin/requests/${requestId}/resolve`, {
    method: "POST",
    headers: { "x-admin-token": adminToken },
    body: JSON.stringify({ action }),
  });
}

export function clearAdminRequests(
  adminToken: string
): Promise<{ deleted: number }> {
  return request("/admin/requests", {
    method: "DELETE",
    headers: { "x-admin-token": adminToken },
  });
}

export { ApiError };
