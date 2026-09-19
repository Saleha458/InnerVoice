const {
  auth,
  db,
} = require("../config/firebase");

module.exports = async function authenticate(
  req,
  res,
  next
) {
  const header =
    req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  try {
    const decoded = await auth.verifyIdToken(
      header.slice(7),
      true
    );

    const doc = await db
      .collection("users")
      .doc(decoded.uid)
      .get();

    if (!doc.exists) {
      return res.status(401).json({
        success: false,
        message: "Account not found.",
      });
    }

    if (doc.data().status !== "active") {
      return res.status(403).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "This account is inactive.",
      });
    }

    req.user = {
      ...decoded,
      role: doc.data().role || "user",
    };

    next();
  } catch (err) {
    console.error(
      "Authentication failed:",
      err.code || err.message
    );

    return res.status(401).json({
      success: false,
      message: "Invalid or expired session.",
    });
  }
};