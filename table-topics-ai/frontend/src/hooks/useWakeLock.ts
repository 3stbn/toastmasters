/**
 * Keeps the phone screen on while the mic is live. Two mechanisms, in order:
 *  1. the Screen Wake Lock API (Chrome Android, Safari iOS ≥ 16.4);
 *  2. a silent 2×2 looping video, which iOS/Android treat as active media
 *     and therefore do not dim or lock (the NoSleep.js trick).
 * Neither survives the user switching apps or locking by hand, so the mic
 * page also tells the operator which one is active.
 */
import { useEffect, useState } from "react";

type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener?: (t: "release", cb: () => void) => void };
type NavigatorWithWakeLock = Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } };

const BLANK_VIDEO = "data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAANMbW9vdgAAAGxtdmhkAAAAAAAAAAAAAAAAAAAD6AAAA+gAAQAAAQAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAnd0cmFrAAAAXHRraGQAAAADAAAAAAAAAAAAAAABAAAAAAAAA+gAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAABAAAAAAAIAAAACAAAAAAAkZWR0cwAAABxlbHN0AAAAAAAAAAEAAAPoAAAAAAABAAAAAAHvbWRpYQAAACBtZGhkAAAAAAAAAAAAAAAAAAAoAAAAKABVxAAAAAAALWhkbHIAAAAAAAAAAHZpZGUAAAAAAAAAAAAAAABWaWRlb0hhbmRsZXIAAAABmm1pbmYAAAAUdm1oZAAAAAEAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAVpzdGJsAAAAunN0c2QAAAAAAAAAAQAAAKphdmMxAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAIAAgBIAAAASAAAAAAAAAABFUxhdmM2MS4xOS4xMDEgbGlieDI2NAAAAAAAAAAAAAAAGP//AAAAMGF2Y0MBQsAe/+EAGGdCwB7ZH4iIwEQAAAMABAAAAwBQPFi5IAEABWjLg8sgAAAAEHBhc3AAAAABAAAAAQAAABRidHJ0AAAAAAAAFqgAAAAAAAAAGHN0dHMAAAAAAAAAAQAAAAoAAAQAAAAAFHN0c3MAAAAAAAAAAQAAAAEAAAAcc3RzYwAAAAAAAAABAAAAAQAAAAoAAAABAAAAPHN0c3oAAAAAAAAAAAAAAAoAAAKDAAAACQAAAAoAAAAJAAAACQAAAAkAAAAJAAAACQAAAAkAAAAJAAAAFHN0Y28AAAAAAAAAAQAAA3wAAABhdWR0YQAAAFltZXRhAAAAAAAAACFoZGxyAAAAAAAAAABtZGlyYXBwbAAAAAAAAAAAAAAAACxpbHN0AAAAJKl0b28AAAAcZGF0YQAAAAEAAAAATGF2ZjYxLjcuMTAwAAAACGZyZWUAAALdbWRhdAAAAnEGBf//bdxF6b3m2Ui3lizYINkj7u94MjY0IC0gY29yZSAxNjQgcjMxMDggMzFlMTlmOSAtIEguMjY0L01QRUctNCBBVkMgY29kZWMgLSBDb3B5bGVmdCAyMDAzLTIwMjMgLSBodHRwOi8vd3d3LnZpZGVvbGFuLm9yZy94MjY0Lmh0bWwgLSBvcHRpb25zOiBjYWJhYz0wIHJlZj0zIGRlYmxvY2s9MTowOjAgYW5hbHlzZT0weDE6MHgxMTEgbWU9aGV4IHN1Ym1lPTcgcHN5PTEgcHN5X3JkPTEuMDA6MC4wMCBtaXhlZF9yZWY9MSBtZV9yYW5nZT0xNiBjaHJvbWFfbWU9MSB0cmVsbGlzPTEgOHg4ZGN0PTAgY3FtPTAgZGVhZHpvbmU9MjEsMTEgZmFzdF9wc2tpcD0xIGNocm9tYV9xcF9vZmZzZXQ9LTIgdGhyZWFkcz0xIGxvb2thaGVhZF90aHJlYWRzPTEgc2xpY2VkX3RocmVhZHM9MCBucj0wIGRlY2ltYXRlPTEgaW50ZXJsYWNlZD0wIGJsdXJheV9jb21wYXQ9MCBjb25zdHJhaW5lZF9pbnRyYT0wIGJmcmFtZXM9MCB3ZWlnaHRwPTAga2V5aW50PTI1MCBrZXlpbnRfbWluPTEwIHNjZW5lY3V0PTQwIGludHJhX3JlZnJlc2g9MCByY19sb29rYWhlYWQ9NDAgcmM9Y3JmIG1idHJlZT0xIGNyZj0yMy4wIHFjb21wPTAuNjAgcXBtaW49MCBxcG1heD02OSBxcHN0ZXA9NCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAACmWIhA/yYoAAw+4AAAAFQZo4H+oAAAAGQZpUB/qAAAAABUGaYD/UAAAABUGagD/UAAAABUGaoD/UAAAABUGawD/UAAAABUGa4D/UAAAABUGbADvUAAAABUGbIDfU";

export type WakeStatus = "off" | "api" | "video" | "failed";

export function useWakeLock(active: boolean): WakeStatus {
  const [status, setStatus] = useState<WakeStatus>("off");

  useEffect(() => {
    if (!active) {
      setStatus("off");
      return;
    }
    let lock: WakeLockSentinelLike | null = null;
    let video: HTMLVideoElement | null = null;
    let disposed = false;

    const startVideo = async () => {
      if (video) return;
      const v = document.createElement("video");
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
      v.muted = true;
      v.loop = true;
      v.src = BLANK_VIDEO;
      v.style.cssText = "position:fixed;width:1px;height:1px;opacity:0.01;pointer-events:none;bottom:0;left:0";
      document.body.appendChild(v);
      try {
        await v.play();
        video = v;
        if (!disposed) setStatus("video");
      } catch {
        v.remove();
        if (!disposed) setStatus("failed");
      }
    };

    const acquire = async () => {
      const nav = navigator as NavigatorWithWakeLock;
      if (nav.wakeLock) {
        try {
          lock = await nav.wakeLock.request("screen");
          lock.addEventListener?.("release", () => {
            if (!disposed && document.visibilityState === "visible") void acquire();
          });
          if (!disposed) setStatus("api");
          return;
        } catch {
          /* denied (low battery, permissions) → fall back */
        }
      }
      await startVideo();
    };

    void acquire();
    const onVis = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVis);
      void lock?.release();
      video?.pause();
      video?.remove();
    };
  }, [active]);

  return status;
}
