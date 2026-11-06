
const express = require("express");

const router = express.Router();

const {
  enrollInCourse,
  getMyEnrollments,
  getCourseEnrollments,
  getAllEnrollments,
  deleteEnrollment,
  cancelMyEnrollment,
  approveEnrollment,
  rejectEnrollment
} = require("../controllers/enrollmentController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Student routes

// Submit enrollment request
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["student"]),
  enrollInCourse
);

// View own enrollment requests
router.get(
  "/my",
  authMiddleware,
  roleMiddleware(["student"]),
  getMyEnrollments
);

// Cancel own pending enrollment request
router.delete(
  "/my/:id",
  authMiddleware,
  roleMiddleware(["student"]),
  cancelMyEnrollment
);

// Admin routes

// View all enrollments with search, filters and pagination
router.get(
  "/",
  authMiddleware,
  roleMiddleware(["admin"]),
  getAllEnrollments
);

// View enrollments for a specific course
router.get(
  "/course/:courseId",
  authMiddleware,
  roleMiddleware(["admin"]),
  getCourseEnrollments
);

// Approve a pending enrollment request
router.put(
  "/:id/approve",
  authMiddleware,
  roleMiddleware(["admin"]),
  approveEnrollment
);

// Reject a pending enrollment request
router.put(
  "/:id/reject",
  authMiddleware,
  roleMiddleware(["admin"]),
  rejectEnrollment
);

// Delete an enrollment
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  deleteEnrollment
);

module.exports = router;
