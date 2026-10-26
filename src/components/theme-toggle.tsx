"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com a classe aplicada pelo script inline
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("jspix-theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <Button variant="outline" size="icon" onClick={toggle} aria-label="Alternar tema" className={className}>
      <span className="relative grid h-4 w-4 place-items-center">
        <Sun className={`absolute h-4 w-4 transition-all duration-300 ${dark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
        <Moon className={`absolute h-4 w-4 transition-all duration-300 ${dark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
      </span>
    </Button>
  );
}
