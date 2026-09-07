export const ROLES = {
  USER: "user",
  EXPERT: "expert",
  PARENT: "parent",
  ADMIN: "admin",
};

export const SESSION_DURATIONS = [20, 30, 45];

export const MIN_USER_AGE = 15;
export const MIN_EXPERT_AGE = 18;
export const MIN_PARENT_AGE = 18;

export const REPORT_SEVERITIES = [
  "low",
  "medium",
  "high",
  "critical",
];

export const REPORT_CATEGORIES = [
  "general",
  "bullying",
  "abuse",
  "neglect",
  "online-safety",
  "other",
];

export const MOODS = [
  "😊 Great",
  "🙂 Good",
  "😐 Okay",
  "😔 Low",
  "😣 Overwhelmed",
];

export const AGE_GROUPS = [
  "0–3 years",
  "4–6 years",
  "7–10 years",
  "11–14 years",
  "15–18 years",
];

export const PASSWORD_RULES = {
  minLength: 8,
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[^A-Za-z0-9]/,
};

export const isStrongPassword = (password = "") => {
  return (
    password.length >= 8 &&
    PASSWORD_RULES.uppercase.test(password) &&
    PASSWORD_RULES.lowercase.test(password) &&
    PASSWORD_RULES.number.test(password) &&
    PASSWORD_RULES.special.test(password)
  );
};