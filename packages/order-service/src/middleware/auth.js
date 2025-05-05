const jwt = require("jsonwebtoken");
const axios = require("axios");

const validateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Verify user exists in auth service
    try {
      await axios.get(`${process.env.AUTH_SERVICE_URL}/users/${decoded.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid user" });
    }
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = {
  validateToken,
};
