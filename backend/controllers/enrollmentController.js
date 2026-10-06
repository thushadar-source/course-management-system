const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");

// Enroll in a course
const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.body;

    // Logged-in student's ID
    const studentId = req.user.id;

    // Validate course ID
    if (
      courseId === undefined ||
      courseId === null ||
      courseId === ""
    ) {
      return res.status(400).json({
        message: "Course ID is required",
      });
    }

    // Course ID must be a positive integer
    if (
      !/^\d+$/.test(String(courseId)) ||
      Number(courseId) <= 0
    ) {
      return res.status(400).json({
        message: "Invalid course ID",
      });
    }

    // Check whether course exists
    const course = await Course.getById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    // Check whether student is already enrolled
    const existingEnrollment =
      await Enrollment.findByStudentAndCourse(
        studentId,
        courseId
      );

    if (existingEnrollment) {
      return res.status(409).json({
        message: "You are already enrolled in this course",
      });
    }

    /*
     * Capacity check and INSERT are handled together
     * by the model transaction.
     *
     * This prevents concurrent requests from exceeding
     * the maximum capacity.
     */
    const enrollmentId =
      await Enrollment.createWithCapacity(
        studentId,
        courseId
      );

    return res.status(201).json({
      message: "Course enrollment successful",
      enrollmentId,
    });

  } catch (error) {
    console.error(
      "Error enrolling in course:",
      error.message
    );

    // Course is already full
    if (error.code === "COURSE_FULL") {
      return res.status(409).json({
        message: "Course is full. No seats are available.",
      });
    }

    // Duplicate enrollment protection
    if (error.code === "DUPLICATE_ENROLLMENT") {
      return res.status(409).json({
        message: "You are already enrolled in this course",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


// Get logged-in student's courses
const getMyEnrollments = async (req, res) => {
  try {
    const studentId = req.user.id;

    const enrollments =
      await Enrollment.getByStudent(studentId);

    res.status(200).json({
      message: "Enrollments retrieved successfully",
      enrollments,
    });

  } catch (error) {
    console.error(
      "Error getting student enrollments:",
      error.message
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};


// Cancel logged-in student's own enrollment
const cancelMyEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate enrollment ID
    if (
      !/^\d+$/.test(id) ||
      Number(id) <= 0
    ) {
      return res.status(400).json({
        message: "Invalid enrollment ID",
      });
    }

    // Student ID comes only from authenticated user
    const studentId = req.user.id;

    // Delete only the logged-in student's own enrollment
    const result =
      await Enrollment.deleteByStudent(
        id,
        studentId
      );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Enrollment not found",
      });
    }

    return res.status(200).json({
      message: "Enrollment cancelled successfully",
    });

  } catch (error) {
    console.error(
      "Error cancelling student enrollment:",
      error.message
    );

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


// Get students enrolled in a course
const getCourseEnrollments = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Check whether course exists
    const course =
      await Course.getById(courseId);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    const enrollments =
      await Enrollment.getByCourse(courseId);

    res.status(200).json({
      message:
        "Course enrollments retrieved successfully",
      course,
      enrollments,
    });

  } catch (error) {
    console.error(
      "Error getting course enrollments:",
      error.message
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};


// Get all enrollments
const getAllEnrollments = async (req, res) => {
  try {
    const enrollments =
      await Enrollment.getAll();

    res.status(200).json({
      message: "All enrollments retrieved successfully",
      enrollments,
    });

  } catch (error) {
    console.error(
      "Error getting all enrollments:",
      error.message
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};


// Existing admin delete enrollment
const deleteEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    const result =
      await Enrollment.delete(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Enrollment not found",
      });
    }

    res.status(200).json({
      message: "Enrollment deleted successfully",
    });

  } catch (error) {
    console.error(
      "Error deleting enrollment:",
      error.message
    );

    res.status(500).json({
      message: "Internal server error",
    });
  }
};


module.exports = {
  enrollInCourse,
  getMyEnrollments,
  cancelMyEnrollment,
  getCourseEnrollments,
  getAllEnrollments,
  deleteEnrollment,
};