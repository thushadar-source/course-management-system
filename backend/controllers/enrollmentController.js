
const Enrollment = require("../models/enrollmentModel");
const Course = require("../models/courseModel");

const enrollInCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const studentId = req.user.id;

    if (
      courseId === undefined ||
      courseId === null ||
      courseId === "" ||
      !/^\d+$/.test(String(courseId)) ||
      Number(courseId) <= 0
    ) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const course = await Course.getById(Number(courseId));
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const existing = await Enrollment.findByStudentAndCourse(
      studentId, Number(courseId)
    );

    if (existing) {
      return res.status(409).json({
        message: "You are already enrolled in this course"
      });
    }

    const enrollmentId = await Enrollment.createWithCapacity(
      studentId, Number(courseId)
    );

    return res.status(201).json({
      message: "Course enrollment successful",
      enrollmentId
    });
  } catch (error) {
    console.error("Error enrolling in course:", error.message);

    if (error.code === "COURSE_FULL") {
      return res.status(409).json({
        message: "Course is full. No seats are available."
      });
    }

    if (error.code === "DUPLICATE_ENROLLMENT") {
      return res.status(409).json({
        message: "You are already enrolled in this course"
      });
    }

    if (error.code === "COURSE_NOT_FOUND") {
      return res.status(404).json({ message: "Course not found" });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
};

const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.getByStudent(req.user.id);
    return res.status(200).json({
      message: "Enrollments retrieved successfully",
      enrollments
    });
  } catch (error) {
    console.error("Error getting student enrollments:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const cancelMyEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id) || Number(id) <= 0) {
      return res.status(400).json({ message: "Invalid enrollment ID" });
    }

    const result = await Enrollment.deleteByStudent(
      Number(id), req.user.id
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    return res.status(200).json({
      message: "Enrollment cancelled successfully"
    });
  } catch (error) {
    console.error("Error cancelling student enrollment:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getCourseEnrollments = async (req, res) => {
  try {
    const { courseId } = req.params;

    if (!/^\d+$/.test(courseId) || Number(courseId) <= 0) {
      return res.status(400).json({ message: "Invalid course ID" });
    }

    const course = await Course.getById(Number(courseId));
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    const enrollments = await Enrollment.getByCourse(Number(courseId));

    return res.status(200).json({
      message: "Course enrollments retrieved successfully",
      course,
      enrollments
    });
  } catch (error) {
    console.error("Error getting course enrollments:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getAllEnrollments = async (req, res) => {
  try {
    const query = req.query;

    const allowedParams = new Set([
      "q", "courseId", "from", "to", "sort", "order", "page", "limit"
    ]);

    for (const key of Object.keys(query)) {
      if (!allowedParams.has(key)) {
        return res.status(400).json({
          message: `Unsupported query parameter: ${key}`
        });
      }

      if (Array.isArray(query[key])) {
        return res.status(400).json({
          message: `Invalid ${key} parameter`
        });
      }
    }

    const positiveInteger = (value, name, fallback, maximum = Infinity) => {
      if (value === undefined) return fallback;

      if (!/^\d+$/.test(value)) {
        throw new Error(`Invalid ${name}: must be a positive integer`);
      }

      const number = Number(value);

      if (
        !Number.isSafeInteger(number) ||
        number < 1 ||
        number > maximum
      ) {
        throw new Error(`Invalid ${name}`);
      }

      return number;
    };

    const validDate = (value, name) => {
      if (value === undefined) return undefined;

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
      ) {
        throw new Error(`Invalid ${name}: use YYYY-MM-DD`);
      }

      const date = new Date(`${value}T00:00:00.000Z`);

      if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
      ) {
        throw new Error(`Invalid ${name}: not a valid date`);
      }

      return value;
    };

    const page = positiveInteger(query.page, "page", 1);
    const limit = positiveInteger(query.limit, "limit", 20, 100);
    const courseId = query.courseId === undefined
      ? undefined
      : positiveInteger(query.courseId, "courseId", undefined);

    const from = validDate(query.from, "from");
    const to = validDate(query.to, "to");

    if (from && to && from > to) {
      return res.status(400).json({
        message: "'from' must be on or before 'to'"
      });
    }

    const sort = query.sort === undefined ? "date" : query.sort;
    const order = query.order === undefined ? "desc" : query.order;

    if (!["date", "student", "course"].includes(sort)) {
      return res.status(400).json({
        message: "Invalid sort. Use date, student, or course."
      });
    }

    if (!["asc", "desc"].includes(order)) {
      return res.status(400).json({
        message: "Invalid order. Use asc or desc."
      });
    }

    if (query.q !== undefined && query.q.length > 200) {
      return res.status(400).json({
        message: "Search query must not exceed 200 characters"
      });
    }

    const result = await Enrollment.getAllPaginated({
      q: query.q?.trim() || "",
      courseId,
      from,
      to,
      sort,
      order,
      page,
      limit
    });

    return res.status(200).json({
      message: "Enrollments retrieved successfully",
      enrollments: result.enrollments,
      pagination: result.pagination
    });
  } catch (error) {
    if (
      error.message.startsWith("Invalid ") ||
      error.message.startsWith("Unsupported ")
    ) {
      return res.status(400).json({ message: error.message });
    }

    console.error("Error getting all enrollments:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const deleteEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id) || Number(id) <= 0) {
      return res.status(400).json({ message: "Invalid enrollment ID" });
    }

    const result = await Enrollment.delete(Number(id));

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    return res.status(200).json({
      message: "Enrollment deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting enrollment:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  enrollInCourse,
  getMyEnrollments,
  cancelMyEnrollment,
  getCourseEnrollments,
  getAllEnrollments,
  deleteEnrollment
};
