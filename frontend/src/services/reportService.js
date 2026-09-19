import api from "./api";
import { auth } from "./firebase";

import {
  getVaultProfile,
  isVaultUnlocked,
  encryptChat,
  decryptChat
} from "./privateVault";

function requireVault() {
  if (
    !auth.currentUser ||
    !isVaultUnlocked()
  ) {
    throw new Error(
      "Sign in and unlock your private vault first."
    );
  }

  return auth.currentUser.uid;
}

async function fingerprint(publicKey) {
  const raw = Uint8Array.from(
    atob(publicKey),
    char => char.charCodeAt(0)
  );

  const hash = await crypto.subtle.digest(
    "SHA-256",
    raw
  );

  return Array.from(
    new Uint8Array(hash),
    byte => byte.toString(16).padStart(2, "0")
  )
    .join("")
    .toUpperCase();
}

export async function getReportRecipient() {
  const uid = requireVault();

  const { data } = await api.get(
    "/reports/recipient"
  );

  const self = await getVaultProfile();

  if (
    !data?.success ||
    !data.adminUid ||
    !data.adminPublicKey ||
    data.adminUid === uid ||
    self?.publicKey !== data.ownPublicKey
  ) {
    throw new Error(
      "The designated report recipient is unavailable or changed."
    );
  }

  const currentFingerprint = await fingerprint(
    data.adminPublicKey
  );

  const pinKey =
    `innervoice:report-admin-key:${uid}:${data.adminUid}`;

  const previousFingerprint =
    localStorage.getItem(pinKey);

  if (
    previousFingerprint &&
    previousFingerprint !== currentFingerprint
  ) {
    throw new Error(
      "The Admin encryption key changed. Report submission is blocked until this is investigated."
    );
  }

  if (!previousFingerprint) {
    localStorage.setItem(
      pinKey,
      currentFingerprint
    );
  }

  // The first server-provided key is not
  // independently identity-verified.
  return data;
}

function validatedFields(input) {
  const category = String(
    input?.category || "general"
  );

  const severity = String(
    input?.severity || "medium"
  );

  const description = String(
    input?.description || ""
  ).trim();

  if (
    ![
      "general",
      "bullying",
      "abuse",
      "neglect",
      "online-safety",
      "other"
    ].includes(category) ||
    ![
      "low",
      "medium",
      "high",
      "critical"
    ].includes(severity) ||
    description.length < 1 ||
    description.length > 10000
  ) {
    throw new Error(
      "Enter a report description (1–10,000 characters) and valid options."
    );
  }

  return {
    category,
    severity,
    description
  };
}

async function seal(id, fields, recipient) {
  const uid = requireVault();

  const context = {
    sessionId: `report_${id}`,
    senderId: uid,
    receiverId: recipient.adminUid,
    type: "text"
  };

  const e2ee = await encryptChat({
    ...context,
    body: fields,
    ownPublicKey: recipient.ownPublicKey,
    peerPublicKey: recipient.adminPublicKey
  });

  const check = await decryptChat({
    id,
    ...context,
    e2ee
  });

  if (
    JSON.stringify(check.message) !==
    JSON.stringify(fields)
  ) {
    throw new Error(
      "Local report encryption check failed."
    );
  }

  return e2ee;
}

export async function createReport(input) {
  const fields = validatedFields(input);

  const recipient = await getReportRecipient();

  const id = crypto.randomUUID();

  const e2ee = await seal(
    id,
    fields,
    recipient
  );

  const { data } = await api.post(
    "/reports",
    {
      id,
      e2ee,

      recipientUid: recipient.adminUid,
      recipientPublicKey: recipient.adminPublicKey,
      ownPublicKey: recipient.ownPublicKey
    }
  );

  if (
    !data?.success ||
    data.id !== id
  ) {
    throw new Error(
      "Report save was not confirmed."
    );
  }

  return data;
}

async function unpack(report) {
  if (report.legacy) {
    return report;
  }

  try {
    const item = await decryptChat(report);

    return {
      ...report,
      ...validatedFields(item.message)
    };
  } catch {
    return {
      ...report,

      category: "Encrypted report",
      severity: "unavailable",

      description:
        "This report could not be decrypted on this device.",

      decryptionFailed: true
    };
  }
}

export async function getMyReports() {
  requireVault();

  const { data } = await api.get("/reports");

  return {
    ...data,

    reports: await Promise.all(
      (data.reports || []).map(unpack)
    )
  };
}

export async function getAllReports() {
  requireVault();

  const { data } = await api.get(
    "/reports/admin/all"
  );

  return {
    ...data,

    reports: await Promise.all(
      (data.reports || []).map(unpack)
    )
  };
}

export async function updateReportStatus(
  id,
  status
) {
  requireVault();

  const { data } = await api.patch(
    `/reports/admin/${encodeURIComponent(id)}/status`,
    { status }
  );

  if (!data?.success) {
    throw new Error(
      "Report status update was not confirmed."
    );
  }

  return data;
}

export async function migrateLegacyReports() {
  // Preserve existing import without silently
  // performing a destructive bulk rewrite.
  throw new Error(
    "Bulk migration is paused. Verify new reports on both accounts and back up existing records first."
  );
}