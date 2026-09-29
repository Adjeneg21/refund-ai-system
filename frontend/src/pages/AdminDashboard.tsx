import { useEffect, useState } from "react";
import { RequestTable } from "../components/RequestTable";
import {
  fetchAdminRequests,
  resolveAdminRequest,
  clearAdminRequests,
  ApiError,
} from "../api/refundApi";
import type { AdminRequestRow } from "../types";
import "./AdminDashboard.css";

const TOKEN_STORAGE_KEY = "refund-admin-token";
const PAGE_SIZE = 7;

export function AdminDashboard() {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(TOKEN_STORAGE_KEY)
  );
  const [tokenInput, setTokenInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [rows, setRows] = useState<AdminRequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  function load(activeToken: string) {
    setLoading(true);
    setActionError(null);
    fetchAdminRequests(activeToken)
      .then((res) => setRows(res.requests))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          // Token was valid before but the server rejected it now (e.g.
          // ADMIN_TOKEN changed) — drop it and send the user back to the
          // sign-in screen rather than showing a silently empty dashboard.
          sessionStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
          setAuthError("Session expired — please sign in again.");
        } else {
          setActionError(err instanceof Error ? err.message : "Failed to load requests.");
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (token) load(token);
  }, [token]);

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    sessionStorage.setItem(TOKEN_STORAGE_KEY, tokenInput.trim());
    setToken(tokenInput.trim());
    setAuthError(null);
  }

  async function handleResolve(id: string, action: "approve" | "deny") {
    if (!token) return;
    try {
      await resolveAdminRequest(token, id, action);
      load(token);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to resolve request.");
    }
  }

  async function handleClearAll() {
    if (!token || rows.length === 0) return;
    const ok = window.confirm(
      `Permanently delete all ${rows.length} saved requests? This cannot be undone.`
    );
    if (!ok) return;
    try {
      await clearAdminRequests(token);
      setPage(1);
      load(token);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to clear requests.");
    }
  }

  if (!token) {
    return (
      <div className="admin-page admin-page--gate">
        <form className="admin-gate" onSubmit={handleSignIn}>
          <h1>Admin sign-in</h1>
          <p className="admin-page__subtitle">
            Enter the admin token to view the refund register.
          </p>
          <label className="admin-gate__field">
            <span className="request-form__label">Admin token</span>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Admin token"
              autoFocus
            />
          </label>
          {authError && <p className="customer-page__error">{authError}</p>}
          <button type="submit" className="request-form__submit">
            Sign in
          </button>
        </form>
      </div>
    );
  }

  // Paging: 7 requests per page. Counts below still cover ALL requests.
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(firstIndex, firstIndex + PAGE_SIZE);

  // Counted by effective status (system decision + any admin override), so
  // the totals always match what the table and the customer see.
  const counts = rows.reduce(
    (acc, r) => {
      acc[r.status] += 1;
      return acc;
    },
    { approved: 0, pending: 0, rejected: 0 }
  );

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>Refund register</h1>
          <p className="admin-page__subtitle">
            Every request the system has processed, with the reasoning
            behind each decision. Any request can be approved or
            rejected by an admin; pending ones are waiting for review.
          </p>
        </div>
        <div className="admin-page__header-actions">
          <button className="admin-page__refresh" onClick={() => load(token)} disabled={loading}>
            {loading ? "Refreshing" : "Refresh"}
          </button>
          <button
            className="admin-page__refresh admin-page__refresh--danger"
            onClick={handleClearAll}
            disabled={loading || rows.length === 0}
          >
            Clear all
          </button>
        </div>
      </header>

      <dl className="admin-page__summary">
        <div>
          <dt>Total</dt>
          <dd>{rows.length}</dd>
        </div>
        <div>
          <dt>Approved</dt>
          <dd>{counts.approved}</dd>
        </div>
        <div>
          <dt>Pending</dt>
          <dd>{counts.pending}</dd>
        </div>
        <div>
          <dt>Rejected</dt>
          <dd>{counts.rejected}</dd>
        </div>
      </dl>

      {actionError && <p className="customer-page__error">{actionError}</p>}

      <RequestTable rows={pageRows} onResolve={handleResolve} />

      {rows.length > PAGE_SIZE && (
        <nav className="admin-page__pager" aria-label="Pagination">
          <button
            className="admin-page__refresh"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="admin-page__pager-status">
            {firstIndex + 1} to {Math.min(firstIndex + PAGE_SIZE, rows.length)} of{" "}
            {rows.length}
          </span>
          <button
            className="admin-page__refresh"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
