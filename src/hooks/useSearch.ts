"use client";

import { useState, useEffect, useCallback } from "react";
import { searchContent } from "@/services/search.service";
import { Content, ContentType, PaginatedResponse } from "@/types";

export function useSearch() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<PaginatedResponse<Content> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const search = useCallback(
    async (params?: { type?: ContentType; tag?: string; from?: string; to?: string; ownerId?: string }) => {
      if (!debouncedQuery.trim()) {
        setResults(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await searchContent({ q: debouncedQuery, ...params });
        setResults(data);
      } catch {
        setError("Search failed");
      } finally {
        setLoading(false);
      }
    },
    [debouncedQuery]
  );

  useEffect(() => {
    search();
  }, [debouncedQuery, search]);

  return { query, setQuery, results, loading, error, search };
}
