const ROLES = {
  USER: "user",
  EXPERT: "expert",
  PARENT: "parent",
  ADMIN: "admin",
};

const SESSION_STATUS = {
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const REQUEST_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const COMMUNICATION_TYPES = {
  TEXT: "text",
  AUDIO: "audio",
  VIDEO: "video",
};

module.exports = {
  ROLES,
  SESSION_STATUS,
  REQUEST_STATUS,
  COMMUNICATION_TYPES,
};