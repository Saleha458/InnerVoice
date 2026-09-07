const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });
      }

      const userRole =
        req.user.role;

      if (!userRole) {
        return res.status(403).json({
          success: false,
          message:
            "User role is missing.",
        });
      }

      if (
        !allowedRoles.includes(userRole)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You do not have permission to access this resource.",
        });
      }

      next();
    } catch (error) {
      console.error(
        "Role authorization error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Authorization check failed.",
      });
    }
  };
};

module.exports = allowRoles;