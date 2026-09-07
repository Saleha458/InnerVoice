const bcrypt = require("bcryptjs");
const { auth, db } = require("../config/firebase");

/**
 * Creates/validates the single InnerVoice admin account.
 *
 * Admin credentials come ONLY from backend .env:
 *
 * ADMIN_ANONYMOUS_ID=your_admin_id
 * ADMIN_PASSWORD=your_strong_admin_password
 *
 * Public registration never creates an admin account.
 */
const ensureAdminAccount = async () => {
  const anonymousId = String(
    process.env.ADMIN_ANONYMOUS_ID || ""
  ).trim();

  const password = String(process.env.ADMIN_PASSWORD || "");

  // ---------------------------------------------------------
  // 1. Check environment variables
  // ---------------------------------------------------------

  if (!anonymousId || !password) {
    console.warn(
      "Admin bootstrap skipped: ADMIN_ANONYMOUS_ID and ADMIN_PASSWORD are not configured."
    );

    return;
  }

  // ---------------------------------------------------------
  // 2. Validate admin anonymous ID
  // ---------------------------------------------------------

  if (
    anonymousId.length < 3 ||
    anonymousId.length > 30 ||
    !/^[A-Za-z0-9_]+$/.test(anonymousId)
  ) {
    throw new Error(
      "ADMIN_ANONYMOUS_ID must be 3-30 characters and contain only letters, numbers and underscores."
    );
  }

  // ---------------------------------------------------------
  // 3. Validate admin password
  // ---------------------------------------------------------

  if (
    password.length < 8 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      "ADMIN_PASSWORD must be at least 8 characters and contain uppercase, lowercase, number and special character."
    );
  }

  // ---------------------------------------------------------
  // 4. Find configured admin by anonymous ID
  // ---------------------------------------------------------

  const existingAdminQuery = await db
    .collection("users")
    .where("anonymousId", "==", anonymousId)
    .limit(1)
    .get();

  // ---------------------------------------------------------
  // 5. If account already exists
  // ---------------------------------------------------------

  if (!existingAdminQuery.empty) {
    const adminDoc = existingAdminQuery.docs[0];
    const adminData = adminDoc.data();

    // Never convert an existing normal user into an admin.
    if (adminData.role !== "admin") {
      throw new Error(
        `Admin bootstrap refused: anonymous ID "${anonymousId}" already belongs to a non-admin account.`
      );
    }

    // Make sure this Firebase Auth user also has admin claims.
    try {
      const firebaseUser = await auth.getUser(adminDoc.id);

      const existingClaims = firebaseUser.customClaims || {};

      await auth.setCustomUserClaims(adminDoc.id, {
        ...existingClaims,
        role: "admin",
        anonymousId,
      });
    } catch (error) {
      console.error(
        "Could not refresh admin custom claims:",
        error.message
      );
    }

    console.log(`Admin account "${anonymousId}" is ready.`);

    return;
  }

  // ---------------------------------------------------------
  // 6. Make sure another admin does not already exist
  // ---------------------------------------------------------

  const existingAdminsQuery = await db
    .collection("users")
    .where("role", "==", "admin")
    .limit(2)
    .get();

  if (!existingAdminsQuery.empty) {
    throw new Error(
      "Admin bootstrap refused: another admin account already exists. InnerVoice allows only one admin account."
    );
  }

  // ---------------------------------------------------------
  // 7. Create Firebase Auth account
  // ---------------------------------------------------------

  let firebaseUser = null;

  try {
    firebaseUser = await auth.createUser({
      password,
      displayName: anonymousId,
    });

    // -------------------------------------------------------
    // 8. Hash password for Firestore
    // -------------------------------------------------------

    const passwordHash = await bcrypt.hash(password, 12);

    const now = new Date();

    // -------------------------------------------------------
    // 9. Create Firestore admin user
    // -------------------------------------------------------

    await db.collection("users").doc(firebaseUser.uid).set({
      uid: firebaseUser.uid,

      anonymousId,

      password: passwordHash,

      role: "admin",

      age: null,

      ageVerified: false,

      status: "active",

      verificationStatus: null,

      createdAt: now,

      updatedAt: now,
    });

    // -------------------------------------------------------
    // 10. Set Firebase custom claims
    // -------------------------------------------------------

    await auth.setCustomUserClaims(firebaseUser.uid, {
      role: "admin",
      anonymousId,
    });

    console.log(
      `Admin account "${anonymousId}" created successfully.`
    );
  } catch (error) {
    // -------------------------------------------------------
    // Roll back Firebase Auth user if Firestore creation
    // or custom claims fail.
    // -------------------------------------------------------

    if (firebaseUser?.uid) {
      try {
        await auth.deleteUser(firebaseUser.uid);
      } catch (deleteError) {
        console.error(
          "Could not roll back Firebase admin user:",
          deleteError.message
        );
      }
    }

    throw error;
  }
};

module.exports = {
  ensureAdminAccount,
};