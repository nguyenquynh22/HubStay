const isValidPassword = (password) =>
  typeof password === "string" &&
  password.length >= 8 &&
  Buffer.byteLength(password, "utf8") <= 72 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

module.exports = { isValidPassword };
