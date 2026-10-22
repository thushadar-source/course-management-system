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
// Create course (JWT + admin role required)
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin"]),
  createCourse
);


// Admin only
// Update course (JWT + admin role required)
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
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
