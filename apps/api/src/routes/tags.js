import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();
router.use(authenticate);

// GET /api/tags
router.get("/", async (req, res, next) => {
  try {
    const tags = await prisma.tag.findMany({
      where: { userId: req.userId },
      include: { _count: { select: { trades: true } } },
      orderBy: { name: "asc" },
    });
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

// POST /api/tags
router.post(
  "/",
  [
    body("name").trim().notEmpty().isLength({ max: 50 }),
    body("color").optional().matches(/^#[0-9A-Fa-f]{6}$/),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const tag = await prisma.tag.create({
        data: { userId: req.userId, name: req.body.name, color: req.body.color },
      });
      res.status(201).json(tag);
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/tags/:id
router.put(
  "/:id",
  [
    param("id").isUUID(),
    body("name").optional().trim().notEmpty().isLength({ max: 50 }),
    body("color").optional().matches(/^#[0-9A-Fa-f]{6}$/),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const existing = await prisma.tag.findFirst({
        where: { id: req.params.id, userId: req.userId },
      });
      if (!existing) return res.status(404).json({ error: "Tag not found" });

      const tag = await prisma.tag.update({
        where: { id: req.params.id },
        data: { name: req.body.name, color: req.body.color },
      });
      res.json(tag);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/tags/:id
router.delete("/:id", param("id").isUUID(), async (req, res, next) => {
  try {
    const existing = await prisma.tag.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Tag not found" });

    await prisma.tag.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
