/**
 * Defense-in-depth against prompt injection in the customer-supplied
 * `reason` field.
 *
 * This is intentionally a simple, auditable pattern screen — not a second
 * LLM call (asking an LLM to judge injection just moves the attack surface
 * rather than closing it). It catches the common shapes of an injection
 * attempt: instructions trying to override the system prompt, requests to
 * reveal hidden instructions, or role-play framing meant to get the model
 * to act outside its bounded task.
 *
 * IMPORTANT: this guard is advisory input to the *policy* layer, not a
 * replacement for it. Per refund_policy.md §5, a flagged request is
 * escalated for human review — the guard never approves or denies on its
 * own, and it runs independently of (and before) the AI call, so a
 * flagged request's raw text is never sent to the LLM as free text.
 */

export interface InjectionScreenResult {
  flagged: boolean;
  matchedPatterns: string[];
}

const INJECTION_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "override-instructions", pattern: /ignore (all|the)?\s*(previous|above|prior)\s*instructions/i },
  { label: "override-instructions", pattern: /disregard (all|the)?\s*(previous|above|prior)?\s*(instructions|policy|rules)/i },
  { label: "reveal-system-prompt", pattern: /(reveal|show|print|output)\s+(your|the)\s+(system prompt|instructions|prompt)/i },
  { label: "role-override", pattern: /you are now/i },
  { label: "role-override", pattern: /act as (an?|the)?\s*(admin|developer|system|root)/i },
  { label: "forced-decision", pattern: /(approve|refund)\s+(this|my)?\s*(request|order)?\s*(automatically|no matter what|regardless)/i },
  { label: "forced-decision", pattern: /set (the )?decision (to )?approved/i },
  { label: "jailbreak-framing", pattern: /\bjailbreak\b/i },
  { label: "jailbreak-framing", pattern: /pretend (you|that)/i },
  { label: "fake-role-tag", pattern: /^\s*(system|assistant)\s*:/im },
  { label: "delimiter-injection", pattern: /```|###\s*(system|instruction)/i },
];

export function screenForInjection(text: string): InjectionScreenResult {
  const matched = INJECTION_PATTERNS.filter((p) => p.pattern.test(text)).map(
    (p) => p.label
  );

  return {
    flagged: matched.length > 0,
    matchedPatterns: [...new Set(matched)],
  };
}

/**
 * Strips characters that have no legitimate place in a refund reason but
 * are common injection/formatting vectors (control chars, excessive
 * markdown fencing). Applied to every request regardless of whether it
 * was flagged, as a baseline sanitization step.
 */
export function sanitizeReason(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "") // control chars
    .replace(/```/g, "'''") // neutralize code-fence delimiters
    .trim();
}
