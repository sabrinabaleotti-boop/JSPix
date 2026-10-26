"use client";

import { usePathname } from "next/navigation";

/** Faz cada página entrar com um fade sutil ao navegar. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-fade-in">
      {children}
    </div>
  );
}
