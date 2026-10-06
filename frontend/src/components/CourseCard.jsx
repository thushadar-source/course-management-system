import { Link } from "react-router-dom";
import { FaEye } from "react-icons/fa";

function CourseCard({ course }) {

  // ---------- Availability ----------
  const getAvailabilityText = () => {
    // NULL means unlimited capacity
    if (course.max_students === null) {
      return "Unlimited";
    }

    // Course has reached maximum capacity
    if (Number(course.is_full) === 1) {
      return "Course Full";
    }

    // Limited course with available seats
    return `${course.enrolled_count || 0} / ${course.max_students} students`;
  };

  const getAvailabilityClass = () => {
    if (course.max_students === null) {
      return "course-availability unlimited";
    }

    if (Number(course.is_full) === 1) {
      return "course-availability full";
    }

    return "course-availability available";
  };

  return (

    <article className="course-card">

      {/* Course image from the database */}
      <img
        src={course.image}
        alt={course.title}
        className="course-card-image"
        loading="lazy"
      />

      <div className="course-card-body">

        <div className="course-card-tags">

          <span className="tag tag-category">
            {course.category}
          </span>

          <span className="tag tag-level">
            {course.level}
          </span>

        </div>

        <h3 className="course-card-title">
          {course.title}
        </h3>

        {/* Short summary */}
        <p className="course-card-summary">
          {course.description?.slice(0, 110)}
          {course.description?.length > 110 ? "..." : ""}
        </p>

        <ul className="course-card-meta">

          <li>
            <strong>Duration:</strong>{" "}
            {course.duration}
          </li>

          <li>
            <strong>Price:</strong> Rs.{" "}
            {course.price}
          </li>

        </ul>

        {/* ---------- CR-007 Availability ---------- */}
        <div className={getAvailabilityClass()}>
          <strong>Availability:</strong>{" "}
          {getAvailabilityText()}
        </div>

        <Link
          to={`/courses/${course.id}`}
          className="btn btn-primary btn-block"
        >
          <FaEye />
          View Details
        </Link>

      </div>

    </article>
  );
}

export default CourseCard;