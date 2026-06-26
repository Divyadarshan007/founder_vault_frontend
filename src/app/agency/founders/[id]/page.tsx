"use client";

import { useEffect, useState, useCallback, use } from "react";
import { ArrowLeft, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentCard } from "@/components/ContentCard";
import { EmptyState } from "@/components/EmptyState";
import { getUserById } from "@/services/user.service";
import { listContent } from "@/services/content.service";
import { searchContent } from "@/services/search.service";
import { User, Content } from "@/types";
import { FileText } from "lucide-react";

export default function FounderDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  const [founder, setFounder] = useState<User | null>(null);
  const [contents, setContents] = useState<Content[]>([]);
  const [founderLoading, setFounderLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    getUserById(id)
      .then(setFounder)
      .catch(() => {})
      .finally(() => setFounderLoading(false));
  }, [id]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  const load = useCallback(async () => {
    setContentLoading(true);
    try {
      const params = { ownerId: id, page };
      if (debouncedQ.trim()) {
        const res = await searchContent({ q: debouncedQ, ...params });
        setContents(res.items);
        setTotalPages(res.pages);
      } else {
        const res = await listContent(params);
        setContents(res.items);
        setTotalPages(res.pages);
      }
    } finally {
      setContentLoading(false);
    }
  }, [id, debouncedQ, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/founder/shared-with-me">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h2 className="text-xl font-bold">Shared Vault</h2>
      </div>

      {/* Founder header */}
      {founderLoading ? (
        <div className="flex items-center gap-4 p-4 border rounded-xl bg-card">
          <Skeleton className="w-14 h-14 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4 p-4 border rounded-xl bg-card">
          <Avatar className="w-14 h-14 shrink-0">
            <AvatarImage src={founder?.profileImage} />
            <AvatarFallback className="text-lg">{founder?.name?.charAt(0) || "F"}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-bold text-lg">{founder?.name || "—"}</h3>
            <p className="text-muted-foreground text-sm">
              {[founder?.designation, founder?.companyName].filter(Boolean).join(" · ")}
            </p>
            {founder?.bio && (
              <p className="text-sm mt-1 text-muted-foreground">{founder.bio}</p>
            )}
          </div>
        </div>
      )}

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

      {/* Content feed — same layout as library */}
      {contentLoading ? (
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
          description={debouncedQ ? "Try a different search term." : "No content in this vault yet."}
        />
      ) : (
        <>
          <div className="flex flex-col">
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
    </div>
  );
}
