import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  COUNTDOWN_FROM,
  LAUNCH_EVENT,
  getLaunchChannel,
  isValidLaunchUrl,
  isValidRoomId,
} from "@/lib/launch-channel";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Live Launch Countdown — System Ignition Display" },
      {
        name: "description",
        content:
          "Full-screen futuristic countdown display that opens any launch website when the sequence hits zero.",
      },
      { property: "og:title", content: "Live Launch Countdown — System Ignition Display" },
      {
        property: "og:description",
        content: "Full-screen countdown display awaiting the remote launch signal.",
      },
    ],
  }),
  component: LiveCountdown,
});

type Phase = "idle" | "counting" | "launching";

function LiveCountdown() {
  const [roomId] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("room") ?? "";
  });
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const [connected, setConnected] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const startSequence = useCallback(
    (from: number, targetUrl: string) => {
      clearTimers();
      setPhase("counting");
      setCount(from);
      for (let i = 1; i <= from; i++) {
        timers.current.push(window.setTimeout(() => setCount(from - i), i * 1000));
      }
      timers.current.push(window.setTimeout(() => setPhase("launching"), from * 1000));
      timers.current.push(
        window.setTimeout(
          () => {
            window.location.href = targetUrl;
          },
          from * 1000 + 2600,
        ),
      );
    },
    [clearTimers],
  );

  useEffect(() => {
    if (!isValidRoomId(roomId)) return;

    const channel = supabase.channel(getLaunchChannel(roomId), {
      config: { broadcast: { self: false } },
    });
    channel
      .on("broadcast", { event: LAUNCH_EVENT }, ({ payload }) => {
        const from = typeof payload?.from === "number" ? payload.from : COUNTDOWN_FROM;
        const targetUrl = typeof payload?.targetUrl === "string" ? payload.targetUrl : "";
        if (isValidLaunchUrl(targetUrl)) startSequence(from, targetUrl);
      })
      .subscribe((state) => setConnected(state === "SUBSCRIBED"));

    return () => {
      clearTimers();
      supabase.removeChannel(channel);
    };
  }, [clearTimers, roomId, startSequence]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      <div className="grid-floor pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent,var(--background)_70%)]"
        aria-hidden
      />
      <div
        className="animate-scan pointer-events-none absolute left-0 h-24 w-full bg-[linear-gradient(to_bottom,transparent,oklch(0.82_0.16_195/10%),transparent)]"
        aria-hidden
      />

      <div className="absolute top-6 left-1/2 z-10 -translate-x-1/2 text-center">
        <p className="font-display text-[0.65rem] tracking-[0.4em] text-primary/80">
          SYSTEM LAUNCH SEQUENCE
        </p>
        <p className="mt-2 flex items-center justify-center gap-2 text-[0.65rem] tracking-[0.25em] text-muted-foreground uppercase">
          <span
            className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-primary animate-pulse" : "bg-muted-foreground"}`}
          />
          {connected ? "Uplink synced" : "Awaiting uplink"}
        </p>
      </div>

      {phase === "idle" && (
        <div className="animate-flicker relative z-10 text-center">
          <h1 className="launch-gradient-text text-5xl font-bold uppercase md:text-7xl">Standby</h1>
          <p className="mt-6 text-sm tracking-[0.3em] text-muted-foreground uppercase">
            Awaiting launch command
          </p>
        </div>
      )}

      {phase === "counting" && (
        <div className="relative z-10 flex flex-col items-center">
          <span
            className="animate-pulse-ring pointer-events-none absolute h-72 w-72 rounded-full border border-primary/40"
            aria-hidden
          />
          <div
            key={count}
            className="digit-anim text-glow font-display text-[clamp(8rem,32vw,22rem)] leading-none font-black text-primary"
          >
            {count}
          </div>
          <p className="mt-4 font-display text-xs tracking-[0.5em] text-muted-foreground uppercase">
            T-Minus {count}
          </p>
          <div className="mt-8 h-1 w-64 overflow-hidden rounded-full bg-secondary/60">
            <div
              className="h-full rounded-full bg-[var(--gradient-launch)] transition-all duration-1000 ease-linear"
              style={{ width: `${((COUNTDOWN_FROM - count) / COUNTDOWN_FROM) * 100}%` }}
            />
          </div>
        </div>
      )}

      {phase === "launching" && (
        <div className="launch-anim relative z-10 text-center">
          <h1 className="launch-gradient-text text-glow-accent text-5xl font-black uppercase md:text-8xl">
            System Launching
          </h1>
          <p className="mt-6 font-display text-xs tracking-[0.45em] text-primary uppercase md:text-sm">
            Initializing Launch System
          </p>
          <div className="mx-auto mt-10 h-1 w-72 overflow-hidden rounded-full bg-secondary/60">
            <div className="h-full w-full origin-left animate-[launch-burst_2.4s_linear_forwards] bg-[var(--gradient-launch)]" />
          </div>
        </div>
      )}
    </main>
  );
}
