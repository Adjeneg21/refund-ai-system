

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


export function sanitizeReason(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "") // control chars
    .replace(/```/g, "'''") // neutralize code-fence delimiters
    .trim();
}
