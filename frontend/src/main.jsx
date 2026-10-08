import React from "react";

import ReactDOM from "react-dom/client";

import {
  BrowserRouter,
} from "react-router-dom";

import App from "./App.jsx";

import {
  AuthProvider,
} from "./context/AuthContext";

import {
  SocketProvider,
} from "./context/SocketContext";

import "./styles/global.css";

import "./styles/dashboard.css";

import "./styles/feature-pages.css";

import "./styles/portal.css";

import "./styles/responsive-final.css";

/*
 * IMPORTANT:
 *
 * This must remain the LAST stylesheet.
 *
 * It contains final authentication UI fixes for:
 * - Register editorial alignment
 * - Password Show / Hide positioning
 * - Forgot Password password fields
 */
import "./styles/auth-polish.css";

ReactDOM
  .createRoot(
    document.getElementById(
      "root"
    )
  )
  .render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <App />
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );