const {
  db,
} = require("../config/firebase");

const {
  encrypt,
} =
  require("./encryptionService");

const canAccessSession =
  async (
    uid,
    sessionId
  ) => {
    if (
      !uid ||
      !sessionId
    ) {
      return false;
    }

    const sessionDoc =
      await db
        .collection(
          "sessions"
        )
        .doc(sessionId)
        .get();

    if (
      !sessionDoc.exists
    ) {
      return false;
    }

    const session =
      sessionDoc.data();

    if (
      session.status !==
        "scheduled" &&
      session.status !==
        "completed"
    ) {
      return false;
    }

    if (
      session.userId ===
      uid
    ) {
      return true;
    }

    const expert =
      await db
        .collection(
          "experts"
        )
        .where(
          "uid",
          "==",
          uid
        )
        .limit(1)
        .get();

    return (
      !expert.empty &&
      expert.docs[0].id ===
        session.expertId
    );
  };

const attachSocketHandlers =
  (io) => {
    io.on(
      "connection",
      (socket) => {
        const uid =
          socket.user.uid;

        socket.emit(
          "connected",
          {
            userId:
              uid,
          }
        );

        /* ===============================================
           JOIN SESSION
        =============================================== */

        socket.on(
          "join-session",
          async (
            sessionId
          ) => {
            try {
              const allowed =
                await canAccessSession(
                  uid,
                  sessionId
                );

              if (!allowed) {
                socket.emit(
                  "socket-error",
                  {
                    message:
                      "You do not have access to this session.",
                  }
                );

                return;
              }

              socket.join(
                `session:${sessionId}`
              );
            } catch (error) {
              socket.emit(
                "socket-error",
                {
                  message:
                    "Could not join the session.",
                }
              );
            }
          }
        );

        /* ===============================================
           TYPING
        =============================================== */

        socket.on(
          "typing",
          async ({
            sessionId,
            isTyping,
          } = {}) => {
            if (
              !(await canAccessSession(
                uid,
                sessionId
              ))
            ) {
              return;
            }

            socket
              .to(
                `session:${sessionId}`
              )
              .emit(
                "typing",
                {
                  userId:
                    uid,

                  isTyping:
                    Boolean(
                      isTyping
                    ),
                }
              );
          }
        );

        /* ===============================================
           TEXT CHAT
        =============================================== */

        socket.on(
          "chat-message",
          async ({
            sessionId,
            receiverId,
            message,
          } = {}) => {
            try {
              if (
                !sessionId ||
                !String(
                  message ||
                    ""
                ).trim()
              ) {
                return;
              }

              if (
                !(await canAccessSession(
                  uid,
                  sessionId
                ))
              ) {
                return;
              }

              const text =
                String(
                  message
                )
                  .trim()
                  .slice(
                    0,
                    4000
                  );

              const encrypted =
                encrypt(text);

              const ref =
                await db
                  .collection(
                    "messages"
                  )
                  .add({
                    sessionId,

                    senderId:
                      uid,

                    receiverId:
                      receiverId ||
                      null,

                    type:
                      "text",

                    encryptedData:
                      encrypted.encryptedData,

                    iv:
                      encrypted.iv,

                    authTag:
                      encrypted.authTag,

                    createdAt:
                      new Date(),
                  });

              io.to(
                `session:${sessionId}`
              ).emit(
                "chat-message",
                {
                  id:
                    ref.id,

                  sessionId,

                  senderId:
                    uid,

                  receiverId:
                    receiverId ||
                    null,

                  message:
                    text,

                  type:
                    "text",

                  createdAt:
                    new Date().toISOString(),
                }
              );
            } catch (error) {
              console.error(
                "Socket chat error:",
                error.message
              );

              socket.emit(
                "socket-error",
                {
                  message:
                    "Could not send message.",
                }
              );
            }
          }
        );

        /* ===============================================
           VOICE MESSAGE
        =============================================== */

        socket.on(
          "voice-message",
          async ({
            sessionId,
            audio,
            mimeType,
          } = {}) => {
            try {
              if (
                !sessionId ||
                !audio
              ) {
                return;
              }

              if (
                !(await canAccessSession(
                  uid,
                  sessionId
                ))
              ) {
                return;
              }

              /*
               * Keep voice messages reasonably small.
               */
              if (
                String(audio)
                  .length >
                1500000
              ) {
                socket.emit(
                  "socket-error",
                  {
                    message:
                      "Voice message is too large. Please record a shorter message.",
                  }
                );

                return;
              }

              const encrypted =
                encrypt(
                  String(audio)
                );

              const ref =
                await db
                  .collection(
                    "messages"
                  )
                  .add({
                    sessionId,

                    senderId:
                      uid,

                    type:
                      "voice",

                    encryptedData:
                      encrypted.encryptedData,

                    iv:
                      encrypted.iv,

                    authTag:
                      encrypted.authTag,

                    mimeType:
                      mimeType ||
                      "audio/webm",

                    createdAt:
                      new Date(),
                  });

              io.to(
                `session:${sessionId}`
              ).emit(
                "voice-message",
                {
                  id:
                    ref.id,

                  sessionId,

                  senderId:
                    uid,

                  audio:
                    String(
                      audio
                    ),

                  mimeType:
                    mimeType ||
                    "audio/webm",

                  createdAt:
                    new Date().toISOString(),
                }
              );
            } catch (error) {
              console.error(
                "Socket voice error:",
                error.message
              );

              socket.emit(
                "socket-error",
                {
                  message:
                    "Could not send voice message.",
                }
              );
            }
          }
        );

        /* ===============================================
           CALL
        =============================================== */

        socket.on(
          "call-user",
          async ({
            sessionId,
            offer,
            mode,
          } = {}) => {
            if (
              !sessionId ||
              !offer
            ) {
              return;
            }

            if (
              !(await canAccessSession(
                uid,
                sessionId
              ))
            ) {
              return;
            }

            socket
              .to(
                `session:${sessionId}`
              )
              .emit(
                "incoming-call",
                {
                  sessionId,

                  offer,

                  mode:
                    mode ===
                    "audio"
                      ? "audio"
                      : "video",

                  from:
                    uid,
                }
              );
          }
        );

        socket.on(
          "answer-call",
          async ({
            sessionId,
            answer,
          } = {}) => {
            if (
              !sessionId ||
              !answer
            ) {
              return;
            }

            if (
              !(await canAccessSession(
                uid,
                sessionId
              ))
            ) {
              return;
            }

            socket
              .to(
                `session:${sessionId}`
              )
              .emit(
                "call-answered",
                {
                  sessionId,
                  answer,
                  from:
                    uid,
                }
              );
          }
        );

        socket.on(
          "ice-candidate",
          async ({
            sessionId,
            candidate,
          } = {}) => {
            if (
              !sessionId ||
              !candidate
            ) {
              return;
            }

            if (
              !(await canAccessSession(
                uid,
                sessionId
              ))
            ) {
              return;
            }

            socket
              .to(
                `session:${sessionId}`
              )
              .emit(
                "ice-candidate",
                {
                  sessionId,
                  candidate,
                  from:
                    uid,
                }
              );
          }
        );

        socket.on(
          "end-call",
          async ({
            sessionId,
          } = {}) => {
            if (
              !sessionId
            ) {
              return;
            }

            if (
              !(await canAccessSession(
                uid,
                sessionId
              ))
            ) {
              return;
            }

            socket
              .to(
                `session:${sessionId}`
              )
              .emit(
                "call-ended",
                {
                  from:
                    uid,
                }
              );
          }
        );

        socket.on(
          "disconnect",
          () => {
            console.log(
              `Socket disconnected: ${uid}`
            );
          }
        );
      }
    );
  };

module.exports = {
  attachSocketHandlers,
  canAccessSession,
};