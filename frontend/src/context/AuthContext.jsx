import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  onIdTokenChanged,
  signInWithCustomToken,
  signOut,
} from "firebase/auth";

import { auth } from "../services/firebase";
import api from "../services/api";

const AuthContext =
  createContext(null);

// =========================================================
// BUILD USER FROM FIREBASE USER
// =========================================================

const buildUser = async (
  firebaseUser
) => {
  if (!firebaseUser) {
    return null;
  }

  const tokenResult =
    await firebaseUser.getIdTokenResult();

  const claims =
    tokenResult.claims || {};

  return {
    uid:
      firebaseUser.uid,

    anonymousId:
      claims.anonymousId ||
      firebaseUser.displayName ||
      "",

    role:
      claims.role ||
      "user",

    age:
      claims.age ??
      null,

    verificationStatus:
      claims.verificationStatus ||
      null,

    status:
      claims.status ||
      "active",
  };
};

// =========================================================
// PROVIDER
// =========================================================

export const AuthProvider = ({
  children,
}) => {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  // -------------------------------------------------------
  // FIREBASE AUTH STATE
  // -------------------------------------------------------

  useEffect(() => {
    const unsubscribe =
      onIdTokenChanged(
        auth,
        async (firebaseUser) => {
          try {
            if (!firebaseUser) {
              setUser(null);
              setLoading(false);
              return;
            }

            const nextUser =
              await buildUser(
                firebaseUser
              );

            setUser(nextUser);
          } catch (error) {
            console.error(
              "Auth state error:",
              error
            );

            setUser(null);
          } finally {
            setLoading(false);
          }
        }
      );

    return () => {
      unsubscribe();
    };
  }, []);

  // =======================================================
  // LOGIN
  // =======================================================

  const login = async (
    anonymousId,
    password
  ) => {
    const response =
      await api.post(
        "/auth/login",
        {
          anonymousId,
          password,
        }
      );

    const token =
      response.data?.token;

    if (!token) {
      throw new Error(
        "Login token was not returned by the server."
      );
    }

    // Sign into Firebase
    await signInWithCustomToken(
      auth,
      token
    );

    // Force fresh token so role claims are available
    const firebaseUser =
      auth.currentUser;

    if (!firebaseUser) {
      throw new Error(
        "Firebase authentication failed."
      );
    }

    await firebaseUser.getIdToken(
      true
    );

    const nextUser =
      await buildUser(
        firebaseUser
      );

    setUser(nextUser);

    return {
      ...response.data,
      user: nextUser,
    };
  };

  // =======================================================
  // REFRESH USER
  // =======================================================

  const refreshUser =
    async () => {
      const firebaseUser =
        auth.currentUser;

      if (!firebaseUser) {
        setUser(null);
        return null;
      }

      await firebaseUser.getIdToken(
        true
      );

      const nextUser =
        await buildUser(
          firebaseUser
        );

      setUser(nextUser);

      return nextUser;
    };

  // =======================================================
  // LOGOUT
  // =======================================================

  const logout = async () => {
    try {
      await signOut(auth);
    } finally {
      setUser(null);
    }
  };

  // =======================================================
  // REGISTER
  // =======================================================

  const register = async (
    registrationData
  ) => {
    const response =
      await api.post(
        "/auth/register",
        registrationData
      );

    return response.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        register,
        refreshUser,
        isAuthenticated:
          Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// =========================================================
// HOOK
// =========================================================

export const useAuth =
  () => useContext(AuthContext);

export default AuthContext;