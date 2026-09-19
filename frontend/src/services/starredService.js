import api from "./api";
import { auth } from "./firebase";

import {
  encryptJournal,
  decryptJournal,
  isVaultUnlocked
} from "./privateVault";

let cache = null;
let cacheUid = null;
let cacheTime = 0;

const clearCache = () => {
  cache = null;
  cacheTime = 0;
};

const validId = value =>
  typeof value === "string" &&
  /^[A-Za-z0-9_-]{1,128}$/.test(value);

export function starKey(item) {
  return (
    `${item.kind}:` +
    `${item.containerId}:` +
    `${item.messageId}`
  );
}

export async function listStars() {
  if (!isVaultUnlocked()) {
    throw new Error(
      "Unlock your private vault first."
    );
  }

  const uid = auth.currentUser.uid;

  if (
    cache &&
    cacheUid === uid &&
    Date.now() - cacheTime < 5000
  ) {
    return cache;
  }

  cacheUid = uid;
  cacheTime = Date.now();

  cache = (async () => {
    const { data } = await api.get(
      "/private-vault/stars"
    );

    return Promise.all(
      (data.stars || []).map(async star => {
        try {
          const reference = await decryptJournal(
            star.id,
            star.e2ee
          );

          if (
            !["ai", "expert"].includes(
              reference.kind
            ) ||
            !validId(reference.containerId) ||
            !validId(reference.messageId)
          ) {
            throw new Error(
              "Invalid star reference."
            );
          }

          return {
            id: star.id,
            ...reference
          };
        } catch {
          return {
            id: star.id,
            damaged: true
          };
        }
      })
    );
  })().catch(error => {
    clearCache();
    throw error;
  });

  return cache;
}

export async function addStar(reference) {
  if (!isVaultUnlocked()) {
    throw new Error(
      "Unlock your private vault first."
    );
  }

  if (
    !["ai", "expert"].includes(
      reference.kind
    ) ||
    !validId(reference.containerId) ||
    !validId(reference.messageId)
  ) {
    throw new Error(
      "Invalid message reference."
    );
  }

  const id = crypto.randomUUID();

  // Store ONLY the original message reference.
  // Do not duplicate its plaintext content.
  const e2ee = await encryptJournal(id, {
    kind: reference.kind,
    containerId: reference.containerId,
    messageId: reference.messageId
  });

  await api.post("/private-vault/stars", {
    id,
    e2ee
  });

  clearCache();

  return {
    id,
    ...reference
  };
}

export async function removeStar(id) {
  if (
    !isVaultUnlocked() ||
    !validId(id)
  ) {
    throw new Error(
      "Unlock vault first."
    );
  }

  await api.delete(
    `/private-vault/stars/${encodeURIComponent(id)}`
  );

  clearCache();
}

export async function resolveStar(star) {
  if (star.damaged) {
    throw new Error(
      "Encrypted star could not be unlocked."
    );
  }

  if (star.kind === "ai") {
    const { data } = await api
      .get(
        `/ai/conversations/${encodeURIComponent(
          star.containerId
        )}`
      )
      .catch(error => {
        if (
          error.response?.status === 404
        ) {
          return {
            data: {
              messages: []
            }
          };
        }

        throw error;
      });

    const message = (
      data.messages || []
    ).find(
      item => item.id === star.messageId
    );

    if (!message) {
      return null;
    }

    if (message.legacy) {
      return {
        text: message.content,
        legacy: true
      };
    }

    const {
      decryptAiMessage
    } = await import("./privateVault");

    const decrypted = await decryptAiMessage(
      star.containerId,
      message
    );

    return {
      text: decrypted.content
    };
  }

  const { data } = await api
    .get(
      `/messages/${encodeURIComponent(
        star.containerId
      )}`
    )
    .catch(error => {
      if (
        error.response?.status === 404
      ) {
        return {
          data: {
            messages: []
          }
        };
      }

      throw error;
    });

  const message = (
    data.messages || []
  ).find(
    item => item.id === star.messageId
  );

  if (!message) {
    return null;
  }

  if (message.legacy) {
    return {
      text:
        message.type === "voice"
          ? "Voice message (open original chat)"
          : message.message,

      legacy: true
    };
  }

  const {
    decryptChat
  } = await import("./privateVault");

  const decrypted = await decryptChat(
    message
  );

  return {
    text:
      decrypted.type === "voice"
        ? "Voice message (open original chat)"
        : decrypted.message
  };
}