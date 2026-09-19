"use strict";

const normalize = (input) => String(input || "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/g, "")
  .replace(/[’‘`]/g, "'")
  .replace(/\b(?:mein|mai|mainn)\b/g, "main")
  .replace(/\b(?:mujhy|muje|mujhey)\b/g, "mujhe")
  .replace(/\b(?:nhi|nai|nahin|nae)\b/g, "nahi")
  .replace(/\b(?:khudkushi|khud kushi)\b/g, "khudkushi")
  .replace(/\b(?:jaan|jan)\b/g, "jaan")
  .replace(/\b(?:marna|marnay)\b/g, "marna")
  .replace(/(.)\1{3,}/gu, "$1$1")
  .replace(/\s+/g, " ")
  .trim();

const matches = (text, patterns) =>
  patterns.some((pattern) => pattern.test(text));

const CRISIS = [
  /\b(?:i (?:am|m) (?:going to|about to)|i (?:will|want to|plan to|intend to)) (?:kill|hurt|harm) myself\b/i,

  /\b(?:i (?:want|wish|plan|intend) to die|i(?:'m| am) going to die by suicide|i have (?:a )?suicide plan)\b/i,

  /\b(?:end my (?:own )?life|take my (?:own )?life|kill myself|hurt myself tonight|overdose(?:d|ing)? on purpose)\b/i,

  /\b(?:main|mujhe) (?:apni )?jaan (?:lena|leni|khatam karna|khatam karni) (?:hai|chahta|chahti|wala|wali)\b/i,

  /\b(?:main|mujhe) (?:khudkushi|suicide) (?:karna|karni|karne) (?:hai|chahta|chahti|wala|wali)\b/i,

  /\b(?:main|mujhe) (?:marna|mar jana) (?:chahta|chahti|hai)\b/i,

  /\b(?:khud ko|apne aap ko) (?:nuqsan|nuksan|zakhmi) (?:pohanchana|pohnchana|dena) (?:chahta|chahti|hai)\b/i,

  /\b(?:kash|kaash) main mar (?:jaun|jaoon|jau)\b/i,

  /(?:میں|مجھے) (?:خودکشی|اپنی جان لینا|جان دینی|مر جانا) (?:چاہتا|چاہتی|ہے|ہوں|کرنی|کرنا)/u,

  /(?:اپنی جان لے لوں|خود کو مار دوں|زندگی ختم کر دوں)/u
];

const HIGH = [
  /\bi (?:want|wanna|plan|intend|am going) to kill\b/i,

  /\bsomeone is (?:hurting|abusing|assaulting|threatening) me\b/i,

  /\b(?:someone is (?:hurting|abusing|assaulting|threatening) me|i am being (?:abused|assaulted|threatened)|i am in immediate danger|not safe at home|scared to go home)\b/i,

  /\b(?:someone (?:is|will) (?:kill|hurt) me|he (?:is|will) (?:kill|hurt) me|she (?:is|will) (?:kill|hurt) me)\b/i,

  /\b(?:sexual(?:ly)? (?:abused|assaulted|touched)|someone (?:forced|forces) me to (?:have sex|do sexual things)|(?:my|a) (?:parent|father|mother|dad|uncle|teacher|adult) (?:touches|touched) me)\b/i,

  /\b(?:mujhe|mere sath|mere saath) (?:zabardasti|ziyadti|ziadti|sexual abuse|rape)\b/i,

  /\b(?:mujhe|main) (?:ghar (?:mein|me|pe) )?(?:maar raha|maar rahi|maar rahe|peet raha|peet rahi|dhamki|unsafe|mehfooz nahi|khataray mein)\b/i,

  /\b(?:koi|woh|wo|usne|unhon ne) (?:mujhe|mere sath) (?:galat touch|gandi harkat|chhed|cher|zabardasti)\b/i,

  /(?:میرے ساتھ زیادتی|مجھے مار رہا|مجھے مار رہی|مجھے دھمکی|میں محفوظ نہیں|مجھے ڈر لگتا ہے گھر جانے)/u
];

const MODERATE = [
  /\b(?:hopeless|worthless|can't cope|cannot cope|panic attacks?|terrified|very depressed|depressed for weeks|can't handle this|can't take this anymore|cannot take this anymore|i wish i (?:weren't|wasn't) alive|i do not want to live|i don't want to live|no reason to live)\b/i,

  /\b(?:suicid\w*|self[- ]?harm|overdos\w*|want to disappear)\b/i,

  /\b(?:jeene ka dil nahi karta|jeena nahi chahti|jeena nahi chahta|zinda nahi rehna|zindagi se tang|sab khatam|bardasht nahi|bohat pareshan|bahut pareshan|bilkul akela|akeli|umeed nahi|himmat nahi|khud se nafrat|khud ko nuksan)\b/i,

  /(?:جینے کا دل نہیں|زندہ نہیں رہنا|خودکشی|خود کو نقصان|امید نہیں|بہت پریشان|زندگی سے تنگ)/u
];

const NEGATED_INTENT =
  /\b(?:main|i)\s+(?:abhi\s+)?(?:suicide|khudkushi|khud ko nuksan|kill myself|hurt myself)\s+(?:nahi|not|never|nahin|don't|do not)\b/i;

function detectRisk(message = "") {
  const text = normalize(message);

  if (!text) {
    return { riskLevel: "low", reason: "" };
  }

  if (NEGATED_INTENT.test(text)) {
    return {
      riskLevel: "moderate",
      reason: "Potentially sensitive self-harm discussion; check context and offer support."
    };
  }

  if (matches(text, CRISIS)) {
    return {
      riskLevel: "crisis",
      reason: "Possible immediate self-harm language; offer urgent support without making a diagnosis."
    };
  }

  if (matches(text, HIGH)) {
    return {
      riskLevel: "high",
      reason: "Possible immediate danger, abuse, or safeguarding concern."
    };
  }

  if (matches(text, MODERATE)) {
    return {
      riskLevel: "moderate",
      reason: "Possible distress or safety-related discussion."
    };
  }

  return { riskLevel: "low", reason: "" };
}

module.exports = { detectRisk, normalize };