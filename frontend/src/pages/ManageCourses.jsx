import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaEdit,
  FaEye,
  FaPlus,
  FaSave,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";


const EMPTY_COURSE = {
  title: "",
  category: "",
  level: "Beginner",
  duration: "",
  price: "",
  image: "",
  description: "",
  max_students: "",
};

const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"];


async function fetchAllCourses() {
  const response = await api.get("/courses");

  return response.data.courses;
}


function ManageCourses() {

  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState(EMPTY_COURSE);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);


  // ---------- Load courses ----------
  useEffect(() => {

    const loadCourses = async () => {

      try {

        setCourses(await fetchAllCourses());

      } catch (error) {

        setError(
          error.response?.data?.message ||
          "Failed to load courses"
        );

      } finally {

        setLoading(false);

      }
    };

    loadCourses();

  }, []);


  // ---------- Reload courses ----------
  const refreshCourses = async () => {
    setCourses(await fetchAllCourses());
  };


  // ---------- Form helpers ----------
  const handleChange = (event) => {

    const { name, value } = event.target;

    setFormData({
      ...formData,
      [name]: value,
    });
  };


  const openAddForm = () => {

    setShowForm(true);
    setEditingId(null);
    setFormData(EMPTY_COURSE);
    setFormError("");
    setError("");
    setSuccess("");

  };


  const openEditForm = (course) => {

    setShowForm(true);
    setEditingId(course.id);

    setFormData({
      title: course.title || "",
      category: course.category || "",
      level: course.level || "Beginner",
      duration: course.duration || "",
      price: String(course.price ?? ""),
      image: course.image || "",
      description: course.description || "",
      max_students:
        course.max_students === null ||
        course.max_students === undefined
          ? ""
          : String(course.max_students),
    });

    setFormError("");
    setError("");
    setSuccess("");

  };


  const closeForm = () => {

    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_COURSE);
    setFormError("");

  };


  // ---------- Create / Update ----------
  const handleSubmit = async (event) => {

    event.preventDefault();

    setFormError("");
    setError("");
    setSuccess("");


    // Required fields
    if (
      !formData.title.trim() ||
      !formData.category.trim() ||
      !formData.level
    ) {
      setFormError(
        "Title, category and level are required."
      );
      return;
    }


    if (!formData.duration.trim()) {
      setFormError(
        "Duration is required (for example: 8 Weeks)."
      );
      return;
    }


    if (
      formData.price === "" ||
      Number(formData.price) < 0
    ) {
      setFormError("Please enter a valid price.");
      return;
    }


    // Frontend validation for maximum students.
    // Backend validation remains authoritative.
    if (
      formData.max_students !== "" &&
      (
        !/^\d+$/.test(formData.max_students) ||
        Number(formData.max_students) <= 0
      )
    ) {
      setFormError(
        "Maximum students must be a positive whole number."
      );
      return;
    }


    const coursePayload = {
      title: formData.title.trim(),
      category: formData.category.trim(),
      level: formData.level,
      duration: formData.duration.trim(),
      price: Number(formData.price),
      image: formData.image.trim(),
      description: formData.description.trim(),

      // Blank = unlimited
      max_students:
        formData.max_students === ""
          ? null
          : Number(formData.max_students),
    };


    setSaving(true);


    try {

      if (editingId) {

        const response = await api.put(
          `/courses/${editingId}`,
          coursePayload
        );

        setSuccess(response.data.message);

      } else {

        const response = await api.post(
          "/courses",
          coursePayload
        );

        setSuccess(response.data.message);

      }


      closeForm();

      await refreshCourses();

    } catch (error) {

      setFormError(
        error.response?.data?.message ||
        "Could not save the course. Please try again."
      );

    } finally {

      setSaving(false);

    }
  };


  // ---------- Delete ----------
  const handleDelete = async (course) => {

    const confirmed = window.confirm(
      `Delete "${course.title}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");


    try {

      const response = await api.delete(
        `/courses/${course.id}`
      );

      setSuccess(response.data.message);

      await refreshCourses();

    } catch (error) {

      setError(
        error.response?.data?.message ||
        "Could not delete the course."
      );

    }
  };


  // ---------- Availability display ----------
  const getAvailabilityText = (course) => {

    if (course.max_students === null) {
      return "Unlimited";
    }

    if (Number(course.is_full) === 1) {
      return "Course Full";
    }

    return `${course.enrolled_count} / ${course.max_students} students`;
  };


  const getAvailabilityClass = (course) => {

    if (course.max_students === null) {
      return "course-availability unlimited";
    }

    if (Number(course.is_full) === 1) {
      return "course-availability full";
    }

    return "course-availability available";
  };


  return (

    <>
      <Navbar />

      <div className="container">

        <div className="page-header">

          <div>
            <h1>Manage Courses</h1>

            <p className="page-subtitle">
              Add new courses, update the existing ones, or remove
              courses that are no longer offered.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={
              showForm
                ? closeForm
                : openAddForm
            }
          >
            {showForm ? <FaTimes /> : <FaPlus />}
            {showForm ? "Cancel" : "Add Course"}
          </button>

        </div>


        {/* Success / Error */}

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


        {/* Add / Edit form */}

        {showForm && (

          <section className="section-card">

            <div className="section-card-header">
              <h2>
                {editingId
                  ? "Edit Course"
                  : "New Course"}
              </h2>
            </div>


            <form
              className="form"
              onSubmit={handleSubmit}
            >

              <div className="form-row">

                <div className="form-group">

                  <label htmlFor="title">
                    Title *
                  </label>

                  <input
                    id="title"
                    className="input"
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. React"
                  />

                </div>


                <div className="form-group">

                  <label htmlFor="category">
                    Category *
                  </label>

                  <input
                    id="category"
                    className="input"
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="e.g. Frontend"
                  />

                </div>

              </div>


              <div className="form-row">

                <div className="form-group">

                  <label htmlFor="level">
                    Level *
                  </label>

                  <select
                    id="level"
                    className="input"
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                  >
                    {LEVEL_OPTIONS.map((level) => (
                      <option
                        key={level}
                        value={level}
                      >
                        {level}
                      </option>
                    ))}
                  </select>

                </div>


                <div className="form-group">

                  <label htmlFor="duration">
                    Duration *
                  </label>

                  <input
                    id="duration"
                    className="input"
                    type="text"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    placeholder="e.g. 10 Weeks"
                  />

                </div>


                <div className="form-group">

                  <label htmlFor="price">
                    Price (Rs.) *
                  </label>

                  <input
                    id="price"
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="e.g. 25000"
                  />

                </div>

              </div>


              {/* Maximum Students */}

              <div className="form-group">

                <label htmlFor="max_students">
                  Maximum Students
                </label>

                <input
                  id="max_students"
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  name="max_students"
                  value={formData.max_students}
                  onChange={handleChange}
                  placeholder="Leave blank for Unlimited"
                />

                <small>
                  Optional. Leave blank to allow unlimited
                  students.
                </small>

              </div>


              <div className="form-group">

                <label htmlFor="image">
                  Image URL
                </label>

                <input
                  id="image"
                  className="input"
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="https://placehold.co/300x180?text=React"
                />

              </div>


              <div className="form-group">

                <label htmlFor="description">
                  Description
                </label>

                <textarea
                  id="description"
                  className="input"
                  rows="4"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Short summary of what students will learn."
                />

              </div>


              {formError && (
                <p className="error">
                  {formError}
                </p>
              )}


              <div className="form-actions">

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  <FaSave />

                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Course"
                      : "Create Course"}
                </button>


                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeForm}
                  disabled={saving}
                >
                  <FaTimes />
                  Cancel
                </button>

              </div>

            </form>

          </section>

        )}


        {/* Course table */}

        <section className="section-card">

          <div className="section-card-header">

            <h2>
              All Courses
              {courses.length > 0
                ? ` (${courses.length})`
                : ""}
            </h2>

            <Link
              to="/admin/enrollments"
              className="link-inline"
            >
              <FaEye />
              Manage enrollments
            </Link>

          </div>


          {loading && (
            <p className="loading">
              Loading courses...
            </p>
          )}


          {!loading &&
            courses.length === 0 && (
              <p className="empty">
                No courses yet. Click "Add Course"
                to create the first one.
              </p>
            )}


          {!loading &&
            courses.length > 0 && (

              <div className="table-wrapper">

                <table className="table">

                  <thead>

                    <tr>

                      <th>ID</th>
                      <th>Image</th>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Level</th>
                      <th>Duration</th>
                      <th>Price</th>
                      <th>Availability</th>
                      <th className="table-actions-column">
                        Actions
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {courses.map((course) => (

                      <tr key={course.id}>

                        <td>
                          {course.id}
                        </td>


                        <td>

                          <img
                            src={course.image}
                            alt={course.title}
                            className="table-thumb"
                          />

                        </td>


                        <td>
                          {course.title}
                        </td>


                        <td>
                          {course.category}
                        </td>


                        <td>

                          <span className="tag tag-level">
                            {course.level}
                          </span>

                        </td>


                        <td>
                          {course.duration}
                        </td>


                        <td>
                          Rs. {course.price}
                        </td>


                        <td>

                          <span
                            className={getAvailabilityClass(
                              course
                            )}
                          >
                            {getAvailabilityText(
                              course
                            )}
                          </span>

                        </td>


                        <td>

                          <div className="table-actions">

                            <button
                              type="button"
                              className="btn btn-small btn-outline"
                              onClick={() =>
                                openEditForm(course)
                              }
                            >
                              <FaEdit />
                              Edit
                            </button>


                            <button
                              type="button"
                              className="btn btn-small btn-danger"
                              onClick={() =>
                                handleDelete(course)
                              }
                            >
                              <FaTrash />
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            )}

        </section>

      </div>

      <Footer />

    </>
  );
}

export default ManageCourses;