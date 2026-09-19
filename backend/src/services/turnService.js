"use strict";

const crypto = require("node:crypto");

const STUN = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];

// Existing coturn REST/HMAC option.
function createIceConfiguration(
  uid,
  sessionId,
  env = process.env,
  nowMs = Date.now()
) {
  const urls = String(env.TURN_URLS || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);

  const secret = env.TURN_SHARED_SECRET;

  if (!secret || !urls.length) {
    if (
      env.NODE_ENV !== "production" &&
      env.ALLOW_STUN_ONLY_DEV === "true"
    ) {
      return {
        iceServers: STUN,
        expiresAt: null,
        developmentOnly: true
      };
    }

    throw Object.assign(
      new Error("TURN is not configured."),
      { status: 503 }
    );
  }

  for (const url of urls) {
    if (
      !/^turns?:[A-Za-z0-9.-]+:\d{1,5}(?:\?transport=(?:udp|tcp))?$/.test(url)
    ) {
      throw Object.assign(
        new Error("Invalid TURN_URLS configuration."),
        { status: 503 }
      );
    }
  }

  const expiresAt =
    Math.floor(nowMs / 1000) + 7200;

  const clientId = crypto
    .createHmac("sha256", secret)
    .update(`${uid}:${sessionId}`)
    .digest("hex")
    .slice(0, 24);

  const username = `${expiresAt}:${clientId}`;

  const credential = crypto
    .createHmac("sha1", secret)
    .update(username)
    .digest("base64");

  return {
    iceServers: [
      ...STUN,
      {
        urls,
        username,
        credential,
        credentialType: "password"
      }
    ],
    expiresAt
  };
}

// Metered Open Relay option.
// Its API key remains on the backend, never in frontend/.env.
async function getIceConfiguration(
  uid,
  sessionId,
  env = process.env,
  fetchImpl = fetch
) {
  const app = String(
    env.METERED_TURN_APP || ""
  ).trim();

  const key = String(
    env.METERED_TURN_API_KEY || ""
  ).trim();

  // If Metered is not configured, use the existing coturn option.
  if (!app && !key) {
    return createIceConfiguration(
      uid,
      sessionId,
      env
    );
  }

  if (
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(app) ||
    !key
  ) {
    throw Object.assign(
      new Error("Invalid Metered TURN configuration."),
      { status: 503 }
    );
  }

  const endpoint = new URL(
    `https://${app}.metered.live/api/v1/turn/credentials`
  );

  endpoint.searchParams.set("apiKey", key);

  let response;

  try {
    response = await fetchImpl(endpoint, {
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(8000)
    });
  } catch {
    throw Object.assign(
      new Error("TURN provider did not respond."),
      { status: 503 }
    );
  }

  if (!response.ok) {
    throw Object.assign(
      new Error(
        `TURN provider returned ${response.status}.`
      ),
      { status: 503 }
    );
  }

  let servers;

  try {
    servers = await response.json();
  } catch {
    servers = null;
  }

  if (!Array.isArray(servers)) {
    throw Object.assign(
      new Error("TURN provider response was not an array."),
      { status: 503 }
    );
  }

  const cleaned = servers
    .filter(item =>
      item &&
      (
        typeof item.urls === "string" ||
        Array.isArray(item.urls)
      ) &&
      (
        Array.isArray(item.urls)
          ? item.urls
          : [item.urls]
      ).every(
        url =>
          typeof url === "string" &&
          /^(?:stun|stuns|turn|turns):/i.test(url)
      )
    )
    .map(item => ({
      urls: item.urls,

      ...(item.username
        ? { username: String(item.username) }
        : {}),

      ...(item.credential
        ? { credential: String(item.credential) }
        : {})
    }));

  const hasTurn = cleaned.some(item =>
    (
      Array.isArray(item.urls)
        ? item.urls
        : [item.urls]
    ).some(url => /^turns?:/i.test(url)) &&
    Boolean(item.username && item.credential)
  );

  if (!hasTurn) {
    throw Object.assign(
      new Error(
        "TURN provider did not return authenticated TURN servers."
      ),
      { status: 503 }
    );
  }

  return {
    iceServers: cleaned,
    expiresAt: null,
    provider: "metered"
  };
}

module.exports = {
  createIceConfiguration,
  getIceConfiguration
};