import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { friendlyError } from './supabase';

/**
 * Runs `fetcher` whenever the screen comes into focus, so lists are fresh after
 * the user adds or edits something on another screen. `refresh` powers pull-to-refresh.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async () => {
    try {
      setError(null);
      setData(await fetcherRef.current());
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      void refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refetch, ...deps]),
  );

  return { data, error, loading, refetch, refresh, refreshing };
}

/** Unwraps a Supabase response, throwing its error so useQuery can show it. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
