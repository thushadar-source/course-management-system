
const db = require("../config/db");

const User = {
  // Find a user by username.
  // Used by existing login/user lookup functionality.
  async findByUsername(username) {
    const [rows] = await db.execute(
      `SELECT id, username, full_name, role, password
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [username]
    );

    return rows[0] || null;
  },

  // Find public user information by ID.
  // Never selects the password hash.
  async findById(id) {
    const [rows] = await db.execute(
      `SELECT id, username, full_name, role
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    return rows[0] || null;
  },

  // Get password hash only for password verification.
  async findPasswordHashById(id) {
    const [rows] = await db.execute(
      `SELECT password
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    return rows[0]?.password || null;
  },

  // Update only full_name.
  async updateFullName(id, fullName) {
    await db.execute(
      `UPDATE users
       SET full_name = ?
       WHERE id = ?`,
      [fullName, id]
    );

    return this.findById(id);
  },

  // Update only the password hash.
  async updatePassword(id, passwordHash) {
    const [result] = await db.execute(
      `UPDATE users
       SET password = ?
       WHERE id = ?`,
      [passwordHash, id]
    );

    return result.affectedRows > 0;
  },

  // Existing functionality: count users by role.
  async countByRole(role) {
    const [rows] = await db.execute(
      "SELECT COUNT(*) AS count FROM users WHERE role = ?",
      [role]
    );

    return rows[0].count;
  },
};

module.exports = User;
