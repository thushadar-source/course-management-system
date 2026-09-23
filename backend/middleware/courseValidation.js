const validateCourse = (req, res, next) => {
  const {
    title,
    category,
    level,
    duration,
    price,
    description,
  } = req.body;

  const errors = {};

  // Required fields
  if (!title || !title.trim()) {
    errors.title = "Course title is required";
  }

  if (!category || !category.trim()) {
    errors.category = "Course category is required";
  }

  if (!level || !level.trim()) {
    errors.level = "Course level is required";
  }

  // Title length
  if (title && title.trim().length < 3) {
    errors.title = "Course title must be at least 3 characters";
  }

  // Duration validation
  if (
    duration !== undefined &&
    duration !== null &&
    duration !== "" &&
    (isNaN(duration) || Number(duration) <= 0)
  ) {
    errors.duration = "Duration must be a positive number";
  }

  // Price validation
  if (
    price !== undefined &&
    price !== null &&
    price !== "" &&
    (isNaN(price) || Number(price) < 0)
  ) {
    errors.price = "Price must be a valid non-negative number";
  }

  // Description length
  if (description && description.length > 1000) {
    errors.description = "Description must not exceed 1000 characters";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  next();
};

module.exports = validateCourse;

