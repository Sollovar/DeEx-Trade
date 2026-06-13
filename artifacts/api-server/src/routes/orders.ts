import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, fillsTable, pairsTable } from "@workspace/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { matchingEngine } from "../engine/matching";
import { hub } from "../websocket/hub";
import { logger } from "../lib/logger";

const router = Router();

router.post("/orders", async (req, res) => {
  try {
    const body = req.body as {
      network: string;
      pair_id: string;
      side: "buy" | "sell";
      order_type?: string;
      price: string;
      amount: string;
      amount_in?: string;
      amount_out_min?: string;
      token_in?: string;
      token_out?: string;
      maker?: string;
      receiver?: string;
      signature?: string;
      order_hash?: string;
      expiration?: string;
      nonce?: number;
      salt?: number;
      time_in_force?: string;
      trigger_price?: string;
      is_post_only?: boolean;
      reduce_only?: boolean;
      amount_in_decimals?: number;
      amount_out_decimals?: number;
    };

    if (!body.network || !body.pair_id || !body.side || !body.price || !body.amount) {
      return res.status(400).json({ error: "Missing required fields: network, pair_id, side, price, amount" });
    }

    const orderType = body.order_type || "limit";
    const expiration = body.expiration
      ? new Date(body.expiration)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [inserted] = await db
      .insert(ordersTable)
      .values({
        network: body.network,
        pairId: body.pair_id,
        side: body.side,
        orderType,
        price: body.price,
        amount: body.amount,
        filledAmount: "0",
        amountIn: body.amount_in,
        amountOutMin: body.amount_out_min,
        tokenIn: body.token_in,
        tokenOut: body.token_out,
        maker: body.maker,
        receiver: body.receiver,
        signature: body.signature,
        orderHash: body.order_hash,
        expiration,
        nonce: body.nonce ?? 0,
        salt: body.salt ?? 0,
        status: "pending",
        timeInForce: body.time_in_force || "GTC",
        triggerPrice: body.trigger_price,
        isPostOnly: body.is_post_only ?? false,
        reduceOnly: body.reduce_only ?? false,
        amountInDecimals: body.amount_in_decimals ?? 18,
        amountOutDecimals: body.amount_out_decimals ?? 18,
      })
      .returning();

    if (!inserted) {
      return res.status(500).json({ error: "Failed to create order" });
    }

    matchingEngine.ensureOrderBook(body.pair_id);

    if (orderType === "limit" || orderType === "post_only") {
      const result = await matchingEngine.matchOrder(inserted);

      if (result.fills.length > 0) {
        const fillRows = await db.insert(fillsTable).values(
          result.fills.map((f) => ({
            network: f.network!,
            pairId: f.pairId!,
            orderId: inserted.id,
            makerOrderId: f.makerOrderId ?? null,
            takerOrderId: f.takerOrderId ?? null,
            maker: f.maker!,
            taker: f.taker!,
            side: f.side!,
            price: f.price!,
            amount: f.amount!,
            amountIn: f.amountIn,
            amountOut: f.amountOut,
            status: "settled",
          }))
        ).returning();

        for (const fill of fillRows) {
          hub.broadcastTradeUpdate(body.pair_id, {
            id: fill.id,
            price: fill.price,
            amount: fill.amount,
            side: fill.side,
            time: fill.createdAt ? Math.floor(fill.createdAt.getTime() / 1000) : 0,
            tx_hash: fill.txHash ?? "",
          });

          if (fill.makerOrderId) {
            const makerOrders = await db
              .select()
              .from(ordersTable)
              .where(eq(ordersTable.id, fill.makerOrderId))
              .limit(1);

            if (makerOrders.length > 0) {
              const makerOrder = makerOrders[0];
              const makerFilled =
                parseFloat(makerOrder.filledAmount ?? "0") + parseFloat(fill.amount ?? "0");
              const makerAmount = parseFloat(makerOrder.amount ?? "0");
              const makerStatus = makerFilled >= makerAmount ? "filled" : "partial";

              await db
                .update(ordersTable)
                .set({
                  filledAmount: makerFilled.toString(),
                  status: makerStatus,
                  updatedAt: new Date(),
                })
                .where(eq(ordersTable.id, fill.makerOrderId));

              hub.broadcastOrderUpdate(body.pair_id, fill.makerOrderId, {
                ...makerOrder,
                filled_amount: makerFilled.toString(),
                status: makerStatus,
              });
            }
          }
        }

        const newFilled =
          parseFloat(inserted.filledAmount ?? "0") +
          result.fills.reduce((s, f) => s + parseFloat(f.amount ?? "0"), 0);

        await db
          .update(ordersTable)
          .set({
            filledAmount: newFilled.toString(),
            status: result.status,
            updatedAt: new Date(),
          })
          .where(eq(ordersTable.id, inserted.id));

        hub.broadcastPriceUpdate({
          pair_id: body.pair_id,
          last_trade_price: result.fills[result.fills.length - 1]?.price ?? body.price,
          last_trade_at: Math.floor(Date.now() / 1000),
          source: "trade",
        });
      }

      await matchingEngine.rebuildOrderBook(body.pair_id).catch(() => {});
    } else if (orderType === "market") {
      const result = await matchingEngine.matchOrder(inserted);

      if (result.fills.length > 0) {
        await db.insert(fillsTable).values(
          result.fills.map((f) => ({
            network: f.network!,
            pairId: f.pairId!,
            orderId: inserted.id,
            makerOrderId: f.makerOrderId ?? null,
            takerOrderId: f.takerOrderId ?? null,
            maker: f.maker!,
            taker: f.taker!,
            side: f.side!,
            price: f.price!,
            amount: f.amount!,
            amountIn: f.amountIn,
            amountOut: f.amountOut,
            status: "settled",
          }))
        );

        const newFilled = result.fills.reduce((s, f) => s + parseFloat(f.amount ?? "0"), 0);
        await db
          .update(ordersTable)
          .set({
            filledAmount: newFilled.toString(),
            status: result.status,
            updatedAt: new Date(),
          })
          .where(eq(ordersTable.id, inserted.id));

        for (const fill of result.fills) {
          hub.broadcastTradeUpdate(body.pair_id, {
            id: inserted.id,
            price: fill.price ?? body.price,
            amount: fill.amount ?? "0",
            side: body.side,
            time: Math.floor(Date.now() / 1000),
            tx_hash: "",
          });
        }
      }

      await matchingEngine.rebuildOrderBook(body.pair_id).catch(() => {});
    }

    const [finalOrder] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, inserted.id))
      .limit(1);

    res.status(201).json({ order: finalOrder });
  } catch (err) {
    logger.error(err, "[Orders] error creating order");
    res.status(500).json({ error: "Failed to create order", details: String(err) });
  }
});

router.get("/orders", async (req, res) => {
  try {
    const { maker, pair_id, status, limit = "50" } = req.query as Record<string, string>;
    const lim = Math.min(parseInt(limit, 10) || 50, 200);

    const conditions = [];
    if (maker) conditions.push(eq(ordersTable.maker, maker));
    if (pair_id) conditions.push(eq(ordersTable.pairId, pair_id));
    if (status) {
      const statuses = status.split(",").map((s) => s.trim());
      conditions.push(inArray(ordersTable.status, statuses));
    }

    const rows = await db
      .select()
      .from(ordersTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(ordersTable.createdAt))
      .limit(lim);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders", details: String(err) });
  }
});

router.get("/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid order id" });

    const rows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    if (rows.length === 0) return res.status(404).json({ error: "Order not found" });

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order", details: String(err) });
  }
});

router.delete("/orders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid order id" });

    const rows = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    if (rows.length === 0) return res.status(404).json({ error: "Order not found" });

    const order = rows[0];
    const cancellable = ["pending", "partial", "open"];

    if (!cancellable.includes(order.status ?? "")) {
      return res.status(400).json({ error: `Cannot cancel order in status: ${order.status}` });
    }

    await db
      .update(ordersTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(ordersTable.id, id));

    if (order.pairId) {
      hub.broadcastOrderUpdate(order.pairId, id, { ...order, status: "cancelled" });
      matchingEngine.rebuildOrderBook(order.pairId).catch(() => {});
    }

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel order", details: String(err) });
  }
});

export default router;
