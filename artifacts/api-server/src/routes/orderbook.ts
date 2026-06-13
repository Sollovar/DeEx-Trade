import { Router } from "express";
import { matchingEngine } from "../engine/matching";

const router = Router();

router.get("/orderbook/:pairId", async (req, res) => {
  try {
    const { pairId } = req.params;
    const { depth = "20" } = req.query as Record<string, string>;
    const depthNum = Math.min(parseInt(depth, 10) || 20, 100);

    const ob = matchingEngine.getOrderBook(pairId);

    if (!ob) {
      return res.json({
        pair_id: pairId,
        asks: [],
        bids: [],
        sequence: 0,
        mid_price: 0,
        spread: 0,
        spread_percent: 0,
      });
    }

    const asks = ob.asks.slice(0, depthNum).map((l) => ({
      price: l.price.toString(),
      amount: l.amount.toString(),
      total: l.total.toString(),
      orders: l.orders,
    }));

    const bids = ob.bids.slice(0, depthNum).map((l) => ({
      price: l.price.toString(),
      amount: l.amount.toString(),
      total: l.total.toString(),
      orders: l.orders,
    }));

    const bestAsk = ob.asks[0]?.price ?? 0;
    const bestBid = ob.bids[0]?.price ?? 0;
    const midPrice = bestAsk && bestBid ? (bestAsk + bestBid) / 2 : 0;
    const spread = bestAsk && bestBid ? bestAsk - bestBid : 0;
    const spreadPercent = midPrice > 0 ? (spread / midPrice) * 100 : 0;

    res.json({
      pair_id: pairId,
      asks,
      bids,
      sequence: ob.sequence,
      mid_price: midPrice,
      spread,
      spread_percent: spreadPercent,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order book", details: String(err) });
  }
});

export default router;
