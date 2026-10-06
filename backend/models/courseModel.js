const db = require("../config/db");

const Course = {

  // Get all courses with availability information
  async getAll() {
    const [rows] = await db.execute(
      `SELECT
          c.*,
          COALESCE(ec.enrolled_count, 0) AS enrolled_count,

          CASE
            WHEN c.max_students IS NULL THEN NULL
            ELSE GREATEST(
              c.max_students - COALESCE(ec.enrolled_count, 0),
              0
            )
          END AS seats_remaining,

          CASE
            WHEN c.max_students IS NULL THEN 0
            WHEN COALESCE(ec.enrolled_count, 0) >= c.max_students THEN 1
            ELSE 0
          END AS is_full

       FROM courses c

       LEFT JOIN (
         SELECT
           course_id,
           COUNT(*) AS enrolled_count
         FROM enrollments
         GROUP BY course_id
       ) ec
       ON ec.course_id = c.id

       ORDER BY c.id ASC`
    );

    return rows;
  },


  // Get one course with availability information
  async getById(id) {
    const [rows] = await db.execute(
      `SELECT
          c.*,
          COALESCE(ec.enrolled_count, 0) AS enrolled_count,

          CASE
            WHEN c.max_students IS NULL THEN NULL
            ELSE GREATEST(
              c.max_students - COALESCE(ec.enrolled_count, 0),
              0
            )
          END AS seats_remaining,

          CASE
            WHEN c.max_students IS NULL THEN 0
            WHEN COALESCE(ec.enrolled_count, 0) >= c.max_students THEN 1
            ELSE 0
          END AS is_full

       FROM courses c

       LEFT JOIN (
         SELECT
           course_id,
           COUNT(*) AS enrolled_count
         FROM enrollments
         GROUP BY course_id
       ) ec
       ON ec.course_id = c.id

       WHERE c.id = ?`,
      [id]
    );

    return rows[0];
  },


  // Create a new course
  async create(course) {
    const {
      title,
      category,
      level,
      duration,
      price,
      image,
      description,
      max_students,
    } = course;

    const [result] = await db.execute(
      `INSERT INTO courses
       (
         title,
         category,
         level,
         duration,
         price,
         image,
         description,
         max_students
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        category,
        level,
        duration,
        price,
        image,
        description,
        max_students,
      ]
    );

    return result.insertId;
  },


  // Update an existing course
  async update(id, course) {
    const {
      title,
      category,
      level,
      duration,
      price,
      image,
      description,
      max_students,
    } = course;

    const [result] = await db.execute(
      `UPDATE courses
       SET
         title = ?,
         category = ?,
         level = ?,
         duration = ?,
         price = ?,
         image = ?,
         description = ?,
         max_students = ?
       WHERE id = ?`,
      [
        title,
        category,
        level,
        duration,
        price,
        image,
        description,
        max_students,
        id,
      ]
    );

    return result;
  },


  // Delete a course
  async delete(id) {
    const [result] = await db.execute(
      "DELETE FROM courses WHERE id = ?",
      [id]
    );

    return result;
  },


  // Get the current approved enrollment count
  async getEnrollmentCount(id) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS enrolled_count
       FROM enrollments
       WHERE course_id = ?`,
      [id]
    );

    return Number(rows[0].enrolled_count);
  },

};

module.exports = Course;