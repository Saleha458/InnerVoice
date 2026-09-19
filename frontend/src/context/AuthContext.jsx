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

const AuthContext = createContext(null);

async function buildUser(firebaseUser) {
  if (!firebaseUser) return null;

  const { claims } =
    await firebaseUser.getIdTokenResult();

  return {
    uid: firebaseUser.uid,

    anonymousId:
      claims.anonymousId ||
      firebaseUser.displayName ||
      "",

    role: claims.role || "user",

    age: claims.age ?? null,

    verificationStatus:
      claims.verificationStatus || null,

    status: "active",
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [
    accountProfile,
    setAccountProfile,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  /* =========================================
     AUTHENTICATION STATE
  ========================================= */

  useEffect(() => {
    let sequence = 0;

    const unsubscribe = onIdTokenChanged(
      auth,
      async (firebaseUser) => {
        const current = ++sequence;

        try {
          if (!firebaseUser) {
            if (current === sequence) {
              setUser(null);
              setAccountProfile(null);
            }

            return;
          }

          // Keep the server-side account-status check.
          // Reuse its response instead of discarding it.

          const [next, response] =
            await Promise.all([
              buildUser(firebaseUser),
              api.get("/users/me"),
            ]);

          if (current !== sequence) {
            return;
          }

          const latest =
            response.data?.user || null;

          setAccountProfile(
            latest
              ? {
                  ...latest,
                  uid: firebaseUser.uid,
                }
              : null
          );

          setUser({
            ...next,
            age: latest?.age ?? next.age,
          });
        } catch (err) {
          if (current === sequence) {
            setUser(null);
            setAccountProfile(null);
          }

          if (
            [401, 403].includes(
              err?.response?.status
            )
          ) {
            await signOut(auth);
          } else {
            console.error(
              "Could not verify account session:",
              err
            );
          }
        } finally {
          if (current === sequence) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      sequence++;
      unsubscribe();
    };
  }, []);

  /* =========================================
     LOGIN
  ========================================= */

  const login = async (
    anonymousId,
    password
  ) => {
    const response = await api.post(
      "/auth/login",
      {
        anonymousId,
        password,
      }
    );

    const token = response.data?.token;

    if (!token) {
      throw new Error(
        "Login token was not returned."
      );
    }

    await signInWithCustomToken(
      auth,
      token
    );

    const firebaseUser =
      auth.currentUser;

    if (!firebaseUser) {
      throw new Error(
        "Firebase sign-in failed."
      );
    }

    await firebaseUser.getIdToken(true);

    const next =
      await buildUser(firebaseUser);

    // The authentication listener supplies
    // the verified /users/me profile.

    setUser(next);

    return {
      ...response.data,
      user: next,
    };
  };

  /* =========================================
     RESTORE
  ========================================= */

  const restore = async (
    anonymousId,
    password
  ) => {
    const response = await api.post(
      "/auth/restore",
      {
        anonymousId,
        password,
      }
    );

    return response.data;
  };

  /* =========================================
     REFRESH USER
  ========================================= */

  const refreshUser = async () => {
    const firebaseUser =
      auth.currentUser;

    if (!firebaseUser) {
      setUser(null);
      setAccountProfile(null);

      return null;
    }

    await firebaseUser.getIdToken(true);

    const [next, response] =
      await Promise.all([
        buildUser(firebaseUser),
        api.get("/users/me"),
      ]);

    const latest =
      response.data?.user || null;

    setAccountProfile(
      latest
        ? {
            ...latest,
            uid: firebaseUser.uid,
          }
        : null
    );

    const updated = {
      ...next,
      age: latest?.age ?? next.age,
    };

    setUser(updated);

    return updated;
  };

  /* =========================================
     UPDATE CACHED ACCOUNT PROFILE
  ========================================= */

  const updateAccountProfile = (
    changes
  ) => {
    const currentUid =
      auth.currentUser?.uid;

    if (!currentUid) return;

    setAccountProfile((previous) =>
      previous?.uid === currentUid
        ? {
            ...previous,
            ...changes,
            uid: currentUid,
          }
        : previous
    );

    if (changes.age !== undefined) {
      setUser((previous) =>
        previous?.uid === currentUid
          ? {
              ...previous,
              age: changes.age,
            }
          : previous
      );
    }
  };

  /* =========================================
     LOGOUT
  ========================================= */

  const logout = async () => {
    try {
      await signOut(auth);
    } finally {
      setUser(null);
      setAccountProfile(null);
    }
  };

  /* =========================================
     REGISTER
  ========================================= */

  const register = async (
    registrationData
  ) => {
    const response = await api.post(
      "/auth/register",
      registrationData
    );

    return response.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accountProfile,
        loading,
        login,
        logout,
        register,
        refreshUser,
        restore,
        updateAccountProfile,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () =>
  useContext(AuthContext);

export default AuthContext;