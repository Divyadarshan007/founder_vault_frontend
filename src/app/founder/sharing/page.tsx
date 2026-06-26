"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Building2, Check, Copy, Link2, Mail, MessageCircle, Search,
  Send, Trash2, XIcon, UserPlus, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { inviteUserById, listShares, revokeShare, SharesData } from "@/services/share.service";
import { listAgencies } from "@/services/user.service";
import { useAuthStore } from "@/store/auth.store";
import { Share, User, PaginatedResponse } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REVOKED: "bg-gray-100 text-gray-600",
};

const LIMIT = 12;

interface ShareChannel {
  label: string;
  icon: React.ReactNode;
  color: string;
  getUrl: (url: string, msg: string) => string;
}

const CHANNELS: ShareChannel[] = [
  {
    label: "WhatsApp",
    icon: <MessageCircle className="w-5 h-5" />,
    color: "bg-green-500 hover:bg-green-600",
    getUrl: (_, msg) => `https://wa.me/?text=${encodeURIComponent(msg)}`,
  },
  {
    label: "Twitter / X",
    icon: <XIcon className="w-5 h-5" />,
    color: "bg-black hover:bg-neutral-800",
    getUrl: (url, msg) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}&url=${encodeURIComponent(url)}`,
  },
  {
    label: "LinkedIn",
    icon: <Send className="w-5 h-5" />,
    color: "bg-blue-600 hover:bg-blue-700",
    getUrl: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    label: "Email",
    icon: <Mail className="w-5 h-5" />,
    color: "bg-orange-500 hover:bg-orange-600",
    getUrl: (url, msg) =>
      `mailto:?subject=${encodeURIComponent("You're invited to Founder Vault")}&body=${encodeURIComponent(msg + "\n\n" + url)}`,
  },
  {
    label: "Telegram",
    icon: <Send className="w-5 h-5" />,
    color: "bg-sky-500 hover:bg-sky-600",
    getUrl: (url, msg) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(msg)}`,
  },
];

interface SocialShareModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  url: string;
  message: string;
}

function SocialShareModal({ open, onClose, title, description, url, message }: SocialShareModalProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 py-2">
          {CHANNELS.map((ch) => (
            <a
              key={ch.label}
              href={ch.getUrl(url, message)}
              target="_blank"
              rel="noopener noreferrer"
              title={ch.label}
              className={`flex items-center justify-center rounded-full w-11 h-11 text-white transition-colors ${ch.color}`}
            >
              {ch.icon}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 truncate rounded-md border bg-muted px-3 py-2 text-xs text-muted-foreground font-mono">
            {url}
          </div>
          <Button size="sm" variant="outline" onClick={copyLink} className="shrink-0 gap-1.5">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SharingPage() {
  const user = useAuthStore((s) => s.user);

  // --- shares ---
  const [sharesData, setSharesData] = useState<SharesData>({ sent: [], received: [] });
  const [sharesLoading, setSharesLoading] = useState(true);

  useEffect(() => {
    listShares()
      .then((data) => setSharesData({ ...data, sent: data.sent.filter((s) => s.status !== "REVOKED") }))
      .finally(() => setSharesLoading(false));
  }, []);

  const sharesByUserId = Object.fromEntries(
    sharesData.sent.map((s) => [typeof s.agencyId === "object" ? s.agencyId._id : s.agencyId, s])
  );

  // --- browse users ---
  const [search, setSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [users, setUsers] = useState<PaginatedResponse<User> | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback((q: string, page: number) => {
    setUsersLoading(true);
    listAgencies(q, page, LIMIT)
      .then(setUsers)
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setUsersLoading(false));
  }, []);

  const [browseActive] = useState(true);

  useEffect(() => {
    if (!browseActive) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setUserPage(1);
      fetchUsers(search, 1);
    }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search, browseActive, fetchUsers]);

  useEffect(() => {
    if (!browseActive) return;
    fetchUsers(search, userPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPage]);

  // --- inviting ---
  const [invitingId, setInvitingId] = useState<string | null>(null);

  // --- social share modal ---
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    url: string;
    message: string;
  }>({ open: false, title: "", description: "", url: "", message: "" });

  function openShareModal(opts: { title: string; description: string; url: string; message: string }) {
    setShareModal({ open: true, ...opts });
  }

  async function onInviteById(invitedUser: User) {
    setInvitingId(invitedUser._id);
    try {
      const share = await inviteUserById(invitedUser._id);
      setSharesData((prev) => ({ ...prev, sent: [share, ...prev.sent.filter((s) => s._id !== share._id)] }));
      toast.success(`Invitation sent to ${invitedUser.name}!`);
      const appUrl = window.location.origin;
      openShareModal({
        title: "Notify the user",
        description: `Share this invite with ${invitedUser.name} so they know to check their notifications.`,
        url: `${appUrl}/founder/sharing`,
        message: `Hi ${invitedUser.name}, I've invited you to access my content vault on Founder Vault. Log in and accept the invitation in your Sharing page.`,
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to invite";
      toast.error(msg);
    } finally {
      setInvitingId(null);
    }
  }

  async function onRevoke(shareId: string) {
    try {
      await revokeShare(shareId);
      setSharesData((prev) => ({ ...prev, sent: prev.sent.filter((s) => s._id !== shareId) }));
      toast.success("Access revoked");
    } catch {
      toast.error("Failed to revoke access");
    }
  }

  function invitedUser(share: Share): User | null {
    return typeof share.agencyId === "object" ? (share.agencyId as User) : null;
  }

  const inviteLink = user ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${user._id}` : "";
  const inviteMessage = `Join me on Founder Vault — the smart way to manage and share your content. Sign up here:`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Shared with others</h2>
        <p className="text-muted-foreground">Invite others to access your content vault.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:items-start">
        {/* ── Main section: Sent Invitations ─────────────────────── */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-base">Sent Invitations</h3>
            {sharesData.sent.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {sharesData.sent.length}
              </span>
            )}
          </div>

          {sharesLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
          ) : sharesData.sent.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground border rounded-lg bg-card">
              <UserPlus className="w-8 h-8 opacity-30" />
              <p className="text-sm">No invitations sent yet. Browse users to invite someone.</p>
            </div>
          ) : (
            sharesData.sent.map((share) => {
              const invited = invitedUser(share);
              return (
                <div key={share._id} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarImage src={invited?.profileImage} />
                    <AvatarFallback className="text-xs">
                      {invited?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{invited?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {invited?.email || "—"} · {invited?.companyName}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[share.status] || ""}`}>
                    {share.status}
                  </span>
                  {share.status !== "REVOKED" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRevoke(share._id)}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Right sidebar: Browse Users + Invite via Link ───────── */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          {/* Browse Users */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Users className="w-4 h-4" /> Browse Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-8 text-sm"
                  placeholder="Search name, company, email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {usersLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                </div>
              ) : users && users.items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <Building2 className="w-6 h-6 opacity-40" />
                  <p className="text-xs">No users found{search ? ` for "${search}"` : ""}.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {users?.items.map((u) => {
                      const existing = sharesByUserId[u._id];
                      const alreadyInvited = !!existing && existing.status !== "REVOKED";
                      return (
                        <div key={u._id} className="flex items-center gap-2.5 p-2.5 border rounded-lg bg-background">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarImage src={u.profileImage} />
                            <AvatarFallback className="text-xs font-semibold">
                              {u.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs truncate">{u.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{u.companyName}</p>
                          </div>
                          {alreadyInvited ? (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[existing.status] || ""}`}>
                              {existing.status}
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={invitingId === u._id}
                              onClick={() => onInviteById(u)}
                              className="h-7 px-2 text-xs shrink-0 gap-1"
                            >
                              <UserPlus className="w-3 h-3" />
                              {invitingId === u._id ? "…" : "Invite"}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {users && users.pages > 1 && (
                    <div className="flex items-center justify-between pt-1">
                      <p className="text-[11px] text-muted-foreground">
                        {users.page}/{users.pages}
                      </p>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm" variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={users.page <= 1}
                          onClick={() => setUserPage((p) => p - 1)}
                        >
                          Prev
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={users.page >= users.pages}
                          onClick={() => setUserPage((p) => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Invite via Link */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Link2 className="w-4 h-4" /> Invite via Link
              </CardTitle>
              <CardDescription className="text-xs">
                Share your invite link with people not yet on Founder Vault.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex-1 truncate rounded-md border bg-muted px-2.5 py-1.5 text-[11px] text-muted-foreground font-mono">
                  {inviteLink || "Loading…"}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(inviteLink);
                    toast.success("Link copied!");
                  }}
                  className="h-7 px-2 shrink-0 gap-1 text-xs"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </Button>
              </div>

              <p className="text-xs font-medium text-muted-foreground">Share via</p>
              <div className="flex gap-2 flex-wrap">
                {CHANNELS.map((ch) => (
                  <a
                    key={ch.label}
                    href={ch.getUrl(inviteLink, inviteMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={ch.label}
                    className={`flex items-center justify-center rounded-full w-9 h-9 text-white transition-colors ${ch.color}`}
                  >
                    <span className="w-4 h-4">{ch.icon}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <SocialShareModal
        open={shareModal.open}
        onClose={() => setShareModal((m) => ({ ...m, open: false }))}
        title={shareModal.title}
        description={shareModal.description}
        url={shareModal.url}
        message={shareModal.message}
      />
    </div>
  );
}
