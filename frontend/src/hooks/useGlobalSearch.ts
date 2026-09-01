import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchApi } from '../api/search.api';
import { trackEvent } from '../lib/analytics';
import type { SearchResults } from '../api/search.api';

const DEBOUNCE_MS = 400;

export function useGlobalSearch(rawQuery: string) {
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce the raw input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(rawQuery.trim());
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  // Track search event once per debounced query (not on every keystroke)
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      trackEvent({ eventType: 'search', metadata: { query: debouncedQuery } });
    }
  }, [debouncedQuery]);

  const query = useQuery<SearchResults>({
    queryKey: ['global-search', debouncedQuery],
    queryFn: async () => {
      const res = await searchApi.global(debouncedQuery);
      return res.data.data;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30 * 1000, // 30 s — search results can be slightly stale
    gcTime:    5 * 60 * 1000,
  });

  return {
    ...query,
    debouncedQuery,
    isReady: debouncedQuery.length >= 2,
  };
}
