"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Plus,
  Flag,
  Settings,
  ShieldAlert,
  Users,
  Warehouse,
  Phone,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { CourtBackdrop } from "@/components/court-backdrop";
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
  { href: "/admin/teams", label: "Teams", icon: Flag },
  { href: "/admin/blocks", label: "Games and Closed Days", icon: ShieldAlert },
  { href: "/admin/emails", label: "Sent Emails", icon: Mail },
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
          <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/80">
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
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors",
                    active
                      ? "bg-black/55 shadow-sm"
                      : "bg-black/25 hover:bg-black/45"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1 leading-snug">{link.label}</span>
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

function UserCard({
  user,
  supportEmail,
  supportPhone,
}: {
  user: ShellUser;
  supportEmail?: string | null;
  supportPhone?: string | null;
}) {
  const hasHelp = Boolean(supportEmail || supportPhone);
  return (
    <div className="rounded-xl bg-black/50 p-3 text-white">
      <p className="truncate text-sm font-medium">{user.name}</p>
      <p className="truncate text-xs text-white/80">{user.email}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[oklch(0.86_0.07_150)]">
        {user.role === "ADMIN" ? "Administrator" : "Coach"}
      </p>
      <a
        href="/logout"
        className="mt-3 inline-flex h-8 w-full items-center justify-start gap-1.5 rounded-lg px-2.5 text-sm text-white hover:bg-black/40"
      >
        <LogOut className="size-4" />
        Sign out
      </a>
      {hasHelp ? (
        <div className="mt-3 space-y-1.5 border-t border-white/10 px-2.5 pt-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/70">
            Need help?
          </p>
          {supportEmail ? (
            <a
              href={`mailto:${supportEmail}`}
              className="flex items-center gap-1.5 text-xs text-white hover:text-white"
            >
              <Mail className="size-3.5 shrink-0" />
              <span className="truncate">{supportEmail}</span>
            </a>
          ) : null}
          {supportPhone ? (
            <a
              href={`tel:${supportPhone.replace(/[^\d+]/g, "")}`}
              className="flex items-center gap-1.5 text-xs text-white hover:text-white"
            >
              <Phone className="size-3.5 shrink-0" />
              <span>{supportPhone}</span>
            </a>
          ) : null}
        </div>
      ) : null}
      <p className="mt-3 px-2.5 text-[11px] tracking-[0.04em] text-white/75">
        MTS Productions 2026
      </p>
    </div>
  );
}

export function AppShell({
  user,
  unread,
  supportEmail,
  supportPhone,
  children,
}: {
  user: ShellUser;
  unread: number;
  supportEmail?: string | null;
  supportPhone?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="hardwood-wash flex min-h-svh">
      <aside className="relative sticky top-0 hidden h-svh w-72 shrink-0 overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
        <CourtBackdrop
          className="pointer-events-none absolute inset-0"
          overlayClassName="absolute inset-0 bg-[oklch(0.12_0.04_155)/0.88]"
        />
        <div className="relative flex h-full flex-col px-4 py-5 drop-shadow-[0_1px_8px_rgba(0,0,0,0.85)]">
          <Link href="/schedule" className="mb-8 flex items-center gap-2.5 px-1 text-white">
            <BrandMark className="size-8 text-[oklch(0.86_0.07_150)]" />
            <div>
              <p className="font-heading text-xl font-semibold tracking-[0.04em] leading-none">
                MP Basketball
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-white/80">
                Midland Park
              </p>
            </div>
          </Link>
          <NavLinks user={user} unread={unread} />
          <UserCard user={user} supportEmail={supportEmail} supportPhone={supportPhone} />
        </div>
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
            <SheetContent side="left" className="relative w-80 overflow-hidden bg-sidebar p-0 text-white">
              <CourtBackdrop
                className="pointer-events-none absolute inset-0"
                overlayClassName="absolute inset-0 bg-[oklch(0.12_0.04_155)/0.88]"
              />
              <div className="relative flex h-full flex-col drop-shadow-[0_1px_8px_rgba(0,0,0,0.85)]">
                <SheetHeader className="p-4">
                  <SheetTitle className="text-white">
                    <span className="font-heading tracking-[0.04em]">MP Basketball</span>
                  </SheetTitle>
                </SheetHeader>
                <Separator className="bg-sidebar-border" />
                <div className="flex h-[calc(100%-5rem)] flex-col px-3 py-4">
                  <NavLinks user={user} unread={unread} />
                  <UserCard user={user} supportEmail={supportEmail} supportPhone={supportPhone} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
