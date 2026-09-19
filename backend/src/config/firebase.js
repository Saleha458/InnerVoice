"use strict";

const path = require("node:path");
const fs = require("node:fs");

const {
  initializeApp,
  getApps,
  cert,
  applicationDefault
} = require("firebase-admin/app");

const {
  getAuth
} = require("firebase-admin/auth");

const {
  getFirestore
} = require("firebase-admin/firestore");

function getCredentials() {
  // Production host: private environment variable.
  if (
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  ) {
    return cert(
      JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      )
    );
  }

  // Local or securely mounted credential file.
  const supplied =
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  const localFile = path.resolve(
    __dirname,
    "../../serviceAccountKey.json"
  );

  const file = supplied
    ? path.resolve(supplied)
    : localFile;

  if (fs.existsSync(file)) {
    return cert(
      JSON.parse(
        fs.readFileSync(file, "utf8")
      )
    );
  }

  // Supported Google Cloud workload identity.
  return applicationDefault();
}

const app =
  getApps()[0] ||
  initializeApp({
    credential: getCredentials()
  });

const db = getFirestore(app);
const auth = getAuth(app);

module.exports = {
  app,
  db,
  auth
};