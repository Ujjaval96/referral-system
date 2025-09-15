import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

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
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      path: string;
    };
    console.log(req.body);
    req.body = {
      ...req.body,
      id: decoded.id,
      email: decoded.email,
      path: decoded.path,
    };
    console.log(req.body);
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};
