"use strict";

require("dotenv").config();

const http = require("node:http");
const { Server } = require("socket.io");

const { auth, db } = require("./src/config/firebase");
const app = require("./src/app");

const {
  startNotificationScheduler
} = require("./src/services/notificationScheduler");

const {
  ensureAdminAccount
} = require("./src/services/adminService");

const {
  attachSocketHandlers
} = require("./src/services/socketService");

const {
  attachCallSocketHandlers
} = require("./src/services/callSocketService");

const {
  setNotificationIO
} = require("./src/services/notificationService");

const {
  setAccountSocketIO,
  startAccountDeletionWorker
} = require("./src/services/accountLifecycle");

const port = Number(process.env.PORT || 5000);

const clientOrigin =
  process.env.CLIENT_URL ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    credentials: true
  },
  maxHttpBufferSize: 2e6
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required."));
    }

    const decoded = await auth.verifyIdToken(token, true);

    const user = await db
      .collection("users")
      .doc(decoded.uid)
      .get();

    if (!user.exists || user.data().status !== "active") {
      return next(new Error("Account inactive."));
    }

    socket.user = {
      ...decoded,
      role: user.data().role
    };

    // Keep existing account-revocation checks.
    socket.use(async (_packet, proceed) => {
      try {
        const fresh = await db
          .collection("users")
          .doc(decoded.uid)
          .get();

        if (!fresh.exists || fresh.data().status !== "active") {
          socket.disconnect(true);

          return proceed(
            new Error("Account inactive.")
          );
        }

        proceed();
      } catch (error) {
        proceed(error);
      }
    });

    next();
  } catch (error) {
    console.error(
      "Socket auth:",
      error.code || error.name
    );

    next(
      new Error("Invalid session or inactive account.")
    );
  }
});

setNotificationIO(io);
setAccountSocketIO(io);

// Existing expert chat and notifications
attachSocketHandlers(io);

// REQUIRED: audio/video signaling
attachCallSocketHandlers(io);

server.on("error", error => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop the previous backend instance.`
    );
  } else {
    console.error("HTTP server error:", error);
  }

  process.exit(1);
});

async function startServer() {
  try {
    await ensureAdminAccount();

    server.listen(port, () => {
      console.log(
        `InnerVoice backend running on port ${port}`
      );

      // Start workers only after this process owns the port.
      startNotificationScheduler();
      startAccountDeletionWorker();
    });
  } catch (error) {
    console.error("Backend startup failed:", error);
    process.exit(1);
  }
}

startServer();