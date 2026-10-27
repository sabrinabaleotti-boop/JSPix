"use client";

import { BellRing, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { playCashSound, unlockAudio } from "@/lib/cash-sound";
import { cn, formatBRL } from "@/lib/utils";

type Scope = "client" | "admin";
type Paid = { chargeId: string; amountCents: number; description?: string | null; clientName?: string | null; url?: string; silentToast?: boolean };

const SEEN_KEY = "jspix-paid-seen";
const DISMISS_KEY = "jspix-push-dismissed-at";
const POLL_MS = 10_000;
const DISMISS_DAYS = 7;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
}

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveSeen(seen: Set<string>) {
  try {
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-100)));
  } catch {}
}

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}

function isIosWithoutHomeScreen() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua);
  const standalone = (navigator as unknown as { standalone?: boolean }).standalone === true || matchMedia("(display-mode: standalone)").matches;
  return ios && !standalone;
}

/**
 * Som de caixa registradora + aviso na tela quando um Pix é pago, e inscrição em Web Push para o aviso chegar no
 * celular/desktop com o app fechado. O service worker (/sw.js) avisa as abas abertas; sem push, o app consulta a
 * API a cada 10 s para não perder nenhum pagamento.
 */
export function PaymentAlerts({ scope, vapidKey }: { scope: Scope; vapidKey: string | null }) {
  const router = useRouter();
  const [toast, setToast] = useState<Paid | null>(null);
  const [banner, setBanner] = useState<"hidden" | "ask" | "ios" | "enabling">("hidden");
  const seen = useRef<Set<string> | null>(null);
  const since = useRef(new Date().toISOString());
  const reg = useRef<ServiceWorkerRegistration | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((p: Paid) => {
    if (!seen.current) seen.current = loadSeen();
    if (seen.current.has(p.chargeId)) return;
    seen.current.add(p.chargeId);
    saveSeen(seen.current);
    void playCashSound();
    if (!p.silentToast) {
      setToast(p);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 8000);
    }
    // Aba em segundo plano sem push: ainda dá para avisar pelo sistema.
    if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted" && !reg.current?.pushManager) {
      try {
        new Notification(`Pix recebido · ${formatBRL(p.amountCents)}`, { body: p.description ?? p.clientName ?? "Pagamento confirmado", tag: `paid-${p.chargeId}` });
      } catch {}
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!vapidKey || !reg.current || !("pushManager" in reg.current)) return false;
    try {
      const sub = (await reg.current.pushManager.getSubscription()) ?? (await reg.current.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) }));
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON(), scope }) });
      return res.ok;
    } catch (e) {
      console.warn("[push] não foi possível inscrever:", (e as Error).message);
      return false;
    }
  }, [vapidKey, scope]);

  // Service worker + estado inicial da permissão (assíncrono para não disparar setState no corpo do effect).
  useEffect(() => {
    let cancelled = false;
    const supported = "serviceWorker" in navigator && "Notification" in window;
    (async () => {
      if (supported) {
        try {
          reg.current = await navigator.serviceWorker.register("/sw.js");
        } catch (e) {
          console.warn("[push] service worker:", (e as Error).message);
        }
      }
      if (cancelled) return;
      const perm = supported ? Notification.permission : "denied";
      if (perm === "granted") void subscribe();
      else if (perm === "default" && !dismissedRecently()) setBanner(isIosWithoutHomeScreen() ? "ios" : "ask");
    })();
    return () => {
      cancelled = true;
    };
  }, [subscribe]);

  // Mensagens do service worker (push recebido com a aba aberta) e do PixView (pagamento visto na própria tela).
  useEffect(() => {
    const onSw = (e: MessageEvent) => {
      if (e.data?.source === "jspix-sw" && e.data.type === "paid") announce({ chargeId: e.data.chargeId, amountCents: e.data.amountCents, description: e.data.body, url: e.data.url });
    };
    const onLocal = (e: Event) => announce((e as CustomEvent<Paid>).detail);
    navigator.serviceWorker?.addEventListener("message", onSw);
    window.addEventListener("jspix:paid", onLocal);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", onSw);
      window.removeEventListener("jspix:paid", onLocal);
    };
  }, [announce]);

  // Libera o áudio no primeiro gesto do usuário.
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Consulta periódica: garante o som mesmo sem permissão de notificação.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/notifications/paid?scope=${scope}&since=${encodeURIComponent(since.current)}`, { cache: "no-store" });
        if (res.ok) {
          const j = (await res.json()) as { now: string; items: Paid[] };
          since.current = j.now;
          for (const item of j.items) announce(item);
        }
      } catch {}
      if (!stopped) timer = setTimeout(poll, document.hidden ? POLL_MS * 3 : POLL_MS);
    };
    timer = setTimeout(poll, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) {
        if (timer) clearTimeout(timer);
        void poll();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [scope, announce]);

  async function enable() {
    unlockAudio();
    setBanner("enabling");
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      await subscribe();
      void playCashSound();
    }
    setBanner("hidden");
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setBanner("hidden");
  }

  return (
    <>
      {banner !== "hidden" && (
        <div className="fixed inset-x-4 bottom-24 z-40 animate-slide-up md:inset-x-auto md:bottom-6 md:right-6 md:w-[380px]">
          <div className="glass-card rounded-2xl border p-4 shadow-[0_24px_60px_-20px_rgb(15_23_42/0.45)]">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-primary text-white shadow-primary">
                <BellRing className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Avisar quando um Pix for pago?</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {banner === "ios"
                    ? "No iPhone, toque em Compartilhar → Adicionar à Tela de Início e abra o JSPix por lá para receber as notificações."
                    : "Você ouve o som da caixa registradora na hora e recebe a notificação no celular, mesmo com o app fechado."}
                </p>
                <div className="mt-3 flex gap-2">
                  {banner !== "ios" && (
                    <Button size="sm" onClick={enable} disabled={banner === "enabling"}>
                      <BellRing className="h-3.5 w-3.5" /> Ativar avisos
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={dismiss}>
                    Agora não
                  </Button>
                </div>
              </div>
              <button type="button" onClick={dismiss} aria-label="Fechar" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <button
          type="button"
          onClick={() => {
            setToast(null);
            if (toast.url) router.push(toast.url);
          }}
          className={cn(
            "fixed inset-x-4 bottom-24 z-50 flex items-center gap-3 rounded-2xl border border-success/40 bg-card p-4 text-left shadow-[0_24px_60px_-20px_rgb(16_185_129/0.55)] animate-slide-up",
            "md:inset-x-auto md:bottom-6 md:right-6 md:w-[360px]",
          )}
        >
          <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-success/15 text-success">
            <span className="absolute inset-0 rounded-full bg-success/30 animate-pulse-ring" />
            <Check className="h-6 w-6 animate-pop" strokeWidth={3} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-success">Pix recebido</span>
            <span className="block text-xl font-bold tabular">{formatBRL(toast.amountCents)}</span>
            <span className="block truncate text-xs text-muted-foreground">{[toast.clientName, toast.description].filter(Boolean).join(" · ") || "Pagamento confirmado"}</span>
          </span>
        </button>
      )}
    </>
  );
}
