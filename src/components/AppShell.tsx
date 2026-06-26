"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { FileText, Share2, LogOut, Inbox } from "lucide-react";

const NAV = [
  { label: "Library", href: "/founder/content", icon: FileText },
  { label: "Shared with me", href: "/founder/shared-with-me", icon: Inbox },
  { label: "Shared with others", href: "/founder/sharing", icon: Share2 },
];

function SidebarNav({ pathname }: { pathname: string }) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenu>
      {NAV.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <SidebarMenuItem key={href}>
            <SidebarMenuButton
              asChild
              isActive={active}
              tooltip={label}
              onClick={() => setOpenMobile(false)}
            >
              <Link href={href}>
                <Icon />
                <span>{label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const initials =
    user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild tooltip="Founder Vault">
                <Link href="/founder/content">
                  <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                    FV
                  </div>
                  <span className="font-bold text-primary">Founder Vault</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarNav pathname={pathname} />
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    tooltip={user?.name ?? "Account"}
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarImage src={user?.profileImage} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.companyName}</p>
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-48">
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 h-14 border-b flex items-center px-4 bg-background shrink-0 gap-3">
          <SidebarTrigger />
          <h1 className="text-sm font-medium text-muted-foreground truncate">
            {user?.companyName} · <span className="text-foreground">{user?.name}</span>
          </h1>
        </header>
        <div className="flex-1 p-4 sm:p-6 overflow-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
