import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  io,
} from "socket.io-client";

import {
  auth,
} from "../services/firebase";

const SocketContext =
  createContext({
    socket: null,
  });

export function SocketProvider({
  children,
}) {
  const [
    socket,
    setSocket,
  ] = useState(null);

  useEffect(() => {
    let current =
      null;

    let disposed =
      false;

    const unsubscribe =
      auth.onAuthStateChanged(
        async (
          firebaseUser
        ) => {
          if (current) {
            current.disconnect();
            current = null;
          }

          if (
            !firebaseUser ||
            disposed
          ) {
            setSocket(null);
            return;
          }

          try {
            const token =
              await firebaseUser.getIdToken(
                true
              );

            current =
              io(
                import.meta.env
                  .VITE_SOCKET_URL ||
                  "http://localhost:5000",
                {
                  auth: {
                    token,
                  },

                  transports: [
                    "websocket",
                    "polling",
                  ],

                  withCredentials:
                    true,

                  reconnection:
                    true,
                }
              );

            current.on(
              "connect_error",
              async () => {
                try {
                  current.auth.token =
                    await firebaseUser.getIdToken(
                      true
                    );
                } catch (_) {}
              }
            );

            if (!disposed) {
              setSocket(
                current
              );
            }
          } catch (error) {
            console.error(
              "Socket setup failed:",
              error
            );

            setSocket(null);
          }
        }
      );

    return () => {
      disposed =
        true;

      unsubscribe();

      current?.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket =
  () =>
    useContext(
      SocketContext
    );