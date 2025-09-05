/* eslint-disable quotes */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtAuthPayload } from "../utils/types";

const JWT_SECRET = process.env.JWT_SECRET || "mysecret123";

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Decode token (payload contains `id` and `path`)
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; path: string };

    // ✅ Remap keys so they match JwtAuthPayload (_uid, _path)
    req.body = {
      ...req.body,
      _uid: decoded.id,
      _path: decoded.path,
    };

    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
