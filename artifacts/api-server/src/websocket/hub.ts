import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { logger } from "../lib/logger";

export interface WsMessage {
  type: string;
  pair_id?: string;
  payload?: unknown;
}

export interface OrderbookLevel {
  price: string;
  amount: string;
  total: string;
  orders: number;
}

export interface TradeUpdate {
  id: number;
  price: string;
  amount: string;
  side: string;
  time: number;
  tx_hash: string;
}

export interface TickerUpdate {
  pair_id: string;
  last_price: string;
  price_change_24h: string;
  volume_24h: string;
  volume_24h_usd?: string;
  price_usd?: string;
  price_high_24h?: string;
  price_low_24h?: string;
  liquidity?: string;
  liquidity_usd?: string;
}

export interface PriceUpdate {
  pair_id: string;
  last_trade_price: string;
  last_trade_at: number;
  source: string;
}

interface Client {
  ws: WebSocket;
  pairId: string;
  send: (msg: WsMessage) => void;
}

export class WsHub {
  private pairs: Map<string, Set<Client>> = new Map();
  private sequence: Map<string, number> = new Map();

  handleUpgrade(ws: WebSocket, _req: IncomingMessage) {
    const client: Client = {
      ws,
      pairId: "all",
      send: (msg: WsMessage) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(msg));
        }
      },
    };

    this.register(client);

    ws.on("message", (raw) => {
      try {
        const msg: WsMessage = JSON.parse(raw.toString());
        if (msg.type === "subscribe" && msg.pair_id) {
          this.unregister(client);
          client.pairId = msg.pair_id;
          this.register(client);
          logger.info({ pairId: msg.pair_id }, "[WsHub] client subscribed to pair");
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on("close", () => {
      this.unregister(client);
    });

    ws.on("error", () => {
      this.unregister(client);
    });

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(ping);
      }
    }, 30_000);
  }

  private register(client: Client) {
    const key = client.pairId;
    if (!this.pairs.has(key)) {
      this.pairs.set(key, new Set());
    }
    this.pairs.get(key)!.add(client);
  }

  private unregister(client: Client) {
    const set = this.pairs.get(client.pairId);
    if (set) {
      set.delete(client);
      if (set.size === 0) {
        this.pairs.delete(client.pairId);
      }
    }
  }

  broadcastToPair(pairId: string, msg: WsMessage) {
    const data = JSON.stringify(msg);

    const send = (clients: Set<Client> | undefined) => {
      if (!clients) return;
      for (const client of clients) {
        if (client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.send(data);
          } catch {
            this.unregister(client);
          }
        }
      }
    };

    send(this.pairs.get(pairId));
    send(this.pairs.get("all"));
  }

  broadcastOrderbookUpdate(pairId: string, asks: OrderbookLevel[], bids: OrderbookLevel[]) {
    const seq = (this.sequence.get(pairId) ?? 0) + 1;
    this.sequence.set(pairId, seq);
    this.broadcastToPair(pairId, {
      type: "orderbook",
      pair_id: pairId,
      payload: { asks, bids, sequence: seq },
    });
  }

  broadcastTradeUpdate(pairId: string, trade: TradeUpdate) {
    this.broadcastToPair(pairId, {
      type: "trade",
      pair_id: pairId,
      payload: trade,
    });
  }

  broadcastTickerUpdate(ticker: TickerUpdate) {
    this.broadcastToPair(ticker.pair_id, {
      type: "ticker",
      pair_id: ticker.pair_id,
      payload: ticker,
    });
  }

  broadcastPriceUpdate(update: PriceUpdate) {
    this.broadcastToPair(update.pair_id, {
      type: "price_update",
      pair_id: update.pair_id,
      payload: update,
    });
  }

  broadcastOrderUpdate(pairId: string, orderId: number, order: unknown) {
    this.broadcastToPair("all", {
      type: "order_update",
      pair_id: pairId,
      payload: { order_id: orderId, order },
    });
  }

  broadcastLiquidityUpdate(pairId: string, liquidity: string, liquidityUsd: string) {
    this.broadcastToPair(pairId, {
      type: "liquidity",
      pair_id: pairId,
      payload: { liquidity, liquidity_usd: liquidityUsd },
    });
  }

  clientCount(): number {
    let n = 0;
    for (const set of this.pairs.values()) n += set.size;
    return n;
  }
}

export const hub = new WsHub();
