
const express = require("express");
const router = express.Router();

const {
  getAdminOverview,
  getMyReport,
} = require("../controllers/reportController");

// Role-based access control
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({
        message: "You do not have permission to access this report.",
      });
    }

    next();
  };
};

// GET /api/reports/overview
// Admin-only report
router.get(
  "/overview",
  requireRole("admin"),
  getAdminOverview
);

// GET /api/reports/my
// Logged-in student-only report
router.get(
  "/my",
  requireRole("student"),
  getMyReport
);

module.exports = router;
