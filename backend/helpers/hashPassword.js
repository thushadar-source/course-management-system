
const bcrypt = require("bcryptjs");

const BCRYPT_ROUNDS = 10;
const BCRYPT_MAX_BYTES = 72;

async function hashPassword(password) {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("Password is required.");
  }

  if (Buffer.byteLength(password, "utf8") > BCRYPT_MAX_BYTES) {
    throw new Error("Password exceeds bcrypt's 72-byte maximum.");
  }

  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function comparePassword(password, passwordHash) {
  if (
    typeof password !== "string" ||
    typeof passwordHash !== "string"
  ) {
    return false;
  }

  if (Buffer.byteLength(password, "utf8") > BCRYPT_MAX_BYTES) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}

module.exports = {
  hashPassword,
  comparePassword,
};
