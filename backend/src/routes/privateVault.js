"use strict";

const router = require("express").Router();
const authenticate = require("../middleware/auth");
const { db } = require("../config/firebase");

const {
  getSessionAccess
} = require("../services/sessionAccessService");

router.use(authenticate);

const vaults = db.collection("privateVaults");

const validId = id =>
  typeof id === "string" &&
  /^[A-Za-z0-9_-]{16,128}$/.test(id);

const b64 = value =>
  typeof value === "string" &&
  /^[A-Za-z0-9+/]+={0,2}$/.test(value);

const box = value =>
  value?.v === 1 &&
  b64(value.iv) &&
  Buffer.from(value.iv, "base64").length === 12 &&
  b64(value.ct) &&
  Buffer.from(value.ct, "base64").length > 16 &&
  value.ct.length <= 3000;

// Each user's stars are stored under THEIR vault.
// No message text, conversation ID, or participant ID
// is stored in clear inside a star record.
router.get("/stars", async (req, res) => {
  try {
    const snap = await vaults
      .doc(req.user.uid)
      .collection("stars")
      .get();

    res.set("Cache-Control", "no-store");

    return res.json({
      success: true,
      stars: snap.docs.map(doc => ({
        id: doc.id,
        e2ee: doc.data().e2ee
      }))
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Could not load starred references."
    });
  }
});

router.post("/stars", async (req, res) => {
  const { id, e2ee } = req.body || {};

  if (!validId(id) || !box(e2ee)) {
    return res.status(400).json({
      success: false,
      message: "Invalid encrypted star."
    });
  }

  try {
    const parent = vaults.doc(req.user.uid);

    if (!(await parent.get()).exists) {
      return res.status(409).json({
        success: false,
        message: "Create your vault first."
      });
    }

    await parent
      .collection("stars")
      .doc(id)
      .create({
        e2ee,
        createdAt: new Date()
      });

    return res.status(201).json({
      success: true,
      id
    });
  } catch (error) {
    if (
      error.code === 6 ||
      error.code === "already-exists"
    ) {
      return res.status(409).json({
        success: false,
        message: "Star already exists."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Could not save star."
    });
  }
});

router.delete("/stars/:id", async (req, res) => {
  if (!validId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid star ID."
    });
  }

  try {
    await vaults
      .doc(req.user.uid)
      .collection("stars")
      .doc(req.params.id)
      .delete();

    return res.json({
      success: true
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Could not remove star."
    });
  }
});

// Existing vault endpoints remain available.

router.get("/", async (req, res) => {
  try {
    const doc = await vaults
      .doc(req.user.uid)
      .get();

    res.set("Cache-Control", "no-store");

    return res.json({
      success: true,
      vault: doc.exists ? doc.data() : null
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Vault unavailable."
    });
  }
});

const encoded = (value, limit = 12000) =>
  typeof value === "string" &&
  value.length > 8 &&
  value.length < limit &&
  /^[A-Za-z0-9+/=]+$/.test(value);

const cipher = value =>
  value?.v === 1 &&
  encoded(value.iv, 50) &&
  encoded(value.ct);

router.post("/", async (req, res) => {
  const {
    version,
    iterations,
    salt,
    verifier,
    wrappedPrivate,
    publicKey
  } = req.body || {};

  if (
    version !== 1 ||
    iterations !== 600000 ||
    !encoded(salt, 60) ||
    !cipher(verifier) ||
    !cipher(wrappedPrivate) ||
    !encoded(publicKey, 1000)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid vault setup."
    });
  }

  try {
    await vaults.doc(req.user.uid).create({
      version,
      iterations,
      salt,
      verifier,
      wrappedPrivate,
      publicKey,
      createdAt: new Date()
    });

    return res.status(201).json({
      success: true
    });
  } catch (error) {
    if (
      error.code === 6 ||
      String(error.message || "").includes(
        "ALREADY_EXISTS"
      )
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Vault already exists. Unlock it instead."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Could not create vault."
    });
  }
});

router.get("/peer/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (
      !/^[A-Za-z0-9_-]{1,128}$/.test(sessionId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid session."
      });
    }

    const access = await getSessionAccess(
      req.user.uid,
      sessionId
    );

    if (
      !access.exists ||
      !access.isParticipant ||
      !access.peerUid
    ) {
      return res.status(403).json({
        success: false,
        message: "Not a session participant."
      });
    }

    const [self, peer] = await Promise.all([
      vaults.doc(req.user.uid).get(),
      vaults.doc(access.peerUid).get()
    ]);

    if (!self.exists || !peer.exists) {
      return res.status(409).json({
        success: false,
        message:
          "Both participants need private vaults."
      });
    }

    const peerAccount = await db
      .collection("users")
      .doc(access.peerUid)
      .get();

    let peerLabel = String(
      peerAccount.exists
        ? peerAccount.data().anonymousId ||
            "Anonymous user"
        : "Anonymous user"
    ).slice(0, 60);

    const peerRole =
      access.role === "user"
        ? "expert"
        : "user";

    if (
      peerRole === "expert" &&
      access.session?.expertId
    ) {
      const expert = await db
        .collection("experts")
        .doc(access.session.expertId)
        .get();

      if (expert.exists) {
        peerLabel = String(
          expert.data().name ||
          expert.data().anonymousId ||
          peerLabel
        ).slice(0, 60);
      }
    }

    res.set("Cache-Control", "no-store");

    return res.json({
      success: true,
      peerUid: access.peerUid,
      peerRole,
      peerLabel,
      ownPublicKey: self.data().publicKey,
      peerPublicKey: peer.data().publicKey
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Could not load session keys."
    });
  }
});

module.exports = router;