"use strict";

const { db } = require("../config/firebase");

const {
  getSessionAccess,
  serializeSessionAccess,
  getSessionLockMessage
} = require("./sessionAccessService");

const {
  notifyExpertMessage
} = require("./notificationService");

const presence = new Map();

const validId = value =>
  typeof value === "string" &&
  /^[A-Za-z0-9_-]{1,128}$/.test(value);

const b64 = value =>
  typeof value === "string" &&
  /^[A-Za-z0-9+/=]+$/.test(value);

function validEnvelope(value) {
  const validBox = part =>
    part?.v === 1 &&
    b64(part.iv) &&
    part.iv.length <= 24 &&
    b64(part.ct) &&
    part.ct.length < 850000;

  return (
    value?.v === 1 &&
    b64(value.epk) &&
    value.epk.length < 1000 &&
    b64(value.salt) &&
    value.salt.length < 60 &&
    validBox(value.sender) &&
    validBox(value.receiver) &&
    JSON.stringify(value).length <= 1500000
  );
}

function count(sessionId) {
  return presence.get(sessionId)?.size || 0;
}

function updatePresence(
  io,
  sessionId,
  socketId,
  add
) {
  if (!presence.has(sessionId)) {
    presence.set(
      sessionId,
      new Set()
    );
  }

  if (add) {
    presence.get(sessionId).add(socketId);
  } else {
    presence.get(sessionId).delete(socketId);
  }

  if (!presence.get(sessionId).size) {
    presence.delete(sessionId);
  }

  io.to(`session:${sessionId}`).emit(
    "session-presence",
    {
      sessionId,
      participantCount: count(sessionId)
    }
  );
}

async function accessFor(socket, sessionId) {
  if (!validId(sessionId)) {
    socket.emit("socket-error", {
      message: "Invalid session ID."
    });

    return null;
  }

  const access = await getSessionAccess(
    socket.user.uid,
    sessionId
  );

  if (
    !access.exists ||
    !access.isParticipant
  ) {
    socket.emit("socket-error", {
      message: "Access denied."
    });

    return null;
  }

  if (!access.active) {
    socket.emit("session-locked", {
      sessionId,
      message: getSessionLockMessage(access),
      communication: serializeSessionAccess(access)
    });

    return null;
  }

  return access;
}

function attachSocketHandlers(io) {
  io.on("connection", socket => {
    if (!socket.user?.uid) {
      socket.disconnect(true);
      return;
    }

    const uid = socket.user.uid;

    const joined = new Set();

    socket.join(`user:${uid}`);

    socket.emit("connected", {
      userId: uid,
      notificationRoom: `user:${uid}`
    });

    socket.on("join-session", async sessionId => {
      try {
        const access = await accessFor(
          socket,
          sessionId
        );

        if (!access) return;

        if (!joined.has(sessionId)) {
          joined.add(sessionId);

          socket.join(
            `session:${sessionId}`
          );

          updatePresence(
            io,
            sessionId,
            socket.id,
            true
          );
        }

        socket.emit("session-joined", {
          sessionId,
          participantCount: count(sessionId),
          communication: serializeSessionAccess(access)
        });
      } catch {
        socket.emit("socket-error", {
          message: "Could not join session."
        });
      }
    });

    socket.on("leave-session", sessionId => {
      if (!joined.has(sessionId)) {
        return;
      }

      joined.delete(sessionId);

      socket.leave(
        `session:${sessionId}`
      );

      updatePresence(
        io,
        sessionId,
        socket.id,
        false
      );
    });

    socket.on(
      "typing",
      async ({
        sessionId,
        isTyping
      } = {}) => {
        try {
          const access = await accessFor(
            socket,
            sessionId
          );

          if (
            !access ||
            !joined.has(sessionId)
          ) {
            return;
          }

          socket
            .to(`session:${sessionId}`)
            .emit("typing", {
              sessionId,
              userId: uid,
              isTyping: Boolean(isTyping)
            });
        } catch {
          // Do not log private content.
        }
      }
    );

    async function saveMessage(
      event,
      payload = {},
      acknowledge
    ) {
      const {
        sessionId,
        e2ee,
        mimeType
      } = payload || {};

      const reply =
        typeof acknowledge === "function"
          ? acknowledge
          : () => {};

      try {
        if (!validEnvelope(e2ee)) {
          reply({
            success: false,
            message:
              "Only device-encrypted messages are accepted."
          });

          return;
        }

        const access = await accessFor(
          socket,
          sessionId
        );

        if (
          !access ||
          !joined.has(sessionId) ||
          !access.peerUid
        ) {
          reply({
            success: false,
            message:
              "Session unavailable. Reconnect first."
          });

          return;
        }

        const type =
          event === "voice-message"
            ? "voice"
            : "text";

        const [selfVault, peerVault] =
          await Promise.all([
            db
              .collection("privateVaults")
              .doc(uid)
              .get(),

            db
              .collection("privateVaults")
              .doc(access.peerUid)
              .get()
          ]);

        if (
          !selfVault.exists ||
          !peerVault.exists
        ) {
          reply({
            success: false,
            message:
              "Both participants need private vaults."
          });

          return;
        }

        const now = new Date();

        const record = {
          sessionId,
          senderId: uid,
          receiverId: access.peerUid,
          type,
          e2ee,
          privacyVersion: 2,
          createdAt: now,

          ...(type === "voice"
            ? {
                mimeType: String(
                  mimeType || "audio/webm"
                ).slice(0, 80)
              }
            : {})
        };

        const ref = await db
          .collection("messages")
          .add(record);

        io.to(`session:${sessionId}`).emit(
          event,
          {
            id: ref.id,
            ...record,
            createdAt: now.toISOString()
          }
        );

        // ACK only AFTER Firestore save succeeds.
        reply({
          success: true,
          id: ref.id
        });

        if (socket.user.role === "expert") {
          try {
            await notifyExpertMessage(
              access.peerUid,
              sessionId,
              ref.id,
              type
            );
          } catch {
            // Saved message must not be duplicated
            // merely because notification failed.
          }
        }
      } catch {
        reply({
          success: false,
          message:
            "Could not save encrypted message."
        });
      }
    }

    socket.on(
      "chat-message",
      (data, acknowledge) => {
        void saveMessage(
          "chat-message",
          data,
          acknowledge
        );
      }
    );

    socket.on(
      "voice-message",
      (data, acknowledge) => {
        void saveMessage(
          "voice-message",
          data,
          acknowledge
        );
      }
    );

    socket.on("disconnect", () => {
      for (const sessionId of joined) {
        updatePresence(
          io,
          sessionId,
          socket.id,
          false
        );
      }

      joined.clear();
    });
  });
}

module.exports = {
  attachSocketHandlers
};