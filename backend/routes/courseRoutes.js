
const express = require("express");

const router = express.Router();

const {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  getStats,
} = require("../controllers/courseController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const validateCourse = require("../middleware/courseValidation");


// Get statistics (course count + student count)
router.get(
  "/stats",
  getStats
);


// PUBLIC
// View all courses
router.get(
  "/",
  getAllCourses
);


// PUBLIC
// View one course
router.get(
  "/:id",
  getCourseById
);


// Admin only
// Create course (JWT + admin role + server-side validation)
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateCourse,
  createCourse
);


// Admin only
// Update course (JWT + admin role + server-side validation)
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  validateCourse,
  updateCourse
);


// Admin only
// Delete course (JWT + admin role required)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  deleteCourse
);


module.exports = router;

