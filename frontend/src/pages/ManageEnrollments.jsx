import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaSearch } from "react-icons/fa";

import api from "../services/api";
import { getUser } from "../services/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function MyEnrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortOption, setSortOption] = useState("newest");

  const user = getUser();

  useEffect(() => {
    const getEnrollments = async () => {
      try {
        const response = await api.get("/enrollments/my");

        setEnrollments(response.data.enrollments || []);
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to load your enrollments"
        );
      } finally {
        setLoading(false);
      }
    };

    getEnrollments();
  }, []);

  // Safe price conversion
  const getSafePrice = (price) => {
    const numericPrice = Number(price);

    return Number.isFinite(numericPrice) ? numericPrice : 0;
  };

  // Summary values
  const totalEnrolledCourses = enrollments.length;

  const totalCourseValue = enrollments.reduce(
    (total, enrollment) => {
      return total + getSafePrice(enrollment.price);
    },
    0
  );

  const averageCoursePrice =
    totalEnrolledCourses > 0
      ? totalCourseValue / totalEnrolledCourses
      : 0;

  const distinctCategories = new Set(
    enrollments
      .map((enrollment) => enrollment.category)
      .filter((category) => category)
  ).size;

  // Sorting
  const sortedEnrollments = useMemo(() => {
    const sorted = [...enrollments];

    switch (sortOption) {
      case "oldest":
        return sorted.sort(
          (a, b) =>
            new Date(a.enrolled_at || 0) -
            new Date(b.enrolled_at || 0)
        );

      case "priceHigh":
        return sorted.sort(
          (a, b) =>
            getSafePrice(b.price) -
            getSafePrice(a.price)
        );

      case "priceLow":
        return sorted.sort(
          (a, b) =>
            getSafePrice(a.price) -
            getSafePrice(b.price)
        );

      case "titleAZ":
        return sorted.sort((a, b) => {
          const titleA = String(a.title || "").toLowerCase();
          const titleB = String(b.title || "").toLowerCase();

          return titleA.localeCompare(titleB);
        });

      case "newest":
      default:
        return sorted.sort(
          (a, b) =>
            new Date(b.enrolled_at || 0) -
            new Date(a.enrolled_at || 0)
        );
    }
  }, [enrollments, sortOption]);

  // Format date
  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString();
  };

  return (
    <>
      <Navbar />

      <div className="container">

        <div className="page-header">
          <div>
            <h1>My Enrollments</h1>

            <p className="page-subtitle">
              {user?.full_name
                ? `${user.full_name}, these are the courses you are enrolled in.`
                : "These are the courses you are enrolled in."}
            </p>
          </div>

          <Link to="/courses" className="btn btn-primary">
            <FaSearch />
            Browse More Courses
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <p className="loading">
            Loading your enrollments...
          </p>
        )}

        {/* Error */}
        {error && !loading && (
          <p className="error">{error}</p>
        )}

        {!loading && !error && (
          <>
            {/* Summary */}
            <div className="enrollment-summary">

              <div className="summary-card">
                <h3>Total Enrolled Courses</h3>
                <p>{totalEnrolledCourses}</p>
              </div>

              <div className="summary-card">
                <h3>Total Course Value</h3>
                <p>
                  Rs. {totalCourseValue.toFixed(2)}
                </p>
              </div>

              <div className="summary-card">
                <h3>Average Course Price</h3>
                <p>
                  Rs. {averageCoursePrice.toFixed(2)}
                </p>
              </div>

              <div className="summary-card">
                <h3>Course Categories</h3>
                <p>{distinctCategories}</p>
              </div>

            </div>

            {/* Sorting */}
            <div className="enrollment-controls">

              <label htmlFor="enrollment-sort">
                <strong>Sort By:</strong>
              </label>

              <select
                id="enrollment-sort"
                value={sortOption}
                onChange={(e) =>
                  setSortOption(e.target.value)
                }
              >
                <option value="newest">
                  Newest Enrolled
                </option>

                <option value="oldest">
                  Oldest Enrolled
                </option>

                <option value="priceHigh">
                  Price: High to Low
                </option>

                <option value="priceLow">
                  Price: Low to High
                </option>

                <option value="titleAZ">
                  Course Title: A to Z
                </option>
              </select>

            </div>

            {/* Empty state */}
            {enrollments.length === 0 && (
              <div className="empty-box">

                <p className="empty">
                  You are not enrolled in any courses yet.
                </p>

                <Link
                  to="/courses"
                  className="btn btn-primary"
                >
                  <FaSearch />
                  Find a Course
                </Link>

              </div>
            )}

            {/* Course cards */}
            {sortedEnrollments.length > 0 && (
              <div className="course-grid">

                {sortedEnrollments.map((enrollment) => (
                  <article
                    className="course-card"
                    key={enrollment.id}
                  >

                    <img
                      src={enrollment.image}
                      alt={enrollment.title}
                      className="course-card-image"
                      loading="lazy"
                    />

                    <div className="course-card-body">

                      <div className="course-card-tags">

                        <span className="tag tag-category">
                          {enrollment.category}
                        </span>

                        <span className="tag tag-level">
                          {enrollment.level}
                        </span>

                      </div>

                      <h3 className="course-card-title">
                        {enrollment.title}
                      </h3>

                      <p className="course-card-summary">
                        {(enrollment.description || "").slice(
                          0,
                          100
                        )}

                        {(enrollment.description || "").length >
                        100
                          ? "..."
                          : ""}
                      </p>

                      <ul className="course-card-meta">

                        <li>
                          <strong>Duration:</strong>{" "}
                          {enrollment.duration || "-"}
                        </li>

                        <li>
                          <strong>Price:</strong>{" "}
                          Rs.{" "}
                          {getSafePrice(
                            enrollment.price
                          ).toFixed(2)}
                        </li>

                        <li>
                          <strong>Enrolled on:</strong>{" "}
                          {formatDate(
                            enrollment.enrolled_at
                          )}
                        </li>

                      </ul>

                      <Link
                        to={`/courses/${enrollment.course_id}`}
                        className="btn btn-outline btn-block"
                      >
                        View Course
                      </Link>

                    </div>
                  </article>
                ))}

              </div>
            )}
          </>
        )}

      </div>

      <Footer />
    </>
  );
}

export default MyEnrollments;