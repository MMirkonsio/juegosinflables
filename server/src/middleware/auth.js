// src/middleware/auth.js
import jwt from "jsonwebtoken";

export function authorize(requiredRole) {
  return (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.substring(7) : null;
    if (!token) return res.status(401).json({ error: "No token" });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
      req.user = decoded; // { id, username, role }
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ error: "Forbidden" });
      }
      next();
    } catch (e) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}
