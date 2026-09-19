import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  io,
} from "socket.io-client";

import {
  auth,
} from "../services/firebase";

/* =========================================================
   CONTEXT
========================================================= */

const SocketContext =
  createContext({
    socket:
      null,

    connected:
      false,

    reconnecting:
      false,
  });

/* =========================================================
   PROVIDER
========================================================= */

export function SocketProvider({
  children,
}) {
  const [
    socket,
    setSocket,
  ] =
    useState(null);

  const [
    connected,
    setConnected,
  ] =
    useState(false);

  const [
    reconnecting,
    setReconnecting,
  ] =
    useState(false);

  const socketRef =
    useRef(null);

  const firebaseUserRef =
    useRef(null);

  const refreshingTokenRef =
    useRef(false);

  /* =======================================================
     REFRESH SOCKET TOKEN
  ======================================================= */

  const refreshSocketToken =
    useCallback(
      async (
        currentSocket
      ) => {
        const firebaseUser =
          firebaseUserRef.current ||
          auth.currentUser;

        if (
          !firebaseUser ||
          !currentSocket
        ) {
          return false;
        }

        /*
         * Prevent multiple simultaneous
         * token refresh requests.
         */
        if (
          refreshingTokenRef.current
        ) {
          return false;
        }

        try {
          refreshingTokenRef.current =
            true;

          setReconnecting(
            true
          );

          /*
           * Force Firebase to issue
           * a fresh ID token.
           */
          const freshToken =
            await firebaseUser.getIdToken(
              true
            );

          currentSocket.auth = {
            ...(currentSocket.auth ||
              {}),

            token:
              freshToken,
          };

          console.log(
            "Socket token refreshed."
          );

          return true;
        } catch (
          error
        ) {
          console.error(
            "Socket token refresh failed:",
            error
          );

          return false;
        } finally {
          refreshingTokenRef.current =
            false;
        }
      },
      []
    );

  /* =======================================================
     SOCKET SETUP
  ======================================================= */

  useEffect(() => {
    let disposed =
      false;

    const unsubscribe =
      auth.onAuthStateChanged(
        async (
          firebaseUser
        ) => {
          firebaseUserRef.current =
            firebaseUser;

          /* =============================================
             CLEAN OLD SOCKET
          ============================================= */

          if (
            socketRef.current
          ) {
            socketRef.current.removeAllListeners();

            socketRef.current.disconnect();

            socketRef.current =
              null;
          }

          if (
            !firebaseUser ||
            disposed
          ) {
            setSocket(
              null
            );

            setConnected(
              false
            );

            return;
          }

          try {
            /*
             * Always use fresh token
             * when creating socket.
             */
            const token =
              await firebaseUser.getIdToken(
                true
              );

            if (
              disposed
            ) {
              return;
            }

            const currentSocket =
              io(
                import.meta.env
                  .VITE_SOCKET_URL ||
                  "http://localhost:5000",
                {
                  auth: {
                    token,
                  },

                  /*
                   * Allow Socket.IO to fall back
                   * if WebSocket temporarily fails.
                   */
                  transports: [
                    "websocket",
                    "polling",
                  ],

                  withCredentials:
                    true,

                  reconnection:
                    true,

                  reconnectionAttempts:
                    Infinity,

                  reconnectionDelay:
                    1000,

                  reconnectionDelayMax:
                    5000,

                  timeout:
                    20000,

                  autoConnect:
                    true,
                }
              );

            socketRef.current =
              currentSocket;

            /* ===========================================
               CONNECTED
            =========================================== */

            currentSocket.on(
              "connect",
              () => {
                console.log(
                  "Socket connected:",
                  currentSocket.id
                );

                setConnected(
                  true
                );

                setReconnecting(
                  false
                );
              }
            );

            /* ===========================================
               SERVER CONNECTED EVENT
            =========================================== */

            currentSocket.on(
              "connected",
              (
                data
              ) => {
                console.log(
                  "InnerVoice socket authenticated:",
                  data?.userId
                );
              }
            );

            /* ===========================================
               DISCONNECT
            =========================================== */

            currentSocket.on(
              "disconnect",
              async (
                reason
              ) => {
                console.warn(
                  "Socket disconnected:",
                  reason
                );

                setConnected(
                  false
                );

                /*
                 * Socket.IO automatically reconnects
                 * for normal transport failures.
                 *
                 * Before reconnecting we refresh token.
                 */
                if (
                  reason !==
                    "io client disconnect" &&
                  auth.currentUser
                ) {
                  await refreshSocketToken(
                    currentSocket
                  );
                }
              }
            );

            /* ===========================================
               CONNECT ERROR
            =========================================== */

            currentSocket.on(
              "connect_error",
              async (
                error
              ) => {
                console.error(
                  "Socket connect error:",
                  error?.message
                );

                setConnected(
                  false
                );

                const message =
                  String(
                    error?.message ||
                      ""
                  ).toLowerCase();

                /*
                 * Backend may return generic
                 * Invalid authentication token,
                 * while Firebase logged
                 * auth/id-token-expired.
                 *
                 * Refresh token for every
                 * authentication-related failure.
                 */
                const authenticationProblem =
                  message.includes(
                    "authentication"
                  ) ||
                  message.includes(
                    "token"
                  ) ||
                  message.includes(
                    "unauthorized"
                  ) ||
                  message.includes(
                    "invalid"
                  );

                if (
                  authenticationProblem &&
                  auth.currentUser
                ) {
                  const refreshed =
                    await refreshSocketToken(
                      currentSocket
                    );

                  if (
                    refreshed &&
                    !currentSocket.connected
                  ) {
                    /*
                     * IMPORTANT:
                     * Setting currentSocket.auth.token
                     * alone is not enough.
                     * We must explicitly reconnect.
                     */
                    currentSocket.connect();
                  }
                }
              }
            );

            /* ===========================================
               RECONNECT ATTEMPT

               Refresh token BEFORE each reconnect.
            =========================================== */

            currentSocket.io.on(
              "reconnect_attempt",
              async () => {
                console.log(
                  "Socket reconnect attempt..."
                );

                setReconnecting(
                  true
                );

                await refreshSocketToken(
                  currentSocket
                );
              }
            );

            currentSocket.io.on(
              "reconnect",
              (
                attempt
              ) => {
                console.log(
                  `Socket reconnected after ${attempt} attempt(s).`
                );

                setConnected(
                  true
                );

                setReconnecting(
                  false
                );
              }
            );

            currentSocket.io.on(
              "reconnect_error",
              (
                error
              ) => {
                console.error(
                  "Socket reconnect error:",
                  error?.message
                );
              }
            );

            if (
              !disposed
            ) {
              setSocket(
                currentSocket
              );
            }
          } catch (
            error
          ) {
            console.error(
              "Socket setup failed:",
              error
            );

            if (
              !disposed
            ) {
              setSocket(
                null
              );

              setConnected(
                false
              );
            }
          }
        }
      );

    return () => {
      disposed =
        true;

      unsubscribe();

      if (
        socketRef.current
      ) {
        socketRef.current.removeAllListeners();

        socketRef.current.disconnect();

        socketRef.current =
          null;
      }

      firebaseUserRef.current =
        null;
    };
  }, [
    refreshSocketToken,
  ]);

  /* =======================================================
     TOKEN REFRESH TIMER

     Firebase ID tokens normally expire.
     Refresh socket auth periodically so a long
     counselling session does not suddenly lose chat.
  ======================================================= */

  useEffect(() => {
    if (
      !socket
    ) {
      return;
    }

    const interval =
      setInterval(
        async () => {
          if (
            auth.currentUser &&
            socket
          ) {
            await refreshSocketToken(
              socket
            );
          }
        },
        45 *
          60 *
          1000
      );

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    socket,
    refreshSocketToken,
  ]);

  /* =======================================================
     CONTEXT
  ======================================================= */

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        reconnecting,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export const useSocket =
  () =>
    useContext(
      SocketContext
    );