"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  ShieldAlert,
  Users,
  Warehouse,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type ShellUser = {
  name: string;
  email: string;
  role: "ADMIN" | "COACH";
};

const coachLinks = [
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/book", label: "Book practice", icon: Plus },
  { href: "/bookings", label: "My bookings", icon: ClipboardList },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const adminLinks = [
  { href: "/admin", label: "Usage board", icon: LayoutDashboard },
  { href: "/admin/gyms", label: "Gyms", icon: Warehouse },
  { href: "/admin/users", label: "People", icon: Users },
  { href: "/admin/blocks", label: "Games & closed days", icon: ShieldAlert },
  { href: "/admin/settings", label: "Thresholds", icon: Settings },
];

function NavLinks({
  user,
  unread,
  onNavigate,
}: {
  user: ShellUser;
  unread: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const groups = [
    { title: "Board", links: coachLinks },
    ...(user.role === "ADMIN" ? [{ title: "Admin", links: adminLinks }] : []),
  ];

  return (
    <nav className="flex flex-1 flex-col gap-6">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/40">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.links.map((link) => {
              const active =
                link.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{link.label}</span>
                  {link.href === "/notifications" && unread > 0 ? (
                    <span className="rounded-full bg-sidebar-primary px-1.5 text-[10px] font-semibold text-sidebar-primary-foreground">
                      {unread}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserCard({ user }: { user: ShellUser }) {
  return (
    <div className="rounded-xl bg-black/20 p-3">
      <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
      <p className="truncate text-xs text-sidebar-foreground/50">{user.email}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-sidebar-primary">
        {user.role === "ADMIN" ? "Administrator" : "Coach"}
      </p>
      <Link
        href="/logout"
        className="mt-3 inline-flex h-8 w-full items-center justify-start gap-1.5 rounded-lg px-2.5 text-sm text-sidebar-foreground/80 hover:bg-white/10 hover:text-white"
      >
        <LogOut className="size-4" />
        Sign out
      </Link>
      <p className="mt-3 px-2.5 text-[11px] tracking-[0.04em] text-sidebar-foreground/70">
        MTS Productions 2026
      </p>
    </div>
  );
}

export function AppShell({
  user,
  unread,
  children,
}: {
  user: ShellUser;
  unread: number;
  children: React.ReactNode;
}) {
  return (
    <div className="hardwood-wash flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col bg-sidebar px-4 py-5 text-sidebar-foreground lg:flex">
        <Link href="/schedule" className="mb-8 flex items-center gap-2.5 px-1">
          <BrandMark className="size-8 text-sidebar-primary" />
          <div>
            <p className="font-heading text-xl font-semibold tracking-[0.04em] leading-none">
              MP Basketball
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/40">
              Midland Park
            </p>
          </div>
        </Link>
        <NavLinks user={user} unread={unread} />
        <UserCard user={user} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/85 px-4 py-3 backdrop-blur-md lg:hidden">
          <Link href="/schedule" className="flex items-center gap-2">
            <BrandMark className="size-7 text-primary" />
            <span className="font-heading text-lg font-semibold tracking-[0.04em]">MP Basketball</span>
          </Link>
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" className="relative">
                  <Menu className="size-4" />
                  {unread > 0 ? (
                    <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
                  ) : null}
                </Button>
              }
            />
            <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
              <SheetHeader className="p-4">
                <SheetTitle className="text-sidebar-foreground">
                  <span className="font-heading tracking-[0.04em]">MP Basketball</span>
                </SheetTitle>
              </SheetHeader>
              <Separator className="bg-sidebar-border" />
              <div className="flex h-[calc(100%-5rem)] flex-col px-3 py-4">
                <NavLinks user={user} unread={unread} />
                <UserCard user={user} />
              </div>
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
