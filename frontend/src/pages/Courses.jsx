import { useEffect, useState } from "react";

import api from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import CourseCard from "../components/CourseCard";

function Courses() {

  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");


  // ---------- Load courses from the backend ----------
  useEffect(() => {

    const getCourses = async () => {

      try {

        const response = await api.get("/courses");

        // The backend always puts the array inside "courses".
        setCourses(response.data.courses);

      } catch (error) {

        setError(
          error.response?.data?.message ||
          "Failed to load courses"
        );

      } finally {

        setLoading(false);

      }
    };

    getCourses();

  }, []);


  // ---------- Build the category list from the loaded courses ----------
  const categories = [
    "All",
    ...new Set(
      courses
        .map((course) => course.category)
        .filter((category) => category !== null && category !== undefined && category !== "")
    ),
  ];


  // ---------- Apply all active filters using AND logic ----------
  const filteredCourses = courses.filter((course) => {

    const searchValue = searchText.trim().toLowerCase();
    const searchableFields = [
      course.title,
      course.category,
      course.level,
      course.description,
      course.duration,
    ].map((value) => String(value ?? "").toLowerCase());

    const coursePrice = Number(course.price);

    const matchesSearch =
      !searchValue || searchableFields.some((field) => field.includes(searchValue));

    const matchesCategory =
      selectedCategory === "All" ||
      course.category === selectedCategory;

    const matchesLevel =
      selectedLevel === "All" || course.level === selectedLevel;

    const matchesMinPrice =
      minPrice === "" || (Number.isFinite(coursePrice) && coursePrice >= Number(minPrice));

    const matchesMaxPrice =
      maxPrice === "" || (Number.isFinite(coursePrice) && coursePrice <= Number(maxPrice));

    return (
      matchesSearch &&
      matchesCategory &&
      matchesLevel &&
      matchesMinPrice &&
      matchesMaxPrice
    );
  });

  const hasActiveFilters =
    searchText.trim() !== "" ||
    selectedCategory !== "All" ||
    selectedLevel !== "All" ||
    minPrice !== "" ||
    maxPrice !== "";

  const clearAllFilters = () => {
    setSearchText("");
    setSelectedCategory("All");
    setSelectedLevel("All");
    setMinPrice("");
    setMaxPrice("");
  };


  return (

    <>
      <Navbar />

      <div className="container">

        <div className="page-header">

          <div>
            <h1>Our Courses</h1>
            <p className="page-subtitle">
              Browse the full catalogue and view the details of any course.
            </p>
          </div>

        </div>


        {/* ---------- Filters ---------- */}

        {!loading && !error && courses.length > 0 && (

          <div className="filter-panel">
            <div className="filter-controls">
              <label className="filter-field filter-field-search">
                <span>Search courses</span>
                <input
                  type="search"
                  className="input"
                  placeholder="Title, category, level, description, or duration"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                />
              </label>

              <label className="filter-field">
                <span>Category</span>
                <select
                  className="input"
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-field">
                <span>Level</span>
                <select
                  className="input"
                  value={selectedLevel}
                  onChange={(event) => setSelectedLevel(event.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </label>

              <label className="filter-field filter-field-price">
                <span>Minimum price</span>
                <input
                  type="number"
                  className="input"
                  min="0"
                  placeholder="Rs. 0"
                  value={minPrice}
                  onChange={(event) => setMinPrice(event.target.value)}
                />
              </label>

              <label className="filter-field filter-field-price">
                <span>Maximum price</span>
                <input
                  type="number"
                  className="input"
                  min="0"
                  placeholder="No maximum"
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                />
              </label>
            </div>

            <div className="filter-summary">
              <div className="filter-chips" aria-live="polite">
                {searchText.trim() && <span className="filter-chip">Search: &quot;{searchText.trim()}&quot;</span>}
                {selectedCategory !== "All" && <span className="filter-chip">Category: {selectedCategory}</span>}
                {selectedLevel !== "All" && <span className="filter-chip">Level: {selectedLevel}</span>}
                {minPrice !== "" && <span className="filter-chip">Min Price: Rs. {minPrice}</span>}
                {maxPrice !== "" && <span className="filter-chip">Max Price: Rs. {maxPrice}</span>}
              </div>

              <button
                type="button"
                className="btn btn-outline-dark clear-filters-button"
                onClick={clearAllFilters}
                disabled={!hasActiveFilters}
              >
                Clear All Filters
              </button>
            </div>
          </div>

        )}


        {/* ---------- Loading state ---------- */}

        {loading && (
          <p className="loading">Loading courses...</p>
        )}


        {/* ---------- Error state ---------- */}

        {error && !loading && (
          <p className="error">{error}</p>
        )}


        {/* ---------- Empty state ---------- */}

        {!loading && !error && courses.length > 0 && (

          <>
            <p className="result-count">
              Showing {filteredCourses.length} of {courses.length} courses
            </p>

            {filteredCourses.length === 0 ? (
              <p className="empty">No courses match your selected filters.</p>
            ) : (
              <div className="course-grid">
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            )}
          </>

        )}

        {!loading && !error && courses.length === 0 && (
          <p className="empty">No courses are currently available.</p>
        )}

      </div>

      <Footer />

    </>
  );
}

export default Courses;
