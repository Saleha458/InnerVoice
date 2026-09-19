import api from "./api";

import {
  encryptJournal,
  decryptJournal,
  isVaultUnlocked,
} from "./privateVault";

function requireVault() {
  if (!isVaultUnlocked()) {
    throw new Error(
      "Unlock your private vault before accessing mood history."
    );
  }
}

function validId(id) {
  return (
    typeof id === "string" &&
    /^[A-Za-z0-9_-]{16,128}$/.test(id)
  );
}

function cleanFields(input) {
  const mood = String(
    input?.mood ?? ""
  ).trim();

  const note = String(
    input?.note ?? ""
  ).trim();

  const intensity = Number(
    input?.intensity
  );

  if (!mood || mood.length > 100) {
    throw new Error("Choose a mood.");
  }

  if (note.length > 5000) {
    throw new Error(
      "Mood note is too long."
    );
  }

  if (
    !Number.isInteger(intensity) ||
    intensity < 1 ||
    intensity > 10
  ) {
    throw new Error(
      "Intensity must be between 1 and 10."
    );
  }

  return {
    kind: "mood",
    mood,
    note,
    intensity,
  };
}

async function encryptMood(id, input) {
  requireVault();

  if (!validId(id)) {
    throw new Error(
      "Invalid mood ID."
    );
  }

  return encryptJournal(
    `mood_${id}`,
    cleanFields(input)
  );
}

async function decryptMood(id, e2ee) {
  requireVault();

  if (!validId(id)) {
    throw new Error(
      "Invalid mood ID."
    );
  }

  const value = await decryptJournal(
    `mood_${id}`,
    e2ee
  );

  if (value?.kind !== "mood") {
    throw new Error(
      "Incorrect encrypted record type."
    );
  }

  return cleanFields(value);
}

async function readRecord(item) {
  if (item.legacy) {
    return item;
  }

  if (
    item.privacyVersion !== 2 ||
    !item.e2ee
  ) {
    return {
      id: item.id,
      createdAt: item.createdAt,
      decryptionFailed: true,
    };
  }

  try {
    const fields = await decryptMood(
      item.id,
      item.e2ee
    );

    return {
      id: item.id,
      ...fields,
      privacyVersion: 2,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  } catch {
    return {
      id: item.id,
      createdAt: item.createdAt,
      decryptionFailed: true,
      privacyVersion: 2,
    };
  }
}

export async function getMoods() {
  requireVault();

  const { data } = await api.get(
    "/moods"
  );

  if (
    !data?.success ||
    !Array.isArray(data.moods)
  ) {
    throw new Error(
      "Invalid mood history response."
    );
  }

  return {
    ...data,
    moods: await Promise.all(
      data.moods.map(readRecord)
    ),
  };
}

export const getMoodHistory = getMoods;

export async function addMood(input) {
  requireVault();

  const id = crypto.randomUUID();
  const fields = cleanFields(input);

  const e2ee = await encryptMood(
    id,
    fields
  );

  const { data } = await api.post(
    "/moods",
    {
      id,
      e2ee,
    }
  );

  if (
    !data?.success ||
    data.mood?.id !== id
  ) {
    throw new Error(
      "Server did not confirm encrypted mood save."
    );
  }

  return {
    success: true,

    mood: {
      id,
      mood: fields.mood,
      note: fields.note,
      intensity: fields.intensity,
      privacyVersion: 2,

      createdAt:
        data.mood.createdAt ||
        new Date().toISOString(),
    },
  };
}

export const saveMood = addMood;
export const createMood = addMood;

export async function updateMood(
  id,
  changes
) {
  const { moods } = await getMoods();

  const existing = moods.find(
    (item) => item.id === id
  );

  if (!existing) {
    throw new Error(
      "Mood entry not found."
    );
  }

  if (
    existing.legacy ||
    existing.decryptionFailed
  ) {
    throw new Error(
      "Migrate or recover this mood entry before editing."
    );
  }

  const fields = cleanFields({
    mood:
      changes?.mood ?? existing.mood,

    note:
      changes?.note ?? existing.note,

    intensity:
      changes?.intensity ??
      existing.intensity,
  });

  const e2ee = await encryptMood(
    id,
    fields
  );

  const { data } = await api.patch(
    `/moods/${encodeURIComponent(id)}`,
    { e2ee }
  );

  if (!data?.success) {
    throw new Error(
      "Could not save encrypted mood update."
    );
  }

  return {
    success: true,
    mood: {
      ...existing,
      ...fields,
    },
  };
}

export async function deleteMood(id) {
  requireVault();

  if (!validId(id)) {
    throw new Error(
      "Invalid mood ID."
    );
  }

  const { data } = await api.delete(
    `/moods/${encodeURIComponent(id)}`
  );

  return data;
}

export const removeMood = deleteMood;

export async function migrateLegacyMoods() {
  requireVault();

  const { moods } = await getMoods();

  if (
    moods.some(
      (item) => item.decryptionFailed
    )
  ) {
    throw new Error(
      "Cannot migrate while an encrypted entry cannot be decrypted."
    );
  }

  let migrated = 0;

  for (
    const item of moods.filter(
      (entry) => entry.legacy
    )
  ) {
    const fields = cleanFields(item);

    const e2ee = await encryptMood(
      item.id,
      fields
    );

    // Local verification before legacy data is replaced.
    const verified = await decryptMood(
      item.id,
      e2ee
    );

    if (
      JSON.stringify(verified) !==
      JSON.stringify(fields)
    ) {
      throw new Error(
        "Local mood verification failed; migration stopped."
      );
    }

    const { data } = await api.post(
      `/moods/${encodeURIComponent(item.id)}/migrate`,
      { e2ee }
    );

    if (!data?.success) {
      throw new Error(
        "Mood migration was not confirmed."
      );
    }

    migrated += 1;
  }

  return migrated;
}