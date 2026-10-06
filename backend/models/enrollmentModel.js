const db = require("../config/db");

const Enrollment = {

  // Create enrollment with capacity protection
  async createWithCapacity(studentId, courseId) {
    const connection = await db.getConnection();

    try {
      // Start transaction
      await connection.beginTransaction();

      /*
       * Lock the course row.
       * This prevents two concurrent enrollment requests
       * from checking the same available seat at the same time.
       */
      const [courseRows] = await connection.execute(
        `SELECT
            id,
            max_students
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

      // Check duplicate enrollment inside transaction
      const [existingRows] = await connection.execute(
        `SELECT id
         FROM enrollments
         WHERE student_id = ?
         AND course_id = ?
         LIMIT 1`,
        [studentId, courseId]
      );

      if (existingRows.length > 0) {
        const error = new Error(
          "Student already enrolled"
        );
        error.code = "DUPLICATE_ENROLLMENT";
        throw error;
      }

      /*
       * NULL max_students means unlimited.
       * Therefore capacity checking is skipped for unlimited courses.
       */
      if (course.max_students !== null) {

        // Count current enrollments while course row is locked
        const [countRows] = await connection.execute(
          `SELECT COUNT(*) AS enrolled_count
           FROM enrollments
           WHERE course_id = ?`,
          [courseId]
        );

        const enrolledCount =
          Number(countRows[0].enrolled_count);

        // Reject when capacity has already been reached
        if (enrolledCount >= Number(course.max_students)) {
          const error = new Error(
            "Course is full"
          );
          error.code = "COURSE_FULL";
          throw error;
        }
      }

      // Insert enrollment
      const [result] = await connection.execute(
        `INSERT INTO enrollments
         (student_id, course_id)
         VALUES (?, ?)`,
        [studentId, courseId]
      );

      // Commit transaction
      await connection.commit();

      return result.insertId;

    } catch (error) {

      // Roll back if anything fails
      await connection.rollback();

      throw error;

    } finally {

      // Always release database connection
      connection.release();
    }
  },


  // Existing create method
  async create(studentId, courseId) {
    const [result] = await db.execute(
      `INSERT INTO enrollments
       (student_id, course_id)
       VALUES (?, ?)`,
      [studentId, courseId]
    );

    return result.insertId;
  },


  // Check if student is already enrolled
  async findByStudentAndCourse(studentId, courseId) {
    const [rows] = await db.execute(
      `SELECT *
       FROM enrollments
       WHERE student_id = ?
       AND course_id = ?`,
      [studentId, courseId]
    );

    return rows[0];
  },


  // Get all courses enrolled by a student
  async getByStudent(studentId) {
    const [rows] = await db.execute(
      `SELECT
          e.id,
          e.enrolled_at,
          c.id AS course_id,
          c.title,
          c.category,
          c.level,
          c.duration,
          c.price,
          c.image,
          c.description,
          c.max_students,

          (
            SELECT COUNT(*)
            FROM enrollments e2
            WHERE e2.course_id = c.id
          ) AS enrolled_count,

          CASE
            WHEN c.max_students IS NULL THEN NULL
            ELSE GREATEST(
              c.max_students -
              (
                SELECT COUNT(*)
                FROM enrollments e2
                WHERE e2.course_id = c.id
              ),
              0
            )
          END AS seats_remaining,

          CASE
            WHEN c.max_students IS NULL THEN 0
            WHEN (
              SELECT COUNT(*)
              FROM enrollments e2
              WHERE e2.course_id = c.id
            ) >= c.max_students THEN 1
            ELSE 0
          END AS is_full

       FROM enrollments e
       JOIN courses c
         ON e.course_id = c.id

       WHERE e.student_id = ?

       ORDER BY e.enrolled_at DESC`,
      [studentId]
    );

    return rows;
  },


  // Get all students enrolled in a course
  async getByCourse(courseId) {
    const [rows] = await db.execute(
      `SELECT
          e.id,
          e.enrolled_at,
          u.id AS student_id,
          u.username,
          u.full_name
       FROM enrollments e
       JOIN users u
         ON e.student_id = u.id
       WHERE e.course_id = ?
       ORDER BY e.enrolled_at DESC`,
      [courseId]
    );

    return rows;
  },


  // Get all enrollments
  async getAll() {
    const [rows] = await db.execute(
      `SELECT
          e.id,
          e.enrolled_at,

          u.id AS student_id,
          u.username,
          u.full_name,

          c.id AS course_id,
          c.title,
          c.category,
          c.level,
          c.max_students,

          (
            SELECT COUNT(*)
            FROM enrollments e2
            WHERE e2.course_id = c.id
          ) AS enrolled_count,

          CASE
            WHEN c.max_students IS NULL THEN NULL
            ELSE GREATEST(
              c.max_students -
              (
                SELECT COUNT(*)
                FROM enrollments e2
                WHERE e2.course_id = c.id
              ),
              0
            )
          END AS seats_remaining,

          CASE
            WHEN c.max_students IS NULL THEN 0
            WHEN (
              SELECT COUNT(*)
              FROM enrollments e2
              WHERE e2.course_id = c.id
            ) >= c.max_students THEN 1
            ELSE 0
          END AS is_full

       FROM enrollments e

       JOIN users u
         ON e.student_id = u.id

       JOIN courses c
         ON e.course_id = c.id

       ORDER BY e.enrolled_at DESC`
    );

    return rows;
  },


  // Get current enrollment count for a course
  async getCourseEnrollmentCount(courseId) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS enrolled_count
       FROM enrollments
       WHERE course_id = ?`,
      [courseId]
    );

    return Number(rows[0].enrolled_count);
  },


  // Admin delete enrollment
  async delete(id) {
    const [result] = await db.execute(
      `DELETE FROM enrollments
       WHERE id = ?`,
      [id]
    );

    return result;
  },


  // Student cancellation
  async deleteByStudent(id, studentId) {
    const [result] = await db.execute(
      `DELETE FROM enrollments
       WHERE id = ?
       AND student_id = ?`,
      [id, studentId]
    );

    return result;
  },

};

module.exports = Enrollment;