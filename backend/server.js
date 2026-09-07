require("dotenv").config();

require("./src/config/firebase");

const http =
  require("http");

const {
  Server,
} = require("socket.io");

const app =
  require("./src/app");

const {
  auth,
} =
  require("./src/config/firebase");

const {
  startNotificationScheduler,
} =
  require("./src/services/notificationScheduler");

const {
  ensureAdminAccount,
} =
  require("./src/services/adminService");

const {
  attachSocketHandlers,
} =
  require("./src/services/socketService");

const PORT =
  process.env.PORT ||
  5000;

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
          process.env.CLIENT_URL ||
          process.env.FRONTEND_URL ||
          "http://localhost:5173",

        credentials:
          true,
      },

      maxHttpBufferSize:
        2e6,
    }
  );

/* =========================================================
   SOCKET AUTH
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
          .auth?.token;

      if (!token) {
        return next(
          new Error(
            "Authentication required."
          )
        );
      }

      socket.user =
        await auth.verifyIdToken(
          token
        );

      next();
    } catch (error) {
      console.error(
        "Socket authentication:",
        error.code ||
          error.message
      );

      next(
        new Error(
          "Invalid authentication token."
        )
      );
    }
  }
);

/* =========================================================
   SOCKET FEATURES
========================================================= */

attachSocketHandlers(
  io
);

/* =========================================================
   START
========================================================= */

const startServer =
  async () => {
    try {
      await ensureAdminAccount();

      startNotificationScheduler();

      server.listen(
        PORT,
        () => {
          console.log(
            `InnerVoice backend running on port ${PORT}`
          );
        }
      );
    } catch (error) {
      console.error(
        "Backend startup failed:",
        error
      );

      process.exit(1);
    }
  };

startServer();