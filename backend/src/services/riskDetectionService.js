const CRISIS_PATTERNS = [
  /\bkill myself\b/i,
  /\bwant to kill myself\b/i,
  /\bi will kill myself\b/i,
  /\bgoing to kill myself\b/i,
  /\bwant to die\b/i,
  /\bi want to die\b/i,
  /\bend my life\b/i,
  /\bend it all\b/i,
  /\bsuicide\b/i,
  /\bcommit suicide\b/i,
  /\btake my own life\b/i,
  /\bno reason to live\b/i,
  /\bdon't want to live\b/i,
  /\bdo not want to live\b/i,
  /\bhurt myself\b/i,
  /\bharm myself\b/i,
  /\bself[- ]?harm\b/i,
  /\boverdose\b/i,
];

const HIGH_RISK_PATTERNS = [
  /\bunsafe right now\b/i,
  /\bin immediate danger\b/i,
  /\bgoing to hurt me\b/i,
  /\bgoing to hurt myself\b/i,
  /\bplanning to hurt myself\b/i,
  /\bsomeone is hurting me\b/i,
  /\bbeing abused\b/i,
  /\babusing me\b/i,
  /\bthreatening me\b/i,
  /\bscared to go home\b/i,
  /\bafraid to go home\b/i,
];

const MODERATE_RISK_PATTERNS = [
  /\bhopeless\b/i,
  /\bworthless\b/i,
  /\bcan't cope\b/i,
  /\bcannot cope\b/i,
  /\bcan't handle this\b/i,
  /\bcannot handle this\b/i,
  /\bpanic\b/i,
  /\bterrified\b/i,
  /\bvery depressed\b/i,
  /\bdepressed for weeks\b/i,
  /\bfeeling terrible for weeks\b/i,
];

const detectRisk = (message = "") => {
  const text = String(message).trim();

  if (!text) {
    return {
      riskLevel: "none",
      reason: "",
    };
  }

  if (
    CRISIS_PATTERNS.some((pattern) =>
      pattern.test(text)
    )
  ) {
    return {
      riskLevel: "crisis",
      reason:
        "Possible immediate self-harm or suicide language detected.",
    };
  }

  if (
    HIGH_RISK_PATTERNS.some((pattern) =>
      pattern.test(text)
    )
  ) {
    return {
      riskLevel: "high",
      reason:
        "Possible immediate safety concern detected.",
    };
  }

  if (
    MODERATE_RISK_PATTERNS.some((pattern) =>
      pattern.test(text)
    )
  ) {
    return {
      riskLevel: "moderate",
      reason:
        "Significant emotional distress detected.",
    };
  }

  return {
    riskLevel: "low",
    reason: "",
  };
};

module.exports = {
  detectRisk,
};