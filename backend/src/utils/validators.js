const isRequired = (value) => {
  return (
    value !== undefined &&
    value !== null &&
    String(value).trim() !== ""
  );
};

const isValidAnonymousId = (anonymousId) => {
  return /^[A-Za-z0-9_]{3,30}$/.test(
    String(anonymousId || "").trim()
  );
};

const isValidPassword = (password) => {
  const value = String(password || "");

  return (
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
};

const getPasswordStrength = (password) => {
  const value = String(password || "");

  let score = 0;

  if (value.length >= 8) score++;
  if (/[a-z]/.test(value)) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  if (score <= 2) {
    return "weak";
  }

  if (score <= 4) {
    return "medium";
  }

  return "strong";
};

/*
=========================================================
AGE VALIDATION
=========================================================

USER:
  Minimum age = 15

PARENT:
  No minimum age restriction

EXPERT:
  No minimum age restriction

All roles still require a valid positive age.
=========================================================
*/

const isValidAgeForRole = (age, role) => {
  const numericAge = Number(age);

  if (
    !Number.isInteger(numericAge) ||
    numericAge <= 0 ||
    numericAge > 120
  ) {
    return false;
  }

  if (role === "user") {
    return numericAge >= 15;
  }

  if (
    role === "parent" ||
    role === "expert"
  ) {
    return true;
  }

  return false;
};

const isValidRole = (role) => {
  return [
    "user",
    "parent",
    "expert",
  ].includes(role);
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email || "")
  );
};

const isValidPin = (pin) => {
  return /^\d{4,}$/.test(
    String(pin || "")
  );
};

const isValidDate = (value) => {
  const date = new Date(value);

  return !Number.isNaN(
    date.getTime()
  );
};

const validateRequiredFields = (
  data,
  fields
) => {
  const missingFields = fields.filter(
    (field) =>
      !isRequired(data[field])
  );

  return {
    valid:
      missingFields.length === 0,
    missingFields,
  };
};

module.exports = {
  isRequired,
  isValidAnonymousId,
  isValidPassword,
  getPasswordStrength,
  isValidAgeForRole,
  isValidRole,
  isValidEmail,
  isValidPin,
  isValidDate,
  validateRequiredFields,
};