/**
 * A fixed 1920×1080 stage scaled to fit whatever the projector offers
 * (1024×768, 1280×720, 1280×800…), letterboxed on `bg`. Views are composed
 * once at 1080p and never reflow, so what was checked on a laptop is what
 * the room sees.
 */
import { useEffect, useState, type ReactNode } from "react";

export const STAGE_W = 1920;
export const STAGE_H = 1080;

function useScale() {
  const compute = () => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  const [scale, setScale] = useState(compute);
  useEffect(() => {
    const onResize = () => setScale(compute());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return scale;
}

export function Stage({ children, bg }: { children: ReactNode; bg: string }) {
  const scale = useScale();
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: bg }}>
      <div
        className="absolute top-1/2 left-1/2"
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: "center" }}
      >
        <div className="relative h-full w-full overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
