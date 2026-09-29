# Refund Policy

This document defines the business rules the refund system enforces.
It is the source of truth — the machine-readable rules in
`policyRules.ts` are a direct translation of this document, and every
automated decision must be traceable back to a rule listed here.

## 1. Eligibility Window
Orders can be refunded within **30 days** of the order date. Requests
for orders older than 30 days are **denied**, regardless of condition,
unless the item is defective (see Section 3).

## 2. Final Sale Items
Items marked `finalSale: true` (e.g. clearance items) are **not
eligible for refunds**, except for confirmed damaged, defective or
incorrect items (Section 3) or where local consumer law requires
otherwise. These requests are **denied** with an
explanation referencing the final-sale terms accepted at purchase.

## 3. Damaged, Defective, or Incorrect Items
If the customer reports the item arrived **damaged**, **malfunctioning**,
or **incorrect** (wrong item received), the order may qualify for
**approval** even if:
- the item is a final sale item, or
- the 30-day window has passed (extended to 45 days for defect claims).

These cases still require the order record to confirm the reported
condition; unverified claims are escalated (see Section 5).

## 4. High-Value Refunds
Any refund request where the order price is **above $500** requires
**human review**, regardless of other factors. The system may
recommend a decision but must return **escalated** for these cases.

## 5. Suspicious or Conflicting Requests
A request is escalated for human review when:
- The claimed reason conflicts with the order record (e.g. customer
  claims "damaged" but the order record shows no damage flag).
- The request contains attempts to manipulate the system's
  instructions (prompt injection) rather than describe a genuine
  refund reason.
- Customer-provided details are inconsistent, incomplete, or cannot be
  matched to a real order in our records.

## 6. One Refund Per Order
If an order already has an approved refund on record — whether approved
automatically by policy or manually by a support agent reviewing an
escalation — any further refund request for that same order is
**denied** outright. This check
runs before the policy engine's other rules and before the AI layer —
there is no scenario in which a second refund for the same order is
approved.

## 7. Refund-Frequency Abuse
If a customer has **3 or more approved refunds within the last 30
days**, any new request from that customer is **escalated** for human
review, regardless of how clean the individual request otherwise
looks. This does not deny the request outright — a customer may have a
genuine run of bad luck — but the volume itself is grounds for a human
to take a closer look before another automatic approval. It protects
against a pattern of abuse that no single request would reveal on its
own.

## 8. Decision Outcomes
Every request resolves to exactly one of:
- **Approved** — meets policy criteria, no further review needed.
- **Denied** — clearly fails policy criteria (e.g. final sale, expired
  window, no defect, already refunded, cancelled or already-refunded
  order).
- **Escalated** — value exceeds $500, claim is unverifiable, refund
  frequency is abnormal, the order has not been delivered (Section
  10), or the request shows signs of manipulation/suspicious behavior.

## 9. AI's Role
The AI model assists with **reasoning and classification** — for
example, summarizing the customer's claim, detecting inconsistency
with order data, or drafting the explanation shown to the customer. It
does **not** have final authority to override these rules. All hard
thresholds (30/45-day windows, $500 cap, refund-frequency limit,
one-refund-per-order, order status) are enforced deterministically in code before
the AI's output is trusted. The message shown to the customer is
drafted from the final decision and policy reasons only — the
customer's own submitted text is never included in that particular
prompt, so there is nothing in it for a manipulation attempt to act on.

## 10. Order Status
Refund rules only apply to orders the order record shows as
**delivered**. A **cancelled** order (no completed purchase) or one
already marked **refunded** is **denied**. Any other status —
processing, shipped, returned, or an unrecognised value — is
**escalated** for human review, because the return window and item
condition can't be judged for an order that hasn't been delivered (or
is mid-return). This check runs after the one-refund-per-order check
and before the high-value and window checks.
