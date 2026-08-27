import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  COUNTDOWN_FROM,
  LAUNCH_EVENT,
  createRoomId,
  getLaunchChannel,
  isValidLaunchUrl,
} from "@/lib/launch-channel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Launch Control — General Launch System" },
      {
        name: "description",
        content:
          "Mission control panel: trigger the 5-second launch sequence on the live countdown display from your phone.",
      },
      { property: "og:title", content: "Launch Control — General Launch System" },
      {
        property: "og:description",
        content:
          "Trigger the futuristic 5-second launch countdown on any connected display in real time.",
      },
    ],
  }),
  component: LaunchControl,
});

type Status = "connecting" | "ready" | "sent" | "error";

function LaunchControl() {
  const [roomId] = useState(createRoomId);
  const [status, setStatus] = useState<Status>("connecting");
  const [targetUrl, setTargetUrl] = useState("");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase.channel(getLaunchChannel(roomId), {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;
    channel.subscribe((state) => {
      if (state === "SUBSCRIBED") setStatus("ready");
      else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") setStatus("error");
    });
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const launch = async () => {
    const channel = channelRef.current;
    if (!channel || !isValidLaunchUrl(targetUrl)) return;
    await channel.send({
      type: "broadcast",
      event: LAUNCH_EVENT,
      payload: { startAt: Date.now(), from: COUNTDOWN_FROM, targetUrl },
    });
    setStatus("sent");
    window.setTimeout(() => setStatus("ready"), 4000);
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div className="grid-floor pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,transparent,var(--background)_75%)]"
        aria-hidden
      />

      <section className="panel relative z-10 w-full max-w-md rounded-3xl px-7 py-10 text-center">
        <p className="font-display text-[0.7rem] tracking-[0.35em] text-primary">MISSION CONTROL</p>
        <h1 className="launch-gradient-text mt-3 text-3xl font-bold uppercase">Launch Console</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Enter the destination, arm the display, then initiate the {COUNTDOWN_FROM}-second ignition
          sequence.
        </p>

        <div className="mt-8 text-left">
          <label
            htmlFor="target-url"
            className="font-display text-[0.65rem] tracking-[0.2em] text-primary uppercase"
          >
            Launch website
          </label>
          <input
            id="target-url"
            type="url"
            value={targetUrl}
            onChange={(event) => setTargetUrl(event.target.value)}
            placeholder="https://your-website.com"
            autoComplete="url"
            className="mt-2 w-full rounded-xl border border-primary/30 bg-secondary/30 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
          />
          {targetUrl.length > 0 && !isValidLaunchUrl(targetUrl) && (
            <p className="mt-2 text-xs text-destructive">Enter a valid HTTPS website address.</p>
          )}
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs tracking-[0.2em] uppercase">
          <span
            className={`h-2 w-2 rounded-full ${
              status === "error"
                ? "bg-destructive"
                : status === "connecting"
                  ? "bg-muted-foreground"
                  : "bg-primary animate-pulse"
            }`}
          />
          <span className="text-muted-foreground">
            {status === "connecting" && "Linking uplink…"}
            {status === "ready" && "Uplink online"}
            {status === "sent" && "Signal transmitted"}
            {status === "error" && "Uplink failure — retry"}
          </span>
        </div>

        <div className="relative mt-10 flex items-center justify-center">
          <span
            className="animate-pulse-ring pointer-events-none absolute h-40 w-40 rounded-full border border-primary/50"
            aria-hidden
          />
          <button
            type="button"
            onClick={launch}
            disabled={!isValidLaunchUrl(targetUrl) || (status !== "ready" && status !== "sent")}
            className="relative flex h-40 w-40 flex-col items-center justify-center rounded-full border border-primary/60 bg-[var(--gradient-launch)] font-display text-lg font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-[var(--glow-primary)] transition-transform duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span>{status === "sent" ? "Launched" : "Initiate"}</span>
            <span className="mt-1 text-[0.6rem] font-medium tracking-[0.3em] opacity-80">
              T-MINUS {COUNTDOWN_FROM}
            </span>
          </button>
        </div>

        <a
          href={`/live?room=${encodeURIComponent(roomId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex w-full items-center justify-center rounded-xl border border-primary/40 bg-secondary/40 px-5 py-3 font-display text-xs font-semibold uppercase tracking-[0.25em] text-primary transition-colors hover:bg-secondary"
        >
          Open live countdown
        </a>
        <p className="mt-3 text-xs text-muted-foreground">
          Open the live screen on the laptop, keep this panel on your phone.
        </p>
      </section>
    </main>
  );
}
