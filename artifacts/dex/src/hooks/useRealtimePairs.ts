/**
 * useRealtimePairs
 * ─────────────────
 * Opens a single WebSocket connection subscribed to pair="all" and keeps
 * every pair in the Zustand store up-to-date in real time.
 *
 * Price update sources (in order of latency):
 *   1. "price_update"  — fired immediately on every fill (sub-second)
 *   2. "ticker"        — fired after fill settlement + after every 30s cache refresh
 *                        (this is how GeckoTerminal / price-worker updates reach the UI)
 *
 * Also tracks a flash direction (up | down | null) per pair ID so any component
 * can show a green/red flash when a price ticks.
 * Flash resets to null after FLASH_MS milliseconds.
 *
 * Usage:
 *   const { flashMap } = useRealtimePairs();
 *   const flash = flashMap[pairId]; // "up" | "down" | null
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../stores/useStore';

export type FlashDir = 'up' | 'down' | null;

const FLASH_MS      = 700;   // how long the flash colour stays on
const RECONNECT_MS  = 3000;  // reconnect delay on disconnect

function buildWsUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL as string | undefined;
  if (explicit) {
    const u = new URL(explicit);
    u.searchParams.set('pair', 'all');
    return u.toString();
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws?pair=all`;
}

/** Map of pairId → current flash direction */
export type FlashMap = Record<string, FlashDir>;

export function useRealtimePairs(): { flashMap: FlashMap; connected: boolean } {
  const [flashMap, setFlashMap]   = useState<FlashMap>({});
  const [connected, setConnected] = useState(false);

  const updatePair   = useStore(s => s.updatePair);
  const getStorePairs = useStore.getState;

  // Timers to reset each pair's flash back to null
  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const triggerFlash = useCallback((pairId: string, dir: FlashDir) => {
    if (!dir) return;
    setFlashMap(prev => ({ ...prev, [pairId]: dir }));
    if (flashTimers.current[pairId]) clearTimeout(flashTimers.current[pairId]);
    flashTimers.current[pairId] = setTimeout(() => {
      setFlashMap(prev => ({ ...prev, [pairId]: null }));
    }, FLASH_MS);
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let shouldReconnect = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      ws = new WebSocket(buildWsUrl());

      ws.onopen = () => {
        setConnected(true);
        // Subscribe to all pairs
        ws!.send(JSON.stringify({ type: 'subscribe', pairId: 'all' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            pair_id?: string;
            payload?: Record<string, unknown>;
          };
          if (!msg.type || !msg.pair_id) return;

          const pairId = msg.pair_id;

          /* ── ticker — full stats update (from fill settlement or cache refresh) ── */
          if (msg.type === 'ticker' && msg.payload) {
            const p   = msg.payload;
            const newPrice = parseFloat(p.last_price as string) || 0;

            // Determine flash direction by comparing against current store price
            const currentPair = getStorePairs().pairs.find(x => x.id === pairId);
            const oldPrice    = currentPair?.price ?? 0;
            const dir: FlashDir = newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : null;

            const updates: Parameters<typeof updatePair>[1] = {
              price:         newPrice,
              priceChange24h: parseFloat(p.price_change_24h as string) || 0,
              volume24h:     parseFloat(p.volume_24h as string)        || 0,
              // Keep existing volume24hUSD if ticker sends 0 (Chainlink failure) —
              // don't overwrite a good cached value with a failed lookup result.
              volume24hUSD:  (() => {
                const v = parseFloat(p.volume_24h_usd as string);
                return (Number.isFinite(v) && v > 0) ? v : undefined;
              })(),
              priceUSD:      parseFloat(p.price_usd as string)         || undefined,
              priceHigh24h:  parseFloat(p.price_high_24h as string)    || undefined,
              priceLow24h:   parseFloat(p.price_low_24h as string)     || undefined,
              liquidity:     parseFloat(p.liquidity as string)         || 0,
              liquidityUSD:  (() => {
                const v = parseFloat(p.liquidity_usd as string);
                return (Number.isFinite(v) && v > 0) ? v : undefined;
              })(),
            };
            updatePair(pairId, updates);
            triggerFlash(pairId, dir);
            return;
          }

          /* ── price_update — immediate lightweight flash on fill ── */
          if (msg.type === 'price_update' && msg.payload) {
            const p        = msg.payload;
            const newPrice = parseFloat(p.last_trade_price as string) || 0;
            if (newPrice <= 0) return;

            const currentPair = getStorePairs().pairs.find(x => x.id === pairId);
            const oldPrice    = currentPair?.price ?? 0;
            const dir: FlashDir = newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : null;

            updatePair(pairId, { price: newPrice });
            triggerFlash(pairId, dir);
            return;
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onerror  = () => setConnected(false);
      ws.onclose  = () => {
        setConnected(false);
        if (shouldReconnect) {
          reconnectTimer = setTimeout(connect, RECONNECT_MS);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      // Clear all flash timers
      Object.values(flashTimers.current).forEach(clearTimeout);
    };
  }, [updatePair, triggerFlash, getStorePairs]);

  return { flashMap, connected };
}
