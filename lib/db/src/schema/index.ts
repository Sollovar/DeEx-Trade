import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  bigint,
  boolean,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    address: varchar("address", { length: 66 }).unique().notNull(),
    email: varchar("email", { length: 255 }),
    username: varchar("username", { length: 100 }),
    referralCode: varchar("referral_code", { length: 50 }).unique(),
    referredBy: varchar("referred_by", { length: 66 }),
    network: varchar("network", { length: 20 }).notNull().default("bsc"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("idx_users_address").on(t.address)],
);

export const tokensTable = pgTable(
  "tokens",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    network: varchar("network", { length: 20 }).notNull(),
    address: varchar("address", { length: 66 }).unique().notNull(),
    symbol: varchar("symbol", { length: 20 }),
    name: varchar("name", { length: 100 }),
    decimals: integer("decimals"),
    logoUri: text("logo_uri"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_tokens_network").on(t.network),
    index("idx_tokens_address").on(t.address),
  ],
);

export const pairsTable = pgTable(
  "pairs",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    network: varchar("network", { length: 20 }).notNull(),
    baseToken: varchar("base_token", { length: 66 }).notNull(),
    quoteToken: varchar("quote_token", { length: 66 }).notNull(),
    baseSymbol: varchar("base_symbol", { length: 20 }),
    quoteSymbol: varchar("quote_symbol", { length: 20 }),
    dexName: varchar("dex_name", { length: 50 }),
    poolAddress: varchar("pool_address", { length: 66 }),
    poolName: varchar("pool_name", { length: 200 }),
    price: numeric("price", { precision: 40, scale: 20 }),
    priceUsd: numeric("price_usd", { precision: 40, scale: 20 }),
    priceChange24h: numeric("price_change_24h", { precision: 20, scale: 6 }),
    priceHigh24h: numeric("price_high_24h", { precision: 40, scale: 20 }),
    priceLow24h: numeric("price_low_24h", { precision: 40, scale: 20 }),
    volume24h: numeric("volume_24h", { precision: 40, scale: 20 }),
    volume24hUsd: numeric("volume_24h_usd", { precision: 40, scale: 20 }),
    liquidity: numeric("liquidity", { precision: 40, scale: 20 }),
    liquidityUsd: numeric("liquidity_usd", { precision: 40, scale: 20 }),
    marketCap: numeric("market_cap", { precision: 40, scale: 20 }),
    marketCapUsd: numeric("market_cap_usd", { precision: 40, scale: 20 }),
    trendingScore: numeric("trending_score", { precision: 10, scale: 4 }),
    lastTradePrice: numeric("last_trade_price", { precision: 40, scale: 20 }),
    lastTradeAt: timestamp("last_trade_at", { withTimezone: true }),
    baseTokenDecimals: integer("base_token_decimals").default(18),
    quoteTokenDecimals: integer("quote_token_decimals").default(18),
    baseTokenInfo: jsonb("base_token_info"),
    quoteTokenInfo: jsonb("quote_token_info"),
    indexedAt: timestamp("indexed_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_pairs_network").on(t.network),
    index("idx_pairs_base_token").on(t.baseToken),
  ],
);

export const ordersTable = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderHash: varchar("order_hash", { length: 100 }).unique(),
    userId: integer("user_id").references(() => usersTable.id),
    network: varchar("network", { length: 20 }).notNull(),
    pairId: varchar("pair_id", { length: 100 }).references(() => pairsTable.id),
    side: varchar("side", { length: 10 }).notNull(),
    orderType: varchar("order_type", { length: 20 }).notNull().default("limit"),
    price: numeric("price", { precision: 40, scale: 20 }).notNull(),
    amount: numeric("amount", { precision: 40, scale: 20 }).notNull(),
    filledAmount: numeric("filled_amount", { precision: 40, scale: 20 }).default("0"),
    amountIn: numeric("amount_in", { precision: 40, scale: 20 }),
    amountOutMin: numeric("amount_out_min", { precision: 40, scale: 20 }),
    tokenIn: varchar("token_in", { length: 66 }),
    tokenOut: varchar("token_out", { length: 66 }),
    receiver: varchar("receiver", { length: 66 }),
    maker: varchar("maker", { length: 66 }),
    signature: text("signature"),
    expiration: timestamp("expiration", { withTimezone: true }).notNull(),
    nonce: bigint("nonce", { mode: "number" }),
    salt: bigint("salt", { mode: "number" }),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    isLadder: boolean("is_ladder").default(false),
    ladderLevels: integer("ladder_levels"),
    ladderPriceStart: numeric("ladder_price_start", { precision: 40, scale: 20 }),
    ladderPriceEnd: numeric("ladder_price_end", { precision: 40, scale: 20 }),
    ladderParentId: integer("ladder_parent_id"),
    commitHash: varchar("commit_hash", { length: 100 }),
    commitRevealed: boolean("commit_revealed").default(false),
    commitExpired: boolean("commit_expired").default(false),
    triggerPrice: numeric("trigger_price", { precision: 40, scale: 20 }),
    triggeredAt: timestamp("triggered_at", { withTimezone: true }),
    isPostOnly: boolean("is_post_only").default(false),
    reduceOnly: boolean("reduce_only").default(false),
    timeInForce: varchar("time_in_force", { length: 10 }).default("GTC"),
    stopLossType: varchar("stop_loss_type", { length: 20 }),
    amountInDecimals: integer("amount_in_decimals").default(18),
    amountOutDecimals: integer("amount_out_decimals").default(18),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_orders_pair_id").on(t.pairId),
    index("idx_orders_user_id").on(t.userId),
    index("idx_orders_status").on(t.status),
    index("idx_orders_network").on(t.network),
  ],
);

export const fillsTable = pgTable(
  "fills",
  {
    id: serial("id").primaryKey(),
    network: varchar("network", { length: 20 }).notNull(),
    pairId: varchar("pair_id", { length: 100 }).references(() => pairsTable.id),
    orderId: integer("order_id").references(() => ordersTable.id),
    makerOrderId: integer("maker_order_id"),
    takerOrderId: integer("taker_order_id"),
    maker: varchar("maker", { length: 66 }).notNull(),
    taker: varchar("taker", { length: 66 }).notNull(),
    side: varchar("side", { length: 10 }).notNull(),
    price: numeric("price", { precision: 40, scale: 20 }).notNull(),
    amount: numeric("amount", { precision: 40, scale: 20 }).notNull(),
    amountIn: numeric("amount_in", { precision: 40, scale: 20 }),
    amountOut: numeric("amount_out", { precision: 40, scale: 20 }),
    fee: numeric("fee", { precision: 40, scale: 20 }),
    tokenIn: varchar("token_in", { length: 66 }),
    tokenOut: varchar("token_out", { length: 66 }),
    txHash: varchar("tx_hash", { length: 100 }),
    txHashBuy: varchar("tx_hash_buy", { length: 100 }),
    txHashSell: varchar("tx_hash_sell", { length: 100 }),
    blockNumber: bigint("block_number", { mode: "number" }),
    gasUsed: bigint("gas_used", { mode: "number" }),
    status: varchar("status", { length: 20 }).default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_fills_pair_id").on(t.pairId),
    index("idx_fills_order_id").on(t.orderId),
    index("idx_fills_network").on(t.network),
    index("idx_fills_created_at").on(t.createdAt),
  ],
);

export const candlesTable = pgTable(
  "candles",
  {
    pairId: varchar("pair_id", { length: 100 }).notNull(),
    time: bigint("time", { mode: "number" }).notNull(),
    resolution: integer("resolution").notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("usd"),
    open: numeric("open", { precision: 40, scale: 20 }),
    high: numeric("high", { precision: 40, scale: 20 }),
    low: numeric("low", { precision: 40, scale: 20 }),
    close: numeric("close", { precision: 40, scale: 20 }),
    volume: numeric("volume", { precision: 40, scale: 20 }),
    source: varchar("source", { length: 20 }).default("gecko"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("idx_candles_pair_time").on(t.pairId, t.time),
    index("idx_candles_resolution").on(t.resolution),
  ],
);

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
export type Token = typeof tokensTable.$inferSelect;
export type InsertToken = typeof tokensTable.$inferInsert;
export type Pair = typeof pairsTable.$inferSelect;
export type InsertPair = typeof pairsTable.$inferInsert;
export type Order = typeof ordersTable.$inferSelect;
export type InsertOrder = typeof ordersTable.$inferInsert;
export type Fill = typeof fillsTable.$inferSelect;
export type InsertFill = typeof fillsTable.$inferInsert;
export type Candle = typeof candlesTable.$inferSelect;
export type InsertCandle = typeof candlesTable.$inferInsert;

export const insertOrderSchema = createInsertSchema(ordersTable);
