import { describe, it, expect } from "vitest";
import { evaluatePolicy, type Order, type PolicyContext } from "../src/policy/policyRules.js";

const NOW = new Date("2026-09-24");

const CLEAN_CONTEXT: PolicyContext = {
  alreadyRefundedThisOrder: false,
  recentApprovedRefundCount: 0,
};

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "ord_test",
    customerId: "cust_test",
    product: "Test Widget",
    price: 50,
    orderDate: "2026-09-15",
    finalSale: false,
    condition: "unopened",
    status: "delivered",
    ...overrides,
  };
}

function evaluate(
  order: Order,
  reason: string,
  contextOverrides: Partial<PolicyContext> = {}
) {
  return evaluatePolicy(order, reason, { ...CLEAN_CONTEXT, ...contextOverrides }, NOW);
}

describe("evaluatePolicy", () => {
  it("escalates orders above the high-value threshold, even if otherwise eligible", () => {
    const order = makeOrder({ price: 750 });
    const result = evaluate(order, "Just changed my mind");
    expect(result.decision).toBe("escalated");
  });

  it("denies final-sale items", () => {
    const order = makeOrder({ finalSale: true });
    const result = evaluate(order, "Don't like the color");
    expect(result.decision).toBe("denied");
  });

  it("approves a defect claim within the extended defect window, even past the standard window", () => {
    const order = makeOrder({
      orderDate: "2026-08-15", // 40 days old — past 30, within 45
      condition: "damaged",
    });
    const result = evaluate(order, "It arrived damaged");
    expect(result.decision).toBe("approved");
  });

  it("escalates a defect claim once past the extended defect window", () => {
    const order = makeOrder({
      orderDate: "2026-06-01", // well past 45 days
      condition: "damaged",
    });
    const result = evaluate(order, "It arrived damaged");
    expect(result.decision).toBe("escalated");
  });

  it("escalates when the claimed reason conflicts with the recorded order condition", () => {
    const order = makeOrder({ condition: "unopened" });
    const result = evaluate(order, "It arrived broken and damaged");
    expect(result.decision).toBe("escalated");
  });

  it("denies orders past the standard return window with no defect claim", () => {
    const order = makeOrder({ orderDate: "2026-06-01" });
    const result = evaluate(order, "Changed my mind");
    expect(result.decision).toBe("denied");
  });

  it("approves a standard in-window, non-final-sale, non-conflicting request", () => {
    const order = makeOrder({ orderDate: "2026-09-20" });
    const result = evaluate(order, "Doesn't fit, would like to return it");
    expect(result.decision).toBe("approved");
  });

  it("does not treat 'wrong size' as a wrong-item defect claim (regression)", () => {
    const order = makeOrder({ finalSale: true, orderDate: "2026-09-20" });
    const result = evaluate(order, "Wrong size, want a refund");
    expect(result.decision).toBe("denied"); 
  });

  it("denies a second refund request for an order that already has an approved refund", () => {
    const order = makeOrder({ orderDate: "2026-09-20" });
    const result = evaluate(order, "Requesting again", {
      alreadyRefundedThisOrder: true,
    });
    expect(result.decision).toBe("denied");
    expect(result.reasons[0]).toMatch(/already been approved/i);
  });

  it("takes the one-refund-per-order check before the high-value check", () => {

    const order = makeOrder({ price: 900 });
    const result = evaluate(order, "Requesting again", {
      alreadyRefundedThisOrder: true,
    });
    expect(result.decision).toBe("denied");
  });

  it("escalates when the customer has hit the refund-frequency limit", () => {
    const order = makeOrder({ orderDate: "2026-09-20" });
    const result = evaluate(order, "Doesn't fit", {
      recentApprovedRefundCount: 3,
    });
    expect(result.decision).toBe("escalated");
    expect(result.reasons[0]).toMatch(/approved refunds in the last/i);
  });

  it("does not escalate for refund frequency when the customer is just under the limit", () => {
    const order = makeOrder({ orderDate: "2026-09-20" });
    const result = evaluate(order, "Doesn't fit", {
      recentApprovedRefundCount: 2,
    });
    expect(result.decision).toBe("approved");
  });
});

describe("evaluatePolicy — order status (§10)", () => {
  it("denies cancelled orders", () => {
    const result = evaluate(makeOrder({ status: "cancelled" }), "Changed my mind");
    expect(result.decision).toBe("denied");
    expect(result.reasons[0]).toMatch(/cancelled/i);
  });

  it("denies orders already marked refunded", () => {
    const result = evaluate(makeOrder({ status: "refunded" }), "Changed my mind");
    expect(result.decision).toBe("denied");
  });

  it.each(["processing", "shipped", "returned"])(
    "escalates orders with status %s",
    (status) => {
      const result = evaluate(makeOrder({ status }), "Changed my mind");
      expect(result.decision).toBe("escalated");
      expect(result.reasons[0]).toMatch(/not "delivered"/i);
    }
  );

  it("escalates unrecognised statuses instead of approving them", () => {
    const result = evaluate(makeOrder({ status: "lost_in_transit" }), "Changed my mind");
    expect(result.decision).toBe("escalated");
  });

  it("treats status case- and whitespace-insensitively", () => {
    const result = evaluate(makeOrder({ status: " Delivered " }), "Changed my mind");
    expect(result.decision).toBe("approved");
  });

  it("checks status before the high-value rule", () => {
    const result = evaluate(makeOrder({ status: "cancelled", price: 900 }), "Refund please");
    expect(result.decision).toBe("denied");
  });

  it("does not let a defect condition bypass a cancelled order", () => {
    const result = evaluate(
      makeOrder({ status: "cancelled", condition: "damaged" }),
      "Arrived damaged"
    );
    expect(result.decision).toBe("denied");
  });

  it("still checks one-refund-per-order before status", () => {
    const result = evaluate(makeOrder({ status: "processing" }), "Again", {
      alreadyRefundedThisOrder: true,
    });
    expect(result.decision).toBe("denied");
    expect(result.reasons[0]).toMatch(/already been approved/i);
  });
});
