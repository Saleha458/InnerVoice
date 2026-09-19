import api from "./api";

import {
  encryptJournal,
  decryptJournal
} from "./privateVault";

export async function getJournalEntries() {
  const { data } = await api.get("/journal");

  const entries = await Promise.all(
    (data.entries || []).map(async item => {
      if (item.legacy) {
        return item;
      }

      try {
        const decrypted = await decryptJournal(
          item.id,
          item.e2ee
        );

        return {
          ...item,
          title: decrypted.title,
          mood: decrypted.mood,
          content: decrypted.content
        };
      } catch {
        return {
          ...item,
          title: "Unable to unlock",
          mood: "",
          content:
            "This entry could not be decrypted with your current vault key.",
          decryptionFailed: true
        };
      }
    })
  );

  return {
    ...data,
    entries
  };
}

export async function createJournalEntry({
  title = "",
  mood = "",
  content = ""
}) {
  if (
    String(content).trim().length < 3 ||
    String(content).length > 30000
  ) {
    throw new Error(
      "Journal reflection must contain 3–30,000 characters."
    );
  }

  const id = crypto.randomUUID();

  const e2ee = await encryptJournal(id, {
    title: String(title).slice(0, 200),
    mood: String(mood).slice(0, 100),
    content: String(content)
  });

  const { data } = await api.post(
    "/journal",
    {
      id,
      e2ee
    }
  );

  return data;
}

export async function migrateLegacyJournalEntries(entries) {
  const legacy = entries.filter(
    entry => entry.legacy
  );

  let migrated = 0;

  for (const item of legacy) {
    const e2ee = await encryptJournal(
      item.id,
      {
        title: item.title,
        mood: item.mood,
        content: item.content
      }
    );

    // Verify locally before removing
    // the old encryption format.

    const verified = await decryptJournal(
      item.id,
      e2ee
    );

    if (
      verified.content !== item.content ||
      verified.title !== item.title ||
      verified.mood !== item.mood
    ) {
      throw new Error(
        `Local verification failed for entry ${item.id}`
      );
    }

    await api.post(
      `/journal/${encodeURIComponent(item.id)}/migrate`,
      { e2ee }
    );

    migrated++;
  }

  return migrated;
}

export async function deleteJournalEntry(id) {
  const { data } = await api.delete(
    `/journal/${encodeURIComponent(id)}`
  );

  return data;
}