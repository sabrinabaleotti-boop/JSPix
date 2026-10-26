import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";

export function Topbar({
  user,
  badge,
  logout = { endpoint: "/api/auth/logout", redirectTo: "/" },
}: {
  user: { name: string; handle: string; role: string };
  badge?: string;
  logout?: { endpoint: string; redirectTo: string };
}) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <Logo className="md:hidden" />
        {badge && (
          <Badge variant="outline" className="hidden h-7 rounded-md px-2.5 text-xs font-medium md:inline-flex">
            {badge}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LogoutButton endpoint={logout.endpoint} redirectTo={logout.redirectTo} />
        <div className="ml-1 flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-sm font-semibold uppercase text-primary">
            {user.name.slice(0, 1)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
              {user.name}
              <Badge variant="primary" className="text-[10px]">{user.role}</Badge>
            </span>
            <span className="block text-[11px] text-muted-foreground">{user.handle}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
