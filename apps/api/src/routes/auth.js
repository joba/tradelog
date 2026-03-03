import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// ─── Helpers ─────────────────────────────────────────────────

function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
  );
  return { accessToken, refreshToken };
}

// ─── POST /api/auth/register ─────────────────────────────────

router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    body("name").optional().trim().isLength({ max: 100 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, password, name } = req.body;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: "Email already in use" });

      const hashed = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { email, password: hashed, name },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      const tokens = generateTokens(user.id);
      res.status(201).json({ user, ...tokens });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      const tokens = generateTokens(user.id);
      res.json({
        user: { id: user.id, email: user.email, name: user.name },
        ...tokens,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/auth/refresh ───────────────────────────────────

router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "Refresh token required" });

    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const tokens = generateTokens(payload.userId);
    res.json(tokens);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
