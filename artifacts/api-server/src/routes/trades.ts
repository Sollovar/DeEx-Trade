import { Router } from "express";
import { db } from "@workspace/db";
import { fillsTable } from "@workspace/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

const router = Router();

router.get("/trades/:pairId", async (req, res) => {
  try {
    const { pairId } = req.params;
    const { limit = "50", since } = req.query as Record<string, string>;
    const lim = Math.min(parseInt(limit, 10) || 50, 200);

    const conditions = [eq(fillsTable.pairId, pairId)];

    if (since) {
      conditions.push(gte(fillsTable.createdAt, new Date(parseInt(since, 10) * 1000)));
    }

    const rows = await db
      .select()
      .from(fillsTable)
      .where(and(...conditions))
      .orderBy(desc(fillsTable.createdAt))
      .limit(lim);

    const trades = rows.map((r: typeof rows[0]) => ({
      id: r.id,
      pair_id: r.pairId,
      side: r.side,
      price: r.price,
      amount: r.amount,
      amount_in: r.amountIn,
      amount_out: r.amountOut,
      maker: r.maker,
      taker: r.taker,
      tx_hash: r.txHash,
      time: r.createdAt ? Math.floor(r.createdAt.getTime() / 1000) : 0,
      created_at: r.createdAt,
    }));

    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch trades", details: String(err) });
  }
});

export default router;
