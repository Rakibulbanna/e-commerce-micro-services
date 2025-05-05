import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "No token provided" });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key"
      ) as JwtPayload;

      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      req.user = decoded;
      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      res.status(401).json({ error: "Invalid token" });
    }
  };
};
