
const Report = require("../models/reportModel");

// =====================================================
// GET /api/reports/overview
// Admin-only overview report
// =====================================================

const getAdminOverview = async (req, res) => {
  try {
    const report = await Report.getAdminOverview();

    return res.status(200).json(report);
  } catch (error) {
    console.error("Admin report error:", error);

    return res.status(500).json({
      message: "Failed to generate the admin report.",
    });
  }
};

// =====================================================
// GET /api/reports/my
// Report for the logged-in student only
// =====================================================

const getMyReport = async (req, res) => {
  try {
    const studentId = Number(
      req.user?.id ?? req.user?.userId
    );

    if (
      !Number.isSafeInteger(studentId) ||
      studentId <= 0
    ) {
      return res.status(401).json({
        message: "Unable to identify the logged-in user.",
      });
    }

    const report = await Report.getStudentReport(studentId);

    return res.status(200).json(report);
  } catch (error) {
    console.error("Student report error:", error);

    return res.status(500).json({
      message: "Failed to generate your report.",
    });
  }
};

module.exports = {
  getAdminOverview,
  getMyReport
};
