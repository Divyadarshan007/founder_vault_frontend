"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentCard } from "@/components/ContentCard";
import { EmptyState } from "@/components/EmptyState";
import { ChatContentModal } from "@/components/ChatContentModal";
import { listContent } from "@/services/content.service";
import { searchContent } from "@/services/search.service";
import { Content } from "@/types";

export default function ContentListPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (debouncedQ.trim()) {
        const res = await searchContent({ q: debouncedQ, page });
        setContents(res.items);
        setTotalPages(res.pages);
      } else {
        const res = await listContent({ page });
        setContents(res.items);
        setTotalPages(res.pages);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Content</h2>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Content
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search content…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content feed */}
      {loading ? (
        <div className="flex flex-col divide-y">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-8 py-8">
              <div className="flex-1 flex flex-col gap-3">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-6 w-3/4 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>
              <Skeleton className="w-36 h-28 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      ) : contents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No content found"
          description={debouncedQ ? "Try a different search term." : "Start logging your first piece of content."}
        />
      ) : (
        <>
          <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
            {contents.map((c) => (
              <ContentCard key={c._id} content={c} href={`/founder/content/${c._id}`} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="flex items-center text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <ChatContentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}
