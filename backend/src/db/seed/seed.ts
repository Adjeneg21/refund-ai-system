import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface SeedCustomer {
  id: string;
  name: string;
  email: string;
  signupDate: string;
  vip: boolean;
}

interface SeedOrder {
  id: string;
  customerId: string;
  product: string;
  price: number;
  /** Either a fixed ISO date, or (preferred) how many days before seeding. */
  orderDate?: string;
  daysAgo?: number;
  finalSale: boolean;
  condition: string;
  status: string;
}

/**
 * Seed order dates are relative ("daysAgo") so the demo scenarios behave the
 * same whenever the app is first run — a fixed date like 2026-09-20 would age
 * out of the 30-day refund window and silently change every outcome.
 */
function resolveOrderDate(o: SeedOrder, now: Date = new Date()): string {
  if (o.orderDate) return o.orderDate;
  const d = new Date(now.getTime() - (o.daysAgo ?? 0) * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export function seedDatabase(): void {
  const { count } = db
    .prepare("SELECT COUNT(*) as count FROM customers")
    .get() as { count: number };

  if (count > 0) {
    console.log("Seed skipped — customers table already populated.");
    return;
  }

  const customers: SeedCustomer[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, "customers.json"), "utf-8")
  );
  const orders: SeedOrder[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, "orders.json"), "utf-8")
  );

  const insertCustomer = db.prepare(
    `INSERT INTO customers (id, name, email, signup_date, vip)
     VALUES (@id, @name, @email, @signupDate, @vip)`
  );
  const insertOrder = db.prepare(
    `INSERT INTO orders (id, customer_id, product, price, order_date, final_sale, condition, status)
     VALUES (@id, @customerId, @product, @price, @orderDate, @finalSale, @condition, @status)`
  );

  const seedAll = () => {
    db.exec("BEGIN");
    try {
      for (const c of customers) {
        insertCustomer.run({ ...c, vip: c.vip ? 1 : 0 });
      }
      for (const o of orders) {
        insertOrder.run({
          id: o.id,
          customerId: o.customerId,
          product: o.product,
          price: o.price,
          orderDate: resolveOrderDate(o),
          finalSale: o.finalSale ? 1 : 0,
          condition: o.condition,
          status: o.status,
        });
      }
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  };

  seedAll();
  console.log(
    `Seeded ${customers.length} customers and ${orders.length} orders.`
  );
}
