
import { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  FaEdit,
  FaEye,
  FaPlus,
  FaSave,
  FaTimes,
  FaTrash,
} from "react-icons/fa";

const EMPTY_COURSE = {
  title: "",
  category: "",
  level: "Beginner",
  duration: "",
  price: "",
  image: "",
  description: "",
};

const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"];

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

  const fetchCourses = async () => {
    const response = await api.get("/courses");
    setCourses(response.data.courses || []);
  };

  useEffect(() => {
    const loadCourses = async () => {
      try {
        await fetchCourses();
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load courses"
        );
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openAddForm = () => {
    setShowForm(true);
    setEditingId(null);
    setFormData({ ...EMPTY_COURSE });
    setFormError("");
    setError("");
    setSuccess("");
  };

  const openEditForm = (course) => {
    console.log("EDIT CLICKED", course);

    setShowForm(true);
    setEditingId(course.id);

    setFormData({
      title: course.title || "",
      category: course.category || "",
      level: course.level || "Beginner",
      duration: course.duration || "",
      price: course.price ?? "",
      image: course.image || "",
      description: course.description || "",
    });

    setFormError("");
    setError("");
    setSuccess("");
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ ...EMPTY_COURSE });
    setFormError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");
    setError("");
    setSuccess("");

    if (
      !formData.title.trim() ||
      !formData.category.trim() ||
      !formData.level
    ) {
      setFormError("Title, category and level are required.");
      return;
    }

    if (!formData.duration.trim()) {
      setFormError("Duration is required.");
      return;
    }

    if (formData.price === "" || Number(formData.price) < 0) {
      setFormError("Please enter a valid price.");
      return;
    }

    const data = {
      title: formData.title.trim(),
      category: formData.category.trim(),
      level: formData.level,
      duration: formData.duration.trim(),
      price: Number(formData.price),
      image: formData.image.trim(),
      description: formData.description.trim(),
    };

    setSaving(true);

    try {
      let response;

      if (editingId) {
        response = await api.put(`/courses/${editingId}`, data);
      } else {
        response = await api.post("/courses", data);
      }

      setSuccess(response.data.message || "Course saved successfully.");

      closeForm();
      await fetchCourses();
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          "Could not save the course."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (course) => {
    const confirmed = window.confirm(
      `Delete "${course.title}"? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await api.delete(`/courses/${course.id}`);

      setSuccess(response.data.message || "Course deleted successfully.");
      setError("");

      await fetchCourses();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not delete the course."
      );
    }
  };

  return (
    <>
      <Navbar />

      <div className="container">
        <div className="page-header">
          <div>
            <h1>Manage Courses</h1>
            <p className="page-subtitle">
              Add new courses, update existing courses, or remove courses.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={showForm ? closeForm : openAddForm}
          >
            {showForm ? <FaTimes /> : <FaPlus />}
            {showForm ? "Cancel" : "Add Course"}
          </button>
        </div>

        {success && <p className="success">{success}</p>}

        {error && <p className="error">{error}</p>}

        {showForm && (
          <section className="section-card">
            <div className="section-card-header">
              <h2>{editingId ? "Edit Course" : "New Course"}</h2>
            </div>

            <form className="form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="title">Title *</label>
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
                  <label htmlFor="category">Category *</label>
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
                  <label htmlFor="level">Level *</label>
                  <select
                    id="level"
                    className="input"
                    name="level"
                    value={formData.level}
                    onChange={handleChange}
                  >
                    {LEVEL_OPTIONS.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="duration">Duration *</label>
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
                  <label htmlFor="price">Price (Rs.) *</label>
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

              <div className="form-group">
                <label htmlFor="image">Image URL</label>
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
                <label htmlFor="description">Description</label>
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

              {formError && <p className="error">{formError}</p>}

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

        <section className="section-card">
          <div className="section-card-header">
            <h2>
              All Courses
              {courses.length > 0 ? ` (${courses.length})` : ""}
            </h2>

            <a
              href="/admin/enrollments"
              className="link-inline"
            >
              <FaEye /> Manage enrollments
            </a>
          </div>

          {loading && (
            <p className="loading">Loading courses...</p>
          )}

          {!loading && courses.length === 0 && (
            <p className="empty">
              No courses yet. Click "Add Course" to create the first one.
            </p>
          )}

          {!loading && courses.length > 0 && (
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
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td>{course.id}</td>

                      <td>
                        <img
                          src={course.image}
                          alt={course.title}
                          className="table-thumb"
                        />
                      </td>

                      <td>{course.title}</td>
                      <td>{course.category}</td>

                      <td>
                        <span className="tag tag-level">
                          {course.level}
                        </span>
                      </td>

                      <td>{course.duration}</td>

                      <td>Rs. {course.price}</td>

                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn btn-small btn-outline"
                            onClick={() => openEditForm(course)}
                          >
                            <FaEdit />
                            Edit
                          </button>

                          <button
                            type="button"
                            className="btn btn-small btn-danger"
                            onClick={() => handleDelete(course)}
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

