"use strict";

const TEMPLATES = Object.freeze({
  expert_request: [
    "New session request",
    "You have a new session request."
  ],
  request_accepted: [
    "Session confirmed",
    "Your session request was accepted."
  ],
  request_rejected: [
    "Session request update",
    "Your session request was declined. Open the app for details."
  ],
  expert_message: [
    "New private message",
    "Open your private session to view a new message."
  ],
  session_starting: [
    "Session reminder",
    "Your support session starts soon."
  ],
  session_ending: [
    "Session reminder",
    "Your support session ends soon."
  ],
  session_completed: [
    "Session update",
    "Your support session has ended."
  ],
  ai_response_ready: [
    "AI response ready",
    "Open your private conversation to continue."
  ],
  support_resources: [
    "Support resources",
    "If you feel unsafe, contact a trusted person or appropriate local emergency services. InnerVoice does not provide live monitoring."
  ],
  safety_support: [
    "Support resources",
    "If you feel unsafe, contact a trusted person or appropriate local emergency services. InnerVoice does not provide live monitoring."
  ],
  general: [
    "InnerVoice update",
    "Open InnerVoice for an update."
  ]
});

const ID = /^[A-Za-z0-9_-]{1,128}$/;

const SAFE_DATA = [
  "sessionId",
  "requestId",
  "messageId",
  "conversationId"
];

function sanitizeNotification(input = {}) {
  const type = Object.prototype.hasOwnProperty.call(
    TEMPLATES,
    input.type
  )
    ? input.type
    : "general";

  const data = {};

  for (const name of SAFE_DATA) {
    if (
      typeof input.data?.[name] === "string" &&
      ID.test(input.data[name])
    ) {
      data[name] = input.data[name];
    }
  }

  return {
    type,
    title: TEMPLATES[type][0],
    message: TEMPLATES[type][1],
    data
  };
}

module.exports = {
  sanitizeNotification
};