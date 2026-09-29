-- Mock CRM tables (populated from seed JSON on startup)
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  signup_date TEXT NOT NULL,
  vip INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  product TEXT NOT NULL,
  price REAL NOT NULL,
  order_date TEXT NOT NULL,
  final_sale INTEGER NOT NULL DEFAULT 0,
  condition TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refund_requests (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  claimed_reason TEXT NOT NULL,
  decision TEXT NOT NULL,             -- approved | denied | escalated
  policy_reasons TEXT NOT NULL,       -- JSON array of strings
  ai_summary TEXT,                    -- internal admin note, never shown to the customer
  customer_message TEXT,              -- the message actually shown to the customer at submit time
  flagged_injection INTEGER NOT NULL DEFAULT 0,
  resolved_decision TEXT,             -- approved | denied, set only by an admin action
  resolved_at TEXT,
  resolved_by TEXT,
  created_at TEXT NOT NULL
);
