
const {
  getSessionAccess,
  serializeSessionAccess,
  getSessionLockMessage
} = require("./sessionAccessService");

// Reject video at the signaling boundary, including forged direct socket calls.
const validId = id => typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id);
const audioSdp = (description, type) =>
  description?.type === type &&
  typeof description.sdp === "string" &&
  description.sdp.length > 20 &&
  description.sdp.length <= 65536 &&
  /(?:^|\r?\n)m=audio(?:\s|$)/i.test(description.sdp) &&
  !/(?:^|\r?\n)m=video(?:\s|$)/i.test(description.sdp);

const callPresence = new Map();

const addCallParticipant = (sessionId, uid, socketId) => {
  if (!callPresence.has(sessionId)) {
    callPresence.set(sessionId, new Map());
  }

  const sessionMap = callPresence.get(sessionId);

  if (!sessionMap.has(uid)) {
    sessionMap.set(uid, new Set());
  }

  sessionMap.get(uid).add(socketId);
};

const removeCallParticipant = (sessionId, uid, socketId) => {
  const sessionMap = callPresence.get(sessionId);
  if (!sessionMap) return;

  const sockets = sessionMap.get(uid);

  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) sessionMap.delete(uid);
  }

  if (sessionMap.size === 0) {
    callPresence.delete(sessionId);
  }
};

const getUniqueParticipantCount = sessionId =>
  callPresence.get(sessionId)?.size || 0;

const emitPresence = (io, sessionId) => {
  io.to(`call:${sessionId}`).emit("call:presence", {
    sessionId,
    participantCount: getUniqueParticipantCount(sessionId)
  });
};

const emitCallLocked = (socket, sessionId, access) => {
  socket.emit("call:locked", {
    sessionId,
    message: getSessionLockMessage(access),
    communication: serializeSessionAccess(access)
  });
};

const requireActiveCallAccess = async (
  socket,
  uid,
  sessionId
) => {
  if (!validId(sessionId)) {
    socket.emit("call:error", { message: "Invalid session ID." });
    return null;
  }
  const access = await getSessionAccess(uid, sessionId);

  if (!access.exists) {
    socket.emit("call:error", {
      message: "Session not found."
    });
    return null;
  }

  if (!access.isParticipant) {
    socket.emit("call:error", {
      message: "You do not have access to this call."
    });
    return null;
  }

  if (!access.active) {
    emitCallLocked(socket, sessionId, access);
    return null;
  }

  return access;
};

const attachCallSocketHandlers = io => {
  io.on("connection", socket => {
    const uid = socket.user?.uid;
    if (!uid) return;

    const joinedCallSessions = new Set();

    socket.on("call:join", async sessionId => {
      try {
        const access = await requireActiveCallAccess(
          socket,
          uid,
          sessionId
        );

        if (!access) return;

        const room = `call:${sessionId}`;
        const personalRoom = `call:${sessionId}:user:${uid}`;

        socket.join(room);
        socket.join(personalRoom);

        addCallParticipant(sessionId, uid, socket.id);
        joinedCallSessions.add(sessionId);

        const participantCount =
          getUniqueParticipantCount(sessionId);

        socket.emit("call:joined", {
          sessionId,
          participantCount,
          role: access.role,
          communication: serializeSessionAccess(access)
        });

        emitPresence(io, sessionId);
      } catch (error) {
        console.error("Call join error:", error?.name || "error");
        socket.emit("call:error", {
          message: "Could not join call room."
        });
      }
    });

    socket.on("call:leave", sessionId => {
      if (!sessionId) return;

      socket.leave(`call:${sessionId}`);
      socket.leave(`call:${sessionId}:user:${uid}`);

      removeCallParticipant(sessionId, uid, socket.id);
      joinedCallSessions.delete(sessionId);
      emitPresence(io, sessionId);
    });

    socket.on(
      "webrtc:offer",
      async ({
        sessionId,
        offer,
        mode,
        renegotiate = false
      } = {}) => {
        try {
          if (mode !== "audio" || !audioSdp(offer, "offer")) {
            socket.emit("call:error", { message: "Only audio calls are supported. Video is disabled." });
            return;
          }
          if (!joinedCallSessions.has(sessionId)) return;

          const access = await requireActiveCallAccess(
            socket,
            uid,
            sessionId
          );

          if (!access || !access.peerUid) return;

          io.to(
            `call:${sessionId}:user:${access.peerUid}`
          ).emit("webrtc:offer", {
            sessionId,
            offer,
            renegotiate: renegotiate === true,
            mode: "audio",
            from: uid
          });
        } catch (error) {
          console.error(
            "WebRTC offer error:",
            error?.name || "error"
          );
        }
      }
    );

    socket.on(
      "webrtc:answer",
      async ({ sessionId, answer } = {}) => {
        try {
          if (!audioSdp(answer, "answer")) {
            socket.emit("call:error", { message: "Only audio calls are supported. Video is disabled." });
            return;
          }
          if (!joinedCallSessions.has(sessionId)) return;

          const access = await requireActiveCallAccess(
            socket,
            uid,
            sessionId
          );

          if (!access || !access.peerUid) return;

          io.to(
            `call:${sessionId}:user:${access.peerUid}`
          ).emit("webrtc:answer", {
            sessionId,
            answer,
            from: uid
          });
        } catch (error) {
          console.error(
            "WebRTC answer error:",
            error?.name || "error"
          );
        }
      }
    );

    socket.on(
      "webrtc:ice",
      async ({ sessionId, candidate } = {}) => {
        try {
          if (!sessionId || !candidate || !joinedCallSessions.has(sessionId)) return;

          const access = await requireActiveCallAccess(
            socket,
            uid,
            sessionId
          );

          if (!access || !access.peerUid) return;

          io.to(
            `call:${sessionId}:user:${access.peerUid}`
          ).emit("webrtc:ice", {
            sessionId,
            candidate,
            from: uid
          });
        } catch (error) {
          console.error(
            "WebRTC ICE error:",
            error?.name || "error"
          );
        }
      }
    );

    socket.on(
      "webrtc:decline",
      async ({ sessionId } = {}) => {
        try {
          const access = await getSessionAccess(uid, sessionId);

          if (!access.isParticipant || !access.peerUid) {
            return;
          }

          io.to(
            `call:${sessionId}:user:${access.peerUid}`
          ).emit("webrtc:declined", {
            sessionId,
            from: uid
          });
        } catch (error) {
          console.error(
            "Call decline error:",
            error?.name || "error"
          );
        }
      }
    );

    socket.on(
      "webrtc:end",
      async ({ sessionId, reason = "ended" } = {}) => {
        try {
          const access = await getSessionAccess(uid, sessionId);

          if (!access.isParticipant || !access.peerUid) {
            return;
          }

          io.to(
            `call:${sessionId}:user:${access.peerUid}`
          ).emit("webrtc:ended", {
            sessionId,
            from: uid,
            reason
          });
        } catch (error) {
          console.error(
            "End call error:",
            error?.name || "error"
          );
        }
      }
    );

    socket.on("disconnect", () => {
      joinedCallSessions.forEach(sessionId => {
        removeCallParticipant(sessionId, uid, socket.id);
        emitPresence(io, sessionId);
      });

      joinedCallSessions.clear();
    });
  });
};

module.exports = { attachCallSocketHandlers };