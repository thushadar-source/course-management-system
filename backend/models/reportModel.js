
const db = require("../config/db");

const Report = {
  // =====================================================
  // ADMIN REPORT
  // =====================================================

  async getAdminOverview() {
    // Overall totals using SQL aggregation.
    const [overviewRows] = await db.execute(`
      SELECT
        (SELECT COUNT(*)
         FROM courses) AS totalCourses,

        (SELECT COUNT(*)
         FROM users
         WHERE role = 'student') AS totalStudents,

        (SELECT COUNT(*)
         FROM enrollments) AS totalEnrollments,

        (SELECT COUNT(DISTINCT e.student_id)
         FROM enrollments e
         INNER JOIN users u ON u.id = e.student_id
         WHERE u.role = 'student') AS studentsWithEnrollments,

        (SELECT COUNT(*)
         FROM enrollments
         WHERE enrolled_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
           AND enrolled_at <= NOW()) AS enrollmentsLast30Days,

        (SELECT COUNT(*)
         FROM courses c
         WHERE NOT EXISTS (
           SELECT 1
           FROM enrollments e
           WHERE e.course_id = c.id
         )) AS coursesWithoutEnrollments
    `);

    // Enrollment totals grouped by course category.
    const [categoryRows] = await db.execute(`
      SELECT
        c.category,
        COUNT(e.id) AS enrollmentCount
      FROM courses c
      LEFT JOIN enrollments e ON e.course_id = c.id
      GROUP BY c.category
      ORDER BY enrollmentCount DESC, c.category ASC
    `);

    // Top five courses by enrollment count.
    const [topCourseRows] = await db.execute(`
      SELECT
        c.id AS courseId,
        c.title,
        c.category,
        COUNT(e.id) AS enrollmentCount
      FROM courses c
      INNER JOIN enrollments e ON e.course_id = c.id
      GROUP BY c.id, c.title, c.category
      ORDER BY enrollmentCount DESC, c.title ASC, c.id ASC
      LIMIT 5
    `);

    // Recent enrollment records for the admin dashboard.
    const [recentEnrollmentRows] = await db.execute(`
      SELECT
        e.id,
        e.student_id,
        e.course_id,
        e.enrolled_at,
        u.username,
        u.full_name,
        c.title,
        c.category,
        c.level
      FROM enrollments e
      INNER JOIN users u ON u.id = e.student_id
      INNER JOIN courses c ON c.id = e.course_id
      WHERE u.role = 'student'
      ORDER BY e.enrolled_at DESC, e.id DESC
      LIMIT 6
    `);

    const overview = overviewRows[0];

    return {
      totalCourses: Number(overview.totalCourses || 0),
      totalStudents: Number(overview.totalStudents || 0),
      totalEnrollments: Number(overview.totalEnrollments || 0),
      studentsWithEnrollments: Number(
        overview.studentsWithEnrollments || 0
      ),
      enrollmentsLast30Days: Number(
        overview.enrollmentsLast30Days || 0
      ),
      coursesWithoutEnrollments: Number(
        overview.coursesWithoutEnrollments || 0
      ),

      enrollmentsByCategory: categoryRows.map((row) => ({
        category: row.category,
        enrollmentCount: Number(row.enrollmentCount || 0),
      })),

      topCourses: topCourseRows.map((row) => ({
        courseId: Number(row.courseId),
        title: row.title,
        category: row.category,
        enrollmentCount: Number(row.enrollmentCount || 0),
      })),

      recentEnrollments: recentEnrollmentRows,
    };
  },

  // =====================================================
  // STUDENT REPORT
  // =====================================================

  async getStudentReport(studentId) {
    // Only the specified student's enrollment records
    // are included in these aggregate calculations.
    const [summaryRows] = await db.execute(
      `
      SELECT
        COUNT(e.id) AS enrolledCourses,
        COUNT(DISTINCT c.category) AS distinctCategories,
        MIN(e.enrolled_at) AS earliestEnrollmentDate,
        MAX(e.enrolled_at) AS latestEnrollmentDate
      FROM enrollments e
      INNER JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = ?
      `,
      [studentId]
    );

    // Recent enrollment information for this student only.
    const [recentRows] = await db.execute(
      `
      SELECT
        e.id,
        e.course_id AS courseId,
        e.enrolled_at AS enrolledAt,
        c.title,
        c.category,
        c.level,
        c.price
      FROM enrollments e
      INNER JOIN courses c ON c.id = e.course_id
      WHERE e.student_id = ?
      ORDER BY e.enrolled_at DESC, e.id DESC
      LIMIT 5
      `,
      [studentId]
    );

    const summary = summaryRows[0];

    return {
      enrolledCourses: Number(summary.enrolledCourses || 0),
      distinctCategories: Number(summary.distinctCategories || 0),
      earliestEnrollmentDate: summary.earliestEnrollmentDate || null,
      latestEnrollmentDate: summary.latestEnrollmentDate || null,
      recentEnrollments: recentRows,
    };
  },
};

module.exports = Report;
