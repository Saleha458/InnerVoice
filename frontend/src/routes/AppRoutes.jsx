import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import {
  useAuth,
} from "../context/AuthContext";

import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";

import Landing from "../pages/Landing";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

import DashboardLayout from "../components/layout/DashboardLayout";

import UserDashboard from "../pages/dashboard/UserDashboard";
import ExpertDashboard from "../pages/dashboard/ExpertDashboard";
import ParentDashboard from "../pages/dashboard/ParentDashboard";

import AdminDashboard from "../pages/admin/AdminDashboard";

import AIChat from "../pages/chat/AIChat";
import ExpertChat from "../pages/chat/ExpertChat";
import CallRoom from "../pages/chat/CallRoom";

import MoodTracker from "../pages/mood/MoodTracker";

import Journal from "../pages/journal/Journal";
import JournalEntry from "../pages/journal/JournalEntry";

import Reports from "../pages/reports/Reports";
import CreateReport from "../pages/reports/CreateReport";

import Notifications from "../pages/notifications/Notifications";

import FindExpert from "../pages/bookings/FindExpert";
import BookSession from "../pages/bookings/BookSession";
import Bookings from "../pages/bookings/Bookings";

import ExpertProfile from "../pages/expert/ExpertProfile";
import ExpertRequests from "../pages/expert/ExpertRequests";
import ExpertSessions from "../pages/expert/ExpertSessions";

import ExpertVerification from "../pages/admin/ExpertVerification";
import UserManagement from "../pages/admin/UserManagement";

import Profile from "../pages/profile/Profile";

import Guidelines from "../pages/guidelines/Guidelines";

// =========================================================
// ROUTES
// =========================================================

export default function AppRoutes() {
  return (
    <Routes>
      {/* ===================================================
          PUBLIC
      =================================================== */}

      <Route
        path="/"
        element={<Landing />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      {/* ===================================================
          PROTECTED
      =================================================== */}

      <Route
        element={<ProtectedRoute />}
      >
        <Route
          element={<DashboardLayout />}
        >
          {/* =================================================
              GENERAL
          ================================================= */}

          <Route
            path="/dashboard"
            element={<DashboardRedirect />}
          />

          <Route
            path="/profile"
            element={<Profile />}
          />

          <Route
            path="/notifications"
            element={<Notifications />}
          />

          {/* =================================================
              USER
          ================================================= */}

          <Route
            element={
              <RoleRoute
                allowedRoles={["user"]}
              />
            }
          >
            <Route
              path="/user/dashboard"
              element={<UserDashboard />}
            />

            <Route
              path="/chat"
              element={<AIChat />}
            />

            <Route
              path="/mood"
              element={<MoodTracker />}
            />

            <Route
              path="/journal"
              element={<Journal />}
            />

            <Route
              path="/journal/new"
              element={<JournalEntry />}
            />

            <Route
              path="/reports"
              element={<Reports />}
            />

            <Route
              path="/reports/new"
              element={<CreateReport />}
            />

            <Route
              path="/experts"
              element={<FindExpert />}
            />

            <Route
              path="/experts/:id"
              element={<ExpertProfile />}
            />

            <Route
              path="/bookings"
              element={<Bookings />}
            />

            <Route
              path="/bookings/new"
              element={<BookSession />}
            />
          </Route>

          {/* =================================================
              USER + EXPERT SESSION COMMUNICATION
          ================================================= */}

          <Route
            element={
              <RoleRoute
                allowedRoles={[
                  "user",
                  "expert",
                ]}
              />
            }
          >
            <Route
              path="/session-chat/:sessionId"
              element={<ExpertChat />}
            />

            <Route
              path="/sessions/:sessionId/call"
              element={<CallRoom />}
            />
          </Route>

          {/* =================================================
              EXPERT
          ================================================= */}

          <Route
            element={
              <RoleRoute
                allowedRoles={["expert"]}
              />
            }
          >
            <Route
              path="/expert/dashboard"
              element={<ExpertDashboard />}
            />

            <Route
              path="/expert/requests"
              element={<ExpertRequests />}
            />

            <Route
              path="/expert/sessions"
              element={<ExpertSessions />}
            />

            <Route
              path="/expert/messages"
              element={<ExpertChat />}
            />

            <Route
              path="/expert/profile"
              element={<Profile />}
            />
          </Route>

          {/* =================================================
              PARENT
          ================================================= */}

          <Route
            element={
              <RoleRoute
                allowedRoles={["parent"]}
              />
            }
          >
            <Route
              path="/parent/dashboard"
              element={<ParentDashboard />}
            />

            <Route
              path="/parent/guidelines"
              element={
                <Guidelines section="guidelines" />
              }
            />

            <Route
              path="/parent/warnings"
              element={
                <Guidelines section="warnings" />
              }
            />

            <Route
              path="/parent/profile"
              element={<Profile />}
            />
          </Route>

          {/* =================================================
              ADMIN
          ================================================= */}

          <Route
            element={
              <RoleRoute
                allowedRoles={["admin"]}
              />
            }
          >
            <Route
              path="/admin/dashboard"
              element={<AdminDashboard />}
            />

            <Route
              path="/admin/experts"
              element={<ExpertVerification />}
            />

            <Route
              path="/admin/users"
              element={<UserManagement />}
            />

            <Route
              path="/admin/reports"
              element={
                <Reports adminMode />
              }
            />

            <Route
              path="/admin/sessions"
              element={
                <Bookings adminMode />
              }
            />
          </Route>
        </Route>
      </Route>

      {/* ===================================================
          FALLBACK
      =================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />
    </Routes>
  );
}

// =========================================================
// DASHBOARD REDIRECT
// =========================================================

function DashboardRedirect() {
  const { user } =
    useAuth();

  if (
    user?.role === "expert"
  ) {
    return (
      <Navigate
        to="/expert/dashboard"
        replace
      />
    );
  }

  if (
    user?.role === "parent"
  ) {
    return (
      <Navigate
        to="/parent/dashboard"
        replace
      />
    );
  }

  if (
    user?.role === "admin"
  ) {
    return (
      <Navigate
        to="/admin/dashboard"
        replace
      />
    );
  }

  return (
    <Navigate
      to="/user/dashboard"
      replace
    />
  );
}