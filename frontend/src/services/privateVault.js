import api from "./api";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

const te = new TextEncoder();
const td = new TextDecoder();

const VERSION = 1;
const ITERATIONS = 600000;

let unlocked = null;

onAuthStateChanged(auth, account => {
  if (!account || (unlocked && unlocked.uid !== account.uid)) {
    unlocked = null;
  }
});

const random = length =>
  crypto.getRandomValues(new Uint8Array(length));

const encode = data => {
  const bytes = new Uint8Array(data);
  let value = "";

  for (let i = 0; i < bytes.length; i += 8192) {
    value += String.fromCharCode(
      ...bytes.subarray(i, i + 8192)
    );
  }

  return btoa(value);
};

const decode = value =>
  Uint8Array.from(
    atob(value),
    character => character.charCodeAt(0)
  );

function ownUid() {
  if (!auth.currentUser) {
    throw new Error("Sign in first.");
  }

  if (!window.isSecureContext || !crypto.subtle) {
    throw new Error(
      "Open InnerVoice using HTTPS or localhost."
    );
  }

  return auth.currentUser.uid;
}

async function derive(passphrase, salt, iterations = ITERATIONS) {
  if (
    typeof passphrase !== "string" ||
    passphrase.length < 16
  ) {
    throw new Error(
      "Use a unique private vault passphrase of at least 16 characters."
    );
  }

  if (iterations !== ITERATIONS) {
    throw new Error("Unsupported vault version.");
  }

  const material = await crypto.subtle.importKey(
    "raw",
    te.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations
    },
    material,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptObject(key, data, aad) {
  const iv = random(12);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: te.encode(aad),
      tagLength: 128
    },
    key,
    te.encode(JSON.stringify(data))
  );

  return {
    v: VERSION,
    iv: encode(iv),
    ct: encode(ciphertext)
  };
}

async function decryptObject(key, payload, aad) {
  if (
    payload?.v !== VERSION ||
    typeof payload.iv !== "string" ||
    typeof payload.ct !== "string"
  ) {
    throw new Error(
      "Unsupported or damaged private ciphertext."
    );
  }

  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: decode(payload.iv),
      additionalData: te.encode(aad),
      tagLength: 128
    },
    key,
    decode(payload.ct)
  );

  return JSON.parse(td.decode(plaintext));
}

export function lockVault() {
  unlocked = null;
}

export function isVaultUnlocked() {
  return Boolean(
    unlocked &&
    auth.currentUser?.uid === unlocked.uid
  );
}

function requireVault() {
  const uid = ownUid();

  if (!unlocked || unlocked.uid !== uid) {
    throw new Error(
      "Unlock your private vault first."
    );
  }

  return unlocked;
}

export async function getVaultProfile() {
  const { data } = await api.get("/private-vault");

  return data.vault || null;
}

export async function createVault(passphrase) {
  const uid = ownUid();

  const salt = random(16);
  const master = await derive(passphrase, salt);

  const identity = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveBits"]
  );

  const publicKey = encode(
    await crypto.subtle.exportKey(
      "spki",
      identity.publicKey
    )
  );

  const pkcs8 = encode(
    await crypto.subtle.exportKey(
      "pkcs8",
      identity.privateKey
    )
  );

  const verifier = await encryptObject(
    master,
    {
      marker: `InnerVoice vault for ${uid}`
    },
    `vault-check|${uid}`
  );

  const wrappedPrivate = await encryptObject(
    master,
    { pkcs8 },
    `vault-private|${uid}`
  );

  await api.post("/private-vault", {
    version: VERSION,
    iterations: ITERATIONS,
    salt: encode(salt),
    verifier,
    wrappedPrivate,
    publicKey
  });

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    decode(pkcs8),
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    false,
    ["deriveBits"]
  );

  unlocked = {
    uid,
    master,
    privateKey,
    publicKey
  };
}

export async function unlockVault(passphrase) {
  const uid = ownUid();

  const profile = await getVaultProfile();

  if (!profile) {
    throw new Error(
      "Set up your private vault first."
    );
  }

  const master = await derive(
    passphrase,
    decode(profile.salt),
    profile.iterations
  );

  let verifier;
  let wrapped;

  try {
    verifier = await decryptObject(
      master,
      profile.verifier,
      `vault-check|${uid}`
    );

    wrapped = await decryptObject(
      master,
      profile.wrappedPrivate,
      `vault-private|${uid}`
    );
  } catch {
    throw new Error(
      "Incorrect passphrase or damaged private vault."
    );
  }

  if (
    verifier.marker !==
    `InnerVoice vault for ${uid}`
  ) {
    throw new Error(
      "Vault verification failed."
    );
  }

  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    decode(wrapped.pkcs8),
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    false,
    ["deriveBits"]
  );

  const publicKey = await crypto.subtle.importKey(
    "spki",
    decode(profile.publicKey),
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    false,
    []
  );

  const testPair = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    false,
    ["deriveBits"]
  );

  const a = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: publicKey
    },
    testPair.privateKey,
    256
  );

  const b = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: testPair.publicKey
    },
    privateKey,
    256
  );

  if (encode(a) !== encode(b)) {
    throw new Error(
      "Vault identity key mismatch."
    );
  }

  unlocked = {
    uid,
    master,
    privateKey,
    publicKey: profile.publicKey
  };
}

export async function encryptJournal(id, fields) {
  const { uid, master } = requireVault();

  if (!/^[A-Za-z0-9_-]{16,128}$/.test(id)) {
    throw new Error(
      "Invalid journal entry ID."
    );
  }

  return encryptObject(
    master,
    fields,
    `journal|${uid}|${id}`
  );
}

export async function decryptJournal(id, ciphertext) {
  const { uid, master } = requireVault();

  return decryptObject(
    master,
    ciphertext,
    `journal|${uid}|${id}`
  );
}

async function fingerprint(spki) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    decode(spki)
  );

  return [...new Uint8Array(hash)]
    .map(n => n.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function ownFingerprint() {
  return fingerprint(
    requireVault().publicKey
  );
}

export async function getChatPeer(sessionId) {
  const vault = requireVault();

  const { data } = await api.get(
    `/private-vault/peer/${encodeURIComponent(sessionId)}`
  );

  if (
    !data.peerUid ||
    !data.peerPublicKey ||
    data.ownPublicKey !== vault.publicKey
  ) {
    throw new Error(
      "Missing or inconsistent chat keys."
    );
  }

  const fp = await fingerprint(
    data.peerPublicKey
  );

  const pinName =
    `innervoice:vault-peer:${vault.uid}:${data.peerUid}`;

  const pinned = localStorage.getItem(pinName);

  if (pinned && pinned !== fp) {
    throw new Error(
      "The other participant's encryption identity changed. Do not send messages until you verify it."
    );
  }

  return {
    ...data,
    fingerprint: fp,
    verified: pinned === fp
  };
}

export function trustChatPeer(peerUid, fingerprintText) {
  const { uid } = requireVault();

  if (!/^[0-9A-F]{64}$/.test(fingerprintText)) {
    throw new Error(
      "Invalid fingerprint."
    );
  }

  localStorage.setItem(
    `innervoice:vault-peer:${uid}:${peerUid}`,
    fingerprintText
  );
}

async function chatKey(
  ephemeralPrivate,
  publicSpki,
  salt,
  info
) {
  const publicKey = await crypto.subtle.importKey(
    "spki",
    decode(publicSpki),
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    false,
    []
  );

  const shared = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: publicKey
    },
    ephemeralPrivate,
    256
  );

  const ikm = await crypto.subtle.importKey(
    "raw",
    shared,
    "HKDF",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: te.encode(info)
    },
    ikm,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptChat({
  sessionId,
  senderId,
  receiverId,
  type,
  body,
  ownPublicKey,
  peerPublicKey
}) {
  const vault = requireVault();

  if (
    !["text", "voice"].includes(type) ||
    !sessionId ||
    !senderId ||
    !receiverId
  ) {
    throw new Error(
      "Invalid chat context."
    );
  }

  const ephemeral = await crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveBits"]
  );

  const epk = encode(
    await crypto.subtle.exportKey(
      "spki",
      ephemeral.publicKey
    )
  );

  const salt = random(16);

  const info =
    `chat|v1|${sessionId}|${senderId}|${receiverId}|${type}`;

  const aad = `${info}|${epk}`;

  const senderPublic =
    senderId === vault.uid
      ? ownPublicKey
      : peerPublicKey;

  const receiverPublic =
    receiverId === vault.uid
      ? ownPublicKey
      : peerPublicKey;

  const senderKey = await chatKey(
    ephemeral.privateKey,
    senderPublic,
    salt,
    info
  );

  const receiverKey = await chatKey(
    ephemeral.privateKey,
    receiverPublic,
    salt,
    info
  );

  return {
    v: 1,
    epk,
    salt: encode(salt),

    sender: await encryptObject(
      senderKey,
      { body },
      aad
    ),

    receiver: await encryptObject(
      receiverKey,
      { body },
      aad
    )
  };
}

export async function decryptChat(item) {
  const { uid, privateKey } = requireVault();

  const {
    sessionId,
    senderId,
    receiverId,
    type,
    e2ee
  } = item;

  if (
    !e2ee ||
    e2ee.v !== 1 ||
    ![senderId, receiverId].includes(uid)
  ) {
    throw new Error(
      "Missing encrypted message or access denied."
    );
  }

  const info =
    `chat|v1|${sessionId}|${senderId}|${receiverId}|${type}`;

  const epk = await crypto.subtle.importKey(
    "spki",
    decode(e2ee.epk),
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    false,
    []
  );

  const shared = await crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: epk
    },
    privateKey,
    256
  );

  const ikm = await crypto.subtle.importKey(
    "raw",
    shared,
    "HKDF",
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: decode(e2ee.salt),
      info: te.encode(info)
    },
    ikm,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["decrypt"]
  );

  const data = await decryptObject(
    key,
    uid === senderId
      ? e2ee.sender
      : e2ee.receiver,
    `${info}|${e2ee.epk}`
  );

  return {
    ...item,
    ...(type === "voice"
      ? { audio: data.body }
      : { message: data.body })
  };
}

export async function encryptAiMessage(
  conversationId,
  id,
  role,
  content
) {
  const { uid, master } = requireVault();

  if (
    !/^[A-Za-z0-9_-]{1,128}$/.test(conversationId) ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(id) ||
    !["user", "assistant"].includes(role)
  ) {
    throw new Error(
      "Invalid AI message identity."
    );
  }

  return encryptObject(
    master,
    { content },
    `ai|${uid}|${conversationId}|${id}|${role}`
  );
}

export async function decryptAiMessage(
  conversationId,
  item
) {
  const { uid, master } = requireVault();

  return decryptObject(
    master,
    item.e2ee,
    `ai|${uid}|${conversationId}|${item.id}|${item.role}`
  );
}