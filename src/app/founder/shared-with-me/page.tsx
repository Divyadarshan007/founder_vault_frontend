"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Check, ChevronRight, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { listShares, acceptShare, SharesData } from "@/services/share.service";
import { Share, User } from "@/types";
import { toast } from "sonner";

export default function SharedWithMePage() {
  const [data, setData] = useState<SharesData>({ sent: [], received: [] });
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    listShares().then(setData).finally(() => setLoading(false));
  }, []);

  async function onAccept(shareId: string) {
    setAcceptingId(shareId);
    try {
      const updated = await acceptShare(shareId);
      setData((prev) => ({ ...prev, received: prev.received.map((s) => (s._id === shareId ? updated : s)) }));
      toast.success("Invitation accepted!");
    } catch {
      toast.error("Failed to accept invitation");
    } finally {
      setAcceptingId(null);
    }
  }

  function senderUser(share: Share): User | null {
    return typeof share.founderId === "object" ? (share.founderId as User) : null;
  }

  const accepted = data.received.filter((s) => s.status === "ACCEPTED");
  const pending = data.received.filter((s) => s.status === "PENDING");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold">Shared with me</h2>
        <p className="text-muted-foreground">Content others have invited you to access.</p>
      </div>

      {/* Pending invitations */}
      {!loading && pending.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Pending Invitations</h3>
          <div className="space-y-3">
            {pending.map((share) => {
              const sender = senderUser(share);
              return (
                <div key={share._id} className="flex items-center gap-3 p-3 border rounded-lg bg-yellow-50 border-yellow-200">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={sender?.profileImage} />
                    <AvatarFallback className="text-xs">{sender?.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{sender?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{sender?.companyName}</p>
                  </div>
                  <Button size="sm" disabled={acceptingId === share._id} onClick={() => onAccept(share._id)}>
                    <Check className="w-3 h-3 mr-1" />
                    {acceptingId === share._id ? "Accepting…" : "Accept"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Accepted vaults */}
      <div>
        <h3 className="font-semibold mb-3">Accessible Vaults</h3>
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : accepted.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Users className="w-8 h-8 opacity-40" />
            <p className="text-sm">No shared vaults yet. Accept an invitation to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 items-stretch">
            {accepted.map((share) => {
              const sender = senderUser(share);
              if (!sender) return null;
              return (
                <Link key={share._id} href={`/agency/founders/${sender._id}`} className="flex">
                  <Card className="w-full cursor-pointer group transition-all duration-200 hover:shadow-md hover:border-primary/25 overflow-hidden">
                    <div className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary/40 to-transparent" />
                    <CardContent className="p-4 flex items-center gap-4">
                      <Avatar className="w-12 h-12 shrink-0 border-2 border-primary/20">
                        <AvatarImage src={sender.profileImage} />
                        <AvatarFallback className="text-base font-bold bg-primary text-primary-foreground">
                          {sender.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="font-semibold text-base leading-tight truncate">{sender.name}</p>
                        {sender.designation && (
                          <p className="text-sm text-primary/80 font-medium truncate">{sender.designation}</p>
                        )}
                        {sender.companyName && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{sender.companyName}</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
