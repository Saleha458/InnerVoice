"use strict";

require("dotenv").config();

const http =
  require("node:http");

const {
  Server
} = require(
  "socket.io"
);

const {
  auth,
  db
} = require(
  "./src/config/firebase"
);

const app =
  require(
    "./src/app"
  );

const {
  startNotificationScheduler
} = require(
  "./src/services/notificationScheduler"
);

const {
  ensureAdminAccount
} = require(
  "./src/services/adminService"
);

const {
  attachSocketHandlers
} = require(
  "./src/services/socketService"
);

const {
  setNotificationIO
} = require(
  "./src/services/notificationService"
);

const {
  setAccountSocketIO,
  startAccountDeletionWorker
} = require(
  "./src/services/accountLifecycle"
);

/* =========================================================
   BASIC CONFIGURATION
========================================================= */

const port =
  Number(
    process.env.PORT ||
      5000
  );

/* =========================================================
   SOCKET CORS
========================================================= */

function normalizeOrigin(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .replace(
      /\/+$/,
      ""
    );
}

const allowedOrigins =
  new Set(
    [
      "http://localhost:5173",

      "https://inner-voice-three.vercel.app",

      process.env
        .CLIENT_URL,

      process.env
        .FRONTEND_URL
    ]
      .map(
        normalizeOrigin
      )
      .filter(Boolean)
  );

function checkSocketOrigin(
  origin,
  callback
) {
  if (!origin) {
    return callback(
      null,
      true
    );
  }

  const normalized =
    normalizeOrigin(
      origin
    );

  if (
    allowedOrigins.has(
      normalized
    )
  ) {
    return callback(
      null,
      true
    );
  }

  console.warn(
    "Blocked Socket.IO origin:",
    normalized
  );

  return callback(
    new Error(
      "Socket origin not allowed."
    ),
    false
  );
}

/* =========================================================
   HTTP + SOCKET SERVER
========================================================= */

const server =
  http.createServer(
    app
  );

const io =
  new Server(
    server,
    {
      cors: {
        origin:
          checkSocketOrigin,

        credentials:
          true,

        methods: [
          "GET",
          "POST"
        ]
      },

      maxHttpBufferSize:
        2e6
    }
  );

/* =========================================================
   SOCKET AUTHENTICATION
========================================================= */

io.use(
  async (
    socket,
    next
  ) => {
    try {
      const token =
        socket
          .handshake
          .auth
          ?.token;

      if (!token) {
        return next(
          new Error(
            "Authentication required."
          )
        );
      }

      const decoded =
        await auth
          .verifyIdToken(
            token,
            true
          );

      const user =
        await db
          .collection(
            "users"
          )
          .doc(
            decoded.uid
          )
          .get();

      if (
        !user.exists ||
        user.data()
          .status !==
          "active"
      ) {
        return next(
          new Error(
            "Account inactive."
          )
        );
      }

      socket.user = {
        ...decoded,

        role:
          user.data()
            .role
      };

      /*
       * Re-check account state
       * before processing each
       * authenticated socket event.
       */
      socket.use(
        async (
          _packet,
          proceed
        ) => {
          try {
            const fresh =
              await db
                .collection(
                  "users"
                )
                .doc(
                  decoded.uid
                )
                .get();

            if (
              !fresh.exists ||
              fresh.data()
                .status !==
                "active"
            ) {
              socket.disconnect(
                true
              );

              return proceed(
                new Error(
                  "Account inactive."
                )
              );
            }

            proceed();
          } catch (
            error
          ) {
            proceed(
              error
            );
          }
        }
      );

      next();
    } catch (
      error
    ) {
      console.error(
        "Socket auth:",
        error?.code ||
          error?.name
      );

      next(
        new Error(
          "Invalid session or inactive account."
        )
      );
    }
  }
);

/* =========================================================
   SOCKET SERVICES
========================================================= */

setNotificationIO(
  io
);

setAccountSocketIO(
  io
);

/*
 * Private expert chat,
 * encrypted voice messages,
 * typing indicators and
 * notifications only.
 *
 * Live audio calling has been
 * removed from the final scope.
 */
attachSocketHandlers(
  io
);

/* =========================================================
   SERVER ERRORS
========================================================= */

server.on(
  "error",
  error => {
    if (
      error.code ===
      "EADDRINUSE"
    ) {
      console.error(
        `Port ${port} is already in use. Stop the previous backend instance.`
      );
    } else {
      console.error(
        "HTTP server error:",
        error
      );
    }

    process.exit(1);
  }
);

/* =========================================================
   START
========================================================= */

async function startServer() {
  try {
    await ensureAdminAccount();

    server.listen(
      port,
      () => {
        console.log(
          `InnerVoice backend running on port ${port}`
        );

        console.log(
          "Allowed browser origins:",
          Array.from(
            allowedOrigins
          ).join(", ")
        );

        startNotificationScheduler();

        startAccountDeletionWorker();
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Backend startup failed:",
      error
    );

    process.exit(1);
  }
}

startServer();