
const express = require("express");
const router = express.Router();

const {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  getUserByUsername,
  getUserById,
} = require("../controllers/userController");

// IMPORTANT:
// Change this path/name to your existing JWT authentication middleware.
// It must verify the token and set req.user.id and req.user.role.
const authMiddleware = require("../middleware/authMiddleware");

// Self-service routes must come before /:id.
router.get("/me", authMiddleware, getMyProfile);
router.put("/me", authMiddleware, updateMyProfile);
router.put("/me/password", authMiddleware, changeMyPassword);

// Existing user lookup routes are now authenticated and
// authorization is checked in the controller.
router.get(
  "/username/:username",
  authMiddleware,
  getUserByUsername
);

router.get("/:id", authMiddleware, getUserById);

module.exports = router;
