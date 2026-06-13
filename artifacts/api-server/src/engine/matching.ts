import { db } from "@workspace/db";
import { ordersTable, fillsTable, pairsTable, type Order, type Fill } from "@workspace/db/schema";
import { eq, and, inArray, lt, or, isNotNull, asc, desc } from "drizzle-orm";
import { hub } from "../websocket/hub";
import { logger } from "../lib/logger";

export type OrderSide = "buy" | "sell";
export type OrderType = "limit" | "market" | "stop_loss" | "take_profit" | "post_only";
export type OrderStatus = "pending" | "partial" | "filled" | "cancelled" | "expired" | "triggered" | "open";

export interface PriceLevel {
  price: number;
  amount: number;
  total: number;
  orders: number;
  orderIds: number[];
}

export interface OrderBook {
  pairId: string;
  asks: PriceLevel[];
  bids: PriceLevel[];
  sequence: number;
}

export interface MatchResult {
  fills: Partial<Fill>[];
  remaining: number;
  status: OrderStatus;
}

function groupOrdersByPrice(orders: Order[], side: OrderSide): PriceLevel[] {
  const priceMap = new Map<string, PriceLevel>();

  for (const order of orders) {
    const price = parseFloat(order.price ?? "0");
    const amount = parseFloat(order.amount ?? "0");
    const filled = parseFloat(order.filledAmount ?? "0");
    const available = amount - filled;
    if (available <= 0) continue;

    const key = price.toFixed(20);
    if (priceMap.has(key)) {
      const lvl = priceMap.get(key)!;
      lvl.amount += available;
      lvl.total += available * price;
      lvl.orders++;
      lvl.orderIds.push(order.id);
    } else {
      priceMap.set(key, {
        price,
        amount: available,
        total: available * price,
        orders: 1,
        orderIds: [order.id],
      });
    }
  }

  const levels = Array.from(priceMap.values());

  if (side === "buy") {
    levels.sort((a, b) => b.price - a.price);
  } else {
    levels.sort((a, b) => a.price - b.price);
  }

  return levels;
}

class MatchingEngine {
  private orderBooks: Map<string, OrderBook> = new Map();
  private orderBookUpdaterTimer?: ReturnType<typeof setInterval>;
  private expiredOrderTimer?: ReturnType<typeof setInterval>;

  async start() {
    await this.loadOrderBooks();

    this.orderBookUpdaterTimer = setInterval(() => {
      this.refreshAllOrderBooks().catch((e) =>
        logger.error(e, "[Matching] error refreshing order books")
      );
    }, 5_000);

    this.expiredOrderTimer = setInterval(() => {
      this.processExpiredOrders().catch((e) =>
        logger.error(e, "[Matching] error processing expired orders")
      );
    }, 15_000);

    this.processExpiredOrders().catch(() => {});

    logger.info("[Matching] engine started");
  }

  stop() {
    if (this.orderBookUpdaterTimer) clearInterval(this.orderBookUpdaterTimer);
    if (this.expiredOrderTimer) clearInterval(this.expiredOrderTimer);
  }

  private async loadOrderBooks() {
    try {
      const pairs = await db.select({ id: pairsTable.id }).from(pairsTable).limit(500);
      for (const pair of pairs) {
        await this.rebuildOrderBook(pair.id);
      }
      logger.info(`[Matching] loaded ${pairs.length} order books`);
    } catch (e) {
      logger.error(e, "[Matching] failed to load order books");
    }
  }

  private async refreshAllOrderBooks() {
    const pairIds = Array.from(this.orderBooks.keys());
    for (const pairId of pairIds) {
      try {
        await this.rebuildOrderBook(pairId);
      } catch (e) {
        logger.error(e, `[Matching] failed to refresh order book for ${pairId}`);
      }
    }
  }

  async rebuildOrderBook(pairId: string) {
    const activeStatuses: string[] = ["pending", "partial", "open"];
    const allOrders = await db
      .select()
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.pairId, pairId),
          inArray(ordersTable.status, activeStatuses),
          inArray(ordersTable.orderType, ["limit", "post_only"])
        )
      );

    const asks = allOrders.filter((o) => o.side === "sell");
    const bids = allOrders.filter((o) => o.side === "buy");

    const ob: OrderBook = {
      pairId,
      asks: groupOrdersByPrice(asks, "sell"),
      bids: groupOrdersByPrice(bids, "buy"),
      sequence: Date.now(),
    };

    this.orderBooks.set(pairId, ob);

    hub.broadcastOrderbookUpdate(
      pairId,
      ob.asks.slice(0, 20).map((l) => ({
        price: l.price.toString(),
        amount: l.amount.toString(),
        total: l.total.toString(),
        orders: l.orders,
      })),
      ob.bids.slice(0, 20).map((l) => ({
        price: l.price.toString(),
        amount: l.amount.toString(),
        total: l.total.toString(),
        orders: l.orders,
      }))
    );
  }

  getOrderBook(pairId: string): OrderBook | undefined {
    return this.orderBooks.get(pairId);
  }

  ensureOrderBook(pairId: string) {
    if (!this.orderBooks.has(pairId)) {
      this.orderBooks.set(pairId, {
        pairId,
        asks: [],
        bids: [],
        sequence: Date.now(),
      });
    }
  }

  async matchOrder(order: Order): Promise<MatchResult> {
    const pairId = order.pairId!;
    this.ensureOrderBook(pairId);

    const ob = this.orderBooks.get(pairId)!;
    const side = order.side as OrderSide;
    const orderType = order.orderType as OrderType;

    const incomingAmount = parseFloat(order.amount ?? "0");
    const incomingPrice = parseFloat(order.price ?? "0");
    let remaining = incomingAmount;
    const fills: Partial<Fill>[] = [];

    const matchingLevels = side === "buy" ? ob.asks : ob.bids;

    for (const level of matchingLevels) {
      if (remaining <= 0) break;

      const priceMatch =
        orderType === "market" ||
        (side === "buy" ? incomingPrice >= level.price : incomingPrice <= level.price);

      if (!priceMatch) continue;

      const makerOrders = await db
        .select()
        .from(ordersTable)
        .where(
          and(
            inArray(ordersTable.id, level.orderIds),
            inArray(ordersTable.status, ["pending", "partial", "open"])
          )
        )
        .orderBy(asc(ordersTable.createdAt));

      for (const makerOrder of makerOrders) {
        if (remaining <= 0) break;

        const makerAmount = parseFloat(makerOrder.amount ?? "0");
        const makerFilled = parseFloat(makerOrder.filledAmount ?? "0");
        const available = makerAmount - makerFilled;
        if (available <= 0) continue;

        const fillAmount = Math.min(remaining, available);
        const fillAmountIn = fillAmount * level.price;

        fills.push({
          network: order.network,
          pairId,
          orderId: order.id,
          makerOrderId: makerOrder.id,
          takerOrderId: order.id,
          maker: makerOrder.maker ?? "",
          taker: order.maker ?? "",
          side: order.side,
          price: level.price.toString(),
          amount: fillAmount.toString(),
          amountIn: fillAmountIn.toString(),
          amountOut: fillAmount.toString(),
          status: "settled",
        });

        remaining -= fillAmount;
      }
    }

    let status: OrderStatus = "pending";
    if (remaining <= 0) status = "filled";
    else if (remaining < incomingAmount) status = "partial";

    return { fills, remaining, status };
  }

  async processExpiredOrders() {
    try {
      const now = new Date();
      const expired = await db
        .select()
        .from(ordersTable)
        .where(
          and(
            inArray(ordersTable.status, ["pending", "partial", "open"]),
            lt(ordersTable.expiration, now)
          )
        )
        .limit(100);

      if (expired.length === 0) return;

      for (const order of expired) {
        await db
          .update(ordersTable)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(ordersTable.id, order.id));

        if (order.pairId) {
          await this.rebuildOrderBook(order.pairId).catch(() => {});
        }
      }

      logger.info(`[Matching] expired ${expired.length} orders`);
    } catch (e) {
      logger.error(e, "[Matching] processExpiredOrders error");
    }
  }
}

export const matchingEngine = new MatchingEngine();
