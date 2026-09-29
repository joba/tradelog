import { Router } from "express";
import { body, query, param, validationResult } from "express-validator";
import prisma from "../lib/prisma.js";
import { authenticate } from "../middleware/authenticate.js";
import { recalcTrade } from "../lib/tradeUtils.js";

const router = Router();
router.use(authenticate);

// ─── Validation ───────────────────────────────────────────────

const ASSET_CLASSES = ["STOCK", "OPTION", "CRYPTO", "FOREX", "FUTURES", "ETF", "ETP"];

// Trade-level fields that are not derived from executions
const tradeMetaValidators = (required) => {
  const req = (chain) => (required ? chain : chain.optional());
  return [
    req(body("ticker")).trim().toUpperCase().notEmpty(),
    body("assetClass").optional().isIn(ASSET_CLASSES),
    req(body("direction")).isIn(["LONG", "SHORT"]),
    body("stopLoss").optional({ nullable: true }).isFloat({ gt: 0 }),
    body("takeProfit").optional({ nullable: true }).isFloat({ gt: 0 }),
    body("notes").optional({ nullable: true }).trim().isLength({ max: 2000 }),
    body("screenshot").optional({ nullable: true }).isURL(),
    body("tagIds").optional().isArray(),
    body("tagIds.*").optional().isUUID(),
    body("currency").optional().isIn(["SEK", "USD"]),
    body("leverage").optional({ nullable: true }).isFloat({ min: 0 }),
  ];
};

const createTradeValidators = [
  ...tradeMetaValidators(true),
  body("quantity").isFloat({ gt: 0 }),
  body("entryPrice").isFloat({ gt: 0 }),
  body("exitPrice").optional({ nullable: true }).isFloat({ gt: 0 }),
  body("entryAt").isISO8601(),
  body("exitAt").optional({ nullable: true }).isISO8601(),
  body("fees").optional().isFloat({ min: 0 }),
  body("fxRate").optional({ nullable: true }).isFloat({ gt: 0 }),
  body("exitFxRate").optional({ nullable: true }).isFloat({ gt: 0 }),
];

const executionValidators = [
  body("type").isIn(["ENTRY", "EXIT"]),
  body("price").isFloat({ gt: 0 }),
  body("quantity").isFloat({ gt: 0 }),
  body("fees").optional().isFloat({ min: 0 }),
  body("fxRate").optional({ nullable: true }).isFloat({ gt: 0 }),
  body("executedAt").isISO8601(),
];

const tradeInclude = {
  tags: { include: { tag: true } },
  executions: { orderBy: { executedAt: "asc" } },
};

// Only keys that were actually sent, so PUT can be a partial update
const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]));

const findOwnTrade = (db, id, userId) =>
  db.trade.findFirst({ where: { id, userId }, include: { executions: true } });

// ─── GET /api/trades ──────────────────────────────────────────

router.get(
  "/",
  [
    query("status").optional().isIn(["OPEN", "CLOSED"]),
    query("direction").optional().isIn(["LONG", "SHORT"]),
    query("tradeType").optional().isIn(["DAY", "SWING"]),
    query("assetClass").optional().isIn(["STOCK", "OPTION", "CRYPTO", "FOREX", "FUTURES", "ETF", "ETP"]),
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
          include: tradeInclude,
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
      include: tradeInclude,
    });
    if (!trade) return res.status(404).json({ error: "Trade not found" });
    res.json(trade);
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/trades ─────────────────────────────────────────
// Creates the trade with an ENTRY fill, plus an EXIT fill if exitPrice is given

router.post("/", createTradeValidators, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const {
      direction, quantity, entryPrice, exitPrice, entryAt, exitAt,
      fees = 0, tagIds = [], currency = "SEK", fxRate, exitFxRate, leverage,
    } = req.body;
    const isUsd = currency === "USD";

    const trade = await prisma.$transaction(async (tx) => {
      const created = await tx.trade.create({
        data: {
          ...pick(req.body, ["ticker", "assetClass", "stopLoss", "takeProfit", "notes", "screenshot"]),
          userId: req.userId,
          direction,
          currency,
          leverage: leverage != null ? Number(leverage) : null,
          // Placeholders — recalcTrade derives these from the fills below
          tradeType: "SWING",
          quantity,
          entryPrice,
          entryAt: new Date(entryAt),
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
          executions: {
            create: [
              {
                type: "ENTRY",
                price: entryPrice,
                quantity,
                // Fees go on the exit when closing immediately, like the close form
                fees: exitPrice ? 0 : Number(fees),
                fxRate: isUsd ? fxRate || null : null,
                executedAt: new Date(entryAt),
              },
              ...(exitPrice
                ? [{
                    type: "EXIT",
                    price: exitPrice,
                    quantity,
                    fees: Number(fees),
                    fxRate: isUsd ? exitFxRate || fxRate || null : null,
                    executedAt: exitAt ? new Date(exitAt) : new Date(),
                  }]
                : []),
            ],
          },
        },
      });
      return recalcTrade(tx, created.id, tradeInclude);
    });

    res.status(201).json(trade);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/trades/:id ──────────────────────────────────────
// Updates trade-level fields. Prices, quantities, fees, times and fx rates
// live on the executions — edit those via /executions.

router.put("/:id", [param("id").isUUID(), ...tradeMetaValidators(false)], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { tagIds, leverage } = req.body;

    const trade = await prisma.$transaction(async (tx) => {
      const existing = await findOwnTrade(tx, req.params.id, req.userId);
      if (!existing) return null;

      await tx.trade.update({
        where: { id: existing.id },
        data: {
          ...pick(req.body, [
            "ticker", "assetClass", "direction", "stopLoss", "takeProfit",
            "notes", "screenshot", "currency",
          ]),
          ...(leverage !== undefined && { leverage: leverage != null ? Number(leverage) : null }),
          ...(tagIds !== undefined && {
            tags: {
              deleteMany: {},
              create: tagIds.map((tagId) => ({ tagId })),
            },
          }),
        },
      });
      // Direction, stop loss and currency affect derived fields
      return recalcTrade(tx, existing.id, tradeInclude);
    });

    if (!trade) return res.status(404).json({ error: "Trade not found" });
    res.json(trade);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/trades/:id/close ─────────────────────────────
// Convenience endpoint — adds an EXIT fill. Sells the whole open position
// unless a quantity is given (partial exit).

router.patch(
  "/:id/close",
  [
    param("id").isUUID(),
    body("exitPrice").isFloat({ gt: 0 }),
    body("exitAt").optional().isISO8601(),
    body("quantity").optional().isFloat({ gt: 0 }),
    body("fees").optional().isFloat({ min: 0 }),
    body("fxRate").optional({ nullable: true }).isFloat({ gt: 0 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { exitPrice, exitAt, quantity, fees = 0, fxRate } = req.body;

      const trade = await prisma.$transaction(async (tx) => {
        const existing = await findOwnTrade(tx, req.params.id, req.userId);
        if (!existing) return null;
        if (existing.status === "CLOSED") {
          const err = new Error("Trade already closed");
          err.status = 400;
          throw err;
        }

        const openQty = existing.executions.reduce(
          (a, e) => a + (e.type === "ENTRY" ? 1 : -1) * Number(e.quantity),
          0,
        );

        await tx.execution.create({
          data: {
            tradeId: existing.id,
            type: "EXIT",
            price: Number(exitPrice),
            quantity: quantity !== undefined ? Number(quantity) : openQty,
            fees: Number(fees),
            fxRate: existing.currency === "USD" ? fxRate || null : null,
            executedAt: exitAt ? new Date(exitAt) : new Date(),
          },
        });
        return recalcTrade(tx, existing.id, tradeInclude);
      });

      if (!trade) return res.status(404).json({ error: "Trade not found" });
      res.json(trade);
    } catch (err) {
      next(err);
    }
  }
);

// ─── Executions (fills) ───────────────────────────────────────
// Every change recomputes the trade; an inconsistent set of fills
// (e.g. selling more than is held) is rejected and rolled back.

const executionData = ({ type, price, quantity, fees = 0, fxRate, executedAt }, currency) => ({
  type,
  price: Number(price),
  quantity: Number(quantity),
  fees: Number(fees),
  fxRate: currency === "USD" ? fxRate || null : null,
  executedAt: new Date(executedAt),
});

router.post(
  "/:id/executions",
  [param("id").isUUID(), ...executionValidators],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const trade = await prisma.$transaction(async (tx) => {
        const existing = await findOwnTrade(tx, req.params.id, req.userId);
        if (!existing) return null;
        await tx.execution.create({
          data: { tradeId: existing.id, ...executionData(req.body, existing.currency) },
        });
        return recalcTrade(tx, existing.id, tradeInclude);
      });

      if (!trade) return res.status(404).json({ error: "Trade not found" });
      res.status(201).json(trade);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  "/:id/executions/:executionId",
  [param("id").isUUID(), param("executionId").isUUID(), ...executionValidators],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const trade = await prisma.$transaction(async (tx) => {
        const existing = await findOwnTrade(tx, req.params.id, req.userId);
        if (!existing?.executions.some((e) => e.id === req.params.executionId)) return null;
        await tx.execution.update({
          where: { id: req.params.executionId },
          data: executionData(req.body, existing.currency),
        });
        return recalcTrade(tx, existing.id, tradeInclude);
      });

      if (!trade) return res.status(404).json({ error: "Execution not found" });
      res.json(trade);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/:id/executions/:executionId",
  [param("id").isUUID(), param("executionId").isUUID()],
  async (req, res, next) => {
    try {
      const trade = await prisma.$transaction(async (tx) => {
        const existing = await findOwnTrade(tx, req.params.id, req.userId);
        if (!existing?.executions.some((e) => e.id === req.params.executionId)) return null;
        await tx.execution.delete({ where: { id: req.params.executionId } });
        return recalcTrade(tx, existing.id, tradeInclude);
      });

      if (!trade) return res.status(404).json({ error: "Execution not found" });
      res.json(trade);
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
