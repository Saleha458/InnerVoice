import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useSocket,
} from "./SocketContext";

import {
  useAuth,
} from "./AuthContext";

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notificationService";

/* =========================================================
   CONTEXT
========================================================= */

const NotificationContext =
  createContext({
    notifications:
      [],

    unreadCount:
      0,

    loading:
      false,

    error:
      "",

    refreshNotifications:
      async () => {},

    markRead:
      async () => {},

    markAllRead:
      async () => {},
  });

/* =========================================================
   PROVIDER
========================================================= */

export function NotificationProvider({
  children,
}) {
  const {
    socket,
  } =
    useSocket();

  const {
    user,
  } =
    useAuth();

  const [
    notifications,
    setNotifications,
  ] =
    useState([]);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    toast,
    setToast,
  ] =
    useState(null);

  const toastTimerRef =
    useRef(null);

  /* =======================================================
     UNREAD COUNT
  ======================================================= */

  const unreadCount =
    useMemo(
      () =>
        notifications.filter(
          (
            item
          ) =>
            !item.read
        ).length,
      [
        notifications,
      ]
    );

  /* =======================================================
     LOAD
  ======================================================= */

  const refreshNotifications =
    useCallback(
      async () => {
        if (
          !user
        ) {
          setNotifications(
            []
          );

          return;
        }

        /*
         * Parent notification UI intentionally disabled
         * according to InnerVoice requirements.
         */
        if (
          user.role ===
          "parent"
        ) {
          setNotifications(
            []
          );

          return;
        }

        try {
          setLoading(
            true
          );

          setError(
            ""
          );

          const response =
            await getNotifications();

          setNotifications(
            Array.isArray(
              response?.notifications
            )
              ? response.notifications
              : []
          );
        } catch (
          err
        ) {
          console.error(
            "Notification loading error:",
            err
          );

          setError(
            err?.response
              ?.data
              ?.message ||
              "Could not load notifications."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        user,
      ]
    );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    refreshNotifications();
  }, [
    refreshNotifications,
  ]);

  /* =======================================================
     TOAST
  ======================================================= */

  const showToast =
    useCallback(
      (
        notification
      ) => {
        if (
          toastTimerRef.current
        ) {
          clearTimeout(
            toastTimerRef.current
          );
        }

        setToast(
          notification
        );

        toastTimerRef.current =
          setTimeout(
            () => {
              setToast(
                null
              );
            },
            6000
          );
      },
      []
    );

  /* =======================================================
     REAL-TIME SOCKET
  ======================================================= */

  useEffect(() => {
    if (
      !socket ||
      !user
    ) {
      return;
    }

    const handleNewNotification =
      (
        notification
      ) => {
        if (
          !notification?.id
        ) {
          return;
        }

        setNotifications(
          (
            current
          ) => {
            /*
             * Avoid duplicates if socket event
             * and refresh happen close together.
             */
            const exists =
              current.some(
                (
                  item
                ) =>
                  item.id ===
                  notification.id
              );

            if (
              exists
            ) {
              return current;
            }

            return [
              notification,
              ...current,
            ];
          }
        );

        showToast(
          notification
        );
      };

    socket.on(
      "notification:new",
      handleNewNotification
    );

    return () => {
      socket.off(
        "notification:new",
        handleNewNotification
      );
    };
  }, [
    socket,
    user,
    showToast,
  ]);

  /* =======================================================
     MARK SINGLE READ
  ======================================================= */

  const markRead =
    async (
      notificationId
    ) => {
      const notification =
        notifications.find(
          (
            item
          ) =>
            item.id ===
            notificationId
        );

      if (
        !notification ||
        notification.read
      ) {
        return;
      }

      try {
        await markNotificationRead(
          notificationId
        );

        setNotifications(
          (
            current
          ) =>
            current.map(
              (
                item
              ) =>
                item.id ===
                notificationId
                  ? {
                      ...item,

                      read:
                        true,

                      readAt:
                        new Date().toISOString(),
                    }
                  : item
            )
        );
      } catch (
        err
      ) {
        console.error(
          "Mark notification read:",
          err
        );

        throw err;
      }
    };

  /* =======================================================
     MARK ALL READ
  ======================================================= */

  const markAllRead =
    async () => {
      if (
        unreadCount ===
        0
      ) {
        return;
      }

      try {
        await markAllNotificationsRead();

        setNotifications(
          (
            current
          ) =>
            current.map(
              (
                item
              ) => ({
                ...item,

                read:
                  true,

                readAt:
                  item.readAt ||
                  new Date().toISOString(),
              })
            )
        );
      } catch (
        err
      ) {
        console.error(
          "Mark all notifications read:",
          err
        );

        throw err;
      }
    };

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(
    () => () => {
      if (
        toastTimerRef.current
      ) {
        clearTimeout(
          toastTimerRef.current
        );
      }
    },
    []
  );

  const value =
    useMemo(
      () => ({
        notifications,
        unreadCount,
        loading,
        error,
        refreshNotifications,
        markRead,
        markAllRead,
      }),
      [
        notifications,
        unreadCount,
        loading,
        error,
        refreshNotifications,
      ]
    );

  return (
    <NotificationContext.Provider
      value={
        value
      }
    >
      {children}

      {/* =================================================
          REAL-TIME TOAST
      ================================================= */}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position:
              "fixed",

            top:
              "24px",

            right:
              "24px",

            zIndex:
              9999,

            width:
              "min(390px, calc(100vw - 32px))",

            padding:
              "18px",

            borderRadius:
              "16px",

            background:
              "#ffffff",

            border:
              "1px solid rgba(101, 87, 255, 0.18)",

            boxShadow:
              "0 18px 50px rgba(17, 24, 39, 0.18)",

            animation:
              "notificationSlideIn 0.25s ease-out",
          }}
        >
          <div
            style={{
              display:
                "flex",

              alignItems:
                "flex-start",

              gap:
                "12px",
            }}
          >
            <div
              style={{
                width:
                  "42px",

                height:
                  "42px",

                flex:
                  "0 0 42px",

                borderRadius:
                  "12px",

                display:
                  "grid",

                placeItems:
                  "center",

                background:
                  "#f0efff",

                fontSize:
                  "20px",
              }}
            >
              🔔
            </div>

            <div
              style={{
                minWidth:
                  0,

                flex:
                  1,
              }}
            >
              <div
                style={{
                  display:
                    "flex",

                  justifyContent:
                    "space-between",

                  gap:
                    "12px",
                }}
              >
                <strong
                  style={{
                    color:
                      "#111827",

                    fontSize:
                      "15px",
                  }}
                >
                  {toast.title ||
                    "New notification"}
                </strong>

                <span
                  style={{
                    width:
                      "8px",

                    height:
                      "8px",

                    borderRadius:
                      "999px",

                    background:
                      "#6c63ff",

                    marginTop:
                      "6px",
                  }}
                />
              </div>

              <p
                style={{
                  margin:
                    "6px 0 0",

                  color:
                    "#5f6472",

                  fontSize:
                    "14px",

                  lineHeight:
                    1.5,
                }}
              >
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              aria-label="Close notification"
              onClick={() =>
                setToast(
                  null
                )
              }
              style={{
                border:
                  "none",

                background:
                  "transparent",

                cursor:
                  "pointer",

                fontSize:
                  "18px",

                color:
                  "#777",
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export const useNotifications =
  () =>
    useContext(
      NotificationContext
    );