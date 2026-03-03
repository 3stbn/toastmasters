import { useEffect } from 'react';

export default function usePresentation() {
  // Keep screen awake
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    async function acquire() {
      try {
        wakeLock = await navigator.wakeLock.request('screen');
      } catch {
        // Wake Lock not supported or denied
      }
    }

    acquire();
    return () => { wakeLock?.release(); };
  }, []);

  // Enter fullscreen
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => { document.exitFullscreen?.().catch(() => {}); };
  }, []);
}
