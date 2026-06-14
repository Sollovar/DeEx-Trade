import { useState, useEffect } from 'react';
import type { Pair } from '../types';
import { getPairs } from '../services/pairs';
import { useStore } from '../stores/useStore';

export function usePairs() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { pairs, setPairs } = useStore();

  useEffect(() => {
    async function fetchPairs() {
      try {
        setLoading(true);
        const data = await getPairs();
        setPairs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch pairs');
      } finally {
        setLoading(false);
      }
    }

    fetchPairs();
  }, [setPairs]);

  return { pairs, loading, error };
}
