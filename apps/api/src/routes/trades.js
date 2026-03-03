import { Router } from "express";
import { body, query, param, validationResult } from "express-validator";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { computePnl } from "../lib/tradeUtils.js";

const router = Router();
router.use(authenticate);

// ─── Validation ───────────────────────────────────────────────

const tradeBodyValidators = [
  body("ticker").trim().toUpperCase().notEmpty(),
  body("assetClass").optional().isIn(["STOCK", "OPTION", "CRYPTO", "FOREX", "FUTURES", "ETF"]),
  body("direction").isIn(["LONG", "SHORT"]),
  body("tradeType").isIn(["DAY", "SWING"]),
  body("quantity").isFloat({ gt: 0 }),
  body("entryPrice").isFloat({ gt: 0 }),
  body("exitPrice").optional({ nullable: true }).isFloat({ gt: 0 }),
  body("entryAt").isISO8601(),
  body("exitAt").optional({ nullable: true }).isISO8601(),
  body("stopLoss").optional({ nullable: true }).isFloat({ gt: 0 }),
  body("takeProfit").optional({ nullable: true }).isFloat({ gt: 0 }),
  body("fees").optional().isFloat({ min: 0 }),
  body("notes").optional().trim().isLength({ max: 2000 }),
  body("screenshot").optional({ nullable: true }).isURL(),
  body("tagIds").optional().isArray(),
  body("tagIds.*").optional().isUUID(),
];

// ─── GET /api/trades ──────────────────────────────────────────

router.get(
  "/",
  [
    query("status").optional().isIn(["OPEN", "CLOSED"]),
    query("direction").optional().isIn(["LONG", "SHORT"]),
    query("tradeType").optional().isIn(["DAY", "SWING"]),
    query("assetClass").optional().isIn(["STOCK", "OPTION", "CRYPTO", "FOREX", "FUTURES", "ETF"]),
    query("ticker").optional().trim().toUpperCase(),
    query("from").optional().isISO8601(),
    query("to").optional().isISO8601(),
    query("tagId").optional().isUUID(),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 200 }),
    query("sort").optional().isIn(["entryAt", "exitAt", "pnl", "ticker"]),
    query("order").optional().isIn(["asc", "desc"]),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const {
        status, direction, tradeType, assetClass, ticker,
        from, to, tagId,
        page = 1, limit = 50,
        sort = "entryAt", order = "desc",
      } = req.query;

      const where = {
        userId: req.userId,
        ...(status && { status }),
        ...(direction && { direction }),
        ...(tradeType && { tradeType }),
        ...(assetClass && { assetClass }),
        ...(ticker && { ticker }),
        ...(tagId && { tags: { some: { tagId } } }),
        ...(from || to) && {
          entryAt: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        },
      };

      const [trades, total] = await Promise.all([
        prisma.trade.findMany({
          where,
          include: { tags: { include: { tag: true } } },
          orderBy: { [sort]: order },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        prisma.trade.count({ where }),
      ]);

      res.json({
        data: trades,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/trades/:id ──────────────────────────────────────

router.get("/:id", param("id").isUUID(), async (req, res, next) => {
  try {
    const trade = await prisma.trade.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        tags: { include: { tag: true } },
        executions: { orderBy: { executedAt: "asc" } },
      },
    });
    if (!trade) return res.status(404).json({ error: "Trade not found" });
    res.json(trade);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/trades ─────────────────────────────────────────

router.post("/", tradeBodyValidators, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      ticker, assetClass, direction, tradeType,
      quantity, entryPrice, exitPrice, entryAt, exitAt,
      stopLoss, takeProfit, fees = 0,
      notes, screenshot, tagIds = [],
    } = req.body;

    // Compute derived fields if closing immediately
    const derived = exitPrice
      ? computePnl({ direction, quantity, entryPrice, exitPrice, fees, stopLoss, takeProfit })
      : {};

    const trade = await prisma.trade.create({
      data: {
        userId: req.userId,
        ticker, assetClass, direction, tradeType,
        quantity, entryPrice, exitPrice, entryAt,
        exitAt: exitAt ? new Date(exitAt) : undefined,
        stopLoss, takeProfit, fees: Number(fees),
        notes, screenshot,
        status: exitPrice ? "CLOSED" : "OPEN",
        ...derived,
        tags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
      include: { tags: { include: { tag: true } } },
    });

    res.status(201).json(trade);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/trades/:id ──────────────────────────────────────

router.put("/:id", [param("id").isUUID(), ...tradeBodyValidators], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existing = await prisma.trade.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!existing) return res.status(404).json({ error: "Trade not found" });

    const {
      ticker, assetClass, direction, tradeType,
      quantity, entryPrice, exitPrice, entryAt, exitAt,
      stopLoss, takeProfit, fees = 0,
      notes, screenshot, tagIds,
    } = req.body;

    const derived = exitPrice
      ? computePnl({ direction, quantity, entryPrice, exitPrice, fees, stopLoss, takeProfit })
      : { pnl: null, pnlPercent: null, riskReward: null, outcome: null };

    const trade = await prisma.trade.update({
      where: { id: req.params.id },
      data: {
        ticker, assetClass, direction, tradeType,
        quantity, entryPrice, exitPrice,
        entryAt: new Date(entryAt),
        exitAt: exitAt ? new Date(exitAt) : null,
        stopLoss, takeProfit, fees: Number(fees),
        notes, screenshot,
        status: exitPrice ? "CLOSED" : "OPEN",
        ...derived,
        // Replace tags if provided
        ...(tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      include: { tags: { include: { tag: true } } },
    });

    res.json(trade);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/trades/:id/close ─────────────────────────────
// Convenience endpoint — just close a trade with exit price/time

router.patch(
  "/:id/close",
  [
    param("id").isUUID(),
    body("exitPrice").isFloat({ gt: 0 }),
    body("exitAt").optional().isISO8601(),
    body("fees").optional().isFloat({ min: 0 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const trade = await prisma.trade.findFirst({
        where: { id: req.params.id, userId: req.userId },
      });
      if (!trade) return res.status(404).json({ error: "Trade not found" });
      if (trade.status === "CLOSED") return res.status(400).json({ error: "Trade already closed" });

      const { exitPrice, exitAt, fees } = req.body;
      const totalFees = fees !== undefined ? Number(fees) : Number(trade.fees);

      const derived = computePnl({
        direction: trade.direction,
        quantity: Number(trade.quantity),
        entryPrice: Number(trade.entryPrice),
        exitPrice: Number(exitPrice),
        fees: totalFees,
        stopLoss: trade.stopLoss ? Number(trade.stopLoss) : null,
        takeProfit: trade.takeProfit ? Number(trade.takeProfit) : null,
      });

      const updated = await prisma.trade.update({
        where: { id: req.params.id },
        data: {
          exitPrice: Number(exitPrice),
          exitAt: exitAt ? new Date(exitAt) : new Date(),
          fees: totalFees,
          status: "CLOSED",
          ...derived,
        },
        include: { tags: { include: { tag: true } } },
      });

      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /api/trades/:id ───────────────────────────────────

router.delete("/:id", param("id").isUUID(), async (req, res, next) => {
  try {
    const trade = await prisma.trade.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    if (!trade) return res.status(404).json({ error: "Trade not found" });

    await prisma.trade.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
