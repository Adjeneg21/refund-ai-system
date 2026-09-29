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
  orderDate: string;
  finalSale: boolean;
  condition: string;
  status: string;
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
        insertOrder.run({ ...o, finalSale: o.finalSale ? 1 : 0 });
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
