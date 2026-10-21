
const db = require("../config/db");

const Enrollment = {
  async createWithCapacity(studentId, courseId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

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

      const course = courseRows[0];

      const [existingRows] = await connection.execute(
        `SELECT id FROM enrollments
         WHERE student_id = ? AND course_id = ?
         LIMIT 1`,
        [studentId, courseId]
      );

      if (existingRows.length > 0) {
        const error = new Error("Student already enrolled");
        error.code = "DUPLICATE_ENROLLMENT";
        throw error;
      }

      if (course.max_students !== null) {
        const [countRows] = await connection.execute(
          `SELECT COUNT(*) AS enrolled_count
           FROM enrollments WHERE course_id = ?`,
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

      const [result] = await connection.execute(
        `INSERT INTO enrollments (student_id, course_id)
         VALUES (?, ?)`,
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

  async create(studentId, courseId) {
    const [result] = await db.execute(
      `INSERT INTO enrollments (student_id, course_id)
       VALUES (?, ?)`,
      [studentId, courseId]
    );
    return result.insertId;
  },

  async findByStudentAndCourse(studentId, courseId) {
    const [rows] = await db.execute(
      `SELECT * FROM enrollments
       WHERE student_id = ? AND course_id = ?`,
      [studentId, courseId]
    );
    return rows[0];
  },

  async getByStudent(studentId) {
    const [rows] = await db.execute(
      `SELECT
         e.id, e.enrolled_at,
         c.id AS course_id, c.title, c.category, c.level,
         c.duration, c.price, c.image, c.description,
         c.max_students,
         (SELECT COUNT(*) FROM enrollments e2
          WHERE e2.course_id = c.id) AS enrolled_count,
         CASE WHEN c.max_students IS NULL THEN NULL
           ELSE GREATEST(c.max_students -
             (SELECT COUNT(*) FROM enrollments e2
              WHERE e2.course_id = c.id), 0)
         END AS seats_remaining,
         CASE WHEN c.max_students IS NULL THEN 0
           WHEN (SELECT COUNT(*) FROM enrollments e2
                 WHERE e2.course_id = c.id) >= c.max_students
           THEN 1 ELSE 0
         END AS is_full
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       WHERE e.student_id = ?
       ORDER BY e.enrolled_at DESC`,
      [studentId]
    );
    return rows;
  },

  async getByCourse(courseId) {
    const [rows] = await db.execute(
      `SELECT e.id, e.enrolled_at,
              u.id AS student_id, u.username, u.full_name
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       WHERE e.course_id = ?
       ORDER BY e.enrolled_at DESC`,
      [courseId]
    );
    return rows;
  },

  // CR-008: Server-side search, filtering, sorting and pagination.
  async getAllPaginated({
    q, courseId, from, to, sort, order, page, limit
  }) {
    const conditions = [];
    const params = [];

    if (q) {
      // Use ! as the LIKE escape character, so user-entered
      // %, _ and ! are treated as literal characters.
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

    const whereSql = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // Never interpolate user-provided column names into SQL.
    const sortColumns = {
      date: "e.enrolled_at",
      student: "u.full_name",
      course: "c.title"
    };

    const sortColumn = sortColumns[sort];
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
        e.id, e.enrolled_at,
        u.id AS student_id, u.username, u.full_name,
        c.id AS course_id, c.title, c.category, c.level,
        c.max_students,
        (SELECT COUNT(*) FROM enrollments e2
         WHERE e2.course_id = c.id) AS enrolled_count,
        CASE WHEN c.max_students IS NULL THEN NULL
          ELSE GREATEST(c.max_students -
            (SELECT COUNT(*) FROM enrollments e2
             WHERE e2.course_id = c.id), 0)
        END AS seats_remaining,
        CASE WHEN c.max_students IS NULL THEN 0
          WHEN (SELECT COUNT(*) FROM enrollments e2
                WHERE e2.course_id = c.id) >= c.max_students
          THEN 1 ELSE 0
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
      pagination: { page, limit, total, totalPages }
    };
  },

  // Retained for compatibility with existing callers.
  async getAll() {
    const [rows] = await db.execute(
      `SELECT
         e.id, e.enrolled_at,
         u.id AS student_id, u.username, u.full_name,
         c.id AS course_id, c.title, c.category, c.level,
         c.max_students,
         (SELECT COUNT(*) FROM enrollments e2
          WHERE e2.course_id = c.id) AS enrolled_count,
         CASE WHEN c.max_students IS NULL THEN NULL
           ELSE GREATEST(c.max_students -
             (SELECT COUNT(*) FROM enrollments e2
              WHERE e2.course_id = c.id), 0)
         END AS seats_remaining,
         CASE WHEN c.max_students IS NULL THEN 0
           WHEN (SELECT COUNT(*) FROM enrollments e2
                 WHERE e2.course_id = c.id) >= c.max_students
           THEN 1 ELSE 0
         END AS is_full
       FROM enrollments e
       JOIN users u ON e.student_id = u.id
       JOIN courses c ON e.course_id = c.id
       ORDER BY e.enrolled_at DESC`
    );
    return rows;
  },

  async getCourseEnrollmentCount(courseId) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS enrolled_count
       FROM enrollments WHERE course_id = ?`,
      [courseId]
    );
    return Number(rows[0].enrolled_count);
  },

  async delete(id) {
    const [result] = await db.execute(
      `DELETE FROM enrollments WHERE id = ?`,
      [id]
    );
    return result;
  },

  async deleteByStudent(id, studentId) {
    const [result] = await db.execute(
      `DELETE FROM enrollments
       WHERE id = ? AND student_id = ?`,
      [id, studentId]
    );
    return result;
  }
};

module.exports = Enrollment;
