import jwt from "jsonwebtoken";
import User from "../models/User.js";
import College from "../models/College.js";

export const authenticate = async (req, res, next) => {
  try {
    // Prefer httpOnly cookie; fall back to Authorization header for API clients
    const token = req.cookies?.au_token || req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user || !user.isActive) return res.status(401).json({ message: "Invalid or inactive user" });

    req.user = user;

    if (user.roleRef) {
      if (user.role === "examcell") {
        req.college = await College.findOne({ examCellAdmin: user.roleRef });
      } else if (user.role === "ce") {
        req.college = await College.findOne({ ce: user.roleRef });
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};
