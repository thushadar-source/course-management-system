
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBook,
  FaEye,
  FaGraduationCap,
  FaSearch,
} from "react-icons/fa";

import api from "../services/api";
import { getUser } from "../services/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const EMPTY_REPORT = {
  enrolledCourses: 0,
  distinctCategories: 0,
  earliestEnrollmentDate: null,
  latestEnrollmentDate: null,
  recentEnrollments: [],
};

function StudentDashboard() {
  const [report, setReport] = useState(EMPTY_REPORT);

  const [stats, setStats] = useState({
    courseCount: 0,
    studentCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statsError, setStatsError] = useState("");

  const user = getUser();

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      const reportRequest = api.get("/reports/my");
      const statsRequest = api.get("/courses/stats");

      const [reportResult, statsResult] = await Promise.allSettled([
        reportRequest,
        statsRequest,
      ]);

      if (!isMounted) return;

      // Process the personal student report independently.
      if (reportResult.status === "fulfilled") {
        const data = reportResult.value.data || {};

        setReport({
          ...EMPTY_REPORT,
          ...data,
          recentEnrollments: Array.isArray(
            data.recentEnrollments
          )
            ? data.recentEnrollments
            : [],
        });

        setError("");
      } else {
        setError(
          reportResult.reason?.response?.data?.message ||
            "Failed to load your learning report. Please try again later."
        );
      }

      // Other dashboard statistics are independent.
      if (statsResult.status === "fulfilled") {
        const data = statsResult.value.data || {};

        setStats({
          courseCount: Number(data.courseCount) || 0,
          studentCount: Number(data.studentCount) || 0,
        });

        setStatsError("");
      } else {
        setStatsError(
          statsResult.reason?.response?.data?.message ||
            "Course statistics are temporarily unavailable."
        );
      }

      setLoading(false);
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatNumber = (value) => {
    const number = Number(value);

    return Number.isFinite(number)
      ? number.toLocaleString()
      : "0";
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "-"
      : date.toLocaleDateString();
  };

  const formatPrice = (value) => {
    const price = Number(value);

    return Number.isFinite(price)
      ? price.toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0.00";
  };

  const recentEnrollments = report.recentEnrollments;

  return (
    <>
      <Navbar />

      <main className="container">
        {/* Welcome */}
        <div className="page-header">
          <div>
            <h1>Student Dashboard</h1>

            <p className="page-subtitle">
              Welcome back,{" "}
              {user?.full_name || user?.username}!
              {" "}Here is your learning activity summary.
            </p>
          </div>

          <Link
            to="/courses"
            className="btn btn-primary"
          >
            <FaSearch />
            Browse Courses
          </Link>
        </div>

        {/* Report error does not prevent other dashboard sections */}
        {error && <p className="error">{error}</p>}

        {statsError && (
          <p className="notice">{statsError}</p>
        )}

        {/* Main statistics */}
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading
                ? "..."
                : formatNumber(report.enrolledCourses)}
            </span>

            <span className="dashboard-card-label">
              My Enrolled Courses
            </span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading
                ? "..."
                : formatNumber(report.distinctCategories)}
            </span>

            <span className="dashboard-card-label">
              Categories Explored
            </span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : formatNumber(stats.courseCount)}
            </span>

            <span className="dashboard-card-label">
              Courses Available
            </span>
          </div>

          <div className="dashboard-card">
            <span className="dashboard-card-value">
              {loading ? "..." : formatNumber(stats.studentCount)}
            </span>

            <span className="dashboard-card-label">
              Registered Students
            </span>
          </div>
        </div>

        {/* Enrollment date summary */}
        <section className="section-card">
          <div className="section-card-header">
            <h2>My Enrollment Summary</h2>
          </div>

          {loading ? (
            <p className="loading">
              Loading your enrollment summary...
            </p>
          ) : (
            <div className="cr009-student-summary">
              <div className="cr009-summary-item">
                <span>First Enrollment</span>
                <strong>
                  {formatDate(report.earliestEnrollmentDate)}
                </strong>
              </div>

              <div className="cr009-summary-item">
                <span>Latest Enrollment</span>
                <strong>
                  {formatDate(report.latestEnrollmentDate)}
                </strong>
              </div>
            </div>
          )}

          {!loading && report.enrolledCourses === 0 && (
            <p className="empty">
              You have not enrolled in any courses yet.
              Browse the courses page to get started.
            </p>
          )}
        </section>

        {/* Recent enrollments */}
        <section className="section-card">
          <div className="section-card-header">
            <h2>My Recent Enrollments</h2>

            <Link
              to="/my-enrollments"
              className="link-inline"
            >
              <FaEye />
              {" "}View all
            </Link>
          </div>

          {loading ? (
            <p className="loading">
              Loading your recent enrollments...
            </p>
          ) : recentEnrollments.length === 0 ? (
            <p className="empty">
              No recent enrollments to display.
            </p>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Category</th>
                    <th>Level</th>
                    <th>Price</th>
                    <th>Enrolled On</th>
                  </tr>
                </thead>

                <tbody>
                  {recentEnrollments.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td>
                        <Link
                          to={`/courses/${enrollment.courseId}`}
                        >
                          {enrollment.title || "-"}
                        </Link>
                      </td>

                      <td>{enrollment.category || "-"}</td>

                      <td>
                        <span className="tag tag-level">
                          {enrollment.level || "-"}
                        </span>
                      </td>

                      <td>
                        Rs. {formatPrice(enrollment.price)}
                      </td>

                      <td>
                        {formatDate(enrollment.enrolledAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quick actions */}
        <section className="section-card">
          <div className="section-card-header">
            <h2>Quick Actions</h2>
          </div>

          <div className="quick-actions">
            <Link
              to="/courses"
              className="quick-action"
            >
              <span className="quick-action-icon">
                <FaBook />
              </span>
              <span>Browse all courses</span>
            </Link>

            <Link
              to="/my-enrollments"
              className="quick-action"
            >
              <span className="quick-action-icon">
                <FaGraduationCap />
              </span>
              <span>View my enrollments</span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default StudentDashboard;
