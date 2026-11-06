
const db = require("../config/db");

const Enrollment = {
  // CR-011: Create a pending enrollment request.
  // Rejected requests can be submitted again.
  async createWithCapacity(studentId, courseId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Lock course row to prevent concurrent duplicate requests.
      const [courseRows] = await connection.execute(
        `SELECT id, max_students
         FROM courses
         WHERE id = ?
         FOR UPDATE`,
        [courseId]
      );

      if (courseRows.length === 0) {
        const error = new Error("Course not found");
        error.code = "COURSE_NOT_FOUND";
        throw error;
      }

      // Pending and approved requests prevent duplicate requests.
      // Rejected requests allow resubmission.
      const [existingRows] = await connection.execute(
        `SELECT id, status
         FROM enrollments
         WHERE student_id = ?
           AND course_id = ?
           AND status IN ('pending', 'approved')
         LIMIT 1`,
        [studentId, courseId]
      );

      if (existingRows.length > 0) {
        const error = new Error(
          existingRows[0].status === "pending"
            ? "Enrollment request is already pending"
            : "Student is already enrolled in this course"
        );

        error.code = "DUPLICATE_ENROLLMENT";
        throw error;
      }

      // Pending requests do not consume course capacity.
      // Capacity is checked only during approval.

      const [result] = await connection.execute(
        `INSERT INTO enrollments
         (student_id, course_id, status)
         VALUES (?, ?, 'pending')`,
        [studentId, courseId]
      );

      await connection.commit();
      return result.insertId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // All new enrollments start as pending.
  async create(studentId, courseId) {
    return this.createWithCapacity(studentId, courseId);
  },

  async findByStudentAndCourse(studentId, courseId) {
    const [rows] = await db.execute(
      `SELECT *
       FROM enrollments
       WHERE student_id = ?
         AND course_id = ?
       ORDER BY enrolled_at DESC
       LIMIT 1`,
      [studentId, courseId]
    );

    return rows[0];
  },

  // Student enrollment list.
  // Course capacity counts approved enrollments only.
  async getByStudent(studentId) {
    const [rows] = await db.execute(
      `SELECT
         e.id,
         e.enrolled_at,
         e.status,
         e.reviewed_by,
         e.reviewed_at,
         e.decision_note,

         c.id AS course_id,
         c.title,
         c.category,
         c.level,
         c.duration,
         c.price,
         c.image,
         c.description,
         c.max_students,

         (SELECT COUNT(*)
          FROM enrollments e2
          WHERE e2.course_id = c.id
            AND e2.status = 'approved'
         ) AS enrolled_count,

         CASE
           WHEN c.max_students IS NULL THEN NULL
           ELSE GREATEST(
             c.max_students -
             (SELECT COUNT(*)
              FROM enrollments e2
              WHERE e2.course_id = c.id
                AND e2.status = 'approved'),
             0
           )
         END AS seats_remaining,

         CASE
           WHEN c.max_students IS NULL THEN 0
           WHEN (SELECT COUNT(*)
                 FROM enrollments e2
                 WHERE e2.course_id = c.id
                   AND e2.status = 'approved') >= c.max_students
           THEN 1
           ELSE 0
         END AS is_full

       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.student_id = ?
       ORDER BY e.enrolled_at DESC`,
      [studentId]
    );

    return rows;
  },

  // Get enrollments for a particular course.
  async getByCourse(courseId) {
    const [rows] = await db.execute(
      `SELECT
         e.id,
         e.enrolled_at,
         e.status,
         e.reviewed_by,
         e.reviewed_at,
         e.decision_note,

         u.id AS student_id,
         u.username,
         u.full_name

       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       WHERE e.course_id = ?
       ORDER BY e.enrolled_at DESC`,
      [courseId]
    );

    return rows;
  },

  // CR-008 + CR-011:
  // Search, filtering, sorting and pagination.
  async getAllPaginated({
    q,
    courseId,
    from,
    to,
    status,
    sort,
    order,
    page,
    limit
  }) {
    const conditions = [];
    const params = [];

    if (q) {
      const escaped = q.replace(/[!%_]/g, "!$&");
      const pattern = `%${escaped}%`;

      conditions.push(
        "(u.full_name LIKE ? ESCAPE '!' OR u.username LIKE ? ESCAPE '!')"
      );

      params.push(pattern, pattern);
    }

    if (courseId !== undefined) {
      conditions.push("c.id = ?");
      params.push(Number(courseId));
    }

    if (from) {
      conditions.push("e.enrolled_at >= ?");
      params.push(`${from} 00:00:00`);
    }

    if (to) {
      conditions.push("e.enrolled_at < DATE_ADD(?, INTERVAL 1 DAY)");
      params.push(to);
    }

    // CR-011 status filter.
    if (status) {
      conditions.push("e.status = ?");
      params.push(status);
    }

    const whereSql = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const sortColumns = {
      date: "e.enrolled_at",
      student: "u.full_name",
      course: "c.title"
    };

    const sortColumn = sortColumns[sort] || "e.enrolled_at";
    const direction = order === "asc" ? "ASC" : "DESC";
    const offset = (page - 1) * limit;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN courses c ON e.course_id = c.id
      ${whereSql}
    `;

    const [countRows] = await db.execute(countSql, params);

    const total = Number(countRows[0].total);
    const totalPages = Math.ceil(total / limit);

    const dataSql = `
      SELECT
        e.id,
        e.enrolled_at,
        e.status,
        e.reviewed_by,
        e.reviewed_at,
        e.decision_note,

        u.id AS student_id,
        u.username,
        u.full_name,

        c.id AS course_id,
        c.title,
        c.category,
        c.level,
        c.max_students,

        (SELECT COUNT(*)
         FROM enrollments e2
         WHERE e2.course_id = c.id
           AND e2.status = 'approved'
        ) AS enrolled_count,

        CASE
          WHEN c.max_students IS NULL THEN NULL
          ELSE GREATEST(
            c.max_students -
            (SELECT COUNT(*)
             FROM enrollments e2
             WHERE e2.course_id = c.id
               AND e2.status = 'approved'),
            0
          )
        END AS seats_remaining,

        CASE
          WHEN c.max_students IS NULL THEN 0
          WHEN (SELECT COUNT(*)
                FROM enrollments e2
                WHERE e2.course_id = c.id
                  AND e2.status = 'approved') >= c.max_students
          THEN 1
          ELSE 0
        END AS is_full

      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      JOIN courses c ON e.course_id = c.id
      ${whereSql}
      ORDER BY ${sortColumn} ${direction}, e.id ASC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.execute(
      dataSql,
      [...params, limit, offset]
    );

    return {
      enrollments: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  },

  // Retained for compatibility with existing callers.
  async getAll() {
    const [rows] = await db.execute(
      `SELECT
         e.id,
         e.enrolled_at,
         e.status,
         e.reviewed_by,
         e.reviewed_at,
         e.decision_note,

         u.id AS student_id,
         u.username,
         u.full_name,

         c.id AS course_id,
         c.title,
         c.category,
         c.level,
         c.max_students,

         (SELECT COUNT(*)
          FROM enrollments e2
          WHERE e2.course_id = c.id
            AND e2.status = 'approved'
         ) AS enrolled_count,

         CASE
           WHEN c.max_students IS NULL THEN NULL
           ELSE GREATEST(
             c.max_students -
             (SELECT COUNT(*)
              FROM enrollments e2
              WHERE e2.course_id = c.id
                AND e2.status = 'approved'),
             0
           )
         END AS seats_remaining,

         CASE
           WHEN c.max_students IS NULL THEN 0
           WHEN (SELECT COUNT(*)
                 FROM enrollments e2
                 WHERE e2.course_id = c.id
                   AND e2.status = 'approved') >= c.max_students
           THEN 1
           ELSE 0
         END AS is_full

       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       JOIN courses c ON e.course_id = c.id
       ORDER BY e.enrolled_at DESC`
    );

    return rows;
  },

  // CR-011: Approve a pending enrollment.
  // Course row lock protects the last available seat.
  async approve(id, adminId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Find the requested course.
      const [initialRows] = await connection.execute(
        `SELECT course_id
         FROM enrollments
         WHERE id = ?`,
        [id]
      );

      if (initialRows.length === 0) {
        const error = new Error("Enrollment not found");
        error.code = "ENROLLMENT_NOT_FOUND";
        throw error;
      }

      const courseId = initialRows[0].course_id;

      // Serialize approvals for this course.
      const [courseRows] = await connection.execute(
        `SELECT id, max_students
         FROM courses
         WHERE id = ?
         FOR UPDATE`,
        [courseId]
      );

      if (courseRows.length === 0) {
        const error = new Error("Course not found");
        error.code = "COURSE_NOT_FOUND";
        throw error;
      }

      // Lock and re-check enrollment status.
      const [enrollmentRows] = await connection.execute(
        `SELECT id, student_id, course_id, status
         FROM enrollments
         WHERE id = ?
         FOR UPDATE`,
        [id]
      );

      if (
        enrollmentRows.length === 0 ||
        enrollmentRows[0].status !== "pending"
      ) {
        const error = new Error(
          "Only pending enrollment requests can be approved"
        );

        error.code = "NOT_PENDING";
        throw error;
      }

      const enrollment = enrollmentRows[0];
      const course = courseRows[0];

      // Re-check duplicate approved enrollment.
      const [duplicateRows] = await connection.execute(
        `SELECT id
         FROM enrollments
         WHERE student_id = ?
           AND course_id = ?
           AND status = 'approved'
           AND id != ?
         LIMIT 1`,
        [enrollment.student_id, courseId, id]
      );

      if (duplicateRows.length > 0) {
        const error = new Error(
          "Student already has an approved enrollment"
        );

        error.code = "DUPLICATE_ENROLLMENT";
        throw error;
      }

      // Re-check capacity using approved enrollments only.
      if (course.max_students !== null) {
        const [countRows] = await connection.execute(
          `SELECT COUNT(*) AS enrolled_count
           FROM enrollments
           WHERE course_id = ?
             AND status = 'approved'`,
          [courseId]
        );

        if (
          Number(countRows[0].enrolled_count) >=
          Number(course.max_students)
        ) {
          const error = new Error("Course is full");
          error.code = "COURSE_FULL";
          throw error;
        }
      }

      // Reviewer ID comes from authenticated administrator.
      const [result] = await connection.execute(
        `UPDATE enrollments
         SET status = 'approved',
             reviewed_by = ?,
             reviewed_at = CURRENT_TIMESTAMP,
             decision_note = NULL
         WHERE id = ?
           AND status = 'pending'`,
        [adminId, id]
      );

      if (result.affectedRows !== 1) {
        const error = new Error(
          "Enrollment request could not be approved"
        );

        error.code = "NOT_PENDING";
        throw error;
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // CR-011: Reject a pending enrollment with a reason.
  async reject(id, adminId, reason) {
    if (!reason || !reason.trim()) {
      const error = new Error("Rejection reason is required");
      error.code = "REJECTION_REASON_REQUIRED";
      throw error;
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.execute(
        `SELECT id, status
         FROM enrollments
         WHERE id = ?
         FOR UPDATE`,
        [id]
      );

      if (rows.length === 0) {
        const error = new Error("Enrollment not found");
        error.code = "ENROLLMENT_NOT_FOUND";
        throw error;
      }

      if (rows[0].status !== "pending") {
        const error = new Error(
          "Only pending enrollment requests can be rejected"
        );

        error.code = "NOT_PENDING";
        throw error;
      }

      const [result] = await connection.execute(
        `UPDATE enrollments
         SET status = 'rejected',
             reviewed_by = ?,
             reviewed_at = CURRENT_TIMESTAMP,
             decision_note = ?
         WHERE id = ?
           AND status = 'pending'`,
        [adminId, reason.trim(), id]
      );

      if (result.affectedRows !== 1) {
        const error = new Error(
          "Enrollment request could not be rejected"
        );

        error.code = "NOT_PENDING";
        throw error;
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  // Approved enrollments only count towards course capacity.
  async getCourseEnrollmentCount(courseId) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS enrolled_count
       FROM enrollments
       WHERE course_id = ?
         AND status = 'approved'`,
      [courseId]
    );

    return Number(rows[0].enrolled_count);
  },

  // Admin can delete any enrollment.
  async delete(id) {
    const [result] = await db.execute(
      `DELETE FROM enrollments WHERE id = ?`,
      [id]
    );

    return result;
  },

  // Students may cancel pending requests only.
  async deleteByStudent(id, studentId) {
    const [result] = await db.execute(
      `DELETE FROM enrollments
       WHERE id = ?
         AND student_id = ?
         AND status = 'pending'`,
      [id, studentId]
    );

    return result;
  }
};

module.exports = Enrollment;
