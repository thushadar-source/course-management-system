import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  FaChartBar,
  FaGraduationCap,
  FaShoppingCart,
  FaSignInAlt,
} from "react-icons/fa";

import api from "../services/api";
import {
  isLoggedIn,
  isStudent,
  isAdmin,
} from "../services/auth";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function CourseDetails() {
  const { id } = useParams();
  const location = useLocation();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] =
    useState(false);

  // Read login state
  const loggedIn = isLoggedIn();
  const studentLoggedIn = isStudent();
  const adminLoggedIn = isAdmin();

  // ---------- Availability helpers ----------
  const isCourseFull =
    course &&
    course.max_students !== null &&
    Number(course.is_full) === 1;

  const isUnlimited =
    course &&
    course.max_students === null;

  const availabilityText = () => {
    if (!course) {
      return "";
    }

    if (isUnlimited) {
      return "Unlimited";
    }

    return `${course.enrolled_count || 0} / ${course.max_students} students`;
  };

  const availabilityClass = () => {
    if (isUnlimited) {
      return "course-availability unlimited";
    }

    if (isCourseFull) {
      return "course-availability full";
    }

    return "course-availability available";
  };

  // ---------- Load course + enrollment state ----------
  useEffect(() => {
    const getCourse = async () => {
      try {
        setLoading(true);
        setError("");
        setSuccess("");

        const response = await api.get(`/courses/${id}`);

        setCourse(response.data.course);

        // Check whether logged-in student is enrolled
        if (studentLoggedIn) {
          try {
            setCheckingEnrollment(true);

            const enrollmentResponse =
              await api.get("/enrollments/my");

            const myEnrollments =
              enrollmentResponse.data.enrollments || [];

            const alreadyEnrolled =
              myEnrollments.some(
                (enrollment) =>
                  String(enrollment.course_id) ===
                  String(id)
              );

            setEnrolled(alreadyEnrolled);
          } catch (enrollmentError) {
            console.error(
              "Error checking enrollment:",
              enrollmentError.message
            );

            setEnrolled(false);
          } finally {
            setCheckingEnrollment(false);
          }
        } else {
          setEnrolled(false);
        }
      } catch (error) {
        setError(
          error.response?.data?.message ||
            "Failed to load course"
        );
      } finally {
        setLoading(false);
      }
    };

    getCourse();
  }, [id, studentLoggedIn]);

  // ---------- Enroll ----------
  const handleEnroll = async () => {
    setError("");
    setSuccess("");
    setEnrolling(true);

    try {
      const response = await api.post(
        "/enrollments",
        {
          courseId: id,
        }
      );

      setSuccess(
        response.data.message ||
          "Course enrollment successful."
      );

      // Course is now enrolled
      setEnrolled(true);

      // Refresh course availability after successful enrollment
      const courseResponse = await api.get(
        `/courses/${id}`
      );

      setCourse(courseResponse.data.course);
    } catch (error) {
      // Course is full
      if (
        error.response?.status === 409 &&
        error.response?.data?.message
          ?.toLowerCase()
          .includes("full")
      ) {
        setError(
          "Course is full. No seats are available."
        );

        // Refresh availability
        try {
          const courseResponse = await api.get(
            `/courses/${id}`
          );

          setCourse(courseResponse.data.course);
        } catch (refreshError) {
          console.error(
            "Error refreshing course:",
            refreshError.message
          );
        }
      } else if (error.response?.status === 409) {
        setEnrolled(true);

        setError(
          "You are already enrolled in this course. You can see it in My Enrollments."
        );
      } else {
        setError(
          error.response?.data?.message ||
            "Enrollment failed. Please try again."
        );
      }
    } finally {
      setEnrolling(false);
    }
  };

  // ---------- Loading ----------
  if (loading) {
    return (
      <>
        <Navbar />

        <div className="container">
          <p className="loading">
            Loading course...
          </p>
        </div>

        <Footer />
      </>
    );
  }

  // ---------- Course not found / server error ----------
  if (error && !course) {
    return (
      <>
        <Navbar />

        <div className="container">
          <p className="error">
            {error}
          </p>

          <div className="center-actions">
            <Link
              to="/courses"
              className="btn btn-primary"
            >
              Back to Courses
            </Link>
          </div>
        </div>

        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="container">

        {/* Breadcrumb */}
        <p className="breadcrumb">
          <Link to="/courses">
            Courses
          </Link>

          <span> / </span>

          <span>{course.title}</span>
        </p>

        <div className="details-layout">

          {/* ---------- Left: image ---------- */}
          <div className="details-image-wrapper">
            <img
              src={course.image}
              alt={course.title}
              className="details-image"
            />
          </div>

          {/* ---------- Right: information ---------- */}
          <div className="details-info">

            <div className="course-card-tags">

              <span className="tag tag-category">
                {course.category}
              </span>

              <span className="tag tag-level">
                {course.level}
              </span>

            </div>

            <h1>{course.title}</h1>

            <p className="details-description">
              {course.description}
            </p>

            <dl className="details-list">

              <div>
                <dt>Category</dt>
                <dd>{course.category}</dd>
              </div>

              <div>
                <dt>Level</dt>
                <dd>{course.level}</dd>
              </div>

              <div>
                <dt>Duration</dt>
                <dd>{course.duration}</dd>
              </div>

              <div>
                <dt>Price</dt>
                <dd className="details-price">
                  Rs. {course.price}
                </dd>
              </div>

              {/* ---------- Availability ---------- */}
              <div>
                <dt>Availability</dt>

                <dd className={availabilityClass()}>
                  {availabilityText()}
                </dd>
              </div>

            </dl>

            {/* ---------- Full course notice ---------- */}
            {isCourseFull && !enrolled && (
              <div className="notice">
                <p>
                  <strong>Course Full</strong>
                </p>

                <p>
                  This course has reached its maximum
                  student capacity. No more students can
                  enroll at the moment.
                </p>
              </div>
            )}

            {/* ---------- Messages ---------- */}

            {success && (
              <p className="success">
                {success}
              </p>
            )}

            {error && (
              <p className="error">
                {error}
              </p>
            )}

            {/* ---------- Action area ---------- */}

            <div className="details-actions">

              {/* Not logged in */}
              {!loggedIn && (
                <div className="notice">

                  <p>
                    Please login as a student to
                    enroll in this course.
                  </p>

                  <Link
                    to="/login"
                    state={{
                      from: location.pathname,
                    }}
                    className="btn btn-primary"
                  >
                    <FaSignInAlt />
                    Login to Enroll
                  </Link>

                </div>
              )}

              {/* Student */}
              {studentLoggedIn && (
                <>
                  {checkingEnrollment ? (
                    <p className="loading">
                      Checking enrollment status...
                    </p>
                  ) : enrolled ? (
                    <>
                      <div className="notice">
                        <p>
                          You are currently enrolled
                          in this course.
                        </p>
                      </div>

                      <Link
                        to="/my-enrollments"
                        className="btn btn-outline"
                      >
                        <FaGraduationCap />
                        My Enrollments
                      </Link>
                    </>
                  ) : isCourseFull ? (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary btn-lg"
                        disabled
                      >
                        Course Full
                      </button>

                      <Link
                        to="/my-enrollments"
                        className="btn btn-outline"
                      >
                        <FaGraduationCap />
                        My Enrollments
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary btn-lg"
                        onClick={handleEnroll}
                        disabled={enrolling}
                      >
                        <FaShoppingCart />

                        {enrolling
                          ? "Enrolling..."
                          : "Enroll Now"}
                      </button>

                      <Link
                        to="/my-enrollments"
                        className="btn btn-outline"
                      >
                        <FaGraduationCap />
                        My Enrollments
                      </Link>
                    </>
                  )}
                </>
              )}

              {/* Admin */}
              {adminLoggedIn && (
                <div className="notice">

                  <p>
                    You are logged in as an administrator.
                    Only students can enroll in courses.
                  </p>

                  <Link
                    to="/admin/courses"
                    className="btn btn-primary"
                  >
                    <FaChartBar />
                    Manage Courses
                  </Link>

                </div>
              )}

            </div>

          </div>

        </div>

      </div>

      <Footer />
    </>
  );
}

export default CourseDetails;