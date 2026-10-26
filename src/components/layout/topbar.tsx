import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { Badge } from "@/components/ui/badge";

export function Topbar({
  user,
  badge,
  menu,
  logout = { endpoint: "/api/auth/logout", redirectTo: "/" },
}: {
  user: { name: string; handle: string; role: string };
  badge?: string;
  /** Botão/drawer do menu no celular (ex.: <AdminMobileMenu />). */
  menu?: React.ReactNode;
  logout?: { endpoint: string; redirectTo: string };
}) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b glass px-4 md:px-6">
      <div className="flex items-center gap-3">
        {menu}
        <Logo className="md:hidden" />
        {badge && (
          <Badge variant="outline" dot pulse className="hidden h-7 rounded-lg bg-card px-2.5 text-xs font-medium md:inline-flex [&>span>span]:bg-success">
            {badge}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LogoutButton endpoint={logout.endpoint} redirectTo={logout.redirectTo} />
        <div className="ml-1 flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-1 sm:border sm:bg-card sm:pr-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg gradient-primary text-sm font-bold uppercase text-white shadow-primary">
            {user.name.slice(0, 1)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
              <span className="max-w-32 truncate">{user.name}</span>
              <Badge variant="primary" className="text-[10px]">
                {user.role}
              </Badge>
            </span>
            <span className="block max-w-44 truncate text-[11px] text-muted-foreground">{user.handle}</span>
          </span>
        </div>
      </div>
    </header>
  );
}
